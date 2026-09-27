/**
 * 图片批量操作：分割（切图）与拼接（长图 / 宫格）。
 */

import { createCanvas, get2d, resizeDraw, type ProgressFn } from './core'

/* ------------------------------------------------------------------ */
/* 分割                                                                */
/* ------------------------------------------------------------------ */

export interface SplitOptions {
  /** 按几行几列切 */
  rows: number
  cols: number
  /** 切块之间的间隔（像素），0 表示紧密相连 */
  gap?: number
  /** 相邻切块的重叠像素，用于拼接场景避免内容被切断 */
  overlap?: number
}

export interface SplitTile {
  canvas: HTMLCanvasElement
  row: number
  col: number
  width: number
  height: number
}

/** 把一张图切成 rows × cols 块 */
export function splitByGrid(
  source: CanvasImageSource,
  width: number,
  height: number,
  options: SplitOptions,
): SplitTile[] {
  const rows = Math.max(1, Math.round(options.rows))
  const cols = Math.max(1, Math.round(options.cols))
  const gap = Math.max(0, options.gap ?? 0)
  const overlap = Math.max(0, options.overlap ?? 0)

  const baseW = Math.floor((width - gap * (cols - 1)) / cols)
  const baseH = Math.floor((height - gap * (rows - 1)) / rows)
  if (baseW < 1 || baseH < 1) {
    throw new Error('分割数量太多，切块尺寸小于 1 像素，请减少行数或列数')
  }

  const tiles: SplitTile[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = Math.max(0, c * (baseW + gap) - (c > 0 ? overlap : 0))
      const sy = Math.max(0, r * (baseH + gap) - (r > 0 ? overlap : 0))
      const ex = Math.min(width, c * (baseW + gap) + baseW + (c < cols - 1 ? overlap : 0))
      const ey = Math.min(height, r * (baseH + gap) + baseH + (r < rows - 1 ? overlap : 0))
      const w = Math.max(1, ex - sx)
      const h = Math.max(1, ey - sy)

      const canvas = createCanvas(w, h)
      const ctx = get2d(canvas)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(source, sx, sy, w, h, 0, 0, w, h)
      tiles.push({ canvas, row: r, col: c, width: w, height: h })
    }
  }
  return tiles
}

export interface FixedSplitOptions {
  /** 每块目标宽度（像素） */
  tileWidth: number
  /** 每块目标高度（像素） */
  tileHeight: number
  overlap?: number
}

/** 按固定尺寸切图（类似「九宫格切图」用于社交平台发布） */
export function splitByFixedSize(
  source: CanvasImageSource,
  width: number,
  height: number,
  options: FixedSplitOptions,
): SplitTile[] {
  const tileW = Math.max(1, Math.round(options.tileWidth))
  const tileH = Math.max(1, Math.round(options.tileHeight))
  const overlap = Math.max(0, options.overlap ?? 0)
  const cols = Math.ceil(width / tileW)
  const rows = Math.ceil(height / tileH)

  if (cols * rows > 400) {
    throw new Error('切块数量超过 400 个，请增大每块尺寸')
  }

  const tiles: SplitTile[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = Math.max(0, c * tileW - (c > 0 ? overlap : 0))
      const sy = Math.max(0, r * tileH - (r > 0 ? overlap : 0))
      const ex = Math.min(width, c * tileW + tileW + (c < cols - 1 ? overlap : 0))
      const ey = Math.min(height, r * tileH + tileH + (r < rows - 1 ? overlap : 0))
      const w = Math.max(1, ex - sx)
      const h = Math.max(1, ey - sy)

      const canvas = createCanvas(w, h)
      const ctx = get2d(canvas)
      ctx.drawImage(source, sx, sy, w, h, 0, 0, w, h)
      tiles.push({ canvas, row: r, col: c, width: w, height: h })
    }
  }
  return tiles
}

/* ------------------------------------------------------------------ */
/* 拼接                                                                */
/* ------------------------------------------------------------------ */

export type ConcatDirection = 'vertical' | 'horizontal' | 'grid'

export interface ConcatItem {
  source: CanvasImageSource
  width: number
  height: number
  /** 文件名，用于命名输出 */
  name: string
}

export interface ConcatOptions {
  direction: ConcatDirection
  /** 间距（像素） */
  gap?: number
  /** 外边距（像素） */
  padding?: number
  background?: string
  /** 对齐方式（非主轴方向） */
  align?: 'start' | 'center' | 'end'
  /** 尺寸策略：按最小宽度统一、按最大宽度统一、或保持原始尺寸 */
  sizing?: 'uniform' | 'original'
  /** 统一尺寸时的目标宽度（仅纵向拼接有意义） */
  targetWidth?: number
  /** grid 模式的列数 */
  columns?: number
  /** 圆角（像素） */
  radius?: number
}

export interface ConcatResult {
  canvas: HTMLCanvasElement
  width: number
  height: number
}

