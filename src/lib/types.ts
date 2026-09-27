/** 站点通用类型 */

export interface OutputFile {
  /** 输出文件名（含扩展名） */
  name: string
  blob: Blob
  size: number
  type: string
  /** 结果缩略图（object URL），由调用方负责回收 */
  previewUrl?: string
  /** 一行说明，例如 "1920×1080 → 1280×720 · 省 62%" */
  note?: string
  /** 原始文件（用于「对比」） */
  originSize?: number
}

export interface SourceFile {
  id: string
  file: File
  /** 可选：预览图 object URL */
  previewUrl?: string
  /** 图片宽高（若能解析） */
  width?: number
  height?: number
}

export type JobStatus = 'idle' | 'reading' | 'working' | 'done' | 'error' | 'cancelled'

export interface JobState {
  status: JobStatus
  progress: number
  message: string
  error?: string
}
