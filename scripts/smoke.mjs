/**
 * 纯逻辑冒烟测试 —— 不需要浏览器、不需要打包，直接用 node 运行：
 *
 *   node scripts/smoke.mjs
 *
 * Node 22+ 可以直接执行 TypeScript（类型擦除），所以这些只依赖纯逻辑的模块
 * 可以在安装依赖之前就跑起来，用来验证解析/格式化的边界情况。
 */

import { parsePageRanges, formatPageRanges, splitRangeSegments } from '../src/lib/pdf/ranges.ts'
import {
  formatBytes,
  formatSavings,
  formatDelta,
  formatDimensions,
  parseSizeInput,
  truncateMiddle,
} from '../src/lib/format.ts'

let passed = 0
const failures = []

function check(label, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    passed++
  } else {
    failures.push(`${label}\n    期望: ${e}\n    实际: ${a}`)
  }
}

/* ---------------- 页码范围解析 ---------------- */

check('简单范围', parsePageRanges('1-3', 10).pages, [1, 2, 3])
check('混合范围与单页', parsePageRanges('1-3,5,8-10', 10).pages, [1, 2, 3, 5, 8, 9, 10])
check('中文逗号', parsePageRanges('1，3、5；7', 10).pages, [1, 3, 5, 7])
check('中文破折号', parsePageRanges('2—4', 10).pages, [2, 3, 4])
check('波浪号', parsePageRanges('2~4', 10).pages, [2, 3, 4])
check('带空格', parsePageRanges(' 1 - 3 , 5 ', 10).pages, [1, 2, 3, 5])
check('去重', parsePageRanges('1,1,1-2', 10).pages, [1, 2])
check('升序输出', parsePageRanges('9,2,5', 10).pages, [2, 5, 9])
check('倒序区间自动纠正', parsePageRanges('5-3', 10).pages, [3, 4, 5])
check('开到末尾 3-', parsePageRanges('3-', 6).pages, [3, 4, 5, 6])
check('超出总页数会被截断', parsePageRanges('8-20', 10).pages, [8, 9, 10])
check('完全越界的区间被忽略', parsePageRanges('20-30', 10).pages, [])
check('越界区间给出提示', parsePageRanges('20-30', 10).warnings.length, 1)
check('单页越界给出提示', parsePageRanges('99', 10).warnings.length, 1)
check('0 页被拒绝', parsePageRanges('0', 10).pages, [])
check('无法识别的片段', parsePageRanges('abc', 10).warnings.length, 1)
check('空输入', parsePageRanges('   ', 10).pages, [])
check('空输入无警告', parsePageRanges('   ', 10).warnings, [])
check('单个点号不会被当成页码', parsePageRanges('.', 10).pages, [])

/* ---------------- 范围格式化 ---------------- */

check('格式化连续范围', formatPageRanges([1, 2, 3, 5, 8, 9, 10]), '1-3,5,8-10')
check('格式化单页', formatPageRanges([4]), '4')
check('格式化空数组', formatPageRanges([]), '')
check('格式化会先排序去重', formatPageRanges([3, 1, 2, 2]), '1-3')

/* 解析与格式化互为逆运算 */
check('往返一致', formatPageRanges(parsePageRanges('1-3,5,8-10', 10).pages), '1-3,5,8-10')

/* ---------------- 分段规则 ---------------- */

check('按逗号分段', splitRangeSegments('1-3, 5 ,8-10'), ['1-3', '5', '8-10'])
check('中文标点分段', splitRangeSegments('1-3，5；7'), ['1-3', '5', '7'])
check('忽略空片段', splitRangeSegments('1-3,,5,'), ['1-3', '5'])

/* ---------------- 体积格式化 ---------------- */

check('字节', formatBytes(0), '0 B')
check('小字节不带小数', formatBytes(512), '512 B')
check('KB', formatBytes(2048), '2.0 KB')
check('MB', formatBytes(1024 * 1024 * 3.5), '3.5 MB')
check('无效输入', formatBytes(NaN), '-')
check('负数', formatBytes(-1), '-')

check('节省比例', formatSavings(1000, 300), '70%')
check('变化率', formatDelta(1000, 300), '-70%')
check('变化率变大为正', formatDelta(1000, 1200), '+20%')
check('变化率除零保护', formatDelta(0, 100), '-')
check('尺寸格式', formatDimensions(1920.4, 1080.6), '1920 × 1081')

/* ---------------- 目标体积解析 ---------------- */

check('默认按 KB', parseSizeInput('200'), 200 * 1024)
check('显式 KB', parseSizeInput('200KB'), 200 * 1024)
check('显式 MB', parseSizeInput('1.5MB'), Math.round(1.5 * 1024 * 1024))
check('小写单位', parseSizeInput('200kb'), 200 * 1024)
check('带空格', parseSizeInput('200 KB'), 200 * 1024)
check('显式字节', parseSizeInput('800B'), 800)
check('默认单位可切换为 MB', parseSizeInput('2', 'MB'), 2 * 1024 * 1024)
check('零被拒绝', parseSizeInput('0'), null)
check('负数被拒绝', parseSizeInput('-5'), null)
check('纯文字被拒绝', parseSizeInput('abc'), null)
check('只有单位被拒绝', parseSizeInput('KB'), null)
check('空字符串被拒绝', parseSizeInput(''), null)

/* ---------------- 文件名截断 ---------------- */

check('短名字不变', truncateMiddle('a.png', 42), 'a.png')
check('长名字被截断且保留扩展名', truncateMiddle('x'.repeat(60) + '.png', 42).endsWith('.png'), true)
check('截断后长度不超过上限', truncateMiddle('x'.repeat(60) + '.png', 42).length <= 42, true)

/* ---------------- 结果 ---------------- */

const total = passed + failures.length
if (failures.length === 0) {
  console.log(`\n全部通过：${passed}/${total}\n`)
} else {
  console.log(`\n通过 ${passed}/${total}，失败 ${failures.length} 项：\n`)
  for (const f of failures) console.log(`  ✗ ${f}`)
  console.log('')
  process.exitCode = 1
}
