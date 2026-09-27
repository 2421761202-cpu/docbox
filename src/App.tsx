import { createElement, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { PageShell } from './components/Layout'
import { TOOLS } from './tools/registry'
import Home from './pages/Home'
import NotFound from './pages/NotFound'

import ImageCompress from './pages/tools/ImageCompress'
import ImageCrop from './pages/tools/ImageCrop'
import ImageResize from './pages/tools/ImageResize'
import ImageRotate from './pages/tools/ImageRotate'
import ImageSplit from './pages/tools/ImageSplit'
import ImageConcat from './pages/tools/ImageConcat'
import ImageConvert from './pages/tools/ImageConvert'
import ImageToPdf from './pages/tools/ImageToPdf'

import PdfMerge from './pages/tools/PdfMerge'
import PdfSplit from './pages/tools/PdfSplit'
import PdfCompress from './pages/tools/PdfCompress'
import PdfRotate from './pages/tools/PdfRotate'
import PdfDeletePages from './pages/tools/PdfDeletePages'
import PdfReorder from './pages/tools/PdfReorder'
import PdfExtract from './pages/tools/PdfExtract'
import PdfToImage from './pages/tools/PdfToImage'

/**
 * 工具 id → 页面组件。
 * 路由表完全由 registry 驱动，新增一个工具只需要两步：
 * ① registry.ts 加 meta ② 这里挂组件。
 */
const PAGES: Record<string, React.ComponentType> = {
  'image-compress': ImageCompress,
  'image-crop': ImageCrop,
  'image-resize': ImageResize,
  'image-rotate': ImageRotate,
  'image-split': ImageSplit,
  'image-concat': ImageConcat,
  'image-convert': ImageConvert,
  'image-to-pdf': ImageToPdf,
  'pdf-merge': PdfMerge,
  'pdf-split': PdfSplit,
  'pdf-compress': PdfCompress,
  'pdf-rotate': PdfRotate,
  'pdf-delete-pages': PdfDeletePages,
  'pdf-reorder': PdfReorder,
  'pdf-extract': PdfExtract,
  'pdf-to-image': PdfToImage,
}

export default function App() {
  return (
    <PageShell>
      <RouteEffects />
      <Routes>
        <Route path="/" element={<Home />} />

        {TOOLS.map((tool) => {
          const Page = PAGES[tool.id]
          return Page ? (
            <Route key={tool.id} path={tool.path} element={createElement(Page)} />
          ) : null
        })}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </PageShell>
  )
}

/** 切换页面时回到顶部 + 同步 <title> */
function RouteEffects() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })

    const clean = pathname.replace(/\/+$/, '') || '/'
    const tool = TOOLS.find((t) => t.path.replace(/\/+$/, '') === clean)
    document.title = tool
      ? `${tool.name} - 免费在线工具 | DocBox`
      : 'DocBox - 免费的在线图片与 PDF 处理工具'
  }, [pathname])

  return null
}
