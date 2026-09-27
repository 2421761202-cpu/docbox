/**
 * 工具注册表 —— 站点的单一数据源。
 *
 * 首页宫格、顶部导航、页脚、相关工具推荐、路由都从这里读取。
 * 新增一个工具只需要：① 在这里加一条 meta ② 在 App.tsx 的 PAGES 里挂上组件。
 */

import type { ComponentType } from 'react'
import {
  IconCompress,
  IconConcat,
  IconConvert,
  IconCrop,
  IconPdfCompress,
  IconPdfDeletePage,
  IconPdfMerge,
  IconPdfReorder,
  IconPdfRotate,
  IconPdfSplit,
  IconPdfToImage,
  IconPdfWatermark,
  IconResize,
  IconRotate,
  IconSplit,
  IconToPdf,
} from '../components/icons'

export type GroupId = 'image' | 'pdf'

export interface ToolMeta {
  id: string
  name: string
  path: string
  group: GroupId
  icon: ComponentType<{ size?: number }>
  /** 首页卡片副标题 + 详情页副标题 */
  summary: string
  /** 详情页正文说明 */
  description?: string
  /** 卡片角标 */
  tag?: '热门' | '新' | '推荐'
  /** <input accept> 值 */
  accept: string
  multiple: boolean
  /** 关键词，用于站内搜索 */
  keywords: string[]
  /** 图标强调色，用于卡片图标底色 */
  accent: string
}

export interface ToolGroup {
  id: GroupId
  /** 首页分组标题 */
  title: string
  /** 导航用短标题 */
  shortTitle: string
  /** 分组副标题 */
  blurb: string
  tools: ToolMeta[]
}

const IMAGE_ACCEPT = 'image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.tif,.tiff'
const PDF_ACCEPT = 'application/pdf,.pdf'

/* ================================================================== */
/* 工具定义                                                            */
/* ================================================================== */

