import { useEffect, useState } from 'react'
import { ToolPage } from '../../components/ToolPage'
import { ColorField, Notice, Segmented, SliderField } from '../../components/controls'
import { PdfPageSelector } from '../../components/PdfPageSelector'
import { useToolJob, type ToolWorker } from '../../hooks/useToolJob'
import { useFileBytes } from '../../hooks/useFileBytes'
import { usePdfPreview } from '../../hooks/usePdfPreview'
import { pdfToImages } from '../../lib/pdf/convert'
import { FORMAT_EXT, type ImageFormat } from '../../lib/image/encode'
import { formatDimensions } from '../../lib/format'
import type { OutputFile } from '../../lib/types'

export default function PdfToImage() {
  const job = useToolJob()
  const first = job.files[0]
  const { bytes } = useFileBytes(first?.file)
  const { info, thumbs, loading, progress, error } = usePdfPreview(bytes)

  const [format, setFormat] = useState<ImageFormat>('jpeg')
  const [dpi, setDpi] = useState(150)
  const [quality, setQuality] = useState(92)
  const [background, setBackground] = useState('#ffffff')
  const [grayscale, setGrayscale] = useState(false)
  const [scope, setScope] = useState<'all' | 'selected'>('all')
  const [selected, setSelected] = useState<number[]>([])

  useEffect(() => {
    setSelected([])
    setScope('all')
  }, [first?.id])

  const pageCount = info?.pageCount ?? thumbs.length
  const targetPages = scope === 'selected' ? selected : undefined

  const worker: ToolWorker = async (files, report, signal) => {
    if (files.length > 1) throw new Error('PDF 转图片一次只处理一个文件，请分批处理')
    if (!bytes) throw new Error('文件还在读取中，请稍候再试')

    const source = new Uint8Array(await files[0].file.arrayBuffer())
    const baseName = files[0].file.name.replace(/\.pdf$/i, '')

    const results = await pdfToImages(
      source,
      baseName,
      {
        format,
        dpi,
        quality: quality / 100,
        pages: targetPages,
        background,
        grayscale,
      },
      (percent, message) => {
        if (!signal.aborted) report(percent, message)
      },
    )

    if (signal.aborted) throw new DOMException('已取消', 'AbortError')

    return results.map(
      (item): OutputFile => ({
        name: item.name,
        blob: item.blob,
        size: item.blob.size,
        type: item.blob.type,
        previewUrl: item.previewUrl,
        note: `第 ${item.pageNumber} 页 · ${formatDimensions(item.width, item.height)}`,
      }),
    )
  }

  const workspace =
    job.files.length > 0 && scope === 'selected' ? (
      <div className="panel">
        <div className="panel-title">选择要导出的页面</div>
        <PdfPageSelector
          thumbs={thumbs}
          selected={selected}
          onSelectedChange={setSelected}
          loading={loading}
          progress={progress}
          error={error}
          hint="只有选中的页面会被导出为图片"
        />
      </div>
    ) : null

  return (
    <ToolPage
      toolId="pdf-to-image"
      job={job}
      onRun={() => job.run(worker)}
      actionLabel="开始转换"
      actionHint={
        pageCount > 0
          ? `将导出 ${scope === 'selected' ? selected.length : pageCount} 张图片`
          : undefined
      }
      maxFiles={1}
      fileVariant="list"
      workspace={workspace}
      optionsTitle="导出设置"
      zipBaseName={`${first ? first.file.name.replace(/\.pdf$/i, '') : 'pdf'}_images`}
      validate={(files) => {
        if (files.length > 1) return 'PDF 转图片一次只处理一个文件'
        if (scope === 'selected' && selected.length === 0) return '请至少选择一个页面'
        return null
      }}
      resultNotice={
        <Notice kind="info">
          每一页都会导出成一张独立图片，页数较多时建议用「打包下载 ZIP」。
          DPI 越高越清晰、体积也越大：屏幕阅读 96~150dpi 够用，印刷或 OCR 建议 200~300dpi。
        </Notice>
      }
      options={
        <>
          <div className="field">
            <span className="field-label">图片格式</span>
            <select
              className="input"
              style={{ width: 130 }}
              value={format}
              onChange={(e) => setFormat(e.target.value as ImageFormat)}
            >
              <option value="jpeg">JPG（体积小）</option>
              <option value="png">PNG（无损）</option>
              <option value="webp">WebP</option>
            </select>
          </div>

          <SliderField
            label="分辨率"
            value={dpi}
            min={72}
            max={300}
            step={6}
            onChange={setDpi}
            format={(v) => `${v} dpi`}
            hint={dpi <= 96 ? '约等于屏幕显示效果' : dpi <= 160 ? '适合屏幕阅读与分享' : '适合印刷或 OCR 识别'}
          />

          {format !== 'png' && (
            <SliderField
              label="图片质量"
              value={quality}
              min={40}
              max={100}
              onChange={setQuality}
              format={(v) => `${v}%`}
            />
          )}

          <ColorField label="背景颜色" value={background} onChange={setBackground} hint="透明区域的填充色" />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
            <input
              className="checkbox"
              type="checkbox"
              checked={grayscale}
              onChange={(e) => setGrayscale(e.target.checked)}
            />
            转为灰度图片
          </label>

          <div className="field" style={{ alignItems: 'flex-start' }}>
            <span className="field-label" style={{ paddingTop: 6 }}>
              导出范围
            </span>
            <Segmented
              value={scope}
              onChange={setScope}
              options={[
                { value: 'all' as const, label: `全部 ${pageCount || ''} 页` },
                { value: 'selected' as const, label: '指定页面' },
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
              共 <strong className="mono-num">{pageCount}</strong> 页 ·{' '}
              {scope === 'selected'
                ? `已选 ${selected.length} 页`
                : `全部导出，格式 ${FORMAT_EXT[format].toUpperCase()}`}
            </div>
          )}

          <Notice kind="info">
            导出使用 pdf.js 逐页渲染，页数很多时会比较耗时，可以随时点「取消」。
            处理过程中页面会占用较多内存，建议一次不超过 100 页。
          </Notice>
        </>
      }
    />
  )
}
