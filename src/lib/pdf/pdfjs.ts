/**
 * pdf.js 封装：PDF 解析、页面渲染、缩略图。
 *
 * 渲染只依赖 pdf.js，编辑（合并/旋转/删页）走 pdf-lib，两者职责分离：
 * pdf.js 负责「看」，pdf-lib 负责「改」。
 */

import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { createCanvas, get2d, type ProgressFn } from '../image/core'

// worker 通过 Vite 的 ?url 导入，dev 与 build 都能正确解析
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

/**
 * 标准字体与 CMap 的目录（由 scripts/copy-pdfjs-assets.mjs 复制到 public/pdfjs/）。
 *
 * 这两项不是可选项：
 *   - 没有 standard_fonts，使用 Helvetica/Times 等 14 种标准字体且未内嵌字体的 PDF 会渲染不出文字；
 *   - 没有 cmaps，用预定义 CMap 的中文 PDF（相当常见）会整段丢失文字。
 * 它们只在解析到这类 PDF 时才被按需请求，不影响首屏体积。
 */
const BASE = import.meta.env.BASE_URL || '/'
const STANDARD_FONT_DATA_URL = `${BASE}pdfjs/standard_fonts/`
const CMAP_URL = `${BASE}pdfjs/cmaps/`

export { pdfjsLib }

export type PDFDocumentProxy = pdfjsLib.PDFDocumentProxy
export type PDFPageProxy = pdfjsLib.PDFPageProxy

export interface PdfPageInfo {
  pageNumber: number
  /** 未旋转的原始尺寸 */
  width: number
  height: number
  /** 页面自带的旋转角（0/90/180/270） */
  rotation: number
  label?: string
}

export interface PdfInfo {
  pageCount: number
  pages: PdfPageInfo[]
  title?: string
  author?: string
  /** 是否是加密文档（能打开但有权限限制） */
  encrypted: boolean
}

/**
 * 打开 PDF。
 * 注意：pdf.js 会「接管」传入的 TypedArray（转移所有权），这里主动复制一份，
 * 否则调用方后续再用同一份数据会拿到空 buffer。
 */
export async function openPdfDocument(
  data: ArrayBuffer | Uint8Array,
  password?: string,
): Promise<PDFDocumentProxy> {
  const bytes = data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(data)
  const task = pdfjsLib.getDocument({
    data: bytes,
    password,
    isEvalSupported: false,
    useSystemFonts: true,
    // 标准字体与中文 CMap 走本地静态资源，站点不请求任何第三方域名
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
    cMapUrl: CMAP_URL,
    cMapPacked: true,
  })
  return task.promise
}

/** 读取 PDF 基本信息（页数、每页尺寸、旋转） */
export async function readPdfInfo(data: ArrayBuffer | Uint8Array): Promise<PdfInfo> {
  const doc = await openPdfDocument(data)
  try {
    const pages: PdfPageInfo[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const viewport = page.getViewport({ scale: 1, rotation: 0 })
      pages.push({
        pageNumber: i,
        width: viewport.width,
        height: viewport.height,
        rotation: ((page.rotate % 360) + 360) % 360,
      })
    }
    const meta = await doc.getMetadata().catch(() => null)
    const info = meta?.info as Record<string, unknown> | undefined
    return {
      pageCount: doc.numPages,
      pages,
      title: typeof info?.Title === 'string' ? info.Title : undefined,
      author: typeof info?.Author === 'string' ? info.Author : undefined,
      encrypted: false,
    }
  } finally {
    await doc.destroy()
  }
}

export interface RenderOptions {
  /** 缩放系数，默认按 maxWidth 计算 */
  scale?: number
  /** 输出最大宽度（像素），与 scale 二选一 */
  maxWidth?: number
  /** 输出最大高度（像素） */
  maxHeight?: number
  /** 额外旋转角度（叠加页面自身旋转） */
  rotate?: number
  background?: string
}

export interface RenderedPage {
  canvas: HTMLCanvasElement
  width: number
  height: number
}

/** 把某一页渲染到 canvas */
export async function renderPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  options: RenderOptions = {},
): Promise<RenderedPage> {
  const page = await doc.getPage(pageNumber)
  const base = page.getViewport({ scale: 1, rotation: (options.rotate ?? 0) as number })

  let scale = options.scale ?? 1
  if (!options.scale) {
    if (options.maxWidth) scale = options.maxWidth / base.width
    if (options.maxHeight) scale = Math.min(scale, options.maxHeight / base.height)
    if (!options.maxWidth && !options.maxHeight) scale = 1
  }
  scale = Math.max(0.01, scale)

  const viewport = page.getViewport({ scale, rotation: (options.rotate ?? 0) as number })
  const canvas = createCanvas(viewport.width, viewport.height)
  const ctx = get2d(canvas, { alpha: true })

  const background = options.background
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  await page.render({ canvasContext: ctx, viewport, background }).promise

  // 渲染完成后释放页面资源，长文档批量渲染时能显著降低内存峰值
  page.cleanup()

  return { canvas, width: canvas.width, height: canvas.height }
}

/**
 * 批量渲染指定页为 canvas。
 * 串行执行 —— PDF 渲染本身就在 pdf.js 的 worker 里跑，外层再并发收益很小，
 * 反而容易把内存打满（每页都是一张全尺寸位图）。
 */
export async function renderPages(
  doc: PDFDocumentProxy,
  pageNumbers: number[],
  options: RenderOptions = {},
  onProgress?: ProgressFn,
): Promise<RenderedPage[]> {
  const results: RenderedPage[] = []
  for (let i = 0; i < pageNumbers.length; i++) {
    results.push(await renderPage(doc, pageNumbers[i], options))
    onProgress?.(Math.round(((i + 1) / pageNumbers.length) * 100), '正在渲染页面')
    // 让出主线程，避免大批量渲染时页面卡死
    await new Promise((r) => setTimeout(r, 0))
  }
  return results
}

/** 生成用于页码选择器的缩略图（带页码） */
export async function renderThumbnails(
  doc: PDFDocumentProxy,
  targetWidth = 132,
  onProgress?: ProgressFn,
): Promise<{ pageNumber: number; url: string; width: number; height: number }[]> {
  const thumbs: { pageNumber: number; url: string; width: number; height: number }[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const { canvas } = await renderPage(doc, i, { maxWidth: targetWidth, background: '#ffffff' })
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.7),
    )
    if (blob) {
      thumbs.push({
        pageNumber: i,
        url: URL.createObjectURL(blob),
        width: canvas.width,
        height: canvas.height,
      })
    }
    onProgress?.(Math.round((i / doc.numPages) * 100), '正在生成缩略图')
    await new Promise((r) => setTimeout(r, 0))
  }
  return thumbs
}