export const TOOLS: ToolMeta[] = [
  /* ---------------- 图片工具 ---------------- */
  {
    id: 'image-compress',
    name: '图片压缩',
    path: '/image/compress',
    group: 'image',
    icon: IconCompress,
    summary: '在画质几乎不变的前提下大幅减小体积',
    description:
      '支持 JPG / PNG / WebP / GIF 等常见格式，可按质量压缩，也可直接指定目标大小（如「压到 200KB 以内」），程序会自动寻找最佳质量与尺寸。',
    tag: '热门',
    accept: IMAGE_ACCEPT,
    multiple: true,
    keywords: ['压缩', '减小体积', '瘦身', 'jpg', 'png'],
    accent: '#6366f1',
  },
  {
    id: 'image-crop',
    name: '图片裁剪',
    path: '/image/crop',
    group: 'image',
    icon: IconCrop,
    summary: '自由框选或按固定比例裁剪',
    description:
      '拖动选框自由裁剪，或锁定 1:1、4:3、16:9 等常用比例，适合头像制作、去除水印边、二次构图。',
    tag: '热门',
    accept: IMAGE_ACCEPT,
    multiple: true,
    keywords: ['裁剪', '切图', '比例', '头像'],
    accent: '#0ea5e9',
  },
  {
    id: 'image-resize',
    name: '图片改尺寸',
    path: '/image/resize',
    group: 'image',
    icon: IconResize,
    summary: '按像素或百分比精确调整宽高',
    description:
      '按像素、百分比或常用规格（一寸照、A4、公众号封面等）调整尺寸，支持保持宽高比与补白边。',
    accept: IMAGE_ACCEPT,
    multiple: true,
    keywords: ['尺寸', '缩放', '分辨率', '宽高'],
    accent: '#6366f1',
  },
  {
    id: 'image-rotate',
    name: '图片旋转',
    path: '/image/rotate',
    group: 'image',
    icon: IconRotate,
    summary: '旋转与镜像翻转，支持批量处理',
    description: '顺时针 / 逆时针 90°、180°，任意角度微调，以及水平、垂直镜像翻转。',
    accept: IMAGE_ACCEPT,
    multiple: true,
    keywords: ['旋转', '翻转', '镜像', '摆正'],
    accent: '#6366f1',
  },
  {
    id: 'image-split',
    name: '图片分割',
    path: '/image/split',
    group: 'image',
    icon: IconSplit,
    summary: '九宫格切图、按行列或固定尺寸切分',
    description:
      '把一张长图切成多张小图：按行列均分（如 3×3 九宫格发朋友圈）、按固定尺寸切块，可设置间距与重叠。',
    tag: '新',
    accept: IMAGE_ACCEPT,
    multiple: true,
    keywords: ['分割', '切图', '九宫格', '切片'],
    accent: '#22c55e',
  },
  {
    id: 'image-concat',
    name: '图片拼接',
    path: '/image/concat',
    group: 'image',
    icon: IconConcat,
    summary: '长图拼接、横排拼接、宫格排版',
    description:
      '把多张图片拼成一张：纵向接成长图、横向并排、或按列数排成宫格，可设置间距、圆角与背景色。',
    tag: '新',
    accept: IMAGE_ACCEPT,
    multiple: true,
    keywords: ['拼接', '长图', '合并', '拼图', '宫格'],
    accent: '#f59e0b',
  },
  {
    id: 'image-to-pdf',
    name: '图片转 PDF',
    path: '/image/to-pdf',
    group: 'image',
    icon: IconToPdf,
    summary: '多张图片合成一个 PDF，可设置页面与边距',
    description:
      '把 JPG / PNG / WebP 等图片按顺序合成为一个 PDF，可选页面尺寸（A4 / Letter / 适应图片）、方向、边距与图片填充方式。',
    tag: '热门',
    accept: IMAGE_ACCEPT,
    multiple: true,
    keywords: ['图片转pdf', 'jpg转pdf', '合成pdf'],
    accent: '#ef4444',
  },
  {
    id: 'image-convert',
    name: '图片转 JPG',
    path: '/image/convert',
    group: 'image',
    icon: IconConvert,
    summary: 'JPG / PNG / WebP 格式互转',
    description:
      '在 JPG、PNG、WebP 之间自由转换：把截图 PNG 转成更小的 JPG，或把照片转成支持透明的 WebP。',
    accept: IMAGE_ACCEPT,
    multiple: true,
    keywords: ['格式转换', 'png转jpg', 'webp', '转格式'],
    accent: '#8b5cf6',
  },

  /* ---------------- PDF 工具 ---------------- */
  {
    id: 'pdf-merge',
    name: 'PDF 合并',
    path: '/pdf/merge',
    group: 'pdf',
    icon: IconPdfMerge,
    summary: '多个 PDF 按顺序合成一个，可挑选页面',
    description:
      '拖入多个 PDF 调整顺序后合并成一个文件，也可以只选取每个文件中的部分页面参与合并。整个过程不重新编码，文字依旧可搜索。',
    tag: '热门',
    accept: PDF_ACCEPT,
    multiple: true,
    keywords: ['pdf合并', '合并pdf', '拼接'],
    accent: '#6366f1',
  },
  {
    id: 'pdf-split',
    name: 'PDF 分割',
    path: '/pdf/split',
    group: 'pdf',
    icon: IconPdfSplit,
    summary: '按页拆分，每页一个文件或按范围拆',
    description:
      '把 PDF 拆分成多个文件：每页一个、每 N 页一份、平均分成 N 份，或自定义页码范围。',
    tag: '热门',
    accept: PDF_ACCEPT,
    multiple: false,
    keywords: ['pdf分割', '拆分pdf', '按页拆分'],
    accent: '#f43f5e',
  },
  {
    id: 'pdf-compress',
    name: 'PDF 压缩',
    path: '/pdf/compress',
    group: 'pdf',
    icon: IconPdfCompress,
    summary: '五档压缩强度，最大可减小九成体积',
    description:
      '提供轻度到极限五档压缩预设，通过重新采样页面图像来大幅减小体积，适合邮件发送与网盘上传。压缩后文字将转为图片。',
    tag: '热门',
    accept: PDF_ACCEPT,
    multiple: true,
    keywords: ['pdf压缩', '减小pdf', '瘦身'],
    accent: '#f43f5e',
  },
  {
    id: 'pdf-rotate',
    name: 'PDF 旋转',
    path: '/pdf/rotate',
    group: 'pdf',
    icon: IconPdfRotate,
    summary: '批量摆正方向颠倒的扫描件',
    description: '按页选择需要旋转的页面，顺时针旋转 90° / 180° / 270°，扫描件方向不齐时特别好用。',
    accept: PDF_ACCEPT,
    multiple: true,
    keywords: ['pdf旋转', '摆正', '方向'],
    accent: '#6366f1',
  },
  {
    id: 'pdf-delete-pages',
    name: 'PDF 删页面',
    path: '/pdf/delete-pages',
    group: 'pdf',
    icon: IconPdfDeletePage,
    summary: '可视化勾选要删除的页面',
    description: '以缩略图方式勾选要删除的页面，一次性移除多余页、空白页或广告页。',
    tag: '新',
    accept: PDF_ACCEPT,
    multiple: true,
    keywords: ['pdf删页', '删除页面', '移除页'],
    accent: '#f43f5e',
  },
  {
    id: 'pdf-reorder',
    name: 'PDF 改页面顺序',
    path: '/pdf/reorder',
    group: 'pdf',
    icon: IconPdfReorder,
    summary: '拖拽调整页面先后次序',
    description: '拖动缩略图重新排列页面顺序，也可以把某一页快速移到最前或最后。',
    accept: PDF_ACCEPT,
    multiple: false,
    keywords: ['pdf排序', '页面顺序', '重排'],
    accent: '#fb923c',
  },
  {
    id: 'pdf-extract',
    name: 'PDF 提取页面',
    path: '/pdf/extract',
    group: 'pdf',
    icon: IconPdfWatermark,
    summary: '从大文档里抽出需要的页面',
    description: '勾选或输入页码范围，把需要的页面单独导出成一个新的 PDF 文件。',
    accept: PDF_ACCEPT,
    multiple: true,
    keywords: ['pdf提取', '抽取页面', '选页'],
    accent: '#f59e0b',
  },
  {
    id: 'pdf-to-image',
    name: 'PDF 转图片',
    path: '/pdf/to-image',
    group: 'pdf',
    icon: IconPdfToImage,
    summary: '按指定 DPI 导出 JPG / PNG',
    description:
      '把 PDF 的每一页导出成图片，可选 DPI（清晰度）、格式与灰度，支持只导出部分页面，并可直接打包成 ZIP 下载。',
    tag: '热门',
    accept: PDF_ACCEPT,
    multiple: true,
    keywords: ['pdf转图片', 'pdf转jpg', 'pdf转png', '截图'],
    accent: '#6366f1',
  },
]

