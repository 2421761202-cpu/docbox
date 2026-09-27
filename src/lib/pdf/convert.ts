/**
 * PDF 格式转换与压缩：
 *  - PDF → 图片（pdf.js 渲染）
 *  - 图片 → PDF（pdf-lib 组装）
 *  - PDF 压缩（把页面栅格化为 JPEG 再重建，体积下降最明显）
 */

import { PDFDocument, rgb } from 'pdf-lib'
import { createCanvas, get2d, loadImageFile, type ProgressFn } from '../image/core'
import { encodeCanvas, type ImageFormat, FORMAT_EXT, FORMAT_MIME } from '../image/encode'
import { openPdfDocument, renderPage } from './pdfjs'

/* ------------------------------------------------------------------ */
/* PDF → 图片                                                          */
/* ------------------------------------------------------------------ */

export interface PdfToImageOptions {
  format: ImageFormat
  /** 目标 DPI（72 为 PDF 原生分辨率） */
  dpi?: number
  quality?: number
  /** 要导出的页（1-based）；为空表示全部 */
  pages?: number[]
  background?: string
  grayscale?: boolean
  /** 单页渲染的最大边长，防止超大页面把内存打满 */
  maxDimension?: number
}

export interface PdfImageResult {
  pageNumber: number
  name: string
  blob: Blob
  width: number
  height: number
  previewUrl?: string
}

export async function pdfToImages(
  bytes: Uint8Array,
  baseName: string,
  options: PdfToImageOptions,
  onProgress?: ProgressFn,
): Promise<PdfImageResult[]> {
  const {
    format,
    dpi = 150,
    quality = 0.92,
    background = '#ffffff',
    grayscale = false,
    maxDimension = 6000,
  } = options

  const doc = await openPdfDocument(bytes)
  const results: PdfImageResult[] = []

  try {
    const targets = options.pages?.length
      ? options.pages.filter((p) => p >= 1 && p <= doc.numPages)
      : Array.from({ length: doc.numPages }, (_, i) => i + 1)

    if (targets.length === 0) throw new Error('请至少选择一页')

    const baseScale = dpi / 72
    const pad = String(doc.numPages).length

    for (let i = 0; i < targets.length; i++) {
      const pageNumber = targets[i]
      const page = await doc.getPage(pageNumber)
      const probe = page.getViewport({ scale: 1 })
      const longest = Math.max(probe.width, probe.height)
      const scale = Math.min(baseScale, maxDimension / Math.max(1, longest))

      const { canvas } = await renderPage(doc, pageNumber, { scale, background })

      if (grayscale) applyGrayscale(canvas)

      const blob = await encodeCanvas(canvas, { format, quality, background })
      const pageLabel = String(pageNumber).padStart(pad, '0')

      results.push({
        pageNumber,
        name: `${baseName}_第${pageLabel}页.${FORMAT_EXT[format]}`,
        blob,
        width: canvas.width,
        height: canvas.height,
        previewUrl: URL.createObjectURL(blob),
      })

      onProgress?.(
        Math.round(((i + 1) / targets.length) * 100),
        `正在导出第 ${pageNumber} 页（共 ${targets.length} 页）`,
      )
      await new Promise((r) => setTimeout(r, 0))
    }
  } finally {
    await doc.destroy()
  }

  return results
}

/** 就地转灰度 */
export function applyGrayscale(canvas: HTMLCanvasElement): void {
  const ctx = get2d(canvas, { willReadFrequently: true })
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    // Rec.601 亮度权重
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0
    data[i] = gray
    data[i + 1] = gray
    data[i + 2] = gray
  }
  ctx.putImageData(image, 0, 0)
}

/* ------------------------------------------------------------------ */
/* 图片 → PDF                                                          */
/* ------------------------------------------------------------------ */

export type PdfPageSize = 'fit' | 'a4' | 'a4-landscape' | 'letter' | 'letter-landscape'
export type PdfImageFit = 'contain' | 'cover' | 'stretch'

export interface ImagesToPdfOptions {
  pageSize: PdfPageSize
  /** 页边距（PDF 点，1pt = 1/72 英寸） */
  margin?: number
  fit?: PdfImageFit
  background?: string
  quality?: number
  /** 'fit' 模式下每像素对应的点大小：1 表示 1px = 1pt */
  pixelToPoint?: number
}

