/**
 * PDF 结构编辑（基于 pdf-lib）：合并、拆分、旋转、删页、重排、提取。
 *
 * 这些操作都是「无损」的 —— 只改动 PDF 的对象结构，不重新编码页面内容，
 * 因此文字依旧是文字、可以继续搜索和复制。
 */

import { PDFDocument, degrees } from 'pdf-lib'
import type { ProgressFn } from '../image/core'
import { parsePageRanges, splitRangeSegments } from './ranges'

export { formatPageRanges, parsePageRanges, splitRangeSegments } from './ranges'
export type { ParsedRanges } from './ranges'

export interface LoadOptions {
  ignoreEncryption?: boolean
  updateMetadata?: boolean
}

async function load(bytes: Uint8Array, options: LoadOptions = {}): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, {
      ignoreEncryption: options.ignoreEncryption ?? true,
      updateMetadata: options.updateMetadata ?? false,
    })
  } catch (err) {
    const message = (err as Error).message || ''
    if (/encrypt/i.test(message)) {
      throw new Error('该 PDF 已加密，请先解除密码保护后再处理')
    }
    throw new Error(`PDF 解析失败：${message || '文件可能已损坏'}`)
  }
}

async function save(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save({ useObjectStreams: true, addDefaultPage: false })
}

/* ------------------------------------------------------------------ */
/* 合并                                                                */
/* ------------------------------------------------------------------ */

export interface MergeSource {
  bytes: Uint8Array
  /** 只取这些页（1-based）；为空表示全部 */
  pages?: number[]
  name: string
}

/** 按给定顺序合并多个 PDF */
export async function mergePdfs(
  sources: MergeSource[],
  onProgress?: ProgressFn,
): Promise<Uint8Array> {
  if (sources.length === 0) throw new Error('请至少添加一个 PDF 文件')

  const out = await PDFDocument.create()
  const totalPages = sources.reduce((sum, s) => sum + (s.pages?.length ?? 0), 0)
  let imported = 0

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i]
    const doc = await load(src.bytes)
    const indices = src.pages?.length
      ? src.pages.map((p) => p - 1).filter((p) => p >= 0 && p < doc.getPageCount())
      : doc.getPageIndices()

    if (indices.length === 0) {
      throw new Error(`「${src.name}」中没有任何可合并的页面`)
    }

    const copied = await out.copyPages(doc, indices)
    copied.forEach((page) => out.addPage(page))
    imported += indices.length
    const progress = totalPages > 0 ? (imported / totalPages) * 100 : ((i + 1) / sources.length) * 100
    onProgress?.(Math.min(99, Math.round(progress)), `正在合并 ${src.name}`)
  }

  const bytes = await save(out)
  onProgress?.(100, '合并完成')
  return bytes
}

/* ------------------------------------------------------------------ */
/* 拆分                                                                */
/* ------------------------------------------------------------------ */

export type SplitMode = 'each' | 'fixed' | 'count' | 'ranges'

export interface SplitOptions {
  mode: SplitMode
  /** fixed 模式：每份包含几页 */
  pagesPerFile?: number
  /** count 模式：拆成几份 */
  fileCount?: number
  /** ranges 模式：如 "1-3,5,8-10"，每个逗号片段一份 */
  ranges?: string
}

export interface SplitResult {
  name: string
  bytes: Uint8Array
  /** 该文件包含的页码（1-based） */
  pages: number[]
}

/** 拆分 PDF，返回若干个子文档 */
export async function splitPdf(
  bytes: Uint8Array,
  options: SplitOptions,
  baseName: string,
  onProgress?: ProgressFn,
): Promise<SplitResult[]> {
  const source = await load(bytes)
  const total = source.getPageCount()
  if (total === 0) throw new Error('该 PDF 没有页面')

  const groups: number[][] = []

  if (options.mode === 'each') {
    for (let i = 1; i <= total; i++) groups.push([i])
  } else if (options.mode === 'fixed') {
    const size = Math.max(1, Math.round(options.pagesPerFile ?? 1))
    for (let start = 1; start <= total; start += size) {
      const end = Math.min(total, start + size - 1)
      const group: number[] = []
      for (let i = start; i <= end; i++) group.push(i)
      groups.push(group)
    }
  } else if (options.mode === 'count') {
    const count = Math.max(1, Math.min(Math.round(options.fileCount ?? 2), total))
    const size = Math.ceil(total / count)
    for (let start = 1; start <= total; start += size) {
      const end = Math.min(total, start + size - 1)
      const group: number[] = []
      for (let i = start; i <= end; i++) group.push(i)
      groups.push(group)
    }
  } else {
    const segments = splitRangeSegments(options.ranges ?? '')
    if (segments.length === 0) {
      throw new Error('请填写拆分范围，例如 1-3,4-6,7')
    }
    for (const segment of segments) {
      const parsed = parsePageRanges(segment, total)
      if (parsed.pages.length === 0) {
        throw new Error(`范围「${segment}」没有匹配到任何页面`)
      }
      groups.push(parsed.pages)
    }
  }

  const results: SplitResult[] = []
  for (let i = 0; i < groups.length; i++) {
    const pages = groups[i]
    const out = await PDFDocument.create()
    const copied = await out.copyPages(
      source,
      pages.map((p) => p - 1),
    )
    copied.forEach((page) => out.addPage(page))
    const outBytes = await save(out)

    const label =
      pages.length === 1 ? `${baseName}_第${pages[0]}页` : `${baseName}_${pages[0]}-${pages[pages.length - 1]}页`
    results.push({ name: `${label}.pdf`, bytes: outBytes, pages })
    onProgress?.(Math.round(((i + 1) / groups.length) * 100), '正在拆分')
  }

  return results
}

