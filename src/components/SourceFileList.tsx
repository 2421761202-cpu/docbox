import { useState } from 'react'
import type { SourceFile } from '../lib/types'
import { formatBytes, truncateMiddle } from '../lib/format'
import { IconArrowDown, IconArrowUp, IconClose, IconPdf, IconPlus } from './icons'
import { FileDropzone } from './FileDropzone'

export interface SourceFileListProps {
  files: SourceFile[]
  variant?: 'list' | 'thumbs'
  onRemove: (id: string) => void
  onMove?: (id: string, delta: number) => void
  onReorder?: (from: number, to: number) => void
  onClear?: () => void
  disabled?: boolean
  /** 列表下方附加的「继续添加」按钮配置 */
  addMore?: { accept: string; multiple: boolean; onFiles: (files: File[]) => void }
  emptyText?: string
}

export function SourceFileList({
  files,
  variant = 'list',
  onRemove,
  onMove,
  onReorder,
  onClear,
  disabled = false,
  addMore,
  emptyText = '还没有添加文件',
}: SourceFileListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)

  if (files.length === 0) {
    return (
      <div
        style={{
          padding: '18px 0',
          textAlign: 'center',
          color: 'var(--color-ink-500)',
          fontSize: 13,
        }}
      >
        {emptyText}
      </div>
    )
  }

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0)

  const header = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 12,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ fontSize: 13.5 }}>
        <strong style={{ fontWeight: 600 }}>{files.length}</strong>
        <span style={{ color: 'var(--color-ink-500)' }}> 个文件 · 共 {formatBytes(totalSize)}</span>
        {onReorder && files.length > 1 && (
          <span style={{ color: 'var(--color-ink-500)', marginLeft: 8 }}>
            （拖拽可调整顺序）
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {addMore && (
          <FileDropzone
            compact
            accept={addMore.accept}
            multiple={addMore.multiple}
            onFiles={addMore.onFiles}
            disabled={disabled}
          />
        )}
        {onClear && (
          <button className="btn btn-ghost btn-sm" onClick={onClear} disabled={disabled}>
            清空
          </button>
        )}
      </div>
    </div>
  )

  if (variant === 'thumbs') {
    return (
      <div>
        {header}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
            gap: 10,
          }}
        >
          {files.map((file, index) => (
            <div
              key={file.id}
              draggable={!disabled && !!onReorder}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => {
                e.preventDefault()
                setOverIndex(index)
              }}
              onDragEnd={() => {
                setDragIndex(null)
                setOverIndex(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragIndex !== null && onReorder && dragIndex !== index) {
                  onReorder(dragIndex, index)
                }
                setDragIndex(null)
                setOverIndex(null)
              }}
              style={{
                position: 'relative',
                border: `1px solid ${overIndex === index && dragIndex !== index ? 'var(--color-brand-500)' : 'var(--color-line)'}`,
                borderRadius: 8,
                overflow: 'hidden',
                background: '#fff',
                opacity: dragIndex === index ? 0.5 : 1,
                cursor: onReorder ? 'grab' : 'default',
              }}
            >
              <div
                style={{
                  height: 96,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--color-surface)',
                  cursor: file.previewUrl ? 'zoom-in' : 'default',
                }}
                onClick={() => file.previewUrl && setZoom(file.previewUrl)}
              >
                {file.previewUrl ? (
                  <img
                    src={file.previewUrl}
                    alt={file.file.name}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <IconPdf size={34} />
                )}
              </div>
              <div style={{ padding: '7px 8px' }}>
                <div
                  style={{
                    fontSize: 12,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={file.file.name}
                >
                  {truncateMiddle(file.file.name, 22)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-ink-500)', marginTop: 2 }}>
                  {file.width && file.height
                    ? `${file.width}×${file.height} · ${formatBytes(file.file.size)}`
                    : formatBytes(file.file.size)}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onRemove(file.id)}
                disabled={disabled}
                title="移除"
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 24,
                  height: 24,
                  padding: 0,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,.9)',
                  boxShadow: '0 1px 4px rgba(0,0,0,.12)',
                }}
              >
                <IconClose size={13} />
              </button>
            </div>
          ))}
        </div>
        {zoom && <Lightbox url={zoom} onClose={() => setZoom(null)} />}
      </div>
    )
  }

  return (
    <div>
      {header}
      <div style={{ display: 'grid', gap: 8 }}>
        {files.map((file, index) => (
          <div
            key={file.id}
            className="result-row"
            draggable={!disabled && !!onReorder}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => {
              e.preventDefault()
              setOverIndex(index)
            }}
            onDragEnd={() => {
              setDragIndex(null)
              setOverIndex(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (dragIndex !== null && onReorder && dragIndex !== index) onReorder(dragIndex, index)
              setDragIndex(null)
              setOverIndex(null)
            }}
            style={{
              marginTop: 0,
              opacity: dragIndex === index ? 0.5 : 1,
              borderColor:
                overIndex === index && dragIndex !== index ? 'var(--color-brand-500)' : undefined,
              cursor: onReorder ? 'grab' : 'default',
            }}
          >
            <span
              className="mono-num"
              style={{
                width: 22,
                flex: '0 0 22px',
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--color-ink-500)',
              }}
            >
              {index + 1}
            </span>

            {file.previewUrl ? (
              <img className="result-thumb" src={file.previewUrl} alt="" />
            ) : (
              <span
                className="result-thumb"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <IconPdf size={26} />
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
                title={file.file.name}
              >
                {file.file.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-ink-500)', marginTop: 1 }}>
                {formatBytes(file.file.size)}
                {file.width && file.height ? ` · ${file.width}×${file.height}` : ''}
              </div>
            </div>

            {onMove && files.length > 1 && (
              <span style={{ display: 'flex', gap: 2 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '0 6px', height: 26 }}
                  disabled={index === 0 || disabled}
                  onClick={() => onMove(file.id, -1)}
                  title="上移"
                >
                  <IconArrowUp size={14} />
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '0 6px', height: 26 }}
                  disabled={index === files.length - 1 || disabled}
                  onClick={() => onMove(file.id, 1)}
                  title="下移"
                >
                  <IconArrowDown size={14} />
                </button>
              </span>
            )}

            <button
              className="btn btn-danger-ghost btn-sm"
              onClick={() => onRemove(file.id)}
              disabled={disabled}
              title="移除"
            >
              <IconClose size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 图片放大预览 */
export function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        cursor: 'zoom-out',
      }}
    >
      <img
        src={url}
        alt=""
        style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 6 }}
      />
      <button
        className="btn btn-default btn-sm"
        onClick={onClose}
        style={{ position: 'fixed', top: 20, right: 20 }}
      >
        <IconClose size={15} /> 关闭
      </button>
    </div>
  )
}

export { IconPlus }
