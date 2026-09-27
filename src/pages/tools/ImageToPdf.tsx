import { useState } from 'react'
import { ToolPage } from '../../components/ToolPage'
import { ColorField, Notice, OptionCards, Segmented, SliderField } from '../../components/controls'
import { useToolJob, type ToolWorker } from '../../hooks/useToolJob'
import { imagesToPdf } from '../../lib/pdf/convert'
import { makePdfThumbnail } from '../../lib/pdf/thumb'
import { formatBytes } from '../../lib/format'
import type { OutputFile } from '../../lib/types'

type PageSize = 'fit' | 'a4' | 'a4-landscape' | 'letter' | 'letter-landscape'
type Fit = 'contain' | 'cover' | 'stretch'

const MM_TO_PT = 72 / 25.4

export default function ImageToPdf() {
  const job = useToolJob()

  const [pageSize, setPageSize] = useState<PageSize>('fit')
  const [marginMm, setMarginMm] = useState(0)
  const [fit, setFit] = useState<Fit>('contain')
  const [background, setBackground] = useState('#ffffff')
  const [quality, setQuality] = useState(0.9)

  const worker: ToolWorker = async (files, report, signal) => {
    const items = files.map((f) => ({ data: f.file, name: f.file.name, type: f.file.type }))

    const bytes = await imagesToPdf(
      items,
      {
        pageSize,
        margin: Math.round(marginMm * MM_TO_PT),
        fit,
        background,
        quality,
      },
      (percent, message) => {
        if (signal.aborted) return
        report(percent, message)
      },
    )

    if (signal.aborted) throw new DOMException('已取消', 'AbortError')

    report(97, '正在生成预览')
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
    const previewUrl = await makePdfThumbnail(bytes)

    const name = singleName(files[0]?.file.name, files.length)

    return [
      {
        name,
        blob,
        size: blob.size,
        type: 'application/pdf',
        previewUrl,
        note: `${files.length} 张图片 · ${pageSizeLabel(pageSize)} · 共 ${files.length} 页`,
      } satisfies OutputFile,
    ]
  }

  return (
    <ToolPage
      toolId="image-to-pdf"
      job={job}
      onRun={() => job.run(worker)}
      actionLabel="生成 PDF"
      actionHint={`${job.files.length} 张图片将合成 1 个 PDF 文件`}
      fileVariant="thumbs"
      optionsTitle="PDF 设置"
      zipBaseName="images_pdf"
      resultNotice={
        <Notice kind="info">
          生成的 PDF 中图片按原分辨率嵌入，文字部分不存在（因为来源是图片），
          因此无法在 PDF 里选中或搜索文字。
        </Notice>
      }
      options={
        <>
          <div className="field">
            <span className="field-label">页面尺寸</span>
            <select
              className="input"
              style={{ width: '100%' }}
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as PageSize)}
            >
              <option value="fit">跟随图片尺寸（无边距）</option>
              <option value="a4">A4 纵向 210×297mm</option>
              <option value="a4-landscape">A4 横向 297×210mm</option>
              <option value="letter">Letter 纵向 8.5×11in</option>
              <option value="letter-landscape">Letter 横向 11×8.5in</option>
            </select>
          </div>

          {pageSize !== 'fit' && (
            <>
              <SliderField
                label="页面边距"
                value={marginMm}
                min={0}
                max={50}
                onChange={setMarginMm}
                format={(v) => `${v} mm`}
              />

              <div className="field" style={{ alignItems: 'flex-start' }}>
                <span className="field-label" style={{ paddingTop: 6 }}>
                  图片适配
                </span>
                <Segmented
                  value={fit}
                  onChange={setFit}
                  options={[
                    { value: 'contain', label: '完整显示', title: '保持比例完整放入页面' },
                    { value: 'cover', label: '铺满裁切', title: '填满整页，超出部分裁掉' },
                    { value: 'stretch', label: '拉伸', title: '强制拉伸到整页，会变形' },
                  ]}
                />
              </div>
            </>
          )}

          <ColorField label="背景颜色" value={background} onChange={setBackground} hint="留白与透明区域" />

          <SliderField
            label="图片压缩质量"
            value={Math.round(quality * 100)}
            min={50}
            max={100}
            onChange={(v) => setQuality(v / 100)}
            format={(v) => `${v}%`}
            hint="90% 以上基本无损"
          />

          <Notice kind="info">
            手机拍摄的照片直接转 PDF，每个文件动辄 3~5MB。如果 PDF 太大，
            可以先用「图片压缩」处理，或者生成后用「PDF 压缩」再压一次。
          </Notice>
        </>
      }
    />
  )
}

function singleName(firstName: string | undefined, count: number): string {
  if (count === 1 && firstName) {
    return firstName.replace(/\.[^.]+$/, '') + '.pdf'
  }
  return `合并图片_${count}张.pdf`
}

function pageSizeLabel(size: PageSize): string {
  const map: Record<PageSize, string> = {
    fit: '跟随图片',
    a4: 'A4',
    'a4-landscape': 'A4 横向',
    letter: 'Letter',
    'letter-landscape': 'Letter 横向',
  }
  return map[size]
}

export { formatBytes, OptionCards }
