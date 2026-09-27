import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { IconGithub, IconInfinity, IconShield, IconBolt, IconClose, IconMenu, IconArrowRight } from './icons'
import { TOOL_GROUPS } from '../tools/registry'

/** 顶部导航 */
export function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 路由变化时收起移动端菜单并回到顶部
  useEffect(() => {
    setOpen(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(246,245,241,0.86)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${scrolled ? 'var(--color-line)' : 'transparent'}`,
        transition: 'border-color .2s',
      }}
    >
      <div className="container-page" style={{ height: 62, display: 'flex', alignItems: 'center', gap: 24 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
          <Logo />
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.4px', color: 'var(--color-ink-900)' }}>
            DocBox
          </span>
          <span
            className="badge"
            style={{ background: '#ecebe7', color: 'var(--color-ink-500)', fontWeight: 500 }}
          >
            免费在线工具
          </span>
        </Link>

        <nav className="nav-desktop" style={{ display: 'flex', gap: 4, marginLeft: 4, flex: 1 }}>
          {TOOL_GROUPS.map((group) => (
            <Link
              key={group.id}
              to={`/#${group.id}`}
              style={{
                padding: '7px 14px',
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--color-ink-700)',
              }}
              className="nav-link"
            >
              {group.shortTitle}
            </Link>
          ))}
        </nav>

        <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
          <a
            className="btn btn-ghost btn-sm"
            href="https://github.com"
            target="_blank"
            rel="noreferrer noopener"
            title="项目源码"
            aria-label="项目源码"
          >
            <IconGithub size={18} />
          </a>
          <Link to="/#tools" className="btn btn-primary btn-sm">
            开始使用
            <IconArrowRight size={15} />
          </Link>
        </div>

        <button
          className="btn btn-ghost btn-sm nav-mobile"
          style={{ display: 'none', marginLeft: 'auto' }}
          onClick={() => setOpen((v) => !v)}
          aria-label="打开菜单"
        >
          {open ? <IconClose size={20} /> : <IconMenu size={20} />}
        </button>
      </div>

      {open && (
        <div
          className="fade-in"
          style={{ borderTop: '1px solid var(--color-line)', background: '#fff', padding: '14px 16px 20px' }}
        >
          {TOOL_GROUPS.map((group) => (
            <div key={group.id} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12.5, color: 'var(--color-ink-500)', margin: '6px 0 8px', fontWeight: 600 }}>
                {group.title}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {group.tools.map((tool) => (
                  <Link
                    key={tool.id}
                    to={tool.path}
                    className="btn btn-default btn-sm"
                    style={{ fontWeight: 400 }}
                  >
                    {tool.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .nav-link:hover { color: var(--color-brand-600) !important; background: #ecebe7; }
        @media (max-width: 860px) {
          .nav-desktop { display: none !important; }
          .nav-mobile { display: inline-flex !important; }
        }
      `}</style>
    </header>
  )
}

/** 站点 Logo */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#4f46e5" />
      <rect x="7" y="10" width="12" height="14.5" rx="2.5" fill="#fff" opacity="0.45" />
      <rect x="12.5" y="6.5" width="12" height="17" rx="2.5" fill="#fff" />
      <path d="M18.5 12h3.4M18.5 16h3.4M18.5 20h2" stroke="#4f46e5" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/** 页脚 */
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <div className="footer-brand-title">
              <Logo />
              DocBox
            </div>
            <p className="footer-brand-text">
              免费的在线图片与 PDF 处理工具。所有处理都在你的浏览器里完成，文件不会上传到任何服务器。
            </p>
          </div>

          {TOOL_GROUPS.map((group) => (
            <div key={group.id}>
              <div className="footer-col-title">{group.title}</div>
              <ul>
                {group.tools.map((tool) => (
                  <li key={tool.id}>
                    <Link to={tool.path} className="footer-link">
                      {tool.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <div className="footer-trust">
            <span>
              <IconShield size={15} /> 本地处理，隐私安全
            </span>
            <span>
              <IconInfinity size={15} /> 不限次数，完全免费
            </span>
            <span>
              <IconBolt size={15} /> 无需注册，即开即用
            </span>
          </div>
          <div>© {new Date().getFullYear()} DocBox · 保留所有权利</div>
        </div>
      </div>
    </footer>
  )
}

/** 页面容器（内容 + 页脚） */
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <Header />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  )
}
