import { useEffect, useState } from 'react'
import { ToolPage } from '../../components/ToolPage'
import { Notice, OptionCards } from '../../components/controls'
import { PdfPageSelector } from '../../components/PdfPageSelector'
import { useToolJob, type ToolWorker } from '../../hooks/useToolJob'
import { useFileBytes } from '../../hooks/useFileBytes'
import { usePdfPreview } from '../../hooks/usePdfPreview'
import { extractPages } from '../../lib/pdf/edit'
import { makePdfThumbnail } from '../../lib/pdf/thumb'
import type { OutputFile } from '../../lib/types'

type Mode = 'single' | 'each'

export default function PdfExtract() {
  const job = useToolJob()
  const first = job.files[0]
  const { bytes } = useFileBytes(first?.file)
  const { info, thumbs, loading, progress, error } = usePdfPreview(bytes)

  const [selected, setSelected] = useState<number[]>([])
  const [mode, setMode] = useState<Mode>('single')

  useEffect(() => {
    setSelected([])
  }, [first?.id])

  const pages = [...selected].sort((a, b) => a - b)
  const baseName = first ? first.file.name.replace(/\.pdf$/i, '') : '提取结果'

  const worker: ToolWorker = async (files, report, signal) => {
    if (files.length > 1) throw new Error('提取页面一次只处理一个 PDF 文件')
    if (!bytes) throw new Error('文件还在读取中，请稍候再试')
    if (pages.length === 0) throw new Error('请先选择要提取的页面')

    const source = new Uint8Array(await files[0].file.arrayBuffer())
    const outputs: OutputFile[] = []

    if (mode === 'single') {
      const out = await extractPages(source, pages, (percent, message) => {
        if (!signal.aborted) report(percent, message)
      })
      if (signal.aborted) throw new DOMException('已取消', 'AbortError')

      report(96, '正在生成预览')
      const blob = new Blob([out as unknown as BlobPart], { type: 'application/pdf' })
      return [
        {
          name: `${baseName}_提取${pages.length}页.pdf`,
          blob,
          size: blob.size,
          type: 'application/pdf',
          originSize: first?.file.size,
          previewUrl: await makePdfThumbnail(out),
          note: `提取第 ${pages.join('、')} 页，共 ${pages.length} 页`,
        } satisfies OutputFile,
      ]
    }

    // 每页一个文件
    for (let i = 0; i < pages.length; i++) {
      const pageNumber = pages[i]
      if (signal.aborted) throw new DOMException('已取消', 'AbortError')
      report(Math.round((i / pages.length) * 92), `正在提取第 ${pageNumber} 页`)
      const out = await extractPages(source, [pageNumber])
      const blob = new Blob([out as unknown as BlobPart], { type: 'application/pdf' })
      outputs.push({
        name: `${baseName}_第${String(pageNumber).padStart(3, '0')}页.pdf`,
        blob,
        size: blob.size,
        type: 'application/pdf',
        previewUrl: pages.length <= 12 ? await makePdfThumbnail(out, 160) : undefined,
        note: `原文档第 ${pageNumber} 页`,
      })
      await new Promise((r) => setTimeout(r, 0))
    }

    return outputs
  }

  const workspace =
    job.files.length > 0 ? (
      <div className="panel">
        <div className="panel-title">
          选择页面
          <span className="field-hint" style={{ fontWeight: 400 }}>
            点击缩略图选中要提取的页面
          </span>
        </div>
        <PdfPageSelector
          thumbs={thumbs}
          selected={selected}
          onSelectedChange={setSelected}
          loading={loading}
          progress={progress}
          error={error}
          hint="提取出的页面会按页码从小到大排列，组成一个新文档"
        />
      </div>
    ) : null

  return (
    <ToolPage
      toolId="pdf-extract"
      job={job}
      onRun={() => job.run(worker)}
      actionLabel="开始提取"
      actionHint={pages.length > 0 ? `已选 ${pages.length} 页` : undefined}
      maxFiles={1}
      fileVariant="list"
      workspace={workspace}
      optionsTitle="提取设置"
      zipBaseName={`${baseName}_extracted`}
      validate={(files) => {
        if (files.length > 1) return '提取页面一次只处理一个文件'
        if (pages.length === 0) return '请先选择要提取的页面'
        return null
      }}
      options={
        <>
          <OptionCards
            value={mode}
            onChange={setMode}
            options={[
              { value: 'single' as Mode, label: '合成一个 PDF', description: '把选中的页面组成一份新文档' },
              { value: 'each' as Mode, label: '每页一个文件', description: '逐页导出，适合批量取图' },
            ]}
          />

          {info && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--color-ink-700)',
                padding: '9px 12px',
                background: 'var(--color-brand-50)',
                borderRadius: 8,
              }}
            >
              原文档共 <strong className="mono-num">{info.pageCount}</strong> 页，
              已选中 <strong className="mono-num">{pages.length}</strong> 页
            </div>
          )}

          {pages.length > 0 && (
            <div className="field-hint" style={{ wordBreak: 'break-all' }}>
              页码：{pages.join('、')}
            </div>
          )}

          <Notice kind="info">
            提取属于无损操作，文字仍然可以选中和搜索，也不会重新压缩图片。
            想按「1-3,7,10-12」这样的范围快速切分，用「PDF 分割」更省事。
          </Notice>
        </>
      }
    />
  )
}
