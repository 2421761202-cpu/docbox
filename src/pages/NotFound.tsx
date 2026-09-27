import { Link } from 'react-router-dom'
import { TOOLS } from '../tools/registry'
import { ToolGrid } from '../components/ToolCard'

export default function NotFound() {
  return (
    <div className="container-page" style={{ paddingTop: 72, paddingBottom: 60, textAlign: 'center' }}>
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          letterSpacing: '-3px',
          lineHeight: 1,
          marginBottom: 14,
          background: 'linear-gradient(115deg, var(--color-brand-600), #a855f7)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        404
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 10px' }}>这个页面不见了</h1>
      <p style={{ color: 'var(--color-ink-500)', margin: '0 0 26px', fontSize: 14.5 }}>
        你访问的地址不存在，或者工具链接已经调整。回到首页看看全部工具吧。
      </p>

      <Link to="/" className="btn btn-primary btn-lg">
        返回首页
      </Link>

      <div style={{ marginTop: 56, textAlign: 'left' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>热门工具</h2>
        <ToolGrid tools={TOOLS.slice(0, 8)} />
      </div>
    </div>
  )
}
