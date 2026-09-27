import { useEffect, useMemo, useState } from 'react'
import { ToolPage } from '../../components/ToolPage'
import { Notice } from '../../components/controls'
import { PdfPageSelector } from '../../components/PdfPageSelector'
import { useToolJob, type ToolWorker } from '../../hooks/useToolJob'
import { useFileBytes } from '../../hooks/useFileBytes'
import { usePdfPreview } from '../../hooks/usePdfPreview'
import { formatPageRanges, parsePageRanges, reorderPages } from '../../lib/pdf/edit'
import { makePdfThumbnail } from '../../lib/pdf/thumb'
import type { OutputFile } from '../../lib/types'

export default function PdfReorder() {
  const job = useToolJob()
  const first = job.files[0]
  const { bytes } = useFileBytes(first?.file)
  const { info, thumbs, loading, progress, error } = usePdfPreview(bytes)

  /** 用户点击建立的顺序；未出现在这里面的页面按原顺序补在后面 */
  const [order, setOrder] = useState<number[]>([])
  const [manual, setManual] = useState('')

  useEffect(() => {
    setOrder([])
    setManual('')
  }, [first?.id])

  const pageCount = info?.pageCount ?? thumbs.length

  /** 补齐缺失页后的完整顺序 */
  const effectiveOrder = useMemo(() => {
    if (pageCount === 0) return []
    const all = Array.from({ length: pageCount }, (_, i) => i + 1)
    const picked = order.filter((p) => p >= 1 && p <= pageCount)
    const missing = all.filter((p) => !picked.includes(p))
    return [...picked, ...missing]
  }, [order, pageCount])

  const changed = effectiveOrder.some((page, index) => page !== index + 1)

  // 手动输入的页码串会直接覆盖顺序
  useEffect(() => {
    if (!manual.trim() || pageCount === 0) return
    const parsed = parsePageRanges(manual, pageCount)
    if (parsed.pages.length > 0) {
      setOrder(parsed.pages)
    }
  }, [manual, pageCount])

  const toggle = (pageNumber: number) => {
    setManual('')
    setOrder((prev) => {
      if (prev.includes(pageNumber)) return prev.filter((p) => p !== pageNumber)
      return [...prev, pageNumber]
    })
  }

  const worker: ToolWorker = async (files, report, signal) => {
    if (files.length > 1) throw new Error('调整顺序一次只处理一个 PDF 文件')
    if (!bytes) throw new Error('文件还在读取中，请稍候再试')
    if (!changed) throw new Error('页面顺序没有变化，请先调整顺序')

    const source = new Uint8Array(await files[0].file.arrayBuffer())

    const out = await reorderPages(source, effectiveOrder, (percent, message) => {
      if (!signal.aborted) report(percent, message)
    })

    if (signal.aborted) throw new DOMException('已取消', 'AbortError')

    report(96, '正在生成预览')
    const blob = new Blob([out as unknown as BlobPart], { type: 'application/pdf' })
    const previewUrl = await makePdfThumbnail(out)

    return [
      {
        name: files[0].file.name.replace(/\.pdf$/i, '') + '_已重排.pdf',
        blob,
        size: blob.size,
        type: 'application/pdf',
        originSize: files[0].file.size,
        previewUrl,
        note: `新顺序：${formatPageRanges(effectiveOrder).slice(0, 60)}${effectiveOrder.length > 12 ? '…' : ''}`,
      } satisfies OutputFile,
    ]
  }

  const workspace =
    job.files.length > 0 ? (
      <div className="panel">
        <div className="panel-title">
          按点击顺序排列
          <span className="field-hint" style={{ fontWeight: 400 }}>
            先点哪个，哪个就排到前面
          </span>
        </div>
        <PdfPageSelector
          thumbs={thumbs}
          selected={order}
          onSelectedChange={setOrder}
          onThumbClick={toggle}
          loading={loading}
          progress={progress}
          error={error}
          showToolbar={false}
          hint="缩略图右下角的数字表示它在文档中的新位置；再次点击可取消该页的排序"
          badge={(pageNumber) => {
            const index = order.indexOf(pageNumber)
            return index >= 0 ? `→ 第 ${index + 1} 位` : undefined
          }}
        />
      </div>
    ) : null

  return (
    <ToolPage
      toolId="pdf-reorder"
      job={job}
      onRun={() => job.run(worker)}
      actionLabel="应用新顺序"
      actionHint={changed ? '页面顺序已修改' : '点击缩略图调整顺序'}
      maxFiles={1}
      fileVariant="list"
      workspace={workspace}
      optionsTitle="顺序控制"
      zipBaseName="reordered_pdf"
      validate={(files) => {
        if (files.length > 1) return '调整顺序一次只处理一个文件'
        if (!changed) return '页面顺序还没有变化，请先点击缩略图调整'
        return null
      }}
      options={
        <>
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
              共 <strong className="mono-num">{pageCount}</strong> 页，
              已手动指定 <strong className="mono-num">{order.length}</strong> 页的顺序
            </div>
          )}

          <div className="field">
            <span className="field-label">手动输入顺序</span>
            <input
              className="input"
              style={{ width: '100%' }}
              placeholder="例如 3,1,2,5,4"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
            <span className="field-hint">用英文逗号分隔，未列出的页面按原顺序接在后面</span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-default btn-sm" onClick={() => { setOrder([]); setManual('') }}>
              重置顺序
            </button>
            <button
              className="btn btn-default btn-sm"
              onClick={() => {
                setManual('')
                setOrder(pageCount > 0 ? Array.from({ length: pageCount }, (_, i) => pageCount - i) : [])
              }}
            >
              整体倒序
            </button>
          </div>

          {order.length > 0 && (
            <div className="field-hint" style={{ wordBreak: 'break-all' }}>
              新顺序：{effectiveOrder.join('、')}
            </div>
          )}

          <Notice kind="info">
            重排页面不会重新编码内容，只是调整页面对象在文档中的排列，
            书签等依赖于页码的结构可能会失效，请处理后检查一遍。
          </Notice>
        </>
      }
    />
  )
}
