import { useState } from 'react'
import { ToolPage } from '../../components/ToolPage'
import { ColorField, Notice, OptionCards, SliderField } from '../../components/controls'
import { useToolJob, type ToolWorker } from '../../hooks/useToolJob'
import { processFileList } from '../../lib/image/batch'
import { loadImageFile, toCanvas } from '../../lib/image/core'
import {
  FORMAT_EXT,
  detectFormat,
  encodeCanvas,
  outputName,
  supportsWebp,
  uniqueName,
  type ImageFormat,
} from '../../lib/image/encode'
import { formatDimensions, formatSavings } from '../../lib/format'
import type { OutputFile } from '../../lib/types'

type Target = 'jpeg' | 'png' | 'webp'

export default function ImageConvert() {
  const job = useToolJob()

  const [target, setTarget] = useState<Target>('jpeg')
  const [quality, setQuality] = useState(92)
  const [background, setBackground] = useState('#ffffff')
  const [skipSame, setSkipSame] = useState(true)

  const webpOk = supportsWebp()

  const worker: ToolWorker = async (files, report, signal) => {
    const outputs: OutputFile[] = []
    const used = new Set<string>()
    const wantPreview = files.length <= 24

    await processFileList(
      files,
      report,
      signal,
      async ({ file, report: scoped }) => {
        const sourceFormat = detectFormat(file.file)

        // 已经是目标格式时，可选直接跳过，避免无意义的重编码
        if (skipSame && sourceFormat === target) {
          scoped(100, `${file.file.name} 已是目标格式，跳过`)
          outputs.push({
            name: uniqueName(file.file.name, used),
            blob: file.file,
            size: file.file.size,
            type: file.file.type,
            originSize: file.file.size,
            note: '已是目标格式，未重新编码',
          })
          return
        }

        const loaded = await loadImageFile(file.file, { maxDimension: 12000 })
        try {
          scoped(55, `正在转换 ${file.file.name}`)
          const blob = await encodeCanvas(toCanvas(loaded.source, loaded.width, loaded.height), {
            format: target,
            quality: quality / 100,
            background,
          })

          outputs.push({
            name: uniqueName(outputName(file.file.name, '', FORMAT_EXT[target]), used),
            blob,
            size: blob.size,
            type: blob.type,
            originSize: file.file.size,
            previewUrl: wantPreview ? URL.createObjectURL(blob) : undefined,
            note: `${sourceFormat.toUpperCase()} → ${FORMAT_EXT[target].toUpperCase()} · ${formatDimensions(
              loaded.width,
              loaded.height,
            )}${
              file.file.size > blob.size
                ? ` · 体积减少 ${formatSavings(file.file.size, blob.size)}`
                : ''
            }`,
          })
          scoped(100)
        } finally {
          loaded.dispose()
        }
      },
      '正在转换格式',
    )

    return outputs
  }

  return (
    <ToolPage
      toolId="image-convert"
      job={job}
      onRun={() => job.run(worker)}
      actionLabel="开始转换"
      actionHint={`输出 ${FORMAT_EXT[target].toUpperCase()}`}
      fileVariant="thumbs"
      optionsTitle="转换设置"
      zipBaseName={`converted_${FORMAT_EXT[target]}`}
      options={
        <>
          <div className="field" style={{ alignItems: 'flex-start' }}>
            <span className="field-label" style={{ paddingTop: 6 }}>
              目标格式
            </span>
            <div style={{ display: 'grid', gap: 10, width: '100%' }}>
              <OptionCards
                value={target}
                onChange={setTarget}
                options={[
                  {
                    value: 'jpeg' as Target,
                    label: 'JPG',
                    description: '体积最小，通用性最好，不支持透明',
                  },
                  {
                    value: 'png' as Target,
                    label: 'PNG',
                    description: '无损、支持透明，体积较大',
                  },
                  {
                    value: 'webp' as Target,
                    label: 'WebP',
                    description: webpOk ? '同画质下比 JPG 小 25% 左右' : '当前浏览器不支持导出',
                    badge: webpOk ? '推荐' : undefined,
                  },
                ]}
              />
            </div>
          </div>

          {target !== 'png' && (
            <SliderField
              label="输出质量"
              value={quality}
              min={10}
              max={100}
              onChange={setQuality}
              format={(v) => `${v}%`}
            />
          )}

          <ColorField
            label="透明底色"
            value={background}
            onChange={setBackground}
            hint={target === 'png' ? 'PNG 保留透明，此项无效' : '透明像素将填充此颜色'}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
            <input
              className="checkbox"
              type="checkbox"
              checked={skipSame}
              onChange={(e) => setSkipSame(e.target.checked)}
            />
            已是目标格式的文件直接跳过转换
          </label>

          {!webpOk && (
            <Notice kind="warn">
              当前浏览器不支持导出 WebP，请改用 Chrome / Edge 的较新版本。
            </Notice>
          )}

          <Notice kind="info">
            PNG 截图转 JPG 通常能省下一大半体积；反过来，JPG 转 PNG 只会让文件更大，
            除非你确实需要透明通道。
          </Notice>
        </>
      }
    />
  )
}

export type { ImageFormat }
