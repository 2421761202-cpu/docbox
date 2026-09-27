import { useEffect, useState } from 'react'
import { ToolPage } from '../../components/ToolPage'
import { Notice, Segmented } from '../../components/controls'
import { PdfPageSelector } from '../../components/PdfPageSelector'
import { useToolJob, type ToolWorker } from '../../hooks/useToolJob'
import { useFileBytes } from '../../hooks/useFileBytes'
import { usePdfPreview } from '../../hooks/usePdfPreview'
import { deletePages } from '../../lib/pdf/edit'
import { makePdfThumbnail } from '../../lib/pdf/thumb'
import type { OutputFile } from '../../lib/types'

export default function PdfDeletePages() {
  const job = useToolJob()
  const first = job.files[0]
  const { bytes } = useFileBytes(first?.file)
  const { info, thumbs, loading, progress, error } = usePdfPreview(bytes)

  const [selected, setSelected] = useState<number[]>([])
  const [mode, setMode] = useState<'delete' | 'keep'>('delete')

  useEffect(() => {
    setSelected([])
  }, [first?.id])

  const pageCount = info?.pageCount ?? thumbs.length

  // delete 模式：选中的被删掉；keep 模式：选中的被保留，其余删除
  const pagesToDelete = (() => {
    if (thumbs.length === 0) return []
    const all = thumbs.map((t) => t.pageNumber)
    if (mode === 'delete') return selected
    return all.filter((p) => !selected.includes(p))
  })()

  const remaining = pageCount - pagesToDelete.length
  const wouldDeleteAll = thumbs.length > 0 && remaining <= 0

  const worker: ToolWorker = async (files, report, signal) => {
    if (files.length > 1) throw new Error('删页面一次只处理一个 PDF 文件')
    if (!bytes) throw new Error('文件还在读取中，请稍候再试')
    if (pagesToDelete.length === 0) throw new Error('没有需要删除的页面')

    const source = new Uint8Array(await files[0].file.arrayBuffer())

    const out = await deletePages(source, pagesToDelete, (percent, message) => {
      if (!signal.aborted) report(percent, message)
    })

    if (signal.aborted) throw new DOMException('已取消', 'AbortError')

    report(96, '正在生成预览')
    const blob = new Blob([out as unknown as BlobPart], { type: 'application/pdf' })
    const previewUrl = await makePdfThumbnail(out)

    return [
      {
        name: files[0].file.name.replace(/\.pdf$/i, '') + '_已删页.pdf',
        blob,
        size: blob.size,
        type: 'application/pdf',
        originSize: files[0].file.size,
        previewUrl,
        note: `删掉 ${pagesToDelete.length} 页，保留 ${remaining} 页`,
      } satisfies OutputFile,
    ]
  }

  const workspace =
    job.files.length > 0 ? (
      <div className="panel">
        <div className="panel-title">
          页面列表
          <span className="field-hint" style={{ fontWeight: 400 }}>
            {mode === 'delete' ? '点击选择要删除的页面' : '点击选择要保留的页面'}
          </span>
        </div>
        <PdfPageSelector
          thumbs={thumbs}
          selected={selected}
          onSelectedChange={setSelected}
          loading={loading}
          progress={progress}
          error={error}
          allowEmpty
          hint={
            mode === 'delete'
              ? '选中的页面将从文档中移除，其余页面保持原顺序'
              : '只有选中的页面会被保留，其余全部删除'
          }
        />
      </div>
    ) : null

  return (
    <ToolPage
      toolId="pdf-delete-pages"
      job={job}
      onRun={() => job.run(worker)}
      actionLabel={mode === 'delete' ? '删除选中页面' : '保留选中页面'}
      actionHint={
        remaining > 0
          ? `将删除 ${pagesToDelete.length} 页，保留 ${remaining} 页`
          : undefined
      }
      maxFiles={1}
      fileVariant="list"
      workspace={workspace}
      optionsTitle="删除方式"
      zipBaseName="deleted_pdf"
      validate={(files) => {
        if (files.length > 1) return '删页面一次只处理一个文件'
        if (wouldDeleteAll) return '不能删除全部页面，至少要保留 1 页'
        if (pagesToDelete.length === 0)
          return mode === 'delete' ? '请先在页面列表中选择要删除的页面' : '请先在页面列表中选择要保留的页面'
        return null
      }}
      options={
        <>
          <div className="field" style={{ alignItems: 'flex-start' }}>
            <span className="field-label" style={{ paddingTop: 6 }}>
              选择语义
            </span>
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'delete' as const, label: '删除选中页' },
                { value: 'keep' as const, label: '保留选中页' },
              ]}
            />
          </div>

          {pageCount > 0 && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--color-ink-700)',
                padding: '9px 12px',
                background: 'var(--color-brand-50)',
                borderRadius: 8,
              }}
            >
              原文档 <strong className="mono-num">{pageCount}</strong> 页 → 处理后{' '}
              <strong className="mono-num">{Math.max(0, remaining)}</strong> 页
            </div>
          )}

          {wouldDeleteAll && <Notice kind="error">当前选择会导致所有页面被删除，请至少保留一页。</Notice>}

          <Notice kind="info">
            删除页面同样是无损操作：未被删除的页面内容原样保留，文字依旧可搜索。
            如果想按范围抽取页面生成新文件，用「PDF 提取页面」更直接。
          </Notice>
        </>
      }
    />
  )
}
