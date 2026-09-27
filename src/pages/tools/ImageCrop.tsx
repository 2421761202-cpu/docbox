import { useEffect, useMemo, useState } from 'react'
import { ToolPage } from '../../components/ToolPage'
import { CropBox, FULL_RECT, type CropRect } from '../../components/CropBox'
import { ColorField, Notice, Segmented, SliderField } from '../../components/controls'
import { useToolJob, type ToolWorker } from '../../hooks/useToolJob'
import { processFileList } from '../../lib/image/batch'
import { coverCanvas, cropImage, fitIntoCanvas, loadImageFile } from '../../lib/image/core'
import { FORMAT_EXT, encodeCanvas, stripExt, type ImageFormat } from '../../lib/image/encode'
import { formatDimensions } from '../../lib/format'
import type { OutputFile } from '../../lib/types'

type AspectId = 'free' | 'original' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3'

const ASPECTS: { id: AspectId; label: string; value: number | null }[] = [
  { id: 'free', label: '自由', value: null },
  { id: 'original', label: '原图比例', value: null },
  { id: '1:1', label: '1:1', value: 1 },
  { id: '4:3', label: '4:3', value: 4 / 3 },
  { id: '3:4', label: '3:4', value: 3 / 4 },
  { id: '16:9', label: '16:9', value: 16 / 9 },
  { id: '9:16', label: '9:16', value: 9 / 16 },
  { id: '3:2', label: '3:2', value: 3 / 2 },
  { id: '2:3', label: '2:3', value: 2 / 3 },
]

