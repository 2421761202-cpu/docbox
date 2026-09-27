import { useEffect, useState } from 'react'

export interface UseFileBytesResult {
  bytes: Uint8Array | null
  loading: boolean
  error: string | null
}

/** 把 File 读成 Uint8Array，文件变化时自动重新读取 */
export function useFileBytes(file: File | undefined): UseFileBytesResult {
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!file) {
      setBytes(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setBytes(null)

    void (async () => {
      try {
        const buffer = await file.arrayBuffer()
        if (cancelled) return
        setBytes(new Uint8Array(buffer))
      } catch (err) {
        if (cancelled) return
        setError((err as Error).message || '读取文件失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [file])

  return { bytes, loading, error }
}
