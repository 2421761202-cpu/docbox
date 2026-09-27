import { Link } from 'react-router-dom'
import type { OutputFile, SourceFile } from '../lib/types'
import type { UseToolJobResult } from '../hooks/useToolJob'
import { getTool, relatedTools } from '../tools/registry'
import { FileDropzone } from './FileDropzone'
import { SourceFileList } from './SourceFileList'
import { Notice, Panel } from './controls'
import { ResultList } from './ResultList'
import { ToolGrid } from './ToolCard'
import { IconBolt, IconInfinity, IconLoader, IconShield } from './icons'

export interface ToolPageProps {
  toolId: string
  job: UseToolJobResult
  /** 点击主按钮时执行的 worker（通常是 () => job.run(worker)） */
  onRun: () => void
  /** 最多允许的文件数 */
  maxFiles?: number
  /** 主按钮文案 */
  actionLabel?: string
  /** 主按钮下方说明 */
  actionHint?: string
  dropTitle?: string
  dropHint?: string
  fileVariant?: 'list' | 'thumbs'
  /** 运行前校验：返回错误文案即阻止运行 */
  validate?: (files: SourceFile[]) => string | null
  /** 拖放区与选项之间的自定义区域（如裁剪器、缩略图选择器） */
  workspace?: React.ReactNode
  /** 选项面板标题 */
  optionsTitle?: string
  options?: React.ReactNode
  /** 自定义结果渲染 */
  renderResults?: (results: OutputFile[]) => React.ReactNode
  zipBaseName?: string
  resultNotice?: React.ReactNode
  /** 是否在文件为空时也展示选项面板 */
  showOptionsWhenEmpty?: boolean
  /** 页面底部自定义说明 */
  footer?: React.ReactNode
}

