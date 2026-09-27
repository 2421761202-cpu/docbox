import { useCallback, useRef, useState } from 'react'
import { IconUpload } from './icons'

export interface FileDropzoneProps {
  accept: string
  multiple: boolean
  onFiles: (files: File[]) => void
  disabled?: boolean
  title?: string
  hint?: string
  /** 紧凑模式（已有文件时继续添加） */
  compact?: boolean
  buttonLabel?: string
}

export function FileDropzone({
  accept,
  multiple,
  onFiles,
  disabled = false,
  title,
  hint,
  compact = false,
  buttonLabel,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list || list.length === 0) return
      onFiles(Array.from(list))
    },
    [onFiles],
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      depth.current = 0
      setDragging(false)
      if (disabled) return
      handleFiles(event.dataTransfer.files)
    },
    [disabled, handleFiles],
  )

  const onDragEnter = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      if (disabled) return
      depth.current += 1
      setDragging(true)
    },
    [disabled],
  )

  const onDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    depth.current -= 1
    if (depth.current <= 0) {
      depth.current = 0
      setDragging(false)
    }
  }, [])

  const openPicker = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  if (compact) {
    return (
      <>
        <button
          className="btn btn-default"
          onClick={openPicker}
          disabled={disabled}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <IconUpload size={16} />
          {buttonLabel ?? '继续添加文件'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </>
    )
  }

  return (
    <div
      className="dropzone"
      data-dragging={dragging}
      onClick={openPicker}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openPicker()
        }
      }}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: dragging ? 'var(--color-brand-100)' : 'var(--color-brand-50)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-brand-500)',
          transition: 'background .18s',
        }}
      >
        <IconUpload size={26} />
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
          {title ?? (dragging ? '松开鼠标即可添加' : '点击选择文件，或把文件拖到这里')}
        </div>
        {hint && <div style={{ fontSize: 12.5, color: 'var(--color-ink-500)' }}>{hint}</div>}
      </div>

      <span className="btn btn-primary" style={{ pointerEvents: 'none' }}>
        {buttonLabel ?? (multiple ? '选择文件（可多选）' : '选择文件')}
      </span>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
