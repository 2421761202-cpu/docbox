/**
 * 图片编码 / 压缩：Canvas → Blob，支持质量压缩与「压到指定大小」。
 */

import { createCanvas, get2d, hasTransparency } from './core'

export type ImageFormat = 'jpeg' | 'png' | 'webp'

export const FORMAT_MIME: Record<ImageFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export const FORMAT_EXT: Record<ImageFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
}

export const FORMAT_LABEL: Record<ImageFormat, string> = {
  jpeg: 'JPG',
  png: 'PNG',
  webp: 'WebP',
}

/** 浏览器可解码、但不是我们直接导出的格式 */
export const PASSTHROUGH_FORMATS = ['gif', 'bmp', 'avif', 'svg', 'ico', 'tiff'] as const

export function mimeToFormat(mime: string): ImageFormat | null {
  const m = mime.toLowerCase()
  if (m === 'image/jpeg' || m === 'image/jpg' || m === 'image/pjpeg') return 'jpeg'
  if (m === 'image/png') return 'png'
  if (m === 'image/webp') return 'webp'
  return null
}

export function extToFormat(fileName: string): ImageFormat | null {
  const ext = extOf(fileName)
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'jpe') return 'jpeg'
  if (ext === 'png') return 'png'
  if (ext === 'webp') return 'webp'
  return null
}

export function extOf(fileName: string): string {
  const i = fileName.lastIndexOf('.')
  return i === -1 ? '' : fileName.slice(i + 1).toLowerCase()
}

export function stripExt(fileName: string): string {
  const i = fileName.lastIndexOf('.')
  return i === -1 ? fileName : fileName.slice(0, i)
}

export function baseName(fileName: string): string {
  const noExt = stripExt(fileName)
  return noExt.split(/[\\/]/).pop() || 'image'
}

/** 根据文件推断原始格式（可能返回 gif / bmp 等需要转码的格式） */
export function detectFormat(file: File): string {
  const byMime = file.type ? file.type.replace('image/', '').toLowerCase() : ''
  if (byMime === 'jpeg' || byMime === 'jpg') return 'jpeg'
  if (['png', 'webp', 'gif', 'bmp', 'avif', 'svg+xml', 'tiff', 'x-icon'].includes(byMime)) {
    return byMime === 'svg+xml' ? 'svg' : byMime === 'x-icon' ? 'ico' : byMime
  }
  const ext = extOf(file.name)
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg'
  return ext || 'unknown'
}

export function isSupportedImage(file: File): boolean {
  const f = detectFormat(file)
  return ['jpeg', 'png', 'webp', 'gif', 'bmp', 'avif', 'tiff', 'svg', 'ico'].includes(f)
}

/** 各工具的输出格式选项：原样保留，或强制转成某一种可导出格式 */
export type FormatOption = 'original' | ImageFormat

/**
 * 把「原样」选项解析成真正要导出的格式。
 * GIF / BMP / AVIF / TIFF / SVG 这些无法直接用 canvas 再导出，统一落到 JPEG。
 */
export function resolveFormat(option: FormatOption, file: File): ImageFormat {
  if (option !== 'original') return option
  const detected = detectFormat(file)
  if (detected === 'jpeg' || detected === 'png' || detected === 'webp') return detected
  return 'jpeg'
}

/* ------------------------------------------------------------------ */
/* 编码                                                                */
/* ------------------------------------------------------------------ */

export interface EncodeOptions {
  format: ImageFormat
  /** 0~1，仅对 jpeg / webp 有效 */
  quality?: number
  /** JPEG 不支持透明，需要铺底色 */
  background?: string
}

/**
 * 把 canvas 编码成 Blob。
 * JPEG 遇到透明像素时先铺底色，否则透明区域会变成黑块。
 */
export function encodeCanvas(canvas: HTMLCanvasElement, options: EncodeOptions): Promise<Blob> {
  const { format, quality = 0.85, background = '#ffffff' } = options

  let target = canvas
  if (format === 'jpeg' && hasTransparency(canvas)) {
    target = createCanvas(canvas.width, canvas.height)
    const ctx = get2d(target)
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(canvas, 0, 0)
  }

  return new Promise((resolve, reject) => {
    target.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('图片编码失败，请重试或更换输出格式'))
      },
      FORMAT_MIME[format],
      format === 'png' ? undefined : clampQuality(quality),
    )
  })
}

function clampQuality(q: number): number {
  return Math.min(1, Math.max(0.01, q))
}

let webpSupport: boolean | null = null