/* ------------------------------------------------------------------ */
/* 提取 / 删除 / 重排                                                   */
/* ------------------------------------------------------------------ */

async function createFromPages(
  source: PDFDocument,
  pages: number[],
): Promise<Uint8Array> {
  const out = await PDFDocument.create()
  const copied = await out.copyPages(
    source,
    pages.map((p) => p - 1),
  )
  copied.forEach((page) => out.addPage(page))
  return save(out)
}

/** 提取指定页组成新 PDF */
export async function extractPages(
  bytes: Uint8Array,
  pages: number[],
  onProgress?: ProgressFn,
): Promise<Uint8Array> {
  if (pages.length === 0) throw new Error('请至少选择一页')
  const source = await load(bytes)
  const total = source.getPageCount()
  const valid = pages.filter((p) => p >= 1 && p <= total)
  if (valid.length === 0) throw new Error('所选页码超出文档范围')
  onProgress?.(50, '正在提取页面')
  const result = await createFromPages(source, valid)
  onProgress?.(100, '提取完成')
  return result
}

/** 删除指定页 */
export async function deletePages(
  bytes: Uint8Array,
  pages: number[],
  onProgress?: ProgressFn,
): Promise<Uint8Array> {
  const doc = await load(bytes)
  const total = doc.getPageCount()
  const targets = [...new Set(pages)].filter((p) => p >= 1 && p <= total).sort((a, b) => b - a)
  if (targets.length === 0) throw new Error('请至少选择要删除的页面')
  if (targets.length >= total) throw new Error('不能删除全部页面，请至少保留一页')

  for (const page of targets) {
    doc.removePage(page - 1)
  }
  onProgress?.(70, '正在删除页面')
  const result = await save(doc)
  onProgress?.(100, '删除完成')
  return result
}

/** 按新顺序重排页面 */
export async function reorderPages(
  bytes: Uint8Array,
  order: number[],
  onProgress?: ProgressFn,
): Promise<Uint8Array> {
  const source = await load(bytes)
  const total = source.getPageCount()
  const valid = order.filter((p) => p >= 1 && p <= total)
  if (valid.length !== total) {
    throw new Error(`页面顺序不完整：需要 ${total} 页，实际 ${valid.length} 页`)
  }
  onProgress?.(40, '正在重排页面')
  const result = await createFromPages(source, valid)
  onProgress?.(100, '重排完成')
  return result
}

/* ------------------------------------------------------------------ */
/* 旋转                                                                */
/* ------------------------------------------------------------------ */

export interface RotateOptions {
  /** 顺时针旋转角度 */
  angle: 90 | 180 | 270
  /** 作用于哪些页（1-based）；为空表示全部 */
  pages?: number[]
  /** 是否使用绝对角度（覆盖原旋转值）而非叠加 */
  absolute?: boolean
}

export async function rotatePdf(
  bytes: Uint8Array,
  options: RotateOptions,
  onProgress?: ProgressFn,
): Promise<Uint8Array> {
  const doc = await load(bytes)
  const total = doc.getPageCount()
  const indices =
    options.pages && options.pages.length > 0
      ? options.pages.filter((p) => p >= 1 && p <= total).map((p) => p - 1)
      : doc.getPageIndices()

  if (indices.length === 0) throw new Error('请选择要旋转的页面')

  indices.forEach((index, i) => {
    const page = doc.getPage(index)
    const current = page.getRotation().angle
    const next = options.absolute
      ? options.angle
      : (((current + options.angle) % 360) + 360) % 360
    page.setRotation(degrees(next))
    if (i % 20 === 0) onProgress?.(Math.round(((i + 1) / indices.length) * 90), '正在旋转')
  })

  const result = await save(doc)
  onProgress?.(100, '旋转完成')
  return result
}

/* ------------------------------------------------------------------ */
/* 元数据                                                              */
/* ------------------------------------------------------------------ */

/** 清除文档元数据（标题/作者/创建工具等），保护隐私 */
export async function stripMetadata(
  bytes: Uint8Array,
  onProgress?: ProgressFn,
): Promise<Uint8Array> {
  const doc = await load(bytes)
  doc.setTitle('')
  doc.setAuthor('')
  doc.setSubject('')
  doc.setKeywords([])
  doc.setProducer('')
  doc.setCreator('')
  doc.setCreationDate(new Date(0))
  doc.setModificationDate(new Date(0))
  onProgress?.(80, '正在清理元数据')
  const result = await save(doc)
  onProgress?.(100, '完成')
  return result
}

/** 无损失的「另存为优化」：重建对象流、去掉未引用对象 */
export async function optimizePdf(
  bytes: Uint8Array,
  onProgress?: ProgressFn,
): Promise<Uint8Array> {
  const doc = await load(bytes)
  onProgress?.(60, '正在重建文档结构')
  const result = await doc.save({ useObjectStreams: true, addDefaultPage: false })
  onProgress?.(100, '完成')
  return result
}

export { load as loadPdfLib }
