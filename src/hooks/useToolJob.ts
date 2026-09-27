/**
 * useToolJob —— 所有工具页面共用的「文件 + 任务 + 结果」状态机。
 *
 * 把「添加文件 → 校验 → 运行 → 进度 → 结果 → 下载/重置」这条链路收敛到一处，
 * 每个工具页面只需要关心「怎么处理」，不用重复写 UI 状态管理。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JobState, OutputFile, SourceFile } from '../lib/types'
import { uid } from '../lib/format'
import type { ProgressFn } from '../lib/image/core'

export interface AddFilesOptions {
  /** 单文件大小上限（字节） */
  maxSize?: number
  /** 最多允许几个文件，超出部分丢弃 */
  maxFiles?: number
}

export interface UseToolJobResult {
  files: SourceFile[]
  job: JobState
  results: OutputFile[]
  warnings: string[]
  isRunning: boolean
  addFiles: (incoming: FileList | File[], options?: AddFilesOptions) => void
  removeFile: (id: string) => void
  moveFile: (id: string, delta: number) => void
  reorderFiles: (from: number, to: number) => void
  clearFiles: () => void
  run: (worker: ToolWorker) => Promise<void>
  cancel: () => void
  reset: () => void
  /** 手动设置结果（用于需要二次处理结果的工具） */
  setResults: React.Dispatch<React.SetStateAction<OutputFile[]>>
  report: ProgressFn
}

export type ToolWorker = (
  files: SourceFile[],
  report: ProgressFn,
  signal: AbortSignal,
) => Promise<OutputFile[]>

const DEFAULT_MAX_SIZE = 200 * 1024 * 1024

export function useToolJob(): UseToolJobResult {
  const [files, setFiles] = useState<SourceFile[]>([])
  const [job, setJob] = useState<JobState>({ status: 'idle', progress: 0, message: '' })
  const [results, setResults] = useState<OutputFile[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const filesRef = useRef<SourceFile[]>([])

  filesRef.current = files

  // 卸载时回收所有预览 URL，避免内存泄漏
  useEffect(() => {
    return () => {
      filesRef.current.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl))
      abortRef.current?.abort()
    }
  }, [])

  const addFiles = useCallback(
    (incoming: FileList | File[], options: AddFilesOptions = {}) => {
      const { maxSize = DEFAULT_MAX_SIZE, maxFiles } = options
      const list = Array.from(incoming)
      const rejected: string[] = []
      const accepted: SourceFile[] = []

      for (const file of list) {
        if (file.size > maxSize) {
          rejected.push(`${file.name} 超过 ${Math.round(maxSize / 1024 / 1024)}MB 上限`)
          continue
        }
        accepted.push({
          id: uid(),
          file,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        })
      }

      setFiles((prev) => {
        const merged = [...prev, ...accepted]
        if (maxFiles && merged.length > maxFiles) {
          const dropped = merged.slice(maxFiles)
          dropped.forEach((f) => {
            rejected.push(`${f.file.name} 超出数量上限，已忽略`)
            if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
          })
          return merged.slice(0, maxFiles)
        }
        return merged
      })

      setWarnings(rejected)
      if (accepted.length > 0) {
        setResults([])
        setJob({ status: 'idle', progress: 0, message: '' })
      }
    },
    [],
  )

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((f) => f.id !== id)
    })
    setResults([])
  }, [])

  const moveFile = useCallback((id: string, delta: number) => {
    setFiles((prev) => {
      const index = prev.findIndex((f) => f.id === id)
      if (index === -1) return prev
      const next = index + delta
      if (next < 0 || next >= prev.length) return prev
      const copy = [...prev]
      const [item] = copy.splice(index, 1)
      copy.splice(next, 0, item)
      return copy
    })
    setResults([])
  }, [])

  const reorderFiles = useCallback((from: number, to: number) => {
    setFiles((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev
      const copy = [...prev]
      const [item] = copy.splice(from, 1)
      copy.splice(to, 0, item)
      return copy
    })
    setResults([])
  }, [])

  const clearFiles = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl))
      return []
    })
    setResults([])
    setWarnings([])
    setJob({ status: 'idle', progress: 0, message: '' })
  }, [])

  const report = useCallback<ProgressFn>((progress, message) => {
    setJob((prev) => ({
      status: 'working',
      progress: Math.max(prev.progress, Math.min(100, Math.max(0, progress))),
      message: message ?? prev.message,
    }))
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setJob((prev) => ({ ...prev, status: 'cancelled', message: '已取消' }))
  }, [])

  const run = useCallback(
    async (worker: ToolWorker) => {
      const current = filesRef.current
      if (current.length === 0) {
        setJob({ status: 'error', progress: 0, message: '', error: '请先添加文件' })
        return
      }

      const controller = new AbortController()
      abortRef.current = controller
      setResults([])
      setJob({ status: 'working', progress: 0, message: '准备中…' })

      try {
        const output = await worker(current, report, controller.signal)
        if (controller.signal.aborted) {
          setJob({ status: 'cancelled', progress: 0, message: '已取消' })
          return
        }
        setResults(output)
        setJob({ status: 'done', progress: 100, message: `处理完成，共 ${output.length} 个结果` })
      } catch (err) {
        if (controller.signal.aborted || (err as Error).name === 'AbortError') {
          setJob({ status: 'cancelled', progress: 0, message: '已取消' })
          return
        }
        setJob({
          status: 'error',
          progress: 0,
          message: '',
          error: (err as Error).message || '处理失败，请重试',
        })
      } finally {
        abortRef.current = null
      }
    },
    [report],
  )

  const reset = useCallback(() => {
    setResults((prev) => {
      prev.forEach((r) => r.previewUrl && URL.revokeObjectURL(r.previewUrl))
      return []
    })
    setJob({ status: 'idle', progress: 0, message: '' })
  }, [])

  const isRunning = job.status === 'working' || job.status === 'reading'

  return useMemo(
    () => ({
      files,
      job,
      results,
      warnings,
      isRunning,
      addFiles,
      removeFile,
      moveFile,
      reorderFiles,
      clearFiles,
      run,
      cancel,
      reset,
      setResults,
      report,
    }),
    [
      files,
      job,
      results,
      warnings,
      isRunning,
      addFiles,
      removeFile,
      moveFile,
      reorderFiles,
      clearFiles,
      run,
      cancel,
      reset,
      report,
    ],
  )
}
