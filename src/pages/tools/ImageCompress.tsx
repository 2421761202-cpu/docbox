import { useState } from 'react'
import { ToolPage } from '../../components/ToolPage'
import { ColorField, Notice, OptionCards, SliderField } from '../../components/controls'
import { useToolJob, type ToolWorker } from '../../hooks/useToolJob'
import { processFileList } from '../../lib/image/batch'
import { loadImageFile, resizeDraw, toCanvas } from '../../lib/image/core'
import {
  FORMAT_EXT,
  detectFormat,
  encodeCanvas,
  encodeToTargetSize,
  outputName,
  resolveFormat,
  uniqueName,
  type FormatOption,
  type ImageFormat,
} from '../../lib/image/encode'
import { formatBytes, formatDimensions, parseSizeInput } from '../../lib/format'
import type { OutputFile } from '../../lib/types'

type Mode = 'quality' | 'target'

export default function ImageCompress() {
  const job = useToolJob()

  const [mode, setMode] = useState<Mode>('quality')
  const [quality, setQuality] = useState(80)
  const [targetValue, setTargetValue] = useState('200')
  const [targetUnit, setTargetUnit] = useState<'KB' | 'MB'>('KB')
  const [format, setFormat] = useState<FormatOption>('original')
  const [background, setBackground] = useState('#ffffff')
  const [limitSize, setLimitSize] = useState(false)
  const [maxWidth, setMaxWidth] = useState<number | ''>(1920)
  const [maxHeight, setMaxHeight] = useState<number | ''>(1920)

  const targetBytes = parseSizeInput(`${targetValue}${targetUnit}`, targetUnit)

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
          let canvas: HTMLCanvasElement
          let width = loaded.width
          let height = loaded.height

          if (limitSize && maxWidth && maxHeight) {
            const scale = Math.min(1, Number(maxWidth) / width, Number(maxHeight) / height)
            if (scale < 1) {
              width = Math.round(width * scale)
              height = Math.round(height * scale)
              canvas = resizeDraw(loaded.source, loaded.width, loaded.height, width, height)
            } else {
              canvas = toCanvas(loaded.source, loaded.width, loaded.height)
            }
          } else {
            canvas = toCanvas(loaded.source, loaded.width, loaded.height)
          }

          const outFormat = resolveFormat(format, file.file)
          scoped(60, `正在压缩 ${file.file.name}`)

          if (mode === 'target' && targetBytes) {
            const result = await encodeToTargetSize(canvas, outFormat, targetBytes, {
              background,
            })
            const name = uniqueName(
              outputName(file.file.name, '', FORMAT_EXT[outFormat]),
              used,
            )
            outputs.push({
              name,
              blob: result.blob,
              size: result.blob.size,
              type: result.blob.type,
              originSize: file.file.size,
              previewUrl: wantPreview ? URL.createObjectURL(result.blob) : undefined,
              note: result.reached
                ? `${formatDimensions(result.width, result.height)} · 质量 ${Math.round(result.quality * 100)}% · 已达目标`
                : `${formatDimensions(result.width, result.height)} · 已压到最小，未能达到目标大小`,
            })
          } else {
            const blob = await encodeCanvas(canvas, {
              format: outFormat,
              quality: quality / 100,
              background,
            })
            const name = uniqueName(
              outputName(file.file.name, '', FORMAT_EXT[outFormat]),
              used,
            )
            outputs.push({
              name,
              blob,
              size: blob.size,
              type: blob.type,
              originSize: file.file.size,
              previewUrl: wantPreview ? URL.createObjectURL(blob) : undefined,
              note: `${formatDimensions(width, height)} · 质量 ${quality}%`,
            })
          }
          scoped(100)
        } finally {
          loaded.dispose()
        }
      },
      '正在压缩图片',
    )

    return outputs
  }

  const pngWarning = format === 'png' || (format === 'original' && job.files.some((f) => detectFormat(f.file) === 'png'))

  return (
    <ToolPage
      toolId="image-compress"
      job={job}
      onRun={() => job.run(worker)}
      actionLabel="开始压缩"
      actionHint={
        mode === 'target' && targetBytes
          ? `目标：压到 ${formatBytes(targetBytes)} 以内`
          : '压缩在本地完成，不会上传'
      }
      fileVariant="thumbs"
      dropHint="支持 JPG、PNG、WebP、GIF、BMP 等格式 · 可一次拖入多个文件 · 单个最大 200MB"
      optionsTitle="压缩设置"
      zipBaseName="compressed"
      options={
        <>
          <OptionCards
            value={mode}
            onChange={setMode}
            options={[
              {
                value: 'quality',
                label: '按画质压缩',
                description: '指定输出质量，体积由画质决定',
              },
              {
                value: 'target',
                label: '按大小压缩',
                description: '指定目标体积，自动寻找最佳参数',
                badge: '推荐',
              },
            ]}
          />

          {mode === 'quality' ? (
            <SliderField
              label="输出质量"
              value={quality}
              min={10}
              max={100}
              step={1}
              onChange={setQuality}
              format={(v) => `${v}%`}
              hint="80% 通常肉眼难辨"
            />
          ) : (
            <div className="field">
              <span className="field-label">目标大小</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  style={{ width: 92 }}
                  type="number"
                  min={1}
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                />
                <select
                  className="input"
                  style={{ width: 76 }}
                  value={targetUnit}
                  onChange={(e) => setTargetUnit(e.target.value as 'KB' | 'MB')}
                >
                  <option value="KB">KB</option>
                  <option value="MB">MB</option>
                </select>
              </div>
            </div>
          )}

          <div className="field">
            <span className="field-label">输出格式</span>
            <select
              className="input"
              style={{ width: 150 }}
              value={format}
              onChange={(e) => setFormat(e.target.value as FormatOption)}
            >
              <option value="original">保持原格式</option>
              <option value="jpeg">JPG（体积最小）</option>
              <option value="png">PNG（支持透明）</option>
              <option value="webp">WebP（同画质更小）</option>
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
            <input
              className="checkbox"
              type="checkbox"
              checked={limitSize}
              onChange={(e) => setLimitSize(e.target.checked)}
            />
            同时限制最大尺寸
          </label>

          {limitSize && (
            <div className="field">
              <span className="field-label">最长边</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  style={{ width: 86 }}
                  type="number"
                  min={16}
                  value={maxWidth}
                  onChange={(e) => setMaxWidth(e.target.value === '' ? '' : Number(e.target.value))}
                />
                <span className="field-hint">×</span>
                <input
                  className="input"
                  style={{ width: 86 }}
                  type="number"
                  min={16}
                  value={maxHeight}
                  onChange={(e) => setMaxHeight(e.target.value === '' ? '' : Number(e.target.value))}
                />
                <span className="field-hint">px</span>
              </div>
            </div>
          )}

          <ColorField
            label="透明底色"
            value={background}
            onChange={setBackground}
            hint="JPG 不支持透明"
          />

          {pngWarning && (
            <Notice kind="warn">
              PNG 是无损格式，不支持质量参数。若「按画质压缩」后体积没有变小甚至变大，属于正常现象 ——
              请改用 JPG / WebP 输出，或使用「按大小压缩」（会自动降低分辨率来达成目标）。
            </Notice>
          )}
        </>
      }
      resultNotice={
        <Notice kind="info">
          压缩过程完全在本地进行。如果某张图压缩后反而变大，说明原图已经被高度优化过，
          建议改用 WebP 输出，或适当降低质量参数。
        </Notice>
      }
    />
  )
}

