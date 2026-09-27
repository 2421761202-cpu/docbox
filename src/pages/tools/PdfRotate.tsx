import { useEffect, useState } from 'react'
import { ToolPage } from '../../components/ToolPage'
import { Notice, Segmented } from '../../components/controls'
import { PdfPageSelector } from '../../components/PdfPageSelector'
import { useToolJob, type ToolWorker } from '../../hooks/useToolJob'
import { useFileBytes } from '../../hooks/useFileBytes'
import { usePdfPreview } from '../../hooks/usePdfPreview'
import { rotatePdf } from '../../lib/pdf/edit'
import { makePdfThumbnail } from '../../lib/pdf/thumb'
import type { OutputFile } from '../../lib/types'

type Angle = 90 | 180 | 270

export default function PdfRotate() {
  const job = useToolJob()
  const first = job.files[0]
  const { bytes } = useFileBytes(first?.file)
  const { info, thumbs, loading, progress, error } = usePdfPreview(bytes)

  const [angle, setAngle] = useState<Angle>(90)
  const [scope, setScope] = useState<'all' | 'selected'>('all')
  const [selected, setSelected] = useState<number[]>([])

  // 缩略图就绪后默认全选
  useEffect(() => {
    if (thumbs.length > 0) {
      setSelected(thumbs.map((t) => t.pageNumber))
    }
  }, [thumbs])

  const pages = scope === 'all' ? undefined : selected
  const targetCount = scope === 'all' ? thumbs.length : selected.length

  const worker: ToolWorker = async (files, report, signal) => {
    if (files.length > 1) throw new Error('旋转工具一次只处理一个 PDF 文件')
    if (!bytes) throw new Error('文件还在读取中，请稍候再试')

    const source = new Uint8Array(await files[0].file.arrayBuffer())

    const out = await rotatePdf(
      source,
      { angle, pages, absolute: false },
      (percent, message) => {
        if (!signal.aborted) report(percent, message)
      },
    )

    if (signal.aborted) throw new DOMException('已取消', 'AbortError')

    report(96, '正在生成预览')
    const blob = new Blob([out as unknown as BlobPart], { type: 'application/pdf' })
    const previewUrl = await makePdfThumbnail(out)

    return [
      {
        name: files[0].file.name.replace(/\.pdf$/i, '') + `_旋转${angle}度.pdf`,
        blob,
        size: blob.size,
        type: 'application/pdf',
        originSize: files[0].file.size,
        previewUrl,
        note: `第 ${angle} 度 · 应用于 ${scope === 'all' ? '全部' : `${targetCount} 个`}页面`,
      } satisfies OutputFile,
    ]
  }

  const workspace =
    job.files.length > 0 ? (
      <div className="panel">
        <div className="panel-title">页面列表</div>
        <PdfPageSelector
          thumbs={thumbs}
          selected={selected}
          onSelectedChange={setSelected}
          loading={loading}
          progress={progress}
          error={error}
          hint={scope === 'all' ? '当前作用于全部页面，切换为「只旋转选中页」可单独挑页' : '点击缩略图选择要旋转的页面'}
          badge={(pageNumber) => {
            const page = info?.pages.find((p) => p.pageNumber === pageNumber)
            if (!page || !page.rotation) return undefined
            return `已转 ${page.rotation}°`
          }}
        />
      </div>
    ) : null

  return (
    <ToolPage
      toolId="pdf-rotate"
      job={job}
      onRun={() => job.run(worker)}
      actionLabel="开始旋转"
      actionHint={`${angle}° · ${scope === 'all' ? '全部页面' : `${targetCount} 个页面`}`}
      maxFiles={1}
      fileVariant="list"
      workspace={workspace}
      optionsTitle="旋转设置"
      zipBaseName="rotated_pdf"
      validate={(files) => {
        if (files.length > 1) return '旋转一次只处理一个文件'
        if (scope === 'selected' && selected.length === 0) return '请至少选择一个页面'
        return null
      }}
      options={
        <>
          <div className="field" style={{ alignItems: 'flex-start' }}>
            <span className="field-label" style={{ paddingTop: 6 }}>
              旋转角度
            </span>
            <Segmented
              value={angle}
              onChange={setAngle}
              options={[
                { value: 90 as Angle, label: '顺时针 90°' },
                { value: 180 as Angle, label: '180°' },
                { value: 270 as Angle, label: '逆时针 90°' },
              ]}
            />
          </div>

          <div className="field" style={{ alignItems: 'flex-start' }}>
            <span className="field-label" style={{ paddingTop: 6 }}>
              作用范围
            </span>
            <Segmented
              value={scope}
              onChange={setScope}
              options={[
                { value: 'all' as const, label: '全部页面' },
                { value: 'selected' as const, label: '只旋转选中页' },
              ]}
            />
          </div>

          <Notice kind="info">
            旋转只修改页面的旋转标记，不改动内容本身，因此是无损操作，
            文件体积几乎不变，重复旋转也可以叠加（旋转两次 90° 等于旋转 180°）。
          </Notice>

          {info?.encrypted && (
            <Notice kind="warn">
              这个 PDF 似乎带有加密标记，如果处理失败请先解除密码保护。
            </Notice>
          )}
        </>
      }
    />
  )
}
