import { useState } from 'react'
import { ToolPage } from '../../components/ToolPage'
import { ColorField, Notice, OptionCards, Segmented, SliderField } from '../../components/controls'
import { useToolJob, type ToolWorker } from '../../hooks/useToolJob'
import { loadImageFile, type LoadedImage } from '../../lib/image/core'
import { concatImages, type ConcatItem } from '../../lib/image/ops'
import { FORMAT_EXT, encodeCanvas, type ImageFormat } from '../../lib/image/encode'
import { formatDimensions } from '../../lib/format'
import type { OutputFile } from '../../lib/types'

type Direction = 'vertical' | 'horizontal' | 'grid'
type Align = 'start' | 'center' | 'end'
type Sizing = 'uniform' | 'original'

const MAX_CONCAT = 40

export default function ImageConcat() {
  const job = useToolJob()

  const [direction, setDirection] = useState<Direction>('vertical')
  const [gap, setGap] = useState(0)
  const [padding, setPadding] = useState(0)
  const [background, setBackground] = useState('#ffffff')
  const [align, setAlign] = useState<Align>('center')
  const [sizing, setSizing] = useState<Sizing>('uniform')
  const [targetWidth, setTargetWidth] = useState<number | ''>('')
  const [columns, setColumns] = useState(3)
  const [radius, setRadius] = useState(0)
  const [format, setFormat] = useState<ImageFormat>('jpeg')
  const [quality, setQuality] = useState(92)

  const worker: ToolWorker = async (files, report, signal) => {
    if (files.length > MAX_CONCAT) {
      throw new Error(`一次最多拼接 ${MAX_CONCAT} 张图片，当前选择了 ${files.length} 张，请分批处理。`)
    }

    report(3, `正在读取 ${files.length} 张图片`)
    const loadedList: LoadedImage[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        if (signal.aborted) throw new DOMException('已取消', 'AbortError')
        const loaded = await loadImageFile(files[i].file, { maxDimension: 10000 })
        loadedList.push(loaded)
        report(3 + Math.round(((i + 1) / files.length) * 45), `已读取 ${i + 1}/${files.length}`)
        await new Promise((r) => setTimeout(r, 0))
      }

      const items: ConcatItem[] = loadedList.map((loaded, index) => ({
        source: loaded.source,
        width: loaded.width,
        height: loaded.height,
        name: files[index].file.name,
      }))

      report(60, '正在拼接')
      const result = concatImages(items, {
        direction,
        gap,
        padding,
        background,
        align,
        sizing,
        targetWidth: targetWidth ? Number(targetWidth) : undefined,
        columns,
        radius,
      })

      report(82, '正在导出')
      const blob = await encodeCanvas(result.canvas, {
        format,
        quality: quality / 100,
        background,
      })

      report(100, '拼接完成')

      return [
        {
          name: `拼接结果_${result.width}x${result.height}.${FORMAT_EXT[format]}`,
          blob,
          size: blob.size,
          type: blob.type,
          previewUrl: URL.createObjectURL(blob),
          note: `${items.length} 张图片拼成 ${formatDimensions(result.width, result.height)}`,
        } satisfies OutputFile,
      ]
    } finally {
      loadedList.forEach((loaded) => loaded.dispose())
    }
  }

  const tooMany = job.files.length > MAX_CONCAT

  return (
    <ToolPage
      toolId="image-concat"
      job={job}
      onRun={() => job.run(worker)}
      actionLabel="开始拼接"
      actionHint={`将按当前顺序拼接 ${job.files.length} 张图片`}
      fileVariant="thumbs"
      optionsTitle="拼接方式"
      zipBaseName="concat"
      validate={() =>
        tooMany ? `一次最多拼接 ${MAX_CONCAT} 张，当前 ${job.files.length} 张，请分批处理` : null
      }
      options={
        <>
          <OptionCards
            value={direction}
            onChange={setDirection}
            options={[
              { value: 'vertical', label: '纵向拼接', description: '从上到下连成长图' },
              { value: 'horizontal', label: '横向拼接', description: '从左到右排成横图' },
              { value: 'grid', label: '宫格拼接', description: '按列数排列成网格' },
            ]}
          />

          {direction === 'grid' && (
            <div className="field">
              <span className="field-label">每行几列</span>
              <input
                className="input"
                style={{ width: 80 }}
                type="number"
                min={1}
                max={10}
                value={columns}
                onChange={(e) => setColumns(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              />
            </div>
          )}

          <div className="field" style={{ alignItems: 'flex-start' }}>
            <span className="field-label" style={{ paddingTop: 6 }}>
              尺寸处理
            </span>
            <Segmented
              value={sizing}
              onChange={setSizing}
              options={[
                { value: 'uniform', label: '统一尺寸', title: '自动缩放，拼接边缘整齐' },
                { value: 'original', label: '保持原尺寸', title: '不做缩放，可能出现错位' },
              ]}
            />
          </div>

          {sizing === 'uniform' && direction !== 'horizontal' && (
            <div className="field">
              <span className="field-label">统一宽度</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  style={{ width: 96 }}
                  type="number"
                  min={16}
                  placeholder="自动"
                  value={targetWidth}
                  onChange={(e) => setTargetWidth(e.target.value === '' ? '' : Number(e.target.value))}
                />
                <span className="field-hint">px，留空取最宽者</span>
              </div>
            </div>
          )}

          <SliderField
            label="图片间距"
            value={gap}
            min={0}
            max={100}
            onChange={setGap}
            format={(v) => (v === 0 ? '无' : `${v} px`)}
          />

          <SliderField
            label="四周留白"
            value={padding}
            min={0}
            max={120}
            onChange={setPadding}
            format={(v) => (v === 0 ? '无' : `${v} px`)}
          />

          <SliderField
            label="圆角"
            value={radius}
            min={0}
            max={80}
            onChange={setRadius}
            format={(v) => (v === 0 ? '无' : `${v} px`)}
          />

          <div className="field" style={{ alignItems: 'flex-start' }}>
            <span className="field-label" style={{ paddingTop: 6 }}>
              对齐方式
            </span>
            <Segmented
              value={align}
              onChange={setAlign}
              options={[
                { value: 'start', label: '左/上' },
                { value: 'center', label: '居中' },
                { value: 'end', label: '右/下' },
              ]}
            />
          </div>

          <ColorField label="背景颜色" value={background} onChange={setBackground} />

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

          <Notice kind="info">
            拼接顺序就是左侧文件列表的顺序，可以直接拖动缩略图调整。
            长图拼接时如果总高度超过 32000px，浏览器画布会失败，请先压缩或分批处理。
          </Notice>
        </>
      }
    />
  )
}