/* ================================================================== */
/* 分组                                                                */
/* ================================================================== */

const GROUP_META: { id: GroupId; title: string; shortTitle: string; blurb: string }[] = [
  {
    id: 'image',
    title: '图片工具',
    shortTitle: '图片工具',
    blurb: '压缩、裁剪、旋转、分割、拼接、改尺寸与格式转换',
  },
  {
    id: 'pdf',
    title: 'PDF 工具',
    shortTitle: 'PDF 工具',
    blurb: '合并、拆分、压缩、旋转、删页、重排与格式转换',
  },
]

export const TOOL_GROUPS: ToolGroup[] = GROUP_META.map((meta) => ({
  ...meta,
  tools: TOOLS.filter((t) => t.group === meta.id),
}))

/* ================================================================== */
/* 查询辅助                                                            */
/* ================================================================== */

export const TOOL_MAP: Record<string, ToolMeta> = Object.fromEntries(
  TOOLS.map((t) => [t.id, t]),
)

export const TOOL_COUNT = TOOLS.length

export function getTool(id: string): ToolMeta {
  const tool = TOOL_MAP[id]
  if (!tool) throw new Error(`未注册的工具: ${id}`)
  return tool
}

/**
 * 相关工具推荐：同组优先，不足时用其他组补齐。
 */
export function relatedTools(id: string, limit = 6): ToolMeta[] {
  const current = TOOL_MAP[id]
  const sameGroup = TOOLS.filter((t) => t.group === current?.group && t.id !== id)
  const others = TOOLS.filter((t) => t.group !== current?.group)
  return [...sameGroup, ...others].slice(0, limit)
}

/** 站内搜索 */
export function searchTools(query: string): ToolMeta[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return TOOLS.filter((tool) => {
    const haystack = [tool.name, tool.summary, tool.description ?? '', ...tool.keywords]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}
