/**
 * 表单控件集合。所有工具页面的选项面板都由这些组件拼装，保证交互与样式统一。
 */

import type { ReactNode } from 'react'
import { IconInfo, IconWarn } from './icons'

/* ------------------------------------------------------------------ */
/* 面板                                                                */
/* ------------------------------------------------------------------ */

export function Panel({
  title,
  extra,
  children,
  style,
}: {
  title?: string
  extra?: ReactNode
  children: ReactNode
  style?: React.CSSProperties
}) {
  return (
    <section className="panel" style={style}>
      {(title || extra) && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            gap: 12,
          }}
        >
          {title && <h3 className="panel-title" style={{ margin: 0 }}>{title}</h3>}
          {extra}
        </header>
      )}
      <div style={{ display: 'grid', gap: 14 }}>{children}</div>
    </section>
  )
}

/** 一行选项：左侧标签，右侧控件 */
export function Field({
  label,
  hint,
  children,
  align = 'center',
}: {
  label?: ReactNode
  hint?: ReactNode
  children: ReactNode
  align?: 'center' | 'start'
}) {
  return (
    <div className="field" style={{ alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      {label !== undefined && (
        <span className="field-label" style={{ paddingTop: align === 'center' ? 0 : 7 }}>
          {label}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {children}
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 分段控件                                                            */
/* ------------------------------------------------------------------ */

export interface SegmentOption<T extends string | number> {
  value: T
  label: ReactNode
  title?: string
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <div className="segment" role="group">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          className="segment-item"
          data-active={option.value === value}
          disabled={disabled}
          title={option.title}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 滑块 + 数字                                                        */
/* ------------------------------------------------------------------ */

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  hint,
  disabled,
}: {
  label: ReactNode
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  format?: (value: number) => string
  hint?: ReactNode
  disabled?: boolean
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span
        className="mono-num"
        style={{
          minWidth: 62,
          textAlign: 'right',
          fontSize: 13,
          color: 'var(--color-ink-700)',
        }}
      >
        {format ? format(value) : value}
      </span>
    </Field>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  placeholder,
  hint,
  disabled,
  width = 96,
}: {
  label?: ReactNode
  value: number | ''
  onChange: (value: number | '') => void
  min?: number
  max?: number
  step?: number
  suffix?: ReactNode
  placeholder?: string
  hint?: ReactNode
  disabled?: boolean
  width?: number
}) {
  return (
    <Field label={label} hint={hint}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <input
          className="input input-num"
          style={{ width }}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value
            onChange(raw === '' ? '' : Number(raw))
          }}
        />
        {suffix && <span className="field-hint">{suffix}</span>}
      </span>
    </Field>
  )
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  disabled,
  maxLength,
}: {
  label?: ReactNode
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: ReactNode
  disabled?: boolean
  maxLength?: number
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        className="input"
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  hint,
  disabled,
  width = 180,
}: {
  label?: ReactNode
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  hint?: ReactNode
  disabled?: boolean
  width?: number
}) {
  return (
    <Field label={label} hint={hint}>
      <select
        className="input"
        style={{ width }}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value
          const matched = options.find((o) => String(o.value) === raw)
          if (matched) onChange(matched.value)
        }}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function CheckboxField({
  label,
  checked,
  onChange,
  hint,
  disabled,
}: {
  label: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  hint?: ReactNode
  disabled?: boolean
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13.5,
      }}
    >
      <input
        className="checkbox"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function ColorField({
  label,
  value,
  onChange,
  hint,
}: {
  label?: ReactNode
  value: string
  onChange: (value: string) => void
  hint?: ReactNode
}) {
  return (
    <Field label={label} hint={hint}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 34,
            height: 30,
            padding: 2,
            border: '1px solid var(--color-line)',
            borderRadius: 6,
            background: '#fff',
            cursor: 'pointer',
          }}
        />
        <code style={{ fontSize: 12.5, color: 'var(--color-ink-500)' }}>{value.toUpperCase()}</code>
      </span>
    </Field>
  )
}

/* ------------------------------------------------------------------ */
/* 预设卡片组（单选）                                                  */
/* ------------------------------------------------------------------ */

export function OptionCards<T extends string>({
  value,
  options,
  onChange,
  columns,
}: {
  value: T
  options: { value: T; label: string; description?: string; badge?: string }[]
  onChange: (value: T) => void
  columns?: number
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${columns ? `${100 / columns - 6}%` : '150px'}, 1fr))`,
        gap: 10,
      }}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              textAlign: 'left',
              padding: '11px 13px',
              borderRadius: 9,
              border: `1px solid ${active ? 'var(--color-brand-500)' : 'var(--color-line)'}`,
              background: active ? 'var(--color-brand-50)' : '#fff',
              transition: 'border-color .15s, background .15s',
              display: 'grid',
              gap: 3,
            }}
          >
            <span
              style={{
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--color-brand-600)' : 'var(--color-ink-900)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {option.label}
              {option.badge && <span className="badge">{option.badge}</span>}
            </span>
            {option.description && (
              <span style={{ fontSize: 12, color: 'var(--color-ink-500)', lineHeight: 1.5 }}>
                {option.description}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 提示条                                                              */
/* ------------------------------------------------------------------ */

export function Notice({
  kind = 'info',
  children,
}: {
  kind?: 'info' | 'warn' | 'error' | 'success'
  children: ReactNode
}) {
  const palette = {
    info: { bg: '#eef2ff', fg: '#4f46e5', border: '#e0e7ff' },
    warn: { bg: '#fff8e6', fg: '#a8730a', border: '#ffe8b8' },
    error: { bg: '#fef0f0', fg: '#c93a3a', border: '#fbd9d9' },
    success: { bg: '#f0f9eb', fg: '#3f7d20', border: '#dcf0cd' },
  }[kind]

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        padding: '10px 13px',
        borderRadius: 8,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.fg,
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      <span style={{ flex: '0 0 auto', marginTop: 1 }}>
        {kind === 'warn' || kind === 'error' ? <IconWarn size={16} /> : <IconInfo size={16} />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}
