import { useEffect, useState } from 'react'
import { ToolPage } from '../../components/ToolPage'
import { Notice, TextField } from '../../components/controls'
import { useToolJob, type ToolWorker } from '../../hooks/useToolJob'
import { mergePdfs } from '../../lib/pdf/edit'
import { readPageCounts, type FilePageCount } from '../../lib/pdf/meta'
import { makePdfThumbnail } from '../../lib/pdf/thumb'
import { formatBytes } from '../../lib/format'
import type { OutputFile } from '../../lib/types'

export default function PdfMerge() {
  const job = useToolJob()
  const [outputName, setOutputName] = useState('合并文档')
  const [counts, setCounts] = useState<FilePageCount[]>([])
  const [ranges, setRanges] = useState<Record<string, string>>({})

  // 读取每个 PDF 的页数，并显示在文件列表旁边
  useEffect(() => {
    if (job.files.length === 0) {
      setCounts([])
      return
    }
    let cancelled = false
    void (async () => {
      const result = await readPageCounts(job.files.map((f) => ({ id: f.id, file: f.file })))
      if (!cancelled) setCounts(result)
    })()
    return () => {
      cancelled = true
    }
  }, [job.files])

  const totalPages = counts.reduce((sum, c) => sum + (c.pageCount ?? 0), 0)

  const worker: ToolWorker = async (files, report, signal) => {
    const sources = []
    for (const file of files) {
      if (signal.aborted) throw new DOMException('已取消', 'AbortError')
      const bytes = new Uint8Array(await file.file.arrayBuffer())
      sources.push({
        bytes,
        name: file.file.name,
        pages: parseRangeInput(ranges[file.id]),
      })
    }

    const bytes = await mergePdfs(sources, (percent, message) => {
      if (!signal.aborted) report(percent, message)
    })

    if (signal.aborted) throw new DOMException('已取消', 'AbortError')

    report(96, '正在生成预览')
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
    const previewUrl = await makePdfThumbnail(bytes)

    return [
      {
        name: ensurePdfExt(outputName || '合并文档'),
        blob,
        size: blob.size,
        type: 'application/pdf',
        previewUrl,
        note: `${files.length} 个文件合并 · 共 ${totalPages || '?'} 页`,
      } satisfies OutputFile,
    ]
  }

  return (
    <ToolPage
      toolId="pdf-merge"
      job={job}
      onRun={() => job.run(worker)}
      actionLabel="合并 PDF"
      actionHint={
        counts.length > 0
          ? `${job.files.length} 个文件 · 共 ${totalPages} 页`
          : `${job.files.length} 个文件将按当前顺序合并`
      }
      fileVariant="list"
      optionsTitle="合并设置"
      zipBaseName="merged"
      options={
        <>
          <TextField
            label="输出文件名"
            value={outputName}
            onChange={setOutputName}
            placeholder="合并文档"
            hint="无需填写 .pdf 后缀"
          />

          {job.files.length > 1 && (
            <div className="field">
              <span className="field-label">页数一览</span>
              <div style={{ display: 'grid', gap: 8, width: '100%' }}>
                {job.files.map((file, index) => {
                  const info = counts.find((c) => c.id === file.id)
                  return (
                    <div key={file.id} style={{ fontSize: 12.5 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                          color: 'var(--color-ink-700)',
                        }}
                      >
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={file.file.name}
                        >
                          {index + 1}. {file.file.name}
                        </span>
                        <span className="mono-num" style={{ flex: '0 0 auto', color: 'var(--color-ink-500)' }}>
                          {info?.error ? '读取失败' : info?.pageCount != null ? `${info.pageCount} 页` : '…'}
                        </span>
                      </div>
                      <input
                        className="input"
                        style={{ marginTop: 4, fontSize: 12.5, height: 30 }}
                        placeholder="只取部分页，如 1-3,5（留空取全部）"
                        value={ranges[file.id] ?? ''}
                        onChange={(e) => setRanges((prev) => ({ ...prev, [file.id]: e.target.value }))}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <Notice kind="info">
            合并使用 pdf-lib 直接重组页面对象，属于无损操作：文字依旧可选中、可搜索，
            书签和链接也会尽量保留。文件顺序就是左侧列表的顺序，可拖动调整。
          </Notice>
        </>
      }
    />
  )
}

function parseRangeInput(input: string | undefined): number[] | undefined {
  if (!input || !input.trim()) return undefined
  const pages = new Set<number>()
  for (const part of input.replace(/[，、；;]/g, ',').split(',')) {
    const token = part.trim()
    if (!token) continue
    const match = token.match(/^(\d+)\s*[-–—~～]\s*(\d+)$/)
    if (match) {
      const start = Number(match[1])
      const end = Number(match[2])
      for (let i = Math.min(start, end); i <= Math.max(start, end); i++) pages.add(i)
    } else if (/^\d+$/.test(token)) {
      pages.add(Number(token))
    }
  }
  const list = [...pages].filter((n) => n > 0).sort((a, b) => a - b)
  return list.length > 0 ? list : undefined
}

function ensurePdfExt(name: string): string {
  return name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`
}

export { formatBytes }
