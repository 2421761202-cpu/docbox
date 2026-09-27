/**
 * 为生成的 PDF 生成首页缩略图。
 *
 * 用途有两个：结果列表里给用户一眼可见的预览，
 * 同时也是对输出文件的一次真实校验 —— 能被 pdf.js 正常打开渲染，说明文件结构没问题。
 */

import { openPdfDocument, renderPage } from './pdfjs'

export async function makePdfThumbnail(
  bytes: Uint8Array,
  maxWidth = 220,
  quality = 0.72,
): Promise<string | undefined> {
  try {
    // openPdfDocument 内部会复制数据，不会破坏调用方的 buffer
    const doc = await openPdfDocument(bytes)
    try {
      const { canvas } = await renderPage(doc, 1, { maxWidth, background: '#ffffff' })
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality),
      )
      if (!blob) return undefined
      return URL.createObjectURL(blob)
    } finally {
      await doc.destroy()
    }
  } catch {
    // 缩略图只是锦上添花，失败不影响结果可用性
    return undefined
  }
}

/** 批量生成缩略图（串行，避免同时打开多个 pdf.js 文档） */
export async function makePdfThumbnails(
  entries: { bytes: Uint8Array; name: string }[],
  maxWidth = 220,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  for (const entry of entries) {
    const url = await makePdfThumbnail(entry.bytes, maxWidth)
    if (url) map.set(entry.name, url)
  }
  return map
}
