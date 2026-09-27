/**
 * 把 pdf.js 运行时需要的两个资源目录复制到 public/pdfjs/。
 *
 * 为什么需要：
 *   - standard_fonts —— PDF 里若使用 14 种标准字体（Helvetica/Times/Courier…）
 *     且没有内嵌字体，pdf.js 必须去加载 Foxit 的替代字体，否则这些文字渲染不出来。
 *   - cmaps —— 中日韩 PDF 常用预定义 CMap（如 UniGB-UCS2-H）而不内嵌字体，
 *     没有这些表，中文内容会整段消失。
 *
 * 这两个目录只在真正需要时才被浏览器按需请求，不会进入 JS bundle。
 * 由 package.json 的 predev / prebuild 自动执行。
 */

import { cp, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'node_modules', 'pdfjs-dist')
const target = join(root, 'public', 'pdfjs')

const DIRS = ['standard_fonts', 'cmaps']

if (!existsSync(source)) {
  console.warn('[pdfjs-assets] 未找到 pdfjs-dist，跳过（请先 npm install）')
  process.exit(0)
}

await mkdir(target, { recursive: true })

for (const name of DIRS) {
  const from = join(source, name)
  const to = join(target, name)

  if (!existsSync(from)) {
    console.warn(`[pdfjs-assets] 警告：pdfjs-dist 里没有 ${name}，跳过`)
    continue
  }

  // 每次都复制：保证资源与当前安装的 pdfjs-dist 版本严格一致
  await cp(from, to, { recursive: true })
  console.log(`[pdfjs-assets] 已复制 ${name}`)
}

console.log(`[pdfjs-assets] 完成 → public/pdfjs/`)
