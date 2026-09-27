import { useState } from 'react'
import { ToolPage } from '../../components/ToolPage'
import { ColorField, Notice, OptionCards, Segmented } from '../../components/controls'
import { useToolJob, type ToolWorker } from '../../hooks/useToolJob'
import { processFileList } from '../../lib/image/batch'
import { coverCanvas, fitIntoCanvas, loadImageFile, resizeDraw } from '../../lib/image/core'
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

type Mode = 'pixel' | 'percent' | 'preset'
type FitMode = 'stretch' | 'contain' | 'cover'

interface Preset {
  id: string
  label: string
  width: number
  height: number
  group: string
}

const PRESETS: Preset[] = [
  { id: 'id-1', label: '一寸照 295×413', width: 295, height: 413, group: '证件照' },
  { id: 'id-2', label: '二寸照 413×579', width: 413, height: 579, group: '证件照' },
  { id: 'id-small', label: '小一寸 260×378', width: 260, height: 378, group: '证件照' },
  { id: 'id-big', label: '大一寸 390×567', width: 390, height: 567, group: '证件照' },
  { id: 'wx-cover', label: '公众号封面 900×383', width: 900, height: 383, group: '社交平台' },
  { id: 'square-1080', label: '朋友圈方图 1080×1080', width: 1080, height: 1080, group: '社交平台' },
  { id: 'avatar', label: '头像 640×640', width: 640, height: 640, group: '社交平台' },
  { id: 'video-cover', label: '视频封面 1920×1080', width: 1920, height: 1080, group: '社交平台' },
  { id: 'hd', label: '高清 1920×1080', width: 1920, height: 1080, group: '通用尺寸' },
  { id: 'sd', label: '标清 1280×720', width: 1280, height: 720, group: '通用尺寸' },
  { id: 'a4', label: 'A4 打印 2480×3508', width: 2480, height: 3508, group: '通用尺寸' },
  { id: 'a4-96', label: 'A4 屏幕 794×1123', width: 794, height: 1123, group: '通用尺寸' },
]

