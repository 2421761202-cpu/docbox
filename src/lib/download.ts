/**
 * 下载：单文件直下，多文件打包成 zip。
 * 打包用 JSZip，压缩级别设为 0（仅存储）—— 图片/PDF 已经是压缩格式，
 * 再走一遍 deflate 既费时间又几乎没有收益。
 */

import JSZip from 'jszip'
import type { OutputFile } from './types'
import type { ProgressFn } from './image/core'
import { stripExt } from './image/encode'

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 立刻 revoke 会让部分浏览器（Safari）下载失败，延迟回收
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function downloadMany(files: OutputFile[]): void {
  files.forEach((file, index) => {
    setTimeout(() => downloadBlob(file.blob, file.name), index * 350)
  })
}

export async function zipAndDownload(
  files: OutputFile[],
  zipName: string,
  onProgress?: ProgressFn,
): Promise<void> {
  const zip = new JSZip()
  const used = new Set<string>()

  files.forEach((file) => {
    let name = file.name
    if (used.has(name)) {
      const base = stripExt(name)
      const ext = name.slice(base.length)
      let i = 2
      while (used.has(`${base}(${i})${ext}`)) i += 1
      name = `${base}(${i})${ext}`
    }
    used.add(name)
    zip.file(name, file.blob)
  })

  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (meta) => {
    onProgress?.(Math.round(meta.percent), '正在打包 ZIP')
  })

  downloadBlob(blob, zipName)
}

/** 给出一个不会重名的 zip 名 */
export function suggestZipName(base: string): string {
  const stamp = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const time = `${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}_${pad(
    stamp.getHours(),
  )}${pad(stamp.getMinutes())}${pad(stamp.getSeconds())}`
  return `${base}_${time}.zip`
}

export function suggestFileName(base: string, ext: string): string {
  const stamp = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${base}_${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}.${ext}`
}
