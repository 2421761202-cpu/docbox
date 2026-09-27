/** 格式化工具 */

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '-'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, i)
  const digits = i === 0 ? 0 : decimals
  return `${value.toFixed(digits)} ${units[i]}`
}

/** 保留有效数字的紧凑展示：12.3 MB / 856 KB */
export function formatSize(bytes: number): string {
  return formatBytes(bytes)
}

/** 变化率描述：-62% / +12% */
export function formatDelta(before: number, after: number): string {
  if (before <= 0) return '-'
  const delta = ((after - before) / before) * 100
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(0)}%`
}

export function formatSavings(before: number, after: number): string {
  if (before <= 0) return '-'
  const saved = ((before - after) / before) * 100
  return `${saved.toFixed(0)}%`
}

export function formatDimensions(width: number, height: number): string {
  return `${Math.round(width)} × ${Math.round(height)}`
}

/** 目标大小输入解析：支持 "200"、"200KB"、"1.5MB" */
export function parseSizeInput(input: string, defaultUnit: 'KB' | 'MB' = 'KB'): number | null {
  const text = input.trim().toUpperCase().replace(/\s+/g, '')
  if (!text) return null
  const match = text.match(/^([\d.]+)(B|KB|MB|GB)?$/)
  if (!match) return null
  const value = Number(match[1])
  if (!Number.isFinite(value) || value <= 0) return null
  const unit = (match[2] as string | undefined) ?? defaultUnit
  const multiplier = unit === 'B' ? 1 : unit === 'KB' ? 1024 : unit === 'MB' ? 1024 ** 2 : 1024 ** 3
  return Math.round(value * multiplier)
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

/** 截断过长的文件名，保留扩展名 */
export function truncateMiddle(name: string, max = 42): string {
  if (name.length <= max) return name
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 ? name.slice(dot) : ''
  const base = dot > 0 ? name.slice(0, dot) : name
  const keep = Math.max(6, max - ext.length - 3)
  return `${base.slice(0, keep)}...${ext}`
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function pluralizeFiles(count: number): string {
  return `${count} 个文件`
}
