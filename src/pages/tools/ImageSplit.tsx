import { useState } from 'react'
import { ToolPage } from '../../components/ToolPage'
import { ColorField, Notice, OptionCards, SliderField } from '../../components/controls'
import { useToolJob, type ToolWorker } from '../../hooks/useToolJob'
import { processFileList } from '../../lib/image/batch'
import { loadImageFile } from '../../lib/image/core'
import { splitByFixedSize, splitByGrid, type SplitTile } from '../../lib/image/ops'
import {
  FORMAT_EXT,
  baseName,
  detectFormat,
  encodeCanvas,
  uniqueName,
  type ImageFormat,
} from '../../lib/image/encode'
import { formatDimensions } from '../../lib/format'
import type { OutputFile } from '../../lib/types'

type Mode = 'grid' | 'fixed'

export default function ImageSplit() {
  const job = useToolJob()

  const [mode, setMode] = useState<Mode>('grid')
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  const [tileWidth, setTileWidth] = useState<number | ''>(1080)
  const [tileHeight, setTileHeight] = useState<number | ''>(1080)
  const [gap, setGap] = useState(0)
  const [overlap, setOverlap] = useState(0)
  const [format, setFormat] = useState<ImageFormat>('jpeg')
  const [quality, setQuality] = useState(92)
  const [background, setBackground] = useState('#ffffff')

  const worker: ToolWorker = async (files, report, signal) => {
    const outputs: OutputFile[] = []
    const used = new Set<string>()

    await processFileList(
      files,
      report,
      signal,
      async ({ file, report: scoped }) => {
        const loaded = await loadImageFile(file.file, { maxDimension: 20000 })
        try {
          scoped(45, `正在切分 ${file.file.name}`)

          let tiles: SplitTile[]
          if (mode === 'grid') {
            tiles = splitByGrid(loaded.source, loaded.width, loaded.height, {
              rows,
              cols,
              gap,
              overlap,
            })
          } else {
            if (!tileWidth || !tileHeight) throw new Error('请填写每块的宽高')
            tiles = splitByFixedSize(loaded.source, loaded.width, loaded.height, {
              tileWidth: Number(tileWidth),
              tileHeight: Number(tileHeight),
              overlap,
            })
          }

          const base = baseName(file.file.name)

          for (const tile of tiles) {
            if (signal.aborted) throw new DOMException('已取消', 'AbortError')
            const blob = await encodeCanvas(tile.canvas, {
              format,
              quality: quality / 100,
              background,
            })
            outputs.push({
              name: uniqueName(`${base}_r${tile.row + 1}c${tile.col + 1}.${FORMAT_EXT[format]}`, used),
              blob,
              size: blob.size,
              type: blob.type,
              previewUrl: URL.createObjectURL(blob),
              note: `第 ${tile.row + 1} 行第 ${tile.col + 1} 列 · ${formatDimensions(tile.width, tile.height)}`,
            })
          }
          scoped(100)
        } finally {
          loaded.dispose()
        }
      },
      '正在分割图片',
    )

    return outputs
  }

  const totalTiles = mode === 'grid' ? rows * cols : undefined

  return (
    <ToolPage
      toolId="image-split"
      job={job}
      onRun={() => job.run(worker)}
      actionLabel="开始分割"
      actionHint={
        totalTiles
          ? `每张图会切成 ${totalTiles} 张`
          : '块数由图片尺寸自动决定'
      }
      fileVariant="thumbs"
      optionsTitle="分割方式"
      zipBaseName="split"
      validate={() => (mode === 'fixed' && (!tileWidth || !tileHeight) ? '请填写每块的宽度和高度' : null)}
      options={
        <>
          <OptionCards
            value={mode}
            onChange={setMode}
            options={[
              { value: 'grid', label: '按行列均分', description: '九宫格切图，各块尺寸自动均分' },
              { value: 'fixed', label: '按固定尺寸', description: '每块指定像素尺寸，末尾可能不满' },
            ]}
          />

          {mode === 'grid' ? (
            <>
              <div className="field">
                <span className="field-label">行数 × 列数</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    className="input"
                    style={{ width: 72 }}
                    type="number"
                    min={1}
                    max={20}
                    value={rows}
                    onChange={(e) => setRows(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  />
                  <span className="field-hint">行</span>
                  <span style={{ color: 'var(--color-ink-300)' }}>×</span>
                  <input
                    className="input"
                    style={{ width: 72 }}
                    type="number"
                    min={1}
                    max={20}
                    value={cols}
                    onChange={(e) => setCols(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  />
                  <span className="field-hint">列</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { label: '2×2', r: 2, c: 2 },
                  { label: '3×3 九宫格', r: 3, c: 3 },
                  { label: '1×3 长图切段', r: 3, c: 1 },
                  { label: '3×1 横切', r: 1, c: 3 },
                  { label: '4×4', r: 4, c: 4 },
                ].map((quick) => (
                  <button
                    key={quick.label}
                    className="btn btn-default btn-sm"
                    onClick={() => {
                      setRows(quick.r)
                      setCols(quick.c)
                    }}
                  >
                    {quick.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="field">
              <span className="field-label">每块尺寸</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  style={{ width: 88 }}
                  type="number"
                  min={8}
                  value={tileWidth}
                  onChange={(e) => setTileWidth(e.target.value === '' ? '' : Number(e.target.value))}
                />
                <span className="field-hint">×</span>
                <input
                  className="input"
                  style={{ width: 88 }}
                  type="number"
                  min={8}
                  value={tileHeight}
                  onChange={(e) => setTileHeight(e.target.value === '' ? '' : Number(e.target.value))}
                />
                <span className="field-hint">px</span>
              </div>
            </div>
          )}

          <SliderField
            label="块间距"
            value={gap}
            min={0}
            max={40}
            onChange={setGap}
            format={(v) => (v === 0 ? '无' : `${v} px`)}
            hint="仅行列均分模式生效"
          />

          <SliderField
            label="边缘重叠"
            value={overlap}
            min={0}
            max={40}
            onChange={setOverlap}
            format={(v) => (v === 0 ? '无' : `${v} px`)}
            hint="避免文字被切断"
          />

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
              min={40}
              max={100}
              onChange={setQuality}
              format={(v) => `${v}%`}
            />
          )}

          <ColorField label="底色" value={background} onChange={setBackground} />

          <Notice kind="info">
            九宫格切图用于社交平台发布时，建议行数列数都填 3，块间距填 0，
            平台会重新拼接成一整张图。
          </Notice>
        </>
      }
    />
  )
}

export { detectFormat }