export default function ImageResize() {
  const job = useToolJob()

  const [mode, setMode] = useState<Mode>('pixel')
  const [width, setWidth] = useState<number | ''>(1280)
  const [height, setHeight] = useState<number | ''>(720)
  const [lockAspect, setLockAspect] = useState(true)
  const [percent, setPercent] = useState(50)
  const [presetId, setPresetId] = useState('hd')
  const [fitMode, setFitMode] = useState<FitMode>('contain')
  const [format, setFormat] = useState<FormatOption>('original')
  const [background, setBackground] = useState('#ffffff')

  const preset = PRESETS.find((p) => p.id === presetId)

  const targetLabel = (() => {
    if (mode === 'percent') return `缩放到 ${percent}%`
    if (mode === 'preset' && preset) return `${preset.width} × ${preset.height}`
    if (mode === 'pixel' && lockAspect && width) return `宽度固定为 ${width}px，高度按比例`
    if (mode === 'pixel' && width && height) return `${width} × ${height}`
    return undefined
  })()

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
          scoped(50, `正在调整 ${file.file.name}`)

          let canvas: HTMLCanvasElement

          if (mode === 'percent') {
            const w = Math.max(1, Math.round((loaded.width * percent) / 100))
            const h = Math.max(1, Math.round((loaded.height * percent) / 100))
            canvas = resizeDraw(loaded.source, loaded.width, loaded.height, w, h)
          } else if (mode === 'preset' && preset) {
            canvas = applyFit(
              loaded.source,
              loaded.width,
              loaded.height,
              preset.width,
              preset.height,
              fitMode,
              background,
            )
          } else {
            if (!width) throw new Error('请填写目标宽度')
            if (lockAspect || !height) {
              const w = Number(width)
              const h = Math.max(1, Math.round((loaded.height / loaded.width) * w))
              canvas = resizeDraw(loaded.source, loaded.width, loaded.height, w, h)
            } else {
              canvas = applyFit(
                loaded.source,
                loaded.width,
                loaded.height,
                Number(width),
                Number(height),
                fitMode,
                background,
              )
            }
          }

          const outFormat = resolveFormat(format, file.file)
          const blob = await encodeCanvas(canvas, { format: outFormat, quality: 0.92, background })

          outputs.push({
            name: uniqueName(outputName(file.file.name, '', FORMAT_EXT[outFormat]), used),
            blob,
            size: blob.size,
            type: blob.type,
            originSize: file.file.size,
            previewUrl: wantPreview ? URL.createObjectURL(blob) : undefined,
            note: `${formatDimensions(loaded.width, loaded.height)} → ${formatDimensions(canvas.width, canvas.height)}`,
          })
          scoped(100)
        } finally {
          loaded.dispose()
        }
      },
      '正在调整尺寸',
    )

    return outputs
  }

  return (
    <ToolPage
      toolId="image-resize"
      job={job}
      onRun={() => job.run(worker)}
      actionLabel="开始调整"
      actionHint={targetLabel}
      fileVariant="thumbs"
      optionsTitle="尺寸设置"
      zipBaseName="resized"
      options={
        <>
          <OptionCards
            value={mode}
            onChange={setMode}
            options={[
              { value: 'pixel', label: '按像素', description: '直接指定宽高' },
              { value: 'percent', label: '按百分比', description: '整体缩放' },
              { value: 'preset', label: '常用规格', description: '证件照 / 封面' },
            ]}
          />

          {mode === 'pixel' && (
            <>
              <div className="field">
                <span className="field-label">目标宽度</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    className="input"
                    style={{ width: 96 }}
                    type="number"
                    min={1}
                    value={width}
                    onChange={(e) => setWidth(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <span className="field-hint">px</span>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
                <input
                  className="checkbox"
                  type="checkbox"
                  checked={lockAspect}
                  onChange={(e) => setLockAspect(e.target.checked)}
                />
                保持宽高比（高度自动计算）
              </label>

              {!lockAspect && (
                <>
                  <div className="field">
                    <span className="field-label">目标高度</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        className="input"
                        style={{ width: 96 }}
                        type="number"
                        min={1}
                        value={height}
                        onChange={(e) => setHeight(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                      <span className="field-hint">px</span>
                    </div>
                  </div>

                  <div className="field" style={{ alignItems: 'flex-start' }}>
                    <span className="field-label" style={{ paddingTop: 6 }}>
                      填充方式
                    </span>
                    <Segmented
                      value={fitMode}
                      onChange={setFitMode}
                      options={[
                        { value: 'contain', label: '完整显示', title: '保持比例完整放入，不足处补底色' },
                        { value: 'cover', label: '填满裁切', title: '保持比例填满，超出部分裁掉' },
                        { value: 'stretch', label: '拉伸', title: '强制拉伸到目标尺寸，可能变形' },
                      ]}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {mode === 'percent' && (
            <div className="field">
              <span className="field-label">缩放比例</span>
              <input
                type="range"
                min={5}
                max={300}
                step={5}
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
              />
              <span className="mono-num" style={{ minWidth: 54, textAlign: 'right', fontSize: 13 }}>
                {percent}%
              </span>
            </div>
          )}

          {mode === 'preset' && (
            <>
              <div className="field">
                <span className="field-label">选择规格</span>
                <select
                  className="input"
                  style={{ width: '100%' }}
                  value={presetId}
                  onChange={(e) => setPresetId(e.target.value)}
                >
                  {['证件照', '社交平台', '通用尺寸'].map((group) => (
                    <optgroup key={group} label={group}>
                      {PRESETS.filter((p) => p.group === group).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="field" style={{ alignItems: 'flex-start' }}>
                <span className="field-label" style={{ paddingTop: 6 }}>
                  填充方式
                </span>
                <Segmented
                  value={fitMode}
                  onChange={setFitMode}
                  options={[
                    { value: 'contain', label: '完整显示', title: '证件照推荐：不裁切内容' },
                    { value: 'cover', label: '填满裁切', title: '封面图推荐：铺满整张画布' },
                    { value: 'stretch', label: '拉伸', title: '强制拉伸，可能变形' },
                  ]}
                />
              </div>
            </>
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
              <option value="jpeg">JPG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </div>

          <ColorField label="补边颜色" value={background} onChange={setBackground} hint="完整显示模式的留白" />

          <Notice kind="info">
            放大会损失细节：图片缩小采用逐级降采样、效果很好，但放大只是插值，画面会变软。
          </Notice>
        </>
      }
    />
  )
}

function applyFit(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  fitMode: FitMode,
  background: string,
): HTMLCanvasElement {
  if (fitMode === 'stretch') {
    return resizeDraw(source, srcW, srcH, targetW, targetH, background)
  }
  if (fitMode === 'cover') {
    return coverCanvas(source, srcW, srcH, targetW, targetH, background)
  }
  return fitIntoCanvas(source, srcW, srcH, targetW, targetH, background)
}

