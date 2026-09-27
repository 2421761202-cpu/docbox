/**
 * 页码范围解析 —— 纯字符串/数字逻辑，不依赖 pdf-lib。
 *
 * 单独拆出来有两个好处：一是可以被前端即时校验复用（不需要加载 PDF 引擎），
 * 二是这段解析有大量边界情况（中文标点、倒序区间、越界、重复），可以独立测试。
 */

export interface ParsedRanges {
  /** 1-based，升序去重 */
  pages: number[]
  /** 无效片段的提示 */
  warnings: string[]
}

/**
 * 解析 "1-3, 5, 8-10" 这类页码表达式。
 * 支持中英文逗号、中文破折号，以及 "3-" 这种表示「到最后一页」的写法。
 */
export function parsePageRanges(input: string, maxPage: number): ParsedRanges {
  const warnings: string[] = []
  const pages = new Set<number>()

  const normalized = input
    .replace(/[，、；;]/g, ',')
    .replace(/[—–~～]/g, '-')
    .replace(/\s+/g, '')
    .trim()

  if (!normalized) return { pages: [], warnings }

  for (const token of normalized.split(',').filter(Boolean)) {
    const rangeMatch = token.match(/^(\d+)-(\d*)$/)
    if (rangeMatch) {
      const start = Number(rangeMatch[1])
      const end = rangeMatch[2] ? Number(rangeMatch[2]) : maxPage
      if (start < 1 || end < 1) {
        warnings.push(`「${token}」页码必须从 1 开始`)
        continue
      }
      const from = Math.min(start, end)
      const to = Math.max(start, end)
      if (from > maxPage) {
        warnings.push(`「${token}」超出总页数 ${maxPage}`)
        continue
      }
      for (let i = from; i <= Math.min(to, maxPage); i++) pages.add(i)
      continue
    }

    const single = token.match(/^(\d+)$/)
    if (single) {
      const value = Number(single[1])
      if (value < 1 || value > maxPage) {
        warnings.push(`「${token}」超出范围 1-${maxPage}`)
        continue
      }
      pages.add(value)
      continue
    }

    warnings.push(`无法识别「${token}」`)
  }

  return { pages: [...pages].sort((a, b) => a - b), warnings }
}

/** 把页码列表压缩成 "1-3,5,8-10" 这样的表达式 */
export function formatPageRanges(pages: number[]): string {
  if (pages.length === 0) return ''
  const sorted = [...new Set(pages)].sort((a, b) => a - b)
  const parts: string[] = []
  let start = sorted[0]
  let prev = sorted[0]
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i]
    if (cur === prev + 1) {
      prev = cur
      continue
    }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`)
    start = cur
    prev = cur
  }
  return parts.join(',')
}

/** 拆成一个个逗号片段 —— 每个片段在「自定义范围拆分」里会生成一个文件 */
export function splitRangeSegments(input: string): string[] {
  return input
    .replace(/[，、；;]/g, ',')
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
}
