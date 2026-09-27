import { useEffect, useRef, useState } from 'react'
import { openPdfDocument, readPdfInfo, renderThumbnails, type PdfInfo } from '../lib/pdf/pdfjs'

export interface PdfThumb {
  pageNumber: number
  url: string
  width: number
  height: number
}

export interface UsePdfPreviewResult {
  info: PdfInfo | null
  thumbs: PdfThumb[]
  loading: boolean
  progress: number
  error: string | null
}

export interface UsePdfInfoResult {
  info: PdfInfo | null
  loading: boolean
  error: string | null
}

/** 只读取 PDF 元信息（页数、尺寸），不渲染缩略图 */
export function usePdfInfo(bytes: Uint8Array | null): UsePdfInfoResult {
  const [info, setInfo] = useState<PdfInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!bytes) {
      setInfo(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const next = await readPdfInfo(bytes)
        if (!cancelled) setInfo(next)
      } catch (err) {
        if (!cancelled) setError((err as Error).message || '无法读取这个 PDF 文件')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [bytes])

  return { info, loading, error }
}

/**
 * 读取单个 PDF 的基本信息并渲染页面缩略图。
 *
 * bytes 必须是稳定引用（用 useMemo 包住），否则每次渲染都会重新解析整个 PDF。
 */
export function usePdfPreview(bytes: Uint8Array | null, targetWidth = 132): UsePdfPreviewResult {
  const [info, setInfo] = useState<PdfInfo | null>(null)
  const [thumbs, setThumbs] = useState<PdfThumb[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const urlsRef = useRef<string[]>([])

  useEffect(() => {
    let cancelled = false

    const revokeAll = () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      urlsRef.current = []
    }

    if (!bytes) {
      revokeAll()
      setInfo(null)
      setThumbs([])
      setError(null)
      setLoading(false)
      setProgress(0)
      return
    }

    setLoading(true)
    setProgress(0)
    setError(null)
    setThumbs([])

    void (async () => {
      try {
        const nextInfo = await readPdfInfo(bytes)
        if (cancelled) return
        setInfo(nextInfo)

        const doc = await openPdfDocument(bytes)
        try {
          const rendered = await renderThumbnails(doc, targetWidth, (percent) => {
            if (!cancelled) setProgress(percent)
          })
          if (cancelled) {
            rendered.forEach((t) => URL.revokeObjectURL(t.url))
            return
          }
          revokeAll()
          urlsRef.current = rendered.map((t) => t.url)
          setThumbs(rendered)
        } finally {
          await doc.destroy()
        }
      } catch (err) {
        if (cancelled) return
        setError((err as Error).message || '无法读取这个 PDF 文件')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setProgress(100)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [bytes, targetWidth])

  // 组件卸载时清理所有缩略图 URL
  useEffect(
    () => () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      urlsRef.current = []
    },
    [],
  )

  return { info, thumbs, loading, progress, error }
}