export function ToolPage({
  toolId,
  job,
  onRun,
  maxFiles,
  actionLabel = '开始处理',
  actionHint,
  dropTitle,
  dropHint,
  fileVariant = 'list',
  validate,
  workspace,
  optionsTitle = '处理选项',
  options,
  renderResults,
  zipBaseName,
  resultNotice,
  showOptionsWhenEmpty = true,
  footer,
}: ToolPageProps) {
  const tool = getTool(toolId)
  const related = relatedTools(toolId, 6)

  const hasFiles = job.files.length > 0
  const validationError = hasFiles && validate ? validate(job.files) : null
  const canRun = hasFiles && !validationError && !job.isRunning

  const handleRun = () => {
    if (!canRun) return
    onRun()
  }

  return (
    <div className="container-page" style={{ paddingTop: 22, paddingBottom: 40 }}>
      {/* 面包屑 */}
      <nav style={{ fontSize: 12.5, color: 'var(--color-ink-500)', marginBottom: 14 }}>
        <Link to="/" style={{ color: 'var(--color-ink-500)' }}>
          首页
        </Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>{groupTitle(tool.group)}</span>
        <span style={{ margin: '0 6px' }}>/</span>
        <span style={{ color: 'var(--color-ink-900)' }}>{tool.name}</span>
      </nav>

      {/* 标题区 */}
      <header style={{ marginBottom: 22 }}>
        <h1
          style={{
            fontSize: 27,
            fontWeight: 800,
            margin: '0 0 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            letterSpacing: '-0.5px',
          }}
        >
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 11,
              background: `${tool.accent}14`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: '0 0 auto',
            }}
          >
            <tool.icon size={30} />
          </span>
          {tool.name}
        </h1>
        <p style={{ margin: 0, color: 'var(--color-ink-700)', fontSize: 14.5, maxWidth: 780 }}>
          {tool.summary}
        </p>
      </header>

      {!hasFiles ? (
            <FileDropzone
              accept={tool.accept}
              multiple={tool.multiple}
              onFiles={(files) => job.addFiles(files, { maxFiles })}
              disabled={job.isRunning}
              title={dropTitle}
              hint={dropHint ?? defaultDropHint(tool.accept, maxFiles)}
            />
          ) : (
            <div className="tool-layout">
              {/* 左列：文件 + 工作区 */}
              <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
                <Panel title="待处理文件">
                  <SourceFileList
                    files={job.files}
                    variant={fileVariant}
                    onRemove={job.removeFile}
                    onMove={job.moveFile}
                    onReorder={job.reorderFiles}
                    onClear={job.clearFiles}
                    disabled={job.isRunning}
                    addMore={{
                      accept: tool.accept,
                      multiple: tool.multiple,
                      onFiles: (files) => job.addFiles(files, { maxFiles }),
                    }}
                  />
                  {job.warnings.length > 0 && (
                    <Notice kind="warn">
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {job.warnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </Notice>
                  )}
                </Panel>

                {workspace}
              </div>

              {/* 右列：选项 + 执行 */}
              <div className="tool-side">
                {options && <Panel title={optionsTitle}>{options}</Panel>}

                <Panel>
                  <button
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                    disabled={!canRun}
                    onClick={handleRun}
                    data-run-button
                  >
                    {job.isRunning ? <IconLoader size={17} className="spin" /> : <IconBolt size={17} />}
                    {job.isRunning ? '处理中…' : actionLabel}
                  </button>

                  {job.isRunning && (
                    <button className="btn btn-default btn-sm" onClick={job.cancel} style={{ width: '100%' }}>
                      取消
                    </button>
                  )}

                  {validationError && <Notice kind="warn">{validationError}</Notice>}
                  {actionHint && !validationError && (
                    <div className="field-hint" style={{ textAlign: 'center' }}>
                      {actionHint}
                    </div>
                  )}

                  {job.job.status === 'error' && job.job.error && (
                    <Notice kind="error">{job.job.error}</Notice>
                  )}
                </Panel>
              </div>
            </div>
          )}

          {/* 进度 */}
          {job.isRunning && (
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12.5,
                  color: 'var(--color-ink-700)',
                  marginBottom: 6,
                }}
              >
                <span>{job.job.message || '处理中…'}</span>
                <span className="mono-num">{job.job.progress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${job.job.progress}%` }} />
              </div>
            </div>
          )}

          {/* 结果 */}
          <div style={{ marginTop: 20 }}>
            {job.results.length > 0 &&
              (renderResults ? (
                renderResults(job.results)
              ) : (
                <ResultList
                  results={job.results}
                  zipBaseName={zipBaseName ?? tool.id}
                  onReset={job.reset}
                  notice={resultNotice}
                />
              ))}
          </div>

      {footer}

      {/* 说明 + 相关工具 */}
      <section style={{ marginTop: 48 }}>
        <div className="info-grid">
          <InfoCard
            icon={<IconShield size={18} />}
            title="文件不会离开你的设备"
            text="所有运算都在浏览器里完成，不上传、不留存，断网也能继续用。"
          />
          <InfoCard
            icon={<IconInfinity size={18} />}
            title="不限次数、不限体积"
            text="没有每日额度，也没有文件大小限制，只受你自己电脑的内存约束。"
          />
          <InfoCard
            icon={<IconBolt size={18} />}
            title="免注册、即开即用"
            text="打开网页就能用，不需要登录，也不会收集你的邮箱和手机号。"
          />
        </div>

        {tool.description && (
          <div style={{ marginTop: 28, maxWidth: 860 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
              关于「{tool.name}」
            </h2>
            <p style={{ color: 'var(--color-ink-700)', margin: 0, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {tool.description}
            </p>
          </div>
        )}

        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>你可能还需要</h2>
          <ToolGrid tools={related} />
        </div>
      </section>
    </div>
  )
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <div
      style={{
        padding: '18px 20px',
        border: '1px solid var(--color-line)',
        borderRadius: 14,
        background: '#fff',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'var(--color-brand-50)',
          color: 'var(--color-brand-600)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--color-ink-500)', lineHeight: 1.7 }}>{text}</div>
    </div>
  )
}

function groupTitle(group: string): string {
  return group === 'pdf' ? 'PDF 工具' : '图片工具'
}

function defaultDropHint(accept: string, maxFiles?: number): string {
  const isPdf = accept.includes('pdf')
  const kinds = isPdf
    ? '支持 PDF 文件'
    : '支持 JPG、PNG、WebP、GIF、BMP、AVIF 等常见格式'
  const limit = maxFiles ? `，最多 ${maxFiles} 个` : '，数量不限'
  return `${kinds}${limit} · 单个文件最大 200MB`
}
