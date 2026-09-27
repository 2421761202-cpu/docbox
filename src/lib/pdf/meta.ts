/** 读取 PDF 页数等轻量元信息（用 pdf-lib，不启动 pdf.js，速度快得多） */

import { loadPdfLib } from './edit'

export async function readPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await loadPdfLib(bytes)
  return doc.getPageCount()
}

export interface FilePageCount {
  id: string
  name: string
  pageCount: number | null
  error?: string
}

export async function readPageCounts(
  files: { id: string; file: File }[],
): Promise<FilePageCount[]> {
  const results: FilePageCount[] = []
  for (const item of files) {
    try {
      const bytes = new Uint8Array(await item.file.arrayBuffer())
      results.push({
        id: item.id,
        name: item.file.name,
        pageCount: await readPageCount(bytes),
      })
    } catch (err) {
      results.push({
        id: item.id,
        name: item.file.name,
        pageCount: null,
        error: (err as Error).message || '无法读取',
      })
    }
  }
  return results
}
