import { useEffect, useMemo, useState } from 'react'
import { TOOLS, TOOL_COUNT, TOOL_GROUPS, searchTools, type GroupId } from '../tools/registry'
import { ToolGrid } from '../components/ToolCard'
import {
  IconBolt,
  IconChevronDown,
  IconClose,
  IconInfinity,
  IconShield,
  IconSparkle,
  IconUpload,
} from '../components/icons'

type Filter = 'all' | GroupId

function hashToFilter(hash: string): Filter {
  if (hash === '#image') return 'image'
  if (hash === '#pdf') return 'pdf'
  return 'all'
}

export default function Home() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>(() => hashToFilter(window.location.hash))
  const results = useMemo(() => searchTools(query), [query])
  const searching = query.trim().length > 0

  // 通过导航 / 地址栏 hash 联动分类筛选
  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash
      setFilter(hashToFilter(hash))
      if (['#image', '#pdf', '#tools'].includes(hash)) {
        requestAnimationFrame(() => {
          document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    }
    window.addEventListener('hashchange', onHash)
    if (['#image', '#pdf', '#tools'].includes(window.location.hash)) {
      setTimeout(() => {
        document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
    }
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const visibleGroups = TOOL_GROUPS.filter((g) => filter === 'all' || g.id === filter)

  return (
    <div>
      {/* ============ Hero ============ */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="container-page">
          <div className="hero-inner">
            <span className="hero-kicker">
              <IconSparkle size={14} />
              隐私优先 · 完全免费 · 无需注册
            </span>

            <h1 className="hero-title">
              图片与 PDF 的处理，
              <br />
              在<span className="hero-accent">本地浏览器</span>里完成
            </h1>

            <p className="hero-sub">
              图片压缩、裁剪、旋转、分割、拼接、改尺寸、格式转换，
              以及 PDF 的合并、拆分、压缩、旋转、删页、重排 —— 全部在本机运行，
              <strong> 文件不上传服务器</strong>，不限次数。
            </p>

            {/* 搜索 */}
            <div className="search-box">
              <span className="search-icon" aria-hidden="true">
                <SearchIcon />
              </span>
              <input
                className="input"
                placeholder="搜索工具，例如「压缩」「PDF 转图片」…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="搜索工具"
              />
              {query && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setQuery('')}
                  aria-label="清空搜索"
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 34,
                    height: 34,
                    padding: 0,
                  }}
                >
                  <IconClose size={16} />
                </button>
              )}
            </div>

            <div className="trust-row">
              <span className="trust-item">
                <IconBolt size={16} />
                {TOOL_COUNT} 个工具，即开即用
              </span>
              <span className="trust-item">
                <IconShield size={16} />
                本地处理 · 隐私安全
              </span>
              <span className="trust-item">
                <IconInfinity size={16} />
                不限次数 · 完全免费
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 搜索结果 ============ */}
      {searching ? (
        <div className="container-page" style={{ paddingBottom: 48 }}>
          <div className="section-head" style={{ marginTop: 8 }}>
            <h2 className="section-title">找到 {results.length} 个相关工具</h2>
            <p className="section-sub">换个关键词试试「压缩」「裁剪」「PDF」</p>
          </div>
          {results.length > 0 ? (
            <ToolGrid tools={results} />
          ) : (
            <div
              style={{
                padding: 48,
                textAlign: 'center',
                border: '1px dashed var(--color-ink-300)',
                borderRadius: 16,
                color: 'var(--color-ink-500)',
                background: '#faf9f6',
              }}
            >
              没有匹配的工具，换个关键词试试，例如「压缩」「PDF」「尺寸」。
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ============ 工具目录 ============ */}
          <div id="tools" className="container-page section" style={{ scrollMarginTop: 84, paddingTop: 8 }}>
            <div className="section-head">
              <h2 className="section-title">全部工具</h2>
              <p className="section-sub">
                共 {TOOL_COUNT} 个工具 · 全部免费 · 本地处理 · 无需注册
              </p>
            </div>

            <div className="filter-bar" role="group" aria-label="按分类筛选">
              <FilterPill active={filter === 'all'} onClick={() => (window.location.hash = 'tools')}>
                全部
                <span className="count-chip">{TOOL_COUNT}</span>
              </FilterPill>
              {TOOL_GROUPS.map((g) => (
                <FilterPill
                  key={g.id}
                  active={filter === g.id}
                  onClick={() => (window.location.hash = g.id)}
                >
                  {g.shortTitle}
                  <span className="count-chip">{g.tools.length}</span>
                </FilterPill>
              ))}
            </div>

            {visibleGroups.map((group) => (
              <div key={group.id} style={{ marginBottom: 40 }}>
                <div className="section-head" style={{ marginBottom: 16 }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: 'var(--color-ink-900)' }}>
                    {group.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-ink-500)' }}>{group.blurb}</p>
                </div>
                <ToolGrid tools={group.tools} />
              </div>
            ))}
          </div>

          {/* ============ 特性 ============ */}
          <section className="container-page" style={{ paddingBottom: 8 }}>
            <div className="section-head" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 28px' }}>
              <h2 className="section-title">为什么选择本地处理？</h2>
              <p className="section-sub">
                传统在线转换工具需要把文件上传到别人的服务器。DocBox 走的是另一条路 ——
                用浏览器自身的计算能力直接处理。
              </p>
            </div>

            <div className="feature-grid">
              <FeatureCard
                icon={<IconShield size={21} />}
                title="零上传，真隐私"
                text="文件从不离开你的设备，合同、证件、身份证照片都可以放心处理。关闭网页后不残留任何数据。"
              />
              <FeatureCard
                icon={<IconInfinity size={21} />}
                title="不限量，不收费"
                text="没有每日免费额度，没有文件大小分级，也没有会员墙。你有多少文件就处理多少。"
              />
              <FeatureCard
                icon={<IconBolt size={21} />}
                title="免注册，断网可用"
                text="打开网页即可使用，不需要手机号或邮箱。页面加载完成后即使断网也能继续处理。"
              />
              <FeatureCard
                icon={<IconUpload size={21} />}
                title="批量更省事"
                text="支持一次拖入几十个文件，多结果自动打包成 ZIP 下载，不用一个个点保存。"
              />
            </div>
          </section>

          {/* ============ FAQ ============ */}
          <section className="container-page" style={{ paddingBottom: 24 }}>
            <div className="section-head" style={{ maxWidth: 760 }}>
              <h2 className="section-title">常见问题</h2>
            </div>
            <div style={{ display: 'grid', gap: 12, maxWidth: 820 }}>
              <Faq q="文件真的不会被上传吗？">
                不会。图片和 PDF 的处理代码全部运行在你自己的浏览器里，页面不发送任何文件内容到服务器。
                你可以打开开发者工具的 Network 面板，在处理过程中观察不到任何上传请求。
              </Faq>
              <Faq q="为什么免费？靠什么维持？">
                因为压缩、裁剪、合并这些操作不消耗服务器算力，网站只提供静态页面，成本极低。
                所以可以做到完全免费、不限次数。
              </Faq>
              <Faq q="有文件大小或数量限制吗？">
                没有人为限制，唯一的瓶颈是你设备的内存。建议单次处理的图片总大小控制在 1GB 以内；
                PDF 页面很多时，分批处理会更稳。
              </Faq>
              <Faq q="处理后的画质会变差吗？">
                图片缩放采用逐级降采样算法，比浏览器默认的一次性缩放清晰得多；
                「按目标大小压缩」会在满足体积要求的前提下自动选择最高质量，尽量少损失画质。
              </Faq>
              <Faq q="支持哪些浏览器？">
                推荐 Chrome、Edge、Firefox、Safari 的最近版本。桌面浏览器体验最佳，
                手机浏览器也能使用图片类工具。
              </Faq>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button type="button" className="filter-pill" data-active={active} onClick={onClick}>
      {children}
    </button>
  )
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-text">{text}</p>
    </div>
  )
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="faq-item">
      <summary>
        {q}
        <span className="faq-chevron" aria-hidden="true">
          <IconChevronDown size={17} />
        </span>
      </summary>
      <p>{children}</p>
    </details>
  )
}

function SearchIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  )
}