/** 检测浏览器是否支持导出 WebP */
export function supportsWebp(): boolean {
  if (webpSupport !== null) return webpSupport
  try {
    const c = createCanvas(1, 1)
    webpSupport = c.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    webpSupport = false
  }
  return webpSupport
}

/* ------------------------------------------------------------------ */
/* 压缩到指定大小                                                       */
/* ------------------------------------------------------------------ */

export interface TargetSizeResult {
  blob: Blob
  /** 最终实际使用的画布（可能被降采样过） */
  canvas: HTMLCanvasElement
  quality: number
  width: number
  height: number
  /** 是否达成了目标大小 */
  reached: boolean
}

/**
 * 把图片压到不超过 targetBytes。
 *
 * 两步策略：
 *  1. 二分搜索质量系数（jpeg / webp 有效），找满足目标的最大质量，保证画质最优。
 *  2. 若纯靠质量仍达不到（PNG，或图片本身信息量太大），按比例逐级降采样尺寸再试。
 */
export async function encodeToTargetSize(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  targetBytes: number,
  options: { minQuality?: number; minDimension?: number; background?: string } = {},
): Promise<TargetSizeResult> {
  const { minQuality = 0.2, minDimension = 64, background = '#ffffff' } = options

  let currentCanvas = canvas
  let bestBlob = await encodeCanvas(currentCanvas, { format, quality: 1, background })
  let bestQuality = 1

  for (let round = 0; round < 8; round++) {
    if (bestBlob.size <= targetBytes) {
      return {
        blob: bestBlob,
        canvas: currentCanvas,
        quality: bestQuality,
        width: currentCanvas.width,
        height: currentCanvas.height,
        reached: true,
      }
    }

    // 第 1 步：二分搜索质量
    if (format !== 'png') {
      let low = minQuality
      let high = bestQuality
      let candidate: { blob: Blob; quality: number } | null = null

      for (let i = 0; i < 7; i++) {
        const mid = (low + high) / 2
        const blob = await encodeCanvas(currentCanvas, { format, quality: mid, background })
        if (blob.size <= targetBytes) {
          if (!candidate || blob.size > candidate.blob.size) candidate = { blob, quality: mid }
          low = mid
        } else {
          high = mid
        }
      }

      if (candidate) {
        return {
          blob: candidate.blob,
          canvas: currentCanvas,
          quality: candidate.quality,
          width: currentCanvas.width,
          height: currentCanvas.height,
          reached: true,
        }
      }

      // 质量已到下限仍超标 → 用最低质量继续，然后进入降采样
      bestQuality = minQuality
      bestBlob = await encodeCanvas(currentCanvas, { format, quality: minQuality, background })
      if (bestBlob.size <= targetBytes) {
        return {
          blob: bestBlob,
          canvas: currentCanvas,
          quality: bestQuality,
          width: currentCanvas.width,
          height: currentCanvas.height,
          reached: true,
        }
      }
    }

    // 第 2 步：降采样尺寸
    const nextW = Math.round(currentCanvas.width * 0.85)
    const nextH = Math.round(currentCanvas.height * 0.85)
    if (nextW < minDimension || nextH < minDimension) break

    const scaled = createCanvas(nextW, nextH)
    const ctx = get2d(scaled)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(currentCanvas, 0, 0, nextW, nextH)
    currentCanvas = scaled
    bestBlob = await encodeCanvas(currentCanvas, { format, quality: bestQuality, background })
  }

  // 尽力而为：返回当前最小的结果
  const fallback = await encodeCanvas(currentCanvas, { format, quality: bestQuality, background })
  return {
    blob: fallback.size < bestBlob.size ? fallback : bestBlob,
    canvas: currentCanvas,
    quality: bestQuality,
    width: currentCanvas.width,
    height: currentCanvas.height,
    reached: Math.min(fallback.size, bestBlob.size) <= targetBytes,
  }
}

/* ------------------------------------------------------------------ */
/* 输出命名                                                            */
/* ------------------------------------------------------------------ */

/** 生成输出文件名，自动处理重名 */
export function outputName(originalName: string, suffix: string, ext: string): string {
  const base = baseName(originalName)
  return suffix ? `${base}${suffix}.${ext}` : `${base}.${ext}`
}

/** 在一组已用名字中保证唯一 */
export function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name)
    return name
  }
  const dot = name.lastIndexOf('.')
  const base = dot === -1 ? name : name.slice(0, dot)
  const ext = dot === -1 ? '' : name.slice(dot)
  let i = 2
  let candidate = `${base}(${i})${ext}`
  while (used.has(candidate)) {
    i += 1
    candidate = `${base}(${i})${ext}`
  }
  used.add(candidate)
  return candidate
}
