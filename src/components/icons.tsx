/**
 * 图标集。
 *
 * 工具图标使用 40×40 视口的手绘几何图形（对应首页宫格），
 * UI 图标使用 24×24 视口的线性图标（跟随 currentColor）。
 */

import type { SVGProps } from 'react'

interface ToolIconProps {
  size?: number
}

const VIEW = 40

function Svg({ size = 40, children, ...rest }: ToolIconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

/** 圆角方形底 + 白色字母，用于 Office / 格式类图标 */
function Badge({
  color,
  label,
  x = 6,
  y = 8,
  size = 26,
  fontSize = 13,
  radius = 6,
}: {
  color: string
  label: string
  x?: number
  y?: number
  size?: number
  fontSize?: number
  radius?: number
}) {
  return (
    <>
      <rect x={x} y={y} width={size} height={size} rx={radius} fill={color} />
      <text
        x={x + size / 2}
        y={y + size / 2}
        fill="#fff"
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {label}
      </text>
    </>
  )
}

/* ================================================================== */
/* AI 类                                                               */
/* ================================================================== */

/** 自动抠图 */
export function IconMatting({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <rect x="4" y="8" width="24" height="24" rx="4" fill="#e8f1ff" />
      <path
        d="M4 26l6-7 5 5 5-6 8 8v2a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-2z"
        fill="#4b8ef7"
      />
      <circle cx="11" cy="16" r="2.6" fill="#6366f1" />
      <path
        d="M26 10h3.5M30.5 10h3.5M32 8.5v3"
        stroke="#6366f1"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="2 2"
      />
      <path
        d="M30 24l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"
        fill="#ffb020"
      />
      <circle cx="32" cy="14" r="2.2" fill="#ffb020" />
    </Svg>
  )
}

/** 图片变高清 */
export function IconUpscale({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <rect x="4" y="16" width="16" height="16" rx="3" fill="#c9d8ff" />
      <rect x="16" y="6" width="20" height="20" rx="4" fill="#7c3aed" />
      <path d="M20 20l4-5 3 3 3-3.5 4 5.5v2a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-2z" fill="#fff" opacity="0.9" />
      <circle cx="22" cy="12" r="2" fill="#fff" />
      <path d="M31 2l1.1 3.4L35.5 6.5l-3.4 1.1L31 11l-1.1-3.4L26.5 6.5l3.4-1.1L31 2z" fill="#ffb020" />
    </Svg>
  )
}

/* ================================================================== */
/* 图片处理                                                            */
/* ================================================================== */

/** 基础图片图标 */
export function IconPhoto({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <rect x="4" y="8" width="32" height="24" rx="4" fill="#6366f1" />
      <circle cx="13" cy="16.5" r="3" fill="#fff" />
      <path d="M6 29l8-8.5 6 6 5-6 9 8.5v1a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-1z" fill="#a8ccff" />
    </Svg>
  )
}

/** 图片压缩 */
export function IconCompress({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <rect x="4" y="8" width="32" height="24" rx="4" fill="#6366f1" />
      <path d="M6 29l8-8.5 6 6 5-6 9 8.5v1a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-1z" fill="#a8ccff" />
      <circle cx="13" cy="16.5" r="2.4" fill="#fff" />
      <path d="M16 20h8M16 20l3-2.6M16 20l3 2.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 20h-8M24 20l-3-2.6M24 20l-3 2.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** 图片裁剪 */
export function IconCrop({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <path
        d="M10 5v25h25"
        stroke="#22c3d6"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 10h25v25"
        stroke="#22c3d6"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="13" y="13" width="14" height="14" rx="2" fill="#22c3d6" opacity="0.22" />
      <circle cx="10" cy="10" r="3" fill="#0ea5b7" />
    </Svg>
  )
}

/** 图片改尺寸 */
export function IconResize({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <rect x="5" y="9" width="24" height="18" rx="3" fill="#6366f1" opacity="0.18" stroke="#6366f1" strokeWidth="2" />
      <path d="M13 30h22V12" stroke="#6366f1" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M20 25h9v-9" stroke="#6366f1" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 16l-6 6" stroke="#6366f1" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="5" y="9" width="8" height="6" rx="1.4" fill="#6366f1" />
      <rect x="29" y="25" width="8" height="6" rx="1.4" fill="#6366f1" />
    </Svg>
  )
}

/** 图片旋转 */
export function IconRotate({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <path
        d="M20 9a11 11 0 1 1-8.3 3.8"
        stroke="#6366f1"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M11.5 4.5v8.5h8.5" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="15" y="16" width="11" height="11" rx="2" fill="#6366f1" opacity="0.35" />
    </Svg>
  )
}

/** 图片分割 */
export function IconSplit({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <rect x="5" y="5" width="13" height="13" rx="2.5" fill="#67c23a" />
      <rect x="22" y="5" width="13" height="13" rx="2.5" fill="#67c23a" opacity="0.55" />
      <rect x="5" y="22" width="13" height="13" rx="2.5" fill="#67c23a" opacity="0.55" />
      <rect x="22" y="22" width="13" height="13" rx="2.5" fill="#67c23a" />
      <path d="M20 4v32" stroke="#fff" strokeWidth="1.6" strokeDasharray="3 3" />
      <path d="M4 20h32" stroke="#fff" strokeWidth="1.6" strokeDasharray="3 3" />
    </Svg>
  )
}

/** 图片拼接（长图 / 宫格） */
export function IconConcat({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <rect x="9" y="4" width="22" height="9" rx="2.5" fill="#ff9f43" />
      <rect x="9" y="15.5" width="22" height="9" rx="2.5" fill="#ff9f43" opacity="0.7" />
      <rect x="9" y="27" width="22" height="9" rx="2.5" fill="#ff9f43" opacity="0.45" />
      <path d="M4 8v24M4 8l-2 3M4 8l2 3M4 32l-2-3M4 32l2-3" stroke="#ff9f43" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** GIF 压缩 */
export function IconGifCompress({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <rect x="4" y="9" width="32" height="22" rx="4" fill="#26c6b0" />
      <text
        x="20"
        y="21"
        fill="#fff"
        fontSize="11"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
      >
        GIF
      </text>
      <path d="M14 26h12M14 26l2.4-2M14 26l2.4 2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 26h-12M26 26l-2.4-2M26 26l-2.4 2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** GIF 裁剪 */
export function IconGifCrop({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <rect x="6" y="8" width="28" height="24" rx="4" fill="#26c6b0" opacity="0.25" />
      <text
        x="20"
        y="18"
        fill="#12988a"
        fontSize="10"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
      >
        GIF
      </text>
      <path d="M14 12v16h16" stroke="#12988a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 16h16v16" stroke="#12988a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="18" y="20" width="12" height="12" rx="2" fill="#26c6b0" opacity="0.5" />
    </Svg>
  )
}

/* ================================================================== */
/* 格式转换                                                            */
/* ================================================================== */

/** 图片转 Word */
export function IconToWord({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <rect x="16" y="10" width="18" height="24" rx="3" fill="#c7d2fe" />
      <rect x="6" y="6" width="18" height="18" rx="4" fill="#2b579a" />
      <text
        x="15"
        y="15"
        fill="#fff"
        fontSize="11"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
      >
        W
      </text>
      <path d="M21 20h10M21 25h10M21 29h6" stroke="#8fb4e8" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  )
}

/** 图片转 Excel */
export function IconToExcel({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <rect x="16" y="10" width="18" height="24" rx="3" fill="#d6f2e0" />
      <rect x="6" y="6" width="18" height="18" rx="4" fill="#217346" />
      <text
        x="15"
        y="15"
        fill="#fff"
        fontSize="11"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
      >
        X
      </text>
      <path d="M21 20h10M21 25h10M21 29h6" stroke="#8fd0ab" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  )
}

/** 图片转 PDF */
export function IconToPdf({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <rect x="15" y="9" width="19" height="25" rx="3" fill="#ffd8c9" />
      <rect x="6" y="6" width="18" height="18" rx="4" fill="#e8503a" />
      <text
        x="15"
        y="15"
        fill="#fff"
        fontSize="10"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
      >
        JPG
      </text>
      <path d="M20 20h11M20 25h11M20 29h7" stroke="#ffb39a" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  )
}

/** 图片格式转换（转 JPG / PNG / WebP） */
export function IconConvert({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <rect x="4" y="8" width="20" height="16" rx="3" fill="#7c5cff" opacity="0.35" />
      <rect x="16" y="16" width="20" height="16" rx="3" fill="#7c5cff" />
      <path d="M18 30l5-5.5 3.5 3.5 3-4 4.5 6v1a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2v-1z" fill="#fff" opacity="0.9" />
      <circle cx="22" cy="21.5" r="1.8" fill="#fff" />
      <path d="M27 12h7M34 12l-2.6-2.4M34 12l-2.6 2.4" stroke="#7c5cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/* ================================================================== */
/* PDF 处理                                                            */
/* ================================================================== */

/** PDF 页面底形 */
function PdfPage({ x = 8, y = 5, w = 24, h = 30 }: { x?: number; y?: number; w?: number; h?: number }) {
  const fold = 7
  return (
    <>
      <path
        d={`M${x} ${y + 3}a3 3 0 0 1 3-3h${w - fold - 3}l${fold} ${fold}v${h - fold - 3}a3 3 0 0 1-3 3H${x + 3}a3 3 0 0 1-3-3V${y + 3}z`}
        fill="#f4564a"
      />
      <path d={`M${x + w - fold} ${y}h${fold}v${fold}h-${fold}z`} fill="#ffbdb6" />
    </>
  )
}

/** PDF 合并 */
export function IconPdfMerge({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <PdfPage x={4} y={9} w={16} h={22} />
      <text x="12" y="23" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial" textAnchor="middle" dominantBaseline="central">
        PDF
      </text>
      <PdfPage x={20} y={9} w={16} h={22} />
      <text x="28" y="23" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial" textAnchor="middle" dominantBaseline="central">
        PDF
      </text>
      <circle cx="20" cy="20" r="8" fill="#6366f1" stroke="#fff" strokeWidth="2" />
      <path d="M20 16v8M16 20h8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </Svg>
  )
}

/** PDF 分割 */
export function IconPdfSplit({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <PdfPage x={6} y={5} w={28} h={30} />
      <text x="20" y="17" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Arial" textAnchor="middle" dominantBaseline="central">
        PDF
      </text>
      <path d="M4 27h32" stroke="#fff" strokeWidth="2" strokeDasharray="4 3" />
      <path d="M20 31v6M20 37l-3-3M20 37l3-3" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** PDF 压缩 */
export function IconPdfCompress({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <PdfPage x={8} y={5} w={24} h={30} />
      <text x="20" y="16" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Arial" textAnchor="middle" dominantBaseline="central">
        PDF
      </text>
      <path d="M13 25h14M13 25l3-3M13 25l3 3" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27 25H13M27 25l-3-3M27 25l-3 3" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 32h16" stroke="#ffbdb6" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

/** PDF 旋转 */
export function IconPdfRotate({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <PdfPage x={11} y={11} w={20} h={24} />
      <text x="21" y="23" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial" textAnchor="middle" dominantBaseline="central">
        PDF
      </text>
      <path d="M20 6a14 14 0 1 1-10.6 5" stroke="#6366f1" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M9.5 1v9h9" stroke="#6366f1" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** PDF 删页面 */
export function IconPdfDeletePage({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <PdfPage x={5} y={5} w={22} h={28} />
      <text x="16" y="17" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial" textAnchor="middle" dominantBaseline="central">
        PDF
      </text>
      <path d="M11 26h10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="29" cy="27" r="8" fill="#f4564a" stroke="#fff" strokeWidth="2" />
      <path d="M29 23.5v7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </Svg>
  )
}

/** PDF 改页面顺序 */
export function IconPdfReorder({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <rect x="7" y="5" width="20" height="7" rx="2" fill="#ff7a45" />
      <rect x="7" y="16.5" width="20" height="7" rx="2" fill="#ff7a45" opacity="0.7" />
      <rect x="7" y="28" width="20" height="7" rx="2" fill="#ff7a45" opacity="0.45" />
      <path d="M31 8v24M31 8l-2.6 3M31 8l2.6 3M31 32l-2.6-3M31 32l2.6-3" stroke="#ff7a45" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** PDF 转 Word */
export function IconPdfToWord({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <PdfPage x={4} y={8} w={18} h={24} />
      <text x="13" y="21" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial" textAnchor="middle" dominantBaseline="central">
        PDF
      </text>
      <rect x="20" y="14" width="16" height="16" rx="4" fill="#2b579a" stroke="#fff" strokeWidth="2" />
      <text x="28" y="22" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial" textAnchor="middle" dominantBaseline="central">
        W
      </text>
    </Svg>
  )
}

/** PDF 转 Excel */
export function IconPdfToExcel({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <PdfPage x={4} y={8} w={18} h={24} />
      <text x="13" y="21" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial" textAnchor="middle" dominantBaseline="central">
        PDF
      </text>
      <rect x="20" y="14" width="16" height="16" rx="4" fill="#217346" stroke="#fff" strokeWidth="2" />
      <text x="28" y="22" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial" textAnchor="middle" dominantBaseline="central">
        X
      </text>
    </Svg>
  )
}

/** PDF 转 PPT */
export function IconPdfToPpt({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <PdfPage x={4} y={8} w={18} h={24} />
      <text x="13" y="21" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial" textAnchor="middle" dominantBaseline="central">
        PDF
      </text>
      <rect x="20" y="14" width="16" height="16" rx="4" fill="#d24726" stroke="#fff" strokeWidth="2" />
      <text x="28" y="22" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial" textAnchor="middle" dominantBaseline="central">
        P
      </text>
    </Svg>
  )
}

/** PDF 转图片 */
export function IconPdfToImage({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <PdfPage x={4} y={7} w={17} h={23} />
      <text x="12.5" y="19" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial" textAnchor="middle" dominantBaseline="central">
        PDF
      </text>
      <rect x="19" y="17" width="18" height="16" rx="3" fill="#6366f1" stroke="#fff" strokeWidth="2" />
      <circle cx="24" cy="22.5" r="1.8" fill="#fff" />
      <path d="M21 31l5-5.5 3.5 3.5 3-3.5 3.5 5.5v.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V31z" fill="#a8ccff" />
    </Svg>
  )
}

/** PDF 通用 */
export function IconPdf({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <PdfPage x={8} y={5} w={24} h={30} />
      <text x="20" y="21" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Arial" textAnchor="middle" dominantBaseline="central">
        PDF
      </text>
      <path d="M13 27h14M13 31h9" stroke="#ffbdb6" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

/** PDF 加密 / 解密 */
export function IconPdfLock({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <PdfPage x={5} y={5} w={22} h={28} />
      <text x="16" y="17" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial" textAnchor="middle" dominantBaseline="central">
        PDF
      </text>
      <rect x="22" y="23" width="14" height="12" rx="2.5" fill="#ffb020" stroke="#fff" strokeWidth="2" />
      <path d="M25 23v-3a4 4 0 0 1 8 0v3" stroke="#ffb020" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="29" cy="29" r="1.8" fill="#fff" />
    </Svg>
  )
}

/** PDF 加页码 / 水印 */
export function IconPdfWatermark({ size }: ToolIconProps) {
  return (
    <Svg size={size}>
      <PdfPage x={7} y={4} w={26} h={32} />
      <text x="20" y="15" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial" textAnchor="middle" dominantBaseline="central">
        PDF
      </text>
      <path d="M20 20l10 10M20 30l10-10" stroke="#ffd9d3" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
      <path d="M11 34h18" stroke="#ffbdb6" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  )
}

/* ================================================================== */
/* 首页分组标题用的 emoji 风格装饰                                      */
/* ================================================================== */

export function IconSparkle({ size = 20 }: ToolIconProps) {
  return (
    <Svg size={size}>
      <path d="M20 6l3 8.5 8.5 3-8.5 3-3 8.5-3-8.5L8.5 17.5l8.5-3L20 6z" fill="#ffb020" />
      <path d="M31 6l1.4 3.6L36 11l-3.6 1.4L31 16l-1.4-3.6L26 11l3.6-1.4L31 6z" fill="#ffd06b" />
    </Svg>
  )
}

/* ================================================================== */
/* UI 线性图标（跟随 currentColor）                                     */
/* ================================================================== */

export type UiIconProps = SVGProps<SVGSVGElement> & { size?: number }

function Ui({ size = 18, children, ...rest }: UiIconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconUpload = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M12 16V4" />
    <path d="M7 9l5-5 5 5" />
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Ui>
)

export const IconDownload = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M12 4v12" />
    <path d="M7 11l5 5 5-5" />
    <path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
  </Ui>
)

export const IconClose = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Ui>
)

export const IconCheck = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M4 12.5l5 5L20 6.5" />
  </Ui>
)

export const IconPlus = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M12 5v14M5 12h14" />
  </Ui>
)

export const IconTrash = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    <path d="M10 11v6M14 11v6" />
  </Ui>
)

export const IconArrowRight = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Ui>
)

export const IconArrowUp = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Ui>
)

export const IconArrowDown = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Ui>
)

export const IconLoader = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M12 3v4M12 17v4M5.6 5.6l2.9 2.9M15.5 15.5l2.9 2.9M3 12h4M17 12h4M5.6 18.4l2.9-2.9M15.5 8.5l2.9-2.9" />
  </Ui>
)

export const IconShield = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M12 3l7 3v6c0 4.4-3 8-7 9-4-1-7-4.6-7-9V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </Ui>
)

export const IconBolt = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M13 2L5 13h6l-1 9 8-11h-6l1-9z" />
  </Ui>
)

export const IconInfinity = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M7.5 9a3.5 3.5 0 0 0 0 7c1.8 0 3-1.3 4.5-4s2.7-3 4.5-3a3.5 3.5 0 0 1 0 7c-1.8 0-3-1.3-4.5-4" />
  </Ui>
)

export const IconGrid = (p: UiIconProps) => (
  <Ui {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </Ui>
)

export const IconChevronDown = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M6 9l6 6 6-6" />
  </Ui>
)

export const IconChevronLeft = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Ui>
)

export const IconInfo = (p: UiIconProps) => (
  <Ui {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.6v.2" />
  </Ui>
)

export const IconWarn = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M12 4l8.5 15H3.5L12 4z" />
    <path d="M12 10v4M12 17.2v.2" />
  </Ui>
)

export const IconRotateLeft = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M4 10V5M4 10h5" />
    <path d="M4.6 9.2A8 8 0 1 1 12 20" />
  </Ui>
)

export const IconRotateRight = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M20 10V5M20 10h-5" />
    <path d="M19.4 9.2A8 8 0 1 0 12 20" />
  </Ui>
)

export const IconFlipH = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M12 3v18" strokeDasharray="3 3" />
    <path d="M9 6L4 12l5 6V6z" />
    <path d="M15 6l5 6-5 6V6z" />
  </Ui>
)

export const IconFlipV = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M3 12h18" strokeDasharray="3 3" />
    <path d="M6 9l6-5 6 5H6z" />
    <path d="M6 15l6 5 6-5H6z" />
  </Ui>
)

export const IconZoom = (p: UiIconProps) => (
  <Ui {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
    <path d="M8.5 11h5M11 8.5v5" />
  </Ui>
)

export const IconList = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.2M4 12h.2M4 18h.2" />
  </Ui>
)

export const IconMenu = (p: UiIconProps) => (
  <Ui {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Ui>
)

export const IconGithub = (p: UiIconProps) => (
  <svg
    width={p.size ?? 18}
    height={p.size ?? 18}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    {...p}
  >
    <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49l-.01-1.72c-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.34 1.12 2.91.86.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.35 4.8-4.58 5.05.36.32.68.94.68 1.9l-.01 2.82c0 .27.18.59.69.49A10.28 10.28 0 0 0 22 12.25C22 6.58 17.52 2 12 2z" />
  </svg>
)