/** 把多张图拼成一张 */
export function concatImages(items: ConcatItem[], options: ConcatOptions): ConcatResult {
  if (items.length === 0) throw new Error('没有可拼接的图片')

  const {
    direction,
    gap = 0,
    padding = 0,
    background = '#ffffff',
    align = 'center',
    sizing = 'uniform',
    columns = Math.ceil(Math.sqrt(items.length)),
    radius = 0,
  } = options

  const prepared = prepareItems(items, direction, sizing, options.targetWidth)

  let width = 0
  let height = 0
  let placements: { item: PreparedItem; x: number; y: number }[] = []

  if (direction === 'vertical') {
    width = Math.max(...prepared.map((p) => p.width))
    height = prepared.reduce((sum, p) => sum + p.height, 0) + gap * (prepared.length - 1)
    let y = 0
    for (const item of prepared) {
      placements.push({ item, x: alignOffset(width, item.width, align), y })
      y += item.height + gap
    }
  } else if (direction === 'horizontal') {
    height = Math.max(...prepared.map((p) => p.height))
    width = prepared.reduce((sum, p) => sum + p.width, 0) + gap * (prepared.length - 1)
    let x = 0
    for (const item of prepared) {
      placements.push({ item, x, y: alignOffset(height, item.height, align) })
      x += item.width + gap
    }
  } else {
    const cols = Math.max(1, Math.min(columns, prepared.length))
    const rows = Math.ceil(prepared.length / cols)
    // 每列宽度取该列最宽者，形成整齐的宫格
    const colWidths: number[] = new Array(cols).fill(0)
    const rowHeights: number[] = new Array(rows).fill(0)
    prepared.forEach((item, i) => {
      const c = i % cols
      const r = Math.floor(i / cols)
      colWidths[c] = Math.max(colWidths[c], item.width)
      rowHeights[r] = Math.max(rowHeights[r], item.height)
    })
    width = colWidths.reduce((a, b) => a + b, 0) + gap * (cols - 1)
    height = rowHeights.reduce((a, b) => a + b, 0) + gap * (rows - 1)

    const colX: number[] = []
    let acc = 0
    for (const w of colWidths) {
      colX.push(acc)
      acc += w + gap
    }
    const rowY: number[] = []
    acc = 0
    for (const h of rowHeights) {
      rowY.push(acc)
      acc += h + gap
    }

    placements = prepared.map((item, i) => {
      const c = i % cols
      const r = Math.floor(i / cols)
      const cellW = colWidths[c]
      const cellH = rowHeights[r]
      return {
        item,
        x: colX[c] + alignOffset(cellW, item.width, align),
        y: rowY[r] + alignOffset(cellH, item.height, align),
      }
    })
  }

  const totalW = width + padding * 2
  const totalH = height + padding * 2
  const canvas = createCanvas(totalW, totalH)
  const ctx = get2d(canvas)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, totalW, totalH)

  for (const { item, x, y } of placements) {
    ctx.save()
    ctx.translate(x + padding, y + padding)
    if (radius > 0) {
      roundedRectPath(ctx, 0, 0, item.width, item.height, radius)
      ctx.clip()
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(item.source, 0, 0, item.width, item.height)
    ctx.restore()
  }

  return { canvas, width: totalW, height: totalH }
}

interface PreparedItem {
  source: CanvasImageSource
  width: number
  height: number
  name: string
}

function prepareItems(
  items: ConcatItem[],
  direction: ConcatDirection,
  sizing: 'uniform' | 'original',
  targetWidth?: number,
): PreparedItem[] {
  if (sizing === 'original') {
    return items.map((i) => ({ source: i.source, width: i.width, height: i.height, name: i.name }))
  }

  // 统一尺寸：纵向 / 宫格以宽度为准，横向以高度为准，保证不变形
  if (direction === 'horizontal') {
    const targetHeight = Math.max(...items.map((i) => i.height))
    return items.map((i) => {
      if (i.height === targetHeight) return { ...i }
      const w = Math.max(1, Math.round((i.width / i.height) * targetHeight))
      return {
        source: resizeDraw(i.source, i.width, i.height, w, targetHeight),
        width: w,
        height: targetHeight,
        name: i.name,
      }
    })
  }

  const width = targetWidth ?? Math.max(...items.map((i) => i.width))
  return items.map((i) => {
    if (i.width === width) return { ...i }
    const h = Math.max(1, Math.round((i.height / i.width) * width))
    return {
      source: resizeDraw(i.source, i.width, i.height, width, h),
      width,
      height: h,
      name: i.name,
    }
  })
}

function alignOffset(container: number, size: number, align: 'start' | 'center' | 'end'): number {
  if (align === 'start') return 0
  if (align === 'end') return Math.max(0, container - size)
  return Math.max(0, Math.round((container - size) / 2))
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/** 带进度的批量处理辅助：逐项执行并回报进度 */
export async function forEachWithProgress<T>(
  items: T[],
  onProgress: ProgressFn | undefined,
  handler: (item: T, index: number) => Promise<void> | void,
  message?: string,
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    await handler(items[i], i)
    onProgress?.(Math.round(((i + 1) / items.length) * 100), message)
  }
}
