/**
 * PDF 结构操作的端到端测试（真实调用 src/lib/pdf/edit.ts 与 pdf-lib）：
 *
 *   node --import ./scripts/register-ts.mjs scripts/smoke-pdf.mjs
 *
 * pdf-lib 是纯 JS，不依赖浏览器环境，所以这六个工具的核心逻辑
 * 可以在 Node 里真正跑一遍，而不只是做类型检查。
 *
 * 页面身份识别技巧：给第 id 页设置宽度 100+id，
 * 操作完成后读回宽度即可知道每一页原本是谁、顺序对不对。
 */

import { PDFDocument } from 'pdf-lib'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import {
  deletePages,
  extractPages,
  mergePdfs,
  optimizePdf,
  reorderPages,
  rotatePdf,
  splitPdf,
  stripMetadata,
} from '../src/lib/pdf/edit.ts'

const BASE = 100

let passed = 0
const failures = []

function check(label, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) passed++
  else failures.push(`${label}\n    期望: ${e}\n    实际: ${a}`)
}

async function expectThrow(label, fn, fragment) {
  try {
    await fn()
    failures.push(`${label}\n    期望抛出错误，但成功返回了`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (fragment && !msg.includes(fragment)) {
      failures.push(`${label}\n    错误信息期望包含: ${fragment}\n    实际: ${msg}`)
    } else {
      passed++
    }
  }
}

/** 用一组 id 造一个 PDF，第 id 页宽度 = BASE + id */
async function makePdf(ids) {
  const doc = await PDFDocument.create()
  for (const id of ids) {
    const page = doc.addPage([BASE + id, 200 + id])
    page.drawText(`marker-${id}`, { x: 8, y: 20, size: 10 })
  }
  return new Uint8Array(await doc.save())
}

/** 读回每页的 id（= 宽度 - BASE） */
async function idsOf(bytes) {
  const doc = await PDFDocument.load(bytes)
  return doc.getPages().map((page) => Math.round(page.getWidth()) - BASE)
}

async function anglesOf(bytes) {
  const doc = await PDFDocument.load(bytes)
  return doc.getPages().map((page) => page.getRotation().angle)
}

const IDS_123 = [1, 2, 3]
const pdf123 = await makePdf(IDS_123)

/* ------------------------------------------------------------------ */
/* 造数据本身就值得验证：宽度标记能正确读回                              */
/* ------------------------------------------------------------------ */
check('测试数据可读回', await idsOf(pdf123), IDS_123)

/* ------------------------------------------------------------------ */
/* 合并                                                                */
/* ------------------------------------------------------------------ */
const pdf12 = await makePdf([1, 2])
const pdf456 = await makePdf([4, 5, 6])

check(
  '合并两个文档',
  await idsOf(
    await mergePdfs([
      { bytes: pdf12, name: 'a.pdf' },
      { bytes: pdf456, name: 'b.pdf' },
    ]),
  ),
  [1, 2, 4, 5, 6],
)

check(
  '合并时可指定页面并保持给定顺序',
  await idsOf(
    await mergePdfs([{ bytes: pdf123, name: 'a.pdf', pages: [3, 1] }]),
  ),
  [3, 1],
)

check(
  '合并时 pages 为空数组表示全部页面',
  await idsOf(await mergePdfs([{ bytes: pdf123, name: 'a.pdf', pages: [] }])),
  IDS_123,
)

await expectThrow('合并空列表报错', () => mergePdfs([]), '请至少添加一个 PDF')

await expectThrow(
  '合并时页面全部越界报错',
  () => mergePdfs([{ bytes: pdf123, name: 'a.pdf', pages: [99] }]),
  '没有任何可合并的页面',
)

// 合并过程会汇报进度，且最终必须是 100
const mergeProgress = []
await mergePdfs(
  [
    { bytes: pdf12, name: 'a.pdf' },
    { bytes: pdf456, name: 'b.pdf' },
  ],
  (percent) => mergeProgress.push(percent),
)
check('合并进度以 100 收尾', mergeProgress.at(-1), 100)
check('合并进度单调不降', mergeProgress.every((p, i) => i === 0 || p >= mergeProgress[i - 1]), true)

/* ------------------------------------------------------------------ */
/* 拆分：四种模式                                                       */
/* ------------------------------------------------------------------ */
const each = await splitPdf(pdf123, { mode: 'each' }, 'doc')
check('每页一份的数量', each.length, 3)
check(
  '每页一份的内容',
  await Promise.all(each.map((r) => idsOf(r.bytes))),
  [[1], [2], [3]],
)
check('每页一份的 pages 元数据', each.map((r) => r.pages), [[1], [2], [3]])
check('每页一份文件名唯一', new Set(each.map((r) => r.name)).size, 3)
check('每页一份文件名带 .pdf', each.every((r) => r.name.endsWith('.pdf')), true)

const pdf5 = await makePdf([1, 2, 3, 4, 5])
const fixed = await splitPdf(pdf5, { mode: 'fixed', pagesPerFile: 2 }, 'doc')
check('按固定页数拆分的数量', fixed.length, 3)
check(
  '按固定页数拆分的内容（末份不足）',
  await Promise.all(fixed.map((r) => idsOf(r.bytes))),
  [[1, 2], [3, 4], [5]],
)

const pdf6 = await makePdf([1, 2, 3, 4, 5, 6])
const byCount = await splitPdf(pdf6, { mode: 'count', fileCount: 3 }, 'doc')
check('按份数拆分的数量', byCount.length, 3)
check(
  '按份数拆分的内容',
  await Promise.all(byCount.map((r) => idsOf(r.bytes))),
  [[1, 2], [3, 4], [5, 6]],
)

// 关键行为：ranges 模式下「每个逗号片段 = 一个文件」
// 想要把 1,3,5 合成一份，应该用「提取页面」，而不是拆分。
const byRanges = await splitPdf(pdf5, { mode: 'ranges', ranges: '1-3,5' }, 'doc')
check('按范围拆分：两个片段 = 两个文件', byRanges.length, 2)
check(
  '按范围拆分的内容',
  await Promise.all(byRanges.map((r) => idsOf(r.bytes))),
  [[1, 2, 3], [5]],
)

const anySegment = await splitPdf(pdf5, { mode: 'ranges', ranges: '1,3,5' }, 'doc')
check('逗号分隔的单页各成一份', anySegment.length, 3)
check(
  '逗号分隔的单页内容',
  await Promise.all(anySegment.map((r) => idsOf(r.bytes))),
  [[1], [3], [5]],
)

const reversed = await splitPdf(pdf5, { mode: 'ranges', ranges: '3-1' }, 'doc')
check('倒序范围会被纠正', await idsOf(reversed[0].bytes), [1, 2, 3])

const mixedSegments = await splitPdf(pdf5, { mode: 'ranges', ranges: '1-2, 4-5' }, 'doc')
check('带空格的范围同样生效', mixedSegments.length, 2)
check(
  '带空格范围的内容',
  await Promise.all(mixedSegments.map((r) => idsOf(r.bytes))),
  [[1, 2], [4, 5]],
)

await expectThrow(
  '范围匹配不到任何页时报错',
  () => splitPdf(pdf5, { mode: 'ranges', ranges: '90-99' }, 'doc'),
  '没有匹配到任何页面',
)

/* ------------------------------------------------------------------ */
/* 提取 / 删除                                                          */
/* ------------------------------------------------------------------ */
check('提取页面并保持给定顺序', await idsOf(await extractPages(pdf123, [3, 1])), [3, 1])
await expectThrow('提取空选择报错', () => extractPages(pdf123, []), '请至少选择一页')
await expectThrow('提取越界页码报错', () => extractPages(pdf123, [99]), '所选页码超出文档范围')

check('删除一页', await idsOf(await deletePages(pdf123, [2])), [1, 3])
check('删除多页', await idsOf(await deletePages(pdf5, [2, 4])), [1, 3, 5])
check('删除时重复页码只删一次', await idsOf(await deletePages(pdf123, [2, 2])), [1, 3])

await expectThrow('删除全部页面报错', () => deletePages(pdf123, [1, 2, 3]), '不能删除全部页面')
await expectThrow('删除越界页码报错', () => deletePages(pdf123, [99]), '请至少选择要删除的页面')

/* ------------------------------------------------------------------ */
/* 重排                                                                */
/* ------------------------------------------------------------------ */
check('整体倒序', await idsOf(await reorderPages(pdf123, [3, 2, 1])), [3, 2, 1])
check('任意重排', await idsOf(await reorderPages(pdf5, [5, 3, 1, 4, 2])), [5, 3, 1, 4, 2])

await expectThrow(
  '重排顺序不完整时报错',
  () => reorderPages(pdf123, [1, 2]),
  '页面顺序不完整',
)

/* ------------------------------------------------------------------ */
/* 旋转                                                                */
/* ------------------------------------------------------------------ */
check('整体旋转 90 度', await anglesOf(await rotatePdf(pdf123, { angle: 90 })), [90, 90, 90])
check('再次旋转 90 度会叠加为 180', await anglesOf(await rotatePdf(await rotatePdf(pdf123, { angle: 90 }), { angle: 90 })), [180, 180, 180])
check(
  '绝对角度会覆盖而非叠加',
  await anglesOf(
    await rotatePdf(await rotatePdf(pdf123, { angle: 180 }), { angle: 90, absolute: true }),
  ),
  [90, 90, 90],
)
check('只旋转指定页', await anglesOf(await rotatePdf(pdf123, { angle: 90, pages: [2] })), [0, 90, 0])
check('旋转 270 度', await anglesOf(await rotatePdf(pdf123, { angle: 270 })), [270, 270, 270])
check(
  '旋转四次 90 度回到 0',
  await anglesOf(
    await rotatePdf(
      await rotatePdf(await rotatePdf(await rotatePdf(pdf123, { angle: 90 }), { angle: 90 }), {
        angle: 90,
      }),
      { angle: 90 },
    ),
  ),
  [0, 0, 0],
)

/* ------------------------------------------------------------------ */
/* 清理 / 优化不应破坏页面                                              */
/* ------------------------------------------------------------------ */
check('去除元数据后页面不变', await idsOf(await stripMetadata(pdf123)), IDS_123)
check('优化后页面不变', await idsOf(await optimizePdf(pdf123)), IDS_123)

/* ------------------------------------------------------------------ */
/* 无损性：文字必须仍是「可提取的真实文本」，而不是被转成了图片          */
/*                                                                     */
/* pdf-lib 保存时会对内容流做 Flate 压缩，所以直接在字节里搜字符串是搜   */
/* 不到的。这里用 pdf.js 自己(真实渲染/文本层用的同一个库)把文字提取出   */
/* 来验证 —— 这也正是用户在阅读器里「能选中、能搜索」所依赖的能力。      */
/* ------------------------------------------------------------------ */
async function textOf(bytes) {
  // verbosity: 0 关掉 pdf.js 的告警 —— 提取文字不需要字体与 canvas，
  // 那些 "standardFontDataUrl / DOMMatrix" 提示在 Node 下属于噪音。
  const task = getDocument({ data: bytes, useSystemFonts: false, isEvalSupported: false, verbosity: 0 })
  const doc = await task.promise
  try {
    const parts = []
    for (let i = 1; i <= doc.numPages; i++) {
      const content = await (await doc.getPage(i)).getTextContent()
      parts.push(content.items.map((item) => item.str).join(''))
    }
    return parts
  } finally {
    await task.destroy()
  }
}

const mergedBytes = await mergePdfs([
  { bytes: pdf12, name: 'a.pdf' },
  { bytes: pdf456, name: 'b.pdf' },
])
const rotatedBytes = await rotatePdf(pdf123, { angle: 90 })

const mergedText = await textOf(mergedBytes)
check('合并后文字仍可被提取（顺序正确）', mergedText, ['marker-1', 'marker-2', 'marker-4', 'marker-5', 'marker-6'])
check('旋转后文字仍可被提取', await textOf(rotatedBytes), ['marker-1', 'marker-2', 'marker-3'])
check('删页后只剩目标页的文字', await textOf(await deletePages(pdf123, [2])), ['marker-1', 'marker-3'])
check('重排后文字顺序跟着变', await textOf(await reorderPages(pdf123, [3, 2, 1])), ['marker-3', 'marker-2', 'marker-1'])
check(
  '拆分后每份文字正确',
  await Promise.all((await splitPdf(pdf123, { mode: 'each' }, 'doc')).map((r) => textOf(r.bytes))),
  [['marker-1'], ['marker-2'], ['marker-3']],
)

/* ------------------------------------------------------------------ */
/* 结果                                                                */
/* ------------------------------------------------------------------ */
const total = passed + failures.length
if (failures.length === 0) {
  console.log(`\n全部通过：${passed}/${total}\n`)
} else {
  console.log(`\n通过 ${passed}/${total}，失败 ${failures.length} 项：\n`)
  for (const f of failures) console.log(`  ✗ ${f}`)
  console.log('')
  process.exitCode = 1
}
