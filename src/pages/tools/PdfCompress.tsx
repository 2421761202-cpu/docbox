import { useEffect, useState } from 'react'
import { ToolPage } from '../../components/ToolPage'
import { Notice, OptionCards, SliderField, Segmented } from '../../components/controls'
import { PdfPageSelector } from '../../components/PdfPageSelector'
import { useToolJob, type ToolWorker } from '../../hooks/useToolJob'
import { useFileBytes } from '../../hooks/useFileBytes'
import { usePdfPreview } from '../../hooks/usePdfPreview'
import { PDF_COMPRESS_PRESETS, compressPdfRaster } from '../../lib/pdf/convert'
import { makePdfThumbnail } from '../../lib/pdf/thumb'
import { formatBytes, formatSavings } from '../../lib/format'
import type { OutputFile } from '../../lib/types'

export default function PdfCompress() {
  const job = useToolJob()
  const first = job.files[0]
  const { bytes } = useFileBytes(first?.file)
  const { info, thumbs, loading, progress, error } = usePdfPreview(bytes)

  const [presetId, setPresetId] = useState('standard')
  const [custom, setCustom] = useState(false)
  const [dpi, setDpi] = useState(120)
  const [quality, setQuality] = useState(70)
  const [grayscale, setGrayscale] = useState(false)
  const [scope, setScope] = useState<'all' | 'selected'>('all')
  const [selected, setSelected] = useState<number[]>([])

  useEffect(() => {
    setSelected([])
    setScope('all')
  }, [first?.id])

  const preset = PDF_COMPRESS_PRESETS.find((p) => p.id === presetId) ?? PDF_COMPRESS_PRESETS[1]
  const active = custom ? { dpi, quality, grayscale } : preset

  const worker: ToolWorker = async (files, report, signal) => {
    if (files.length > 1) throw new Error('PDF 压缩一次只处理一个文件，请分批处理')
    if (!bytes) throw new Error('文件还在读取中，请稍候再试')

    const source = new Uint8Array(await files[0].file.arrayBuffer())

    const result = await compressPdfRaster(
      source,
      {
        dpi: active.dpi,
        quality: active.quality / 100,
        grayscale: active.grayscale,
        pages: scope === 'selected' && selected.length > 0 ? selected : undefined,
      },
      (percent, message) => {
        if (!signal.aborted) report(percent, message)
      },
    )

    if (signal.aborted) throw new DOMException('已取消', 'AbortError')

    report(96, '正在生成预览')
    const blob = new Blob([result.bytes as unknown as BlobPart], { type: 'application/pdf' })
    const previewUrl = await makePdfThumbnail(result.bytes, 200, 0.6)
    const originSize = files[0].file.size

    return [
      {
        name: files[0].file.name.replace(/\.pdf$/i, '') + '_压缩.pdf',
        blob,
        size: blob.size,
        type: 'application/pdf',
        originSize,
        previewUrl,
        note:
          `${result.pageCount} 页 · ${active.dpi}dpi · 质量 ${active.quality}%` +
          (active.grayscale ? ' · 灰度' : '') +
          (blob.size < originSize
            ? ` · 体积减少 ${formatSavings(originSize, blob.size)}`
            : ' · 未能进一步压缩'),
      } satisfies OutputFile,
    ]
  }

  const workspace =
    job.files.length > 0 && scope === 'selected' ? (
      <div className="panel">
        <div className="panel-title">选择要压缩的页面</div>
        <PdfPageSelector
          thumbs={thumbs}
          selected={selected}
          onSelectedChange={setSelected}
          loading={loading}
          progress={progress}
          error={error}
          hint="未选中的页面会以原样保留在输出文件里"
        />
      </div>
    ) : null

  return (
    <ToolPage
      toolId="pdf-compress"
      job={job}
      onRun={() => job.run(worker)}
      actionLabel="开始压缩"
      actionHint={
        first ? `原始大小 ${formatBytes(first.file.size)}` : undefined
      }
      maxFiles={1}
      fileVariant="list"
      workspace={workspace}
      optionsTitle="压缩强度"
      zipBaseName="compressed_pdf"
      validate={(files) => {
        if (files.length > 1) return 'PDF 压缩一次只处理一个文件'
        if (scope === 'selected' && selected.length === 0) return '请至少选择一个要压缩的页面'
        return null
      }}
      options={
        <>
          <OptionCards
            value={presetId}
            onChange={(id) => {
              setPresetId(id)
              setCustom(false)
            }}
            options={PDF_COMPRESS_PRESETS.map((p) => ({
              value: p.id,
              label: p.label,
              description: p.description,
              badge: p.id === 'standard' ? '推荐' : undefined,
            }))}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
            <input
              className="checkbox"
              type="checkbox"
              checked={custom}
              onChange={(e) => setCustom(e.target.checked)}
            />
            自定义参数
          </label>

          {custom && (
            <>
              <SliderField
                label="渲染分辨率"
                value={dpi}
                min={50}
                max={300}
                step={2}
                onChange={setDpi}
                format={(v) => `${v} dpi`}
                hint="低于 96dpi 文字会明显发虚"
              />
              <SliderField
                label="JPEG 质量"
                value={quality}
                min={30}
                max={95}
                onChange={setQuality}
                format={(v) => `${v}%`}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
                <input
                  className="checkbox"
                  type="checkbox"
                  checked={grayscale}
                  onChange={(e) => setGrayscale(e.target.checked)}
                />
                转为灰度（黑白文档可再省一半体积）
              </label>
            </>
          )}

          <div className="field" style={{ alignItems: 'flex-start' }}>
            <span className="field-label" style={{ paddingTop: 6 }}>
              作用范围
            </span>
            <Segmented
              value={scope}
              onChange={setScope}
              options={[
                { value: 'all' as const, label: '全部页面' },
                { value: 'selected' as const, label: '指定页面' },
              ]}
            />
          </div>

          <Notice kind="warn">
            <strong>请注意：</strong>这种压缩方式会把每一页重新渲染成图片，因此文字将变成图片，
            不能再选中或搜索，文档里的链接也会失效。页面尺寸保持不变，打印效果不受影响。
            如果你需要保留可搜索的文字，请不要使用本工具。
          </Notice>

          {first && (
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--color-ink-700)',
                padding: '9px 12px',
                background: 'var(--color-brand-50)',
                borderRadius: 8,
              }}
            >
              当前文件：{formatBytes(first.file.size)}
              {info ? ` · ${info.pageCount} 页` : ''}
            </div>
          )}
        </>
      }
    />
  )
}
