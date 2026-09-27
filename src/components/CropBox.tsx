import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 归一化裁剪框（0~1 相对于原图）。
 * 用归一化而不是像素值，可以让同一套裁剪参数直接套用到整批图片。
 */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export const FULL_RECT: CropRect = { x: 0, y: 0, width: 1, height: 1 }

export interface CropBoxProps {
  src: string
  /** 原图宽高比（width/height），用于锁定比例 */
  imageAspect?: number
  rect: CropRect
  onChange: (rect: CropRect) => void
  /** null 表示自由裁剪 */
  aspect: number | null
  disabled?: boolean
  /** 图片真实像素尺寸回调（用于计算输出尺寸与比例） */
  onImageLoad?: (width: number, height: number) => void
}

type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e'

const MIN_SIZE = 0.02
const HANDLE_SIZE = 13

export function CropBox({ src, imageAspect, rect, onChange, aspect, disabled, onImageLoad }: CropBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{
    handle: Handle
    startX: number
    startY: number
    origin: CropRect
    boxW: number
    boxH: number
  } | null>(null)

  const onPointerDown = useCallback(
    (handle: Handle) => (event: React.PointerEvent) => {
      if (disabled) return
      const container = containerRef.current
      if (!container) return
      const bounds = container.getBoundingClientRect()
      event.preventDefault()
      event.stopPropagation()
      ;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
      dragRef.current = {
        handle,
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...rect },
        boxW: bounds.width,
        boxH: bounds.height,
      }
      setDragging(true)
    },
    [disabled, rect],
  )

  useEffect(() => {
    if (!dragging) return

    const handleMove = (event: PointerEvent) => {
      const state = dragRef.current
      if (!state) return

      const dx = (event.clientX - state.startX) / state.boxW
      const dy = (event.clientY - state.startY) / state.boxH
      const next = applyDrag(state.origin, state.handle, dx, dy, aspect, imageAspect)
      onChange(next)
    }

    const handleUp = () => {
      dragRef.current = null
      setDragging(false)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [dragging, aspect, imageAspect, onChange])

  const style = {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.width * 100}%`,
    height: `${rect.height * 100}%`,
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        background: '#ecebe7',
        borderRadius: 8,
        padding: 0,
        overflow: 'hidden',
      }}
    >
      {/* frame 收缩包裹图片，使百分比坐标严格对应图片本身，而不是留白后的容器 */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          display: 'inline-block',
          userSelect: 'none',
          touchAction: 'none',
          lineHeight: 0,
          maxWidth: '100%',
        }}
      >
        <img
          src={src}
          alt="裁剪预览"
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget
            if (img.naturalWidth && img.naturalHeight) {
              onImageLoad?.(img.naturalWidth, img.naturalHeight)
            }
          }}
          style={{
            display: 'block',
            width: 'auto',
            height: 'auto',
            maxWidth: '100%',
            maxHeight: 460,
          }}
        />

        {/* 暗化遮罩：用超大 box-shadow 实现，无需四个 div */}
        <div
          style={{
            position: 'absolute',
            ...style,
            boxShadow: '0 0 0 9999px rgba(0,0,0,.55)',
            outline: '1px solid rgba(255,255,255,.9)',
            cursor: disabled ? 'default' : 'move',
          }}
          onPointerDown={onPointerDown('move')}
        >
          {/* 三分线 */}
          <Grid />

          {!disabled &&
            (['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as Handle[]).map((handle) => (
              <span
                key={handle}
                onPointerDown={onPointerDown(handle)}
                style={{
                  position: 'absolute',
                  width: HANDLE_SIZE,
                  height: HANDLE_SIZE,
                  background: '#fff',
                  border: '1.5px solid var(--color-brand-500)',
                  borderRadius: 3,
                  ...handlePosition(handle),
                  cursor: handleCursor(handle),
                }}
              />
            ))}
        </div>
      </div>
    </div>
  )
}

function Grid() {
  const line = (extra: React.CSSProperties) => (
    <span
      style={{
        position: 'absolute',
        background: 'rgba(255,255,255,.35)',
        pointerEvents: 'none',
        ...extra,
      }}
    />
  )
  return (
    <>
      {line({ left: '33.33%', top: 0, width: 1, height: '100%' })}
      {line({ left: '66.66%', top: 0, width: 1, height: '100%' })}
      {line({ top: '33.33%', left: 0, height: 1, width: '100%' })}
      {line({ top: '66.66%', left: 0, height: 1, width: '100%' })}
    </>
  )
}

function handlePosition(handle: Handle): React.CSSProperties {
  const offset = -HANDLE_SIZE / 2
  const map: Record<Handle, React.CSSProperties> = {
    move: {},
    nw: { left: offset, top: offset },
    n: { left: `calc(50% + ${offset}px)`, top: offset },
    ne: { right: offset, top: offset },
    e: { right: offset, top: `calc(50% + ${offset}px)` },
    se: { right: offset, bottom: offset },
    s: { left: `calc(50% + ${offset}px)`, bottom: offset },
    sw: { left: offset, bottom: offset },
    w: { left: offset, top: `calc(50% + ${offset}px)` },
  }
  return map[handle]
}

function handleCursor(handle: Handle): string {
  const map: Record<Handle, string> = {
    move: 'move',
    nw: 'nwse-resize',
    se: 'nwse-resize',
    ne: 'nesw-resize',
    sw: 'nesw-resize',
    n: 'ns-resize',
    s: 'ns-resize',
    e: 'ew-resize',
    w: 'ew-resize',
  }
  return map[handle]
}

function applyDrag(
  origin: CropRect,
  handle: Handle,
  dx: number,
  dy: number,
  aspect: number | null,
  imageAspect?: number,
): CropRect {
  let { x, y, width, height } = origin

  if (handle === 'move') {
    x = clamp01(x + dx, 0, 1 - width)
    y = clamp01(y + dy, 0, 1 - height)
    return { x, y, width, height }
  }

  let left = x
  let top = y
  let right = x + width
  let bottom = y + height

  if (handle.includes('w')) left = clamp01(left + dx, 0, right - MIN_SIZE)
  if (handle.includes('e')) right = clamp01(right + dx, left + MIN_SIZE, 1)
  if (handle.includes('n')) top = clamp01(top + dy, 0, bottom - MIN_SIZE)
  if (handle.includes('s')) bottom = clamp01(bottom + dy, top + MIN_SIZE, 1)

  let next: CropRect = { x: left, y: top, width: right - left, height: bottom - top }

  // 锁定比例：以拖动方向的主导边为准，反推另一边
  const ratio = aspect ?? null
  if (ratio) {
    const target = ratio / (imageAspect || 1)
    const horizontal = handle.includes('e') || handle.includes('w')
    const vertical = handle.includes('n') || handle.includes('s')

    if (horizontal && !vertical) {
      const h = next.width / target
      if (handle.includes('n')) {
        next.y = clamp01(bottom - h, 0, 1)
        next.height = bottom - next.y
      } else {
        next.height = Math.min(h, 1 - next.y)
      }
      next.width = next.height * target
    } else if (vertical && !horizontal) {
      const w = next.height * target
      if (handle.includes('w')) {
        next.x = clamp01(right - w, 0, 1)
        next.width = right - next.x
      } else {
        next.width = Math.min(w, 1 - next.x)
      }
      next.height = next.width / target
    } else {
      // 角handle：以宽度为准
      const h = next.width / target
      if (handle.includes('n')) {
        next.y = clamp01(bottom - h, 0, 1)
        next.height = bottom - next.y
      } else {
        next.height = Math.min(h, 1 - next.y)
      }
      next.width = next.height * target
    }

    // 越界纠正
    if (next.x + next.width > 1) next.width = 1 - next.x
    if (next.y + next.height > 1) next.height = 1 - next.y
    if (next.width / target > 1 - next.y) {
      next.height = 1 - next.y
      next.width = next.height * target
    }
  }

  return {
    x: clamp01(next.x, 0, 1),
    y: clamp01(next.y, 0, 1),
    width: Math.max(MIN_SIZE, Math.min(next.width, 1)),
    height: Math.max(MIN_SIZE, Math.min(next.height, 1)),
  }
}

function clamp01(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}
