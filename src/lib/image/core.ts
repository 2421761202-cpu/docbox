/**
 * 图片处理核心：加载、缩放、旋转、翻转、裁剪。
 *
 * 设计原则：
 *  - 全程使用 Canvas / ImageBitmap，浏览器本地完成，文件不离开用户设备。
 *  - 所有函数接收原始尺寸参数，避免依赖隐式状态，方便在 Web Worker 中复用。
 */

export type ProgressFn = (percent: number, message?: string) => void

/** 创建一个离屏 canvas（并保证拿到 2d 上下文） */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(width))
  c.height = Math.max(1, Math.round(height))
  return c
}

export function get2d(
  canvas: HTMLCanvasElement,
  opts?: { alpha?: boolean; willReadFrequently?: boolean },
): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', {
    alpha: opts?.alpha ?? true,
    willReadFrequently: opts?.willReadFrequently ?? false,
  })
  if (!ctx) throw new Error('当前浏览器不支持 Canvas 2D，无法处理图片')
  return ctx
}

/**
 * 把任意图像源画到 canvas，用于需要 getImageData / toBlob 的场景。
 * 本身就是 canvas 时直接返回，避免多余的拷贝。
 */
export function toCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
): HTMLCanvasElement {
  if (source instanceof HTMLCanvasElement) return source
  const canvas = createCanvas(width, height)
  const ctx = get2d(canvas)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** 让出主线程一帧，便于 UI 刷新进度 */
export function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

/* ------------------------------------------------------------------ */
/* 加载                                                                */
/* ------------------------------------------------------------------ */

export interface LoadedImage {
  /** 用于 drawImage 的源 */
  source: CanvasImageSource
  width: number
  height: number
  /** 释放底层资源 */
  dispose: () => void
}

export interface LoadImageOptions {
  /** 限制最大边长（超大图先降采样，避免爆内存） */
  maxDimension?: number
  signal?: AbortSignal
}

/**
 * 把 File / Blob 解码成可绘制的图像源。
 * 优先使用 createImageBitmap（支持 EXIF 方向 + 更快），失败则退回 <img>。
 */
export async function loadImageFile(
  file: Blob,
  options: LoadImageOptions = {},
): Promise<LoadedImage> {
  const { maxDimension, signal } = options

  let bitmap: ImageBitmap | null = null
  try {
    // imageOrientation: 'from-image' 让浏览器按 EXIF 自动旋转，避免手机照片躺倒
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
  } catch {
    bitmap = null
  }

  if (signal?.aborted) throw new DOMException('已取消', 'AbortError')

  if (!bitmap) {
    const url = URL.createObjectURL(file)
    try {
      const img = await loadHtmlImage(url)
      return {
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        dispose: () => URL.revokeObjectURL(url),
      }
    } catch (err) {
      URL.revokeObjectURL(url)
      throw new Error(`无法解码该文件，可能不是受支持的图片格式（${(err as Error).message}）`)
    }
  }

  const dispose = () => bitmap?.close()

  if (maxDimension && Math.max(bitmap.width, bitmap.height) > maxDimension) {
    const scale = maxDimension / Math.max(bitmap.width, bitmap.height)
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = resizeDraw(bitmap, bitmap.width, bitmap.height, w, h)
    bitmap.close()
    return { source: canvas, width: w, height: h, dispose: () => void 0 }
  }

  return { source: bitmap, width: bitmap.width, height: bitmap.height, dispose }
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.decoding = 'async'
    img.src = url
  })
}

/* ------------------------------------------------------------------ */
/* 缩放                                                                */
/* ------------------------------------------------------------------ */

/**
 * 高质量缩放。采用「逐级减半」策略：浏览器对大幅缩小使用简单的双线性采样，
 * 一次性缩到 1/10 会产生严重锯齿；先连续二分到 2 倍以内再落到目标尺寸，质量明显更好。
 */
export function resizeDraw(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  background?: string,
): HTMLCanvasElement {
  const tw = Math.max(1, Math.round(targetWidth))
  const th = Math.max(1, Math.round(targetHeight))

  let current: CanvasImageSource = source
  let cw = sourceWidth
  let ch = sourceHeight

  while (cw / 2 >= tw && ch / 2 >= th && cw > 2 && ch > 2) {
    const nw = Math.max(tw, Math.floor(cw / 2))
    const nh = Math.max(th, Math.floor(ch / 2))
    const step = createCanvas(nw, nh)
    const stepCtx = get2d(step)
    stepCtx.imageSmoothingEnabled = true
    stepCtx.imageSmoothingQuality = 'high'
    stepCtx.drawImage(current, 0, 0, cw, ch, 0, 0, nw, nh)
    current = step
    cw = nw
    ch = nh
  }

  const out = createCanvas(tw, th)
  const ctx = get2d(out)
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, tw, th)
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(current, 0, 0, cw, ch, 0, 0, tw, th)
  return out
}

/* ------------------------------------------------------------------ */
/* 旋转 / 翻转                                                         */
/* ------------------------------------------------------------------ */

