import { Link } from 'react-router-dom'
import type { ToolMeta } from '../tools/registry'
import { IconArrowRight } from './icons'

const TAG_STYLE: Record<string, { bg: string; fg: string }> = {
  热门: { bg: '#fff1f2', fg: '#e11d48' },
  新: { bg: '#ecfdf5', fg: '#059669' },
  推荐: { bg: 'var(--color-brand-100)', fg: 'var(--color-brand-700)' },
}

/** 首页 / 详情页的工具卡片 */
export function ToolCard({ tool }: { tool: ToolMeta }) {
  const Icon = tool.icon
  const tag = tool.tag ? TAG_STYLE[tool.tag] : null
  return (
    <Link to={tool.path} className="tool-card" title={tool.summary}>
      {tag && (
        <span className="tool-tag" style={{ background: tag.bg, color: tag.fg }}>
          {tool.tag}
        </span>
      )}
      <span className="tool-card-icon" style={{ background: `${tool.accent}14` }}>
        <Icon size={26} />
      </span>
      <span className="tool-card-name">
        {tool.name}
        <span className="card-arrow" aria-hidden="true">
          <IconArrowRight size={16} />
        </span>
      </span>
      <span className="tool-card-summary">{tool.summary}</span>
    </Link>
  )
}

/** 工具宫格 */
export function ToolGrid({ tools }: { tools: ToolMeta[] }) {
  return (
    <div className="tool-grid">
      {tools.map((tool) => (
        <ToolCard key={tool.id} tool={tool} />
      ))}
    </div>
  )
}