export interface PdfImageInput {
  data: ArrayBuffer | Blob
  name: string
  type?: string
}

const PAGE_SIZES: Record<Exclude<PdfPageSize, 'fit'>, [number, number]> = {
  a4: [595.28, 841.89],
  'a4-landscape': [841.89, 595.28],
  letter: [612, 792],
  'letter-landscape': [792, 612],
}

/** 把多张图片合成一个 PDF，顺序即传入顺序 */
export async function imagesToPdf(
  items: PdfImageInput[],
  options: ImagesToPdfOptions,
  onProgress?: ProgressFn,
): Promise<Uint8Array> {
  if (items.length === 0) throw new Error('请至少添加一张图片')

  const {
    pageSize,
    margin = 0,
    fit = 'contain',
    background = '#ffffff',
    quality = 0.92,
    pixelToPoint = 0.75, // 96dpi 屏幕图 → 72dpi PDF
  } = options

  const doc = await PDFDocument.create()
  doc.setProducer('DocBox')
  doc.setCreator('DocBox 在线工具箱')

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const loaded = await loadImageFile(item.data as Blob)

    try {
      const encoded = await encodeForPdf(loaded.source, loaded.width, loaded.height, quality)
      const embedded =
        encoded.format === 'png'
          ? await doc.embedPng(encoded.bytes)
          : await doc.embedJpg(encoded.bytes)

      let pageWidth: number
      let pageHeight: number

      if (pageSize === 'fit') {
        pageWidth = loaded.width * pixelToPoint + margin * 2
        pageHeight = loaded.height * pixelToPoint + margin * 2
      } else {
        ;[pageWidth, pageHeight] = PAGE_SIZES[pageSize]
      }

      const page = doc.addPage([pageWidth, pageHeight])

      // 背景色（非 fit 模式下常见需求：白底）
      if (background && background.toLowerCase() !== '#ffffff') {
        // hexToRgb 返回 0–1 的分量，正好是 pdf-lib rgb() 的入参范围，
        // 但必须用 rgb() 包一层才能得到 pdf-lib 认识的 Color 实例。
        const bg = hexToRgb(background)
        page.drawRectangle({
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
          color: rgb(bg.r, bg.g, bg.b),
        })
      }

      const availW = Math.max(1, pageWidth - margin * 2)
      const availH = Math.max(1, pageHeight - margin * 2)
      const scale =
        fit === 'stretch'
          ? null
          : fit === 'cover'
            ? Math.max(availW / loaded.width, availH / loaded.height)
            : Math.min(availW / loaded.width, availH / loaded.height)

      const drawW = scale === null ? availW : loaded.width * scale
      const drawH = scale === null ? availH : loaded.height * scale
      const x = (pageWidth - drawW) / 2
      // PDF 坐标原点在左下角
      const y = (pageHeight - drawH) / 2

      page.drawImage(embedded, { x, y, width: drawW, height: drawH })

      onProgress?.(
        Math.round(((i + 1) / items.length) * 95),
        `正在写入第 ${i + 1}/${items.length} 张图片`,
      )
    } finally {
      loaded.dispose()
    }
  }

  const bytes = await doc.save({ useObjectStreams: true })
  onProgress?.(100, 'PDF 生成完成')
  return bytes
}

/** 把任意格式的图像源转成 pdf-lib 能嵌入的 JPEG / PNG 字节 */
async function encodeForPdf(
  source: CanvasImageSource,
  width: number,
  height: number,
  quality: number,
): Promise<{ format: 'jpeg' | 'png'; bytes: Uint8Array }> {
  const canvas = createCanvas(width, height)
  const ctx = get2d(canvas)
  ctx.drawImage(source, 0, 0, width, height)

  // 先尝试 PNG：能保留透明通道；如果 PNG 太大再退回 JPEG
  const pngBlob = await encodeCanvas(canvas, { format: 'png' })
  const jpegBlob = await encodeCanvas(canvas, { format: 'jpeg', quality, background: '#ffffff' })

  const chosen = pngBlob.size <= jpegBlob.size ? pngBlob : jpegBlob

  if (chosen === pngBlob) {
    return { format: 'png', bytes: new Uint8Array(await pngBlob.arrayBuffer()) }
  }
  return { format: 'jpeg', bytes: new Uint8Array(await jpegBlob.arrayBuffer()) }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  const value = Number.parseInt(full, 16)
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  }
}

