/**
 * 批量处理辅助：串行遍历文件、汇报进度、响应取消。
 *
 * 串行而非并发 —— 图片解码/编码本身就是内存大户，
 * 十几个大图同时处理很容易触发浏览器 OOM，反而更慢。
 *
 * 这里刻意不收集返回值：各工具通常把结果累加到自己的数组里，
 * 需要"边遍历边收集"的场景请用 ops.ts 里的 forEachWithProgress。
 */

import type { SourceFile } from '../types'
import type { ProgressFn } from './core'

export interface BatchContext {
  file: SourceFile
  index: number
  total: number
  /** 整体进度基准（0~100） */
  report: ProgressFn
  signal: AbortSignal
}

export async function processFileList(
  files: SourceFile[],
  report: ProgressFn,
  signal: AbortSignal,
  handler: (ctx: BatchContext) => Promise<void> | void,
  message?: string,
): Promise<void> {
  const total = files.length

  for (let index = 0; index < total; index++) {
    if (signal.aborted) throw new DOMException('已取消', 'AbortError')

    const file = files[index]
    const base = (index / total) * 100
    const span = 100 / total

    const scopedReport: ProgressFn = (percent, msg) => {
      report(Math.round(base + (Math.min(100, Math.max(0, percent)) / 100) * span), msg)
    }

    report(Math.round(base), message ?? `正在处理第 ${index + 1}/${total} 个文件`)

    await handler({ file, index, total, report: scopedReport, signal })

    // 让出主线程，让进度条能真正刷新出来
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  report(100, '处理完成')
}