export interface TransformOptions {
  /** 顺时针旋转角度，仅支持 0 / 90 / 180 / 270 */
  rotate?: 0 | 90 | 180 | 270 | number
  flipH?: boolean
  flipV?: boolean
  background?: string
}

/** 计算旋转后画布尺寸 */
export function rotatedSize(
  width: number,
  height: number,
  rotate: number,
): { width: number; height: number } {
  const deg = normalizeAngle(rotate)
  return deg === 90 || deg === 270 ? { width: height, height: width } : { width, height }
}

export function normalizeAngle(rotate: number): 0 | 90 | 180 | 270 {
  const n = ((Math.round(rotate / 90) * 90) % 360 + 360) % 360
  return n as 0 | 90 | 180 | 270
}

/** 任意角度旋转（会放大画布以容纳完整图像） */
export function rotateArbitrary(
  source: CanvasImageSource,
  width: number,
  height: number,
  angleDeg: number,
  background = '#ffffff',
): HTMLCanvasElement {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const outW = Math.ceil(width * cos + height * sin)
  const outH = Math.ceil(width * sin + height * cos)

  const canvas = createCanvas(outW, outH)
  const ctx = get2d(canvas)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, outW, outH)
  ctx.translate(outW / 2, outH / 2)
  ctx.rotate(rad)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, -width / 2, -height / 2, width, height)
  return canvas
}

/** 旋转 + 翻转（90 的倍数用精确像素操作，避免插值模糊） */
export function applyTransform(
  source: CanvasImageSource,
  width: number,
  height: number,
  options: TransformOptions,
): HTMLCanvasElement {
  const { rotate = 0, flipH = false, flipV = false, background } = options

  if (rotate % 90 !== 0) {
    let canvas = rotateArbitrary(source, width, height, rotate, background ?? '#ffffff')
    if (flipH || flipV) {
      canvas = flipCanvas(canvas, canvas.width, canvas.height, flipH, flipV)
    }
    return canvas
  }

  const deg = normalizeAngle(rotate)
  const { width: outW, height: outH } = rotatedSize(width, height, deg)
  const canvas = createCanvas(outW, outH)
  const ctx = get2d(canvas)
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, outW, outH)
  }
  ctx.translate(outW / 2, outH / 2)
  ctx.rotate((deg * Math.PI) / 180)
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, -width / 2, -height / 2, width, height)
  return canvas
}

export function flipCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  flipH: boolean,
  flipV = false,
): HTMLCanvasElement {
  const canvas = createCanvas(width, height)
  const ctx = get2d(canvas)
  ctx.translate(flipH ? width : 0, flipV ? height : 0)
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
  ctx.drawImage(source, 0, 0, width, height)
  return canvas
}

/* ------------------------------------------------------------------ */
/* 裁剪                                                                */
/* ------------------------------------------------------------------ */

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

/** 从源图裁剪一块矩形区域 */
export function cropImage(
  source: CanvasImageSource,
  rect: CropRect,
  background?: string,
): HTMLCanvasElement {
  const x = clamp(Math.round(rect.x), 0, Number.MAX_SAFE_INTEGER)
  const y = clamp(Math.round(rect.y), 0, Number.MAX_SAFE_INTEGER)
  const w = Math.max(1, Math.round(rect.width))
  const h = Math.max(1, Math.round(rect.height))

  const canvas = createCanvas(w, h)
  const ctx = get2d(canvas)
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, w, h)
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, x, y, w, h, 0, 0, w, h)
  return canvas
}

/** 把图像内接进指定画布（contain），可指定背景色 —— 用于改尺寸时的「补白边」模式 */
export function fitIntoCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number,
  background = '#ffffff',
): HTMLCanvasElement {
  const canvas = createCanvas(targetWidth, targetHeight)
  const ctx = get2d(canvas)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const scale = Math.min(targetWidth / width, targetHeight / height)
  const w = width * scale
  const h = height * scale
  const x = (targetWidth - w) / 2
  const y = (targetHeight - h) / 2
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, x, y, w, h)
  return canvas
}

/** 覆盖式填充（cover），多余部分裁掉 —— 用于改尺寸时的「裁切填充」模式 */
export function coverCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number,
  background = '#ffffff',
): HTMLCanvasElement {
  const canvas = createCanvas(targetWidth, targetHeight)
  const ctx = get2d(canvas)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const scale = Math.max(targetWidth / width, targetHeight / height)
  const w = width * scale
  const h = height * scale
  const x = (targetWidth - w) / 2
  const y = (targetHeight - h) / 2
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, x, y, w, h)
  return canvas
}

/* ------------------------------------------------------------------ */
/* 杂项                                                                */
/* ------------------------------------------------------------------ */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** 检查 canvas 是否全透明（用于判断导出 JPEG 时是否需要铺白底） */
export function hasTransparency(canvas: HTMLCanvasElement): boolean {
  try {
    const ctx = get2d(canvas, { willReadFrequently: true })
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    // 采样步进，避免大图全量扫描
    const step = Math.max(4, Math.floor(data.length / 4 / 20000)) * 4
    for (let i = 3; i < data.length; i += step) {
      if (data[i] < 250) return true
    }
    return false
  } catch {
    return true
  }
}