/* ------------------------------------------------------------------ */
/* PDF 压缩                                                            */
/* ------------------------------------------------------------------ */

export interface PdfCompressOptions {
  /** 渲染 DPI：越低体积越小、越模糊 */
  dpi: number
  /** JPEG 质量 0~1 */
  quality: number
  grayscale?: boolean
  /** 仅压缩这些页；为空表示全部 */
  pages?: number[]
  maxDimension?: number
}

export interface PdfCompressResult {
  bytes: Uint8Array
  /** 每页压缩后的近似尺寸，用于结果说明 */
  pageCount: number
}

/**
 * 「强力压缩」：把每页栅格化成 JPEG 后重建 PDF。
 *
 * 这是体积下降最明显的方式，代价是文字会变成图片 —— 不能再选中/搜索。
 * 页面物理尺寸按原始 point 尺寸保持，打印效果不变。
 */
export async function compressPdfRaster(
  bytes: Uint8Array,
  options: PdfCompressOptions,
  onProgress?: ProgressFn,
): Promise<PdfCompressResult> {
  const { dpi = 120, quality = 0.7, grayscale = false, maxDimension = 4000 } = options

  const doc = await openPdfDocument(bytes)
  const out = await PDFDocument.create()
  out.setProducer('DocBox')
  out.setCreator('DocBox 在线工具箱')

  try {
    const targets = options.pages?.length
      ? options.pages.filter((p) => p >= 1 && p <= doc.numPages)
      : Array.from({ length: doc.numPages }, (_, i) => i + 1)

    const baseScale = dpi / 72

    for (let i = 0; i < targets.length; i++) {
      const pageNumber = targets[i]
      const page = await doc.getPage(pageNumber)
      const natural = page.getViewport({ scale: 1, rotation: 0 })

      const longest = Math.max(natural.width, natural.height)
      const scale = Math.min(baseScale, maxDimension / Math.max(1, longest))

      const rendered = await renderPage(doc, pageNumber, { scale, background: '#ffffff' })
      const canvas = rendered.canvas
      if (grayscale) applyGrayscale(canvas)

      const jpeg = await encodeCanvas(canvas, { format: 'jpeg', quality, background: '#ffffff' })
      const embedded = await out.embedJpg(new Uint8Array(await jpeg.arrayBuffer()))

      // 保留原始页面点尺寸，保证打印比例不变
      const pageW = natural.width
      const pageH = natural.height
      out.addPage([pageW, pageH]).drawImage(embedded, {
        x: 0,
        y: 0,
        width: pageW,
        height: pageH,
      })

      onProgress?.(
        Math.round(((i + 1) / targets.length) * 97),
        `正在压缩第 ${pageNumber} 页（共 ${targets.length} 页）`,
      )
      await new Promise((r) => setTimeout(r, 0))
    }

    const result = await out.save({ useObjectStreams: true })
    onProgress?.(100, '压缩完成')
    return { bytes: result, pageCount: targets.length }
  } finally {
    await doc.destroy()
  }
}

/** 压缩档位预设 */
export interface CompressPreset {
  id: string
  label: string
  description: string
  dpi: number
  quality: number
  grayscale: boolean
}

export const PDF_COMPRESS_PRESETS: CompressPreset[] = [
  {
    id: 'light',
    label: '轻度压缩',
    description: '画质几乎无损，适合屏幕阅读',
    dpi: 150,
    quality: 0.85,
    grayscale: false,
  },
  {
    id: 'standard',
    label: '标准压缩',
    description: '清晰度与体积的平衡点，推荐',
    dpi: 120,
    quality: 0.7,
    grayscale: false,
  },
  {
    id: 'strong',
    label: '强力压缩',
    description: '体积明显变小，文字边缘略软',
    dpi: 96,
    quality: 0.6,
    grayscale: false,
  },
  {
    id: 'extreme',
    label: '极限压缩',
    description: '优先最小体积，适合邮件附件',
    dpi: 72,
    quality: 0.5,
    grayscale: false,
  },
  {
    id: 'gray',
    label: '黑白扫描件',
    description: '转灰度，文档类 PDF 可再省一大半',
    dpi: 120,
    quality: 0.65,
    grayscale: true,
  },
]

export { FORMAT_EXT, FORMAT_MIME }
