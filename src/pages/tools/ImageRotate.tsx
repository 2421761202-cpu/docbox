import { useState } from 'react'
import { ToolPage } from '../../components/ToolPage'
import { ColorField, Notice, Segmented, SliderField } from '../../components/controls'
import { useToolJob, type ToolWorker } from '../../hooks/useToolJob'
import { processFileList } from '../../lib/image/batch'
import { applyTransform, loadImageFile, rotatedSize } from '../../lib/image/core'
import {
  FORMAT_EXT,
  encodeCanvas,
  outputName,
  resolveFormat,
  uniqueName,
  type FormatOption,
  type ImageFormat,
} from '../../lib/image/encode'
import { formatDimensions } from '../../lib/format'
import type { OutputFile } from '../../lib/types'

export default function ImageRotate() {
  const job = useToolJob()

  const [angle, setAngle] = useState<90 | 180 | 270 | 0>(90)
  const [fineAngle, setFineAngle] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [format, setFormat] = useState<FormatOption>('original')
  const [background, setBackground] = useState('#ffffff')

  const totalAngle = angle + fineAngle
  const noChange = totalAngle % 360 === 0 && !flipH && !flipV

  const worker: ToolWorker = async (files, report, signal) => {
    const outputs: OutputFile[] = []
    const used = new Set<string>()
    const wantPreview = files.length <= 24

    await processFileList(
      files,
      report,
      signal,
      async ({ file, report: scoped }) => {
        const loaded = await loadImageFile(file.file, { maxDimension: 12000 })
        try {
          scoped(50, `正在旋转 ${file.file.name}`)

          const canvas = applyTransform(loaded.source, loaded.width, loaded.height, {
            rotate: totalAngle,
            flipH,
            flipV,
            background,
          })

          const outFormat = resolveFormat(format, file.file)
          const blob = await encodeCanvas(canvas, {
            format: outFormat,
            quality: 0.92,
            background,
          })

          outputs.push({
            name: uniqueName(outputName(file.file.name, '', FORMAT_EXT[outFormat]), used),
            blob,
            size: blob.size,
            type: blob.type,
            originSize: file.file.size,
            previewUrl: wantPreview ? URL.createObjectURL(blob) : undefined,
            note: describe(totalAngle, flipH, flipV, loaded.width, loaded.height, canvas),
          })
          scoped(100)
        } finally {
          loaded.dispose()
        }
      },
      '正在旋转图片',
    )

    return outputs
  }

  return (
    <ToolPage
      toolId="image-rotate"
      job={job}
      onRun={() => job.run(worker)}
      actionLabel="开始旋转"
      actionHint={noChange ? '当前没有任何变化，请先选择旋转方式' : undefined}
      fileVariant="thumbs"
      validate={() => (noChange ? '请至少选择一项旋转或翻转操作' : null)}
      optionsTitle="旋转设置"
      zipBaseName="rotated"
      options={
        <>
          <div className="field" style={{ alignItems: 'flex-start' }}>
            <span className="field-label" style={{ paddingTop: 6 }}>
              旋转角度
            </span>
            <Segmented
              value={angle}
              onChange={(v) => setAngle(v)}
              options={[
                { value: 0, label: '不旋转' },
                { value: 90, label: '顺时针 90°' },
                { value: 180, label: '180°' },
                { value: 270, label: '逆时针 90°' },
              ]}
            />
          </div>

          <SliderField
            label="角度微调"
            value={fineAngle}
            min={-45}
            max={45}
            step={1}
            onChange={setFineAngle}
            format={(v) => `${v > 0 ? '+' : ''}${v}°`}
            hint="用于摆正轻微倾斜的扫描件"
          />

          <div className="field">
            <span className="field-label">镜像翻转</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={flipH ? 'btn btn-primary btn-sm' : 'btn btn-default btn-sm'}
                onClick={() => setFlipH((v) => !v)}
              >
                水平翻转
              </button>
              <button
                className={flipV ? 'btn btn-primary btn-sm' : 'btn btn-default btn-sm'}
                onClick={() => setFlipV((v) => !v)}
              >
                垂直翻转
              </button>
            </div>
          </div>

          <div className="field">
            <span className="field-label">输出格式</span>
            <select
              className="input"
              style={{ width: 150 }}
              value={format}
              onChange={(e) => setFormat(e.target.value as FormatOption)}
            >
              <option value="original">保持原格式</option>
              <option value="jpeg">JPG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </div>

          <ColorField
            label="补边颜色"
            value={background}
            onChange={setBackground}
            hint="角度微调时四角的填充色"
          />

          {fineAngle !== 0 && (
            <Notice kind="info">
              使用非 90° 倍数旋转时，画布会自动扩大到刚好容纳整张图片，四角用上方颜色填充。
              若只想摆正不裁剪，这是推荐做法。
            </Notice>
          )}
        </>
      }
    />
  )
}

function describe(
  angle: number,
  flipH: boolean,
  flipV: boolean,
  srcW: number,
  srcH: number,
  canvas: HTMLCanvasElement,
): string {
  const parts: string[] = []
  if (angle % 360 !== 0) parts.push(`旋转 ${angle % 360}°`)
  if (flipH) parts.push('水平翻转')
  if (flipV) parts.push('垂直翻转')
  const before = formatDimensions(srcW, srcH)
  return `${before} → ${formatDimensions(canvas.width, canvas.height)}${parts.length ? ` · ${parts.join(' + ')}` : ''}`
}

export { rotatedSize }
