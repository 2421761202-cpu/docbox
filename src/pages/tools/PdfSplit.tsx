import { useMemo, useState } from 'react'
import { ToolPage } from '../../components/ToolPage'
import { Notice, OptionCards, NumberField, TextField } from '../../components/controls'
import { useToolJob, type ToolWorker } from '../../hooks/useToolJob'
import { useFileBytes } from '../../hooks/useFileBytes'
import { usePdfInfo } from '../../hooks/usePdfPreview'
import { formatPageRanges, parsePageRanges, splitPdf, type SplitMode } from '../../lib/pdf/edit'
import { splitRangeSegments } from '../../lib/pdf/ranges'
import { makePdfThumbnail } from '../../lib/pdf/thumb'
import type { OutputFile } from '../../lib/types'

export default function PdfSplit() {
  const job = useToolJob()
  const first = job.files[0]
  const { bytes } = useFileBytes(first?.file)
  const { info, error: infoError } = usePdfInfo(bytes)

  const [mode, setMode] = useState<SplitMode>('each')
  const [pagesPerFile, setPagesPerFile] = useState<number | ''>(5)
  const [fileCount, setFileCount] = useState<number | ''>(2)
  const [ranges, setRanges] = useState('')

  const pageCount = info?.pageCount ?? 0
  const parsedRanges = pageCount > 0 && ranges.trim() ? parsePageRanges(ranges, pageCount) : null

  /**
   * ranges 模式下每个逗号片段会生成一个文件，所以要按片段统计，
   * 而不是统计解析出的总页数。分段规则与 splitPdf 共用同一个函数，避免两处不一致。
   */
  const rangeSegments = useMemo(() => {
    if (pageCount === 0 || !ranges.trim()) return []
    return splitRangeSegments(ranges).map((segment) => ({
      segment,
      parsed: parsePageRanges(segment, pageCount),
    }))
  }, [ranges, pageCount])

  const outputEstimate = (() => {
    if (pageCount === 0) return undefined
    if (mode === 'each') return `将生成 ${pageCount} 个 PDF 文件`
    if (mode === 'fixed' && pagesPerFile)
      return `将生成 ${Math.ceil(pageCount / Number(pagesPerFile))} 个 PDF 文件`
    if (mode === 'count' && fileCount) return `将生成 ${Number(fileCount)} 个 PDF 文件`
    if (mode === 'ranges' && rangeSegments.length > 0)
      return `将生成 ${rangeSegments.length} 个 PDF 文件`
    return undefined
  })()

  const worker: ToolWorker = async (files, report, signal) => {
    if (files.length > 1) {
      throw new Error('拆分工具一次只处理一个 PDF 文件，请先移除多余文件或分批处理。')
    }
    if (!bytes) throw new Error('文件还在读取中，请稍候再试')

    const source = new Uint8Array(await files[0].file.arrayBuffer())
    const baseName = files[0].file.name.replace(/\.pdf$/i, '')

    const results = await splitPdf(
      source,
      {
        mode,
        pagesPerFile: pagesPerFile ? Number(pagesPerFile) : undefined,
        fileCount: fileCount ? Number(fileCount) : undefined,
        ranges,
      },
      baseName,
      (percent, message) => {
        if (!signal.aborted) report(percent, message)
      },
    )

    if (signal.aborted) throw new DOMException('已取消', 'AbortError')

    const outputs: OutputFile[] = []
    const wantPreview = results.length <= 12

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      report(80 + Math.round(((i + 1) / results.length) * 18), `正在生成预览 ${i + 1}/${results.length}`)
      const blob = new Blob([result.bytes as unknown as BlobPart], { type: 'application/pdf' })
      outputs.push({
        name: result.name,
        blob,
        size: blob.size,
        type: 'application/pdf',
        previewUrl: wantPreview ? await makePdfThumbnail(result.bytes, 160) : undefined,
        note: `${result.pages.length} 页（第 ${result.pages[0]}–${result.pages[result.pages.length - 1]} 页）`,
      })
    }

    return outputs
  }

  return (
    <ToolPage
      toolId="pdf-split"
      job={job}
      onRun={() => job.run(worker)}
      actionLabel="开始拆分"
      actionHint={outputEstimate}
      maxFiles={1}
      fileVariant="list"
      optionsTitle="拆分方式"
      zipBaseName="split_pdf"
      validate={(files) => (files.length > 1 ? '拆分一次只处理一个文件，请先移除多余文件' : null)}
      resultNotice={
        <Notice kind="info">
          拆分会生成多个文件，点击「打包下载 ZIP」可以一次全部拿到。拆分属于无损操作，
          每个文件里的文字仍然可以选中和搜索。
        </Notice>
      }
      options={
        <>
          {infoError && <Notice kind="error">{infoError}</Notice>}

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
              这个 PDF 共 <strong className="mono-num">{pageCount}</strong> 页
            </div>
          )}

          <OptionCards
            value={mode}
            onChange={setMode}
            options={[
              { value: 'each' as SplitMode, label: '每页一个文件', description: '按单页拆开，适合拆分扫描件' },
              { value: 'fixed' as SplitMode, label: '每 N 页一个', description: '按固定页数切分' },
              { value: 'count' as SplitMode, label: '平均分成 N 份', description: '尽可能均分为指定份数' },
              { value: 'ranges' as SplitMode, label: '自定义范围', description: '按页码范围提取，如 1-3,7,10-12' },
            ]}
          />

          {mode === 'fixed' && (
            <NumberField
              label="每个文件包含页数"
              value={pagesPerFile}
              onChange={setPagesPerFile}
              min={1}
              max={pageCount || 9999}
              suffix="页"
            />
          )}

          {mode === 'count' && (
            <NumberField
              label="拆分成几份"
              value={fileCount}
              onChange={setFileCount}
              min={2}
              max={Math.max(2, pageCount || 100)}
              suffix="份"
            />
          )}

          {mode === 'ranges' && (
            <>
              <TextField
                label="页码范围"
                value={ranges}
                onChange={setRanges}
                placeholder="例如 1-3, 5, 8-10"
                hint="英文逗号分隔，每个范围会生成一个独立 PDF"
              />
              {parsedRanges && parsedRanges.warnings.length > 0 && (
                <Notice kind="warn">
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {parsedRanges.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </Notice>
              )}
              {rangeSegments.some((item) => item.parsed.pages.length === 0) && (
                <Notice kind="warn">
                  这些范围没有匹配到任何页面，请检查页码是否超出 1–{pageCount}：
                  {rangeSegments
                    .filter((item) => item.parsed.pages.length === 0)
                    .map((item) => `「${item.segment}」`)
                    .join('、')}
                </Notice>
              )}
              {rangeSegments.length > 0 && (
                <div className="field-hint" style={{ lineHeight: 1.8 }}>
                  {rangeSegments.map((item, index) => (
                    <div key={`${item.segment}-${index}`}>
                      第 {index + 1} 个文件：
                      {item.parsed.pages.length > 0
                        ? `第 ${formatPageRanges(item.parsed.pages)} 页（共 ${item.parsed.pages.length} 页）`
                        : `「${item.segment}」没有匹配到页面`}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <Notice kind="info">
            如果只是想删掉几页而不是全部拆开，用「PDF 删页面」更合适；
            想按范围抽取并合成一个新文件，用「PDF 提取页面」。
          </Notice>
        </>
      }
    />
  )
}
