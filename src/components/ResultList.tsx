import { useState } from 'react'
import type { OutputFile } from '../lib/types'
import { formatBytes, formatSavings, truncateMiddle } from '../lib/format'
import { downloadBlob, downloadMany, suggestZipName, zipAndDownload } from '../lib/download'
import { IconCheck, IconDownload, IconLoader } from './icons'
import { Lightbox } from './SourceFileList'
import { Notice } from './controls'

export interface ResultListProps {
  results: OutputFile[]
  /** 打包下载的 zip 名称前缀 */
  zipBaseName?: string
  title?: string
  onReset?: () => void
  /** 附加操作按钮 */
  extraActions?: React.ReactNode
  /** 展示体积对比 */
  showSavings?: boolean
  /** 结果项的说明性提示 */
  notice?: React.ReactNode
}

export function ResultList({
  results,
  zipBaseName = 'docbox_output',
  title,
  onReset,
  extraActions,
  showSavings = true,
  notice,
}: ResultListProps) {
  const [zipping, setZipping] = useState(false)
  const [zipProgress, setZipProgress] = useState(0)
  const [zoom, setZoom] = useState<string | null>(null)

  if (results.length === 0) return null

  const totalSize = results.reduce((sum, r) => sum + r.size, 0)
  const originTotal = results.reduce((sum, r) => sum + (r.originSize ?? 0), 0)
  const hasOrigin = results.some((r) => typeof r.originSize === 'number' && r.originSize > 0)

  const handleZip = async () => {
    setZipping(true)
    setZipProgress(0)
    try {
      await zipAndDownload(results, suggestZipName(zipBaseName), (p) => setZipProgress(p))
    } finally {
      setZipping(false)
      setZipProgress(0)
    }
  }

  return (
    <section className="panel fade-in">
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#f0f9eb',
              color: '#529b2e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: '0 0 auto',
            }}
          >
            <IconCheck size={15} />
          </span>
          <div>
            <h3 className="panel-title" style={{ margin: 0 }}>
              {title ?? `处理完成，共 ${results.length} 个文件`}
            </h3>
            <div style={{ fontSize: 12.5, color: 'var(--color-ink-500)' }}>
              输出总大小 {formatBytes(totalSize)}
              {hasOrigin && originTotal > 0 && showSavings && (
                <>
                  {' · '}
                  原始 {formatBytes(originTotal)}
                  {'，'}
                  <span style={{ color: '#529b2e' }}>
                    减少 {formatSavings(originTotal, totalSize)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {extraActions}
          {results.length > 1 && (
            <button className="btn btn-default" onClick={() => downloadMany(results)} disabled={zipping}>
              <IconDownload size={16} />
              逐个下载
            </button>
          )}
          {results.length > 1 ? (
            <button className="btn btn-primary" onClick={handleZip} disabled={zipping}>
              {zipping ? <IconLoader size={16} className="spin" /> : <IconDownload size={16} />}
              {zipping ? `打包中 ${zipProgress}%` : '打包下载 ZIP'}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => downloadBlob(results[0].blob, results[0].name)}
            >
              <IconDownload size={16} />
              下载文件
            </button>
          )}
          {onReset && (
            <button className="btn btn-ghost" onClick={onReset}>
              再处理一批
            </button>
          )}
        </div>
      </header>

      {notice}

      <div style={{ display: 'grid', gap: 8 }}>
        {results.map((result, index) => (
          <div key={`${result.name}-${index}`} className="result-row" style={{ marginTop: 0 }}>
            {result.previewUrl ? (
              <img
                className="result-thumb"
                src={result.previewUrl}
                alt=""
                style={{ cursor: 'zoom-in' }}
                onClick={() => setZoom(result.previewUrl!)}
              />
            ) : (
              <span
                className="result-thumb"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#e8503a',
                }}
              >
                {(result.name.split('.').pop() ?? '').slice(0, 4).toUpperCase()}
              </span>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={result.name}
              >
                {truncateMiddle(result.name, 56)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-ink-500)', marginTop: 1 }}>
                {formatBytes(result.size)}
                {result.originSize ? (
                  <>
                    {' · '}
                    <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>
                      {formatBytes(result.originSize)}
                    </span>
                    {result.originSize > result.size && (
                      <span style={{ color: '#529b2e' }}>
                        {' '}
                        −{formatSavings(result.originSize, result.size)}
                      </span>
                    )}
                  </>
                ) : null}
                {result.note ? ` · ${result.note}` : ''}
              </div>
            </div>

            <button
              className="btn btn-default btn-sm"
              onClick={() => downloadBlob(result.blob, result.name)}
            >
              <IconDownload size={15} />
              下载
            </button>
          </div>
        ))}
      </div>

      {results.length > 1 && (
        <div style={{ marginTop: 14 }}>
          <Notice kind="info">
            多个文件建议直接「打包下载 ZIP」，浏览器只会弹出一次保存框。ZIP 采用仅存储模式打包，
            不重新压缩，因此速度很快、体积也不会额外膨胀。
          </Notice>
        </div>
      )}

      {zoom && <Lightbox url={zoom} onClose={() => setZoom(null)} />}
    </section>
  )
}