export default function ImageCrop() {
  const job = useToolJob()

  const [activeIndex, setActiveIndex] = useState(0)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [rect, setRect] = useState<CropRect>(FULL_RECT)
  const [aspectId, setAspectId] = useState<AspectId>('free')
  const [format, setFormat] = useState<ImageFormat>('jpeg')
  const [quality, setQuality] = useState(92)
  const [background, setBackground] = useState('#ffffff')
  const [unified, setUnified] = useState(false)
  const [outWidth, setOutWidth] = useState<number | ''>(800)
  const [outHeight, setOutHeight] = useState<number | ''>(800)
  const [unifiedFit, setUnifiedFit] = useState<'contain' | 'cover'>('contain')

  const activeFile = job.files[Math.min(activeIndex, job.files.length - 1)]
  const imageAspect = imageSize ? imageSize.width / imageSize.height : undefined

  const pixelAspect = useMemo(() => {
    if (aspectId === 'free') return null
    if (aspectId === 'original') return imageAspect ?? null
    return ASPECTS.find((a) => a.id === aspectId)?.value ?? null
  }, [aspectId, imageAspect])

  // 切换比例时，把裁剪框重置为该比例下最大的居中框
  useEffect(() => {
    if (!imageAspect) return
    if (!pixelAspect) return
    setRect(fitRect(pixelAspect / imageAspect))
  }, [pixelAspect, imageAspect])

  // 切换图片时重置尺寸信息，等待新图片 onLoad
  useEffect(() => {
    setImageSize(null)
  }, [activeFile?.id])

  const cropPixels = imageSize
    ? {
        width: Math.max(1, Math.round(rect.width * imageSize.width)),
        height: Math.max(1, Math.round(rect.height * imageSize.height)),
        x: Math.round(rect.x * imageSize.width),
        y: Math.round(rect.y * imageSize.height),
      }
    : null

  const worker: ToolWorker = async (files, report, signal) => {
    const outputs: OutputFile[] = []
    const wantPreview = files.length <= 24

    await processFileList(
      files,
      report,
      signal,
      async ({ file, index, report: scoped }) => {
        const loaded = await loadImageFile(file.file, { maxDimension: 16000 })
        try {
          scoped(50, `正在裁剪 ${file.file.name}`)

          const cropRect = {
            x: Math.round(rect.x * loaded.width),
            y: Math.round(rect.y * loaded.height),
            width: Math.max(1, Math.round(rect.width * loaded.width)),
            height: Math.max(1, Math.round(rect.height * loaded.height)),
          }

          // cropImage 的第二个参数就是像素矩形，裁剪区域已被完整覆盖，
          // 因此不传背景色，避免把透明 PNG 压成白底。
          let canvas = cropImage(loaded.source, cropRect)

          if (unified && outWidth && outHeight) {
            canvas =
              unifiedFit === 'cover'
                ? coverCanvas(canvas, canvas.width, canvas.height, Number(outWidth), Number(outHeight), background)
                : fitIntoCanvas(canvas, canvas.width, canvas.height, Number(outWidth), Number(outHeight), background)
          }

          const blob = await encodeCanvas(canvas, {
            format,
            quality: quality / 100,
            background,
          })

          outputs.push({
            name: `${stripExt(file.file.name)}_裁剪.${FORMAT_EXT[format]}`,
            blob,
            size: blob.size,
            type: blob.type,
            originSize: file.file.size,
            previewUrl: wantPreview ? URL.createObjectURL(blob) : undefined,
            note: `第 ${index + 1} 张 · 输出 ${formatDimensions(canvas.width, canvas.height)}`,
          })
          scoped(100)
        } finally {
          loaded.dispose()
        }
      },
      '正在裁剪图片',
    )

    return outputs
  }

  const workspace =
    job.files.length > 0 && activeFile?.previewUrl ? (
      <div className="panel">
        <div className="panel-title">
          裁剪区域
          {job.files.length > 1 && (
            <span className="field-hint" style={{ fontWeight: 400 }}>
              同一裁剪框会套用到全部 {job.files.length} 张图片
            </span>
          )}
        </div>

        {job.files.length > 1 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
            {job.files.map((file, index) => (
              <button
                key={file.id}
                onClick={() => setActiveIndex(index)}
                title={file.file.name}
                style={{
                  flex: '0 0 auto',
                  width: 54,
                  height: 54,
                  padding: 0,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: `2px solid ${index === activeIndex ? 'var(--color-brand-500)' : 'var(--color-line)'}`,
                  background: '#f3f2ee',
                  cursor: 'pointer',
                }}
              >
                {file.previewUrl && (
                  <img
                    src={file.previewUrl}
                    alt={file.file.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        <CropBox
          src={activeFile.previewUrl}
          imageAspect={imageAspect}
          rect={rect}
          onChange={setRect}
          aspect={pixelAspect}
          onImageLoad={(width, height) => setImageSize({ width, height })}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            marginTop: 12,
            flexWrap: 'wrap',
          }}
        >
          <span className="field-hint">
            {cropPixels
              ? `原始 ${formatDimensions(imageSize!.width, imageSize!.height)} · 裁剪后 ${formatDimensions(
                  cropPixels.width,
                  cropPixels.height,
                )}`
              : '正在读取图片尺寸…'}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setRect(FULL_RECT)}>
            重置裁剪框
          </button>
        </div>
      </div>
    ) : null

  return (
    <ToolPage
      toolId="image-crop"
      job={job}
      onRun={() => job.run(worker)}
      actionLabel="开始裁剪"
      actionHint={cropPixels ? `输出 ${formatDimensions(cropPixels.width, cropPixels.height)}` : undefined}
      fileVariant="thumbs"
      workspace={workspace}
      optionsTitle="裁剪设置"
      zipBaseName="cropped"
      options={
        <>
          <div className="field">
            <span className="field-label">裁剪比例</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ASPECTS.map((item) => (
                <button
                  key={item.id}
                  className={aspectId === item.id ? 'btn btn-primary btn-sm' : 'btn btn-default btn-sm'}
                  onClick={() => setAspectId(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {aspectId === 'original' && (
            <Notice kind="info">保持原图比例，相当于只缩小画幅不改变形状。</Notice>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
            <input
              className="checkbox"
              type="checkbox"
              checked={unified}
              onChange={(e) => setUnified(e.target.checked)}
            />
            统一输出尺寸
          </label>

          {unified && (
            <>
              <div className="field">
                <span className="field-label">输出尺寸</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    className="input"
                    style={{ width: 88 }}
                    type="number"
                    min={8}
                    value={outWidth}
                    onChange={(e) => setOutWidth(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <span className="field-hint">×</span>
                  <input
                    className="input"
                    style={{ width: 88 }}
                    type="number"
                    min={8}
                    value={outHeight}
                    onChange={(e) => setOutHeight(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <span className="field-hint">px</span>
                </div>
              </div>

              <Segmented
                value={unifiedFit}
                onChange={setUnifiedFit}
                options={[
                  { value: 'contain', label: '完整显示' },
                  { value: 'cover', label: '填满裁切' },
                ]}
              />
            </>
          )}

          <div className="field">
            <span className="field-label">输出格式</span>
            <select
              className="input"
              style={{ width: 130 }}
              value={format}
              onChange={(e) => setFormat(e.target.value as ImageFormat)}
            >
              <option value="jpeg">JPG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </div>

          {format !== 'png' && (
            <SliderField
              label="输出质量"
              value={quality}
              min={50}
              max={100}
              onChange={setQuality}
              format={(v) => `${v}%`}
            />
          )}

          <ColorField label="底色" value={background} onChange={setBackground} />

          <Notice kind="info">
            裁剪框的位置和大小按百分比记录，因此可以直接套用到整批图片 ——
            比如统一裁掉截图顶部 10% 的浏览器工具栏。
          </Notice>
        </>
      }
    />
  )
}

function fitRect(normalizedRatio: number): CropRect {
  const ratio = Math.max(0.01, normalizedRatio)
  let width: number
  let height: number
  if (ratio >= 1) {
    width = 1
    height = 1 / ratio
  } else {
    height = 1
    width = ratio
  }
  return {
    x: (1 - width) / 2,
    y: (1 - height) / 2,
    width,
    height,
  }
}
