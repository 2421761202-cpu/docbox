import { Notice } from './controls'
import { IconLoader } from './icons'

export interface PageThumb {
  pageNumber: number
  url: string
  width?: number
  height?: number
}

export interface PdfPageSelectorProps {
  thumbs: PageThumb[]
  /** 已选页码；传 null 表示"全选"语义 */
  selected: number[]
  onSelectedChange: (pages: number[]) => void
  loading?: boolean
  progress?: number
  error?: string | null
  /** 是否允许一个都不选（例如压缩/旋转允许） */
  allowEmpty?: boolean
  /** 是否允许选中全部（删除页面场景下需要防止全删） */
  maxSelectable?: number
  /** 覆盖默认提示文案 */
  hint?: string
  /** 点击缩略图时的行为，默认切换选中 */
  onThumbClick?: (pageNumber: number) => void
  /** 页码标记，例如旋转角度 */
  badge?: (pageNumber: number) => string | undefined
  /** 是否显示工具栏（全选/反选/清空） */
  showToolbar?: boolean
}

export function PdfPageSelector({
  thumbs,
  selected,
  onSelectedChange,
  loading,
  progress = 0,
  error,
  allowEmpty = true,
  maxSelectable,
  hint,
  onThumbClick,
  badge,
  showToolbar = true,
}: PdfPageSelectorProps) {
  const total = thumbs.length
  const selectedSet = new Set(selected)

  const toggle = (pageNumber: number) => {
    if (onThumbClick) {
      onThumbClick(pageNumber)
      return
    }
    const next = new Set(selectedSet)
    if (next.has(pageNumber)) {
      if (!allowEmpty && next.size === 1) return
      next.delete(pageNumber)
    } else {
      if (maxSelectable !== undefined && next.size >= maxSelectable) return
      next.add(pageNumber)
    }
    onSelectedChange([...next].sort((a, b) => a - b))
  }

  const selectAll = () => {
    const all = thumbs.map((t) => t.pageNumber)
    onSelectedChange(maxSelectable !== undefined ? all.slice(0, maxSelectable) : all)
  }

  const clearAll = () => {
    if (!allowEmpty) return
    onSelectedChange([])
  }

  const invert = () => {
    const next = thumbs.map((t) => t.pageNumber).filter((p) => !selectedSet.has(p))
    if (!allowEmpty && next.length === 0) return
    onSelectedChange(maxSelectable !== undefined ? next.slice(0, maxSelectable) : next)
  }

  if (error) {
    return <Notice kind="error">{error}</Notice>
  }

  if (loading && total === 0) {
    return (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'var(--color-ink-700)',
            marginBottom: 8,
          }}
        >
          <IconLoader size={15} className="spin" />
          正在生成页面缩略图… {progress}%
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div>
      {showToolbar && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--color-ink-700)' }}>
            已选 <strong className="mono-num">{selected.length}</strong> / {total} 页
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-default btn-sm" onClick={selectAll}>
              全选
            </button>
            <button className="btn btn-default btn-sm" onClick={invert}>
              反选
            </button>
            <button className="btn btn-default btn-sm" onClick={clearAll} disabled={!allowEmpty}>
              清空
            </button>
          </div>
        </div>
      )}

      {hint && (
        <div className="field-hint" style={{ marginBottom: 10 }}>
          {hint}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))',
          gap: 10,
          maxHeight: 430,
          overflowY: 'auto',
          padding: 2,
        }}
      >
        {thumbs.map((thumb) => {
          const isSelected = selectedSet.has(thumb.pageNumber)
          const mark = badge?.(thumb.pageNumber)
          return (
            <button
              key={thumb.pageNumber}
              onClick={() => toggle(thumb.pageNumber)}
              title={`第 ${thumb.pageNumber} 页`}
              style={{
                position: 'relative',
                padding: 5,
                borderRadius: 8,
                border: `2px solid ${isSelected ? 'var(--color-brand-500)' : 'var(--color-line)'}`,
                background: isSelected ? 'var(--color-brand-50)' : '#fff',
                cursor: 'pointer',
                transition: 'border-color .15s, background .15s',
              }}
            >
              <div
                style={{
                  background: '#f3f2ee',
                  borderRadius: 5,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 118,
                }}
              >
                <img
                  src={thumb.url}
                  alt={`第 ${thumb.pageNumber} 页`}
                  style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', objectFit: 'contain' }}
                />
              </div>

              <div
                style={{
                  fontSize: 11.5,
                  color: isSelected ? 'var(--color-brand-700)' : 'var(--color-ink-500)',
                  marginTop: 4,
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                第 {thumb.pageNumber} 页
                {mark ? ` · ${mark}` : ''}
              </div>

              {isSelected && (
                <span
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'var(--color-brand-500)',
                    color: '#fff',
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
