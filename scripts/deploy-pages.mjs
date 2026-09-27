/**
 * 把 dist/ 发布到 GitHub Pages（gh-pages 分支）。
 *
 *   1) 先构建（部署在 /<repo>/ 子路径下，必须带 PAGES_BASE）：
 *        Windows PowerShell:  $env:PAGES_BASE='/docbox/'; npm run build
 *        bash:                PAGES_BASE=/docbox/ npm run build
 *   2) 再发布：
 *        node scripts/deploy-pages.mjs
 *   3) 自检：
 *        node scripts/verify-pages.mjs
 *
 * 脚本会自动从 git 的 origin 推导出 owner/repo 与子路径，校验 dist/ 的前缀是否
 * 匹配（不匹配就提示正确的构建命令，避免发出一个资源全 404 的版本），然后补上
 * 404.html（深层链接回退）与 .nojekyll（关掉 Jekyll），最后强推 gh-pages 分支。
 */

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

/** stdio 用 inherit：不通过管道捕获子进程输出，任何环境都能跑 */
function run(cmd, args, cwd, capture = false) {
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
  })
  if (r.error) {
    console.error(`无法执行 ${cmd}：${r.error.message}`)
    process.exit(1)
  }
  if (r.status !== 0) {
    console.error(`${cmd} ${args.join(' ')} 失败（退出码 ${r.status}）`)
    process.exit(1)
  }
  return capture ? (r.stdout ?? '').trim() : ''
}

// 1. 从 origin 推导 owner / repo / 子路径
const remote = run('git', ['remote', 'get-url', 'origin'], root, true)
const matched = remote.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/)
if (!matched) {
  console.error(`无法从 origin 解析 GitHub 仓库地址：${remote || '(空)'}`)
  process.exit(1)
}
const [, owner, repo] = matched
const basePath = `/${repo}/`
const site = `https://${owner}.github.io${basePath}`

// 2. 校验 dist/ 是用正确的子路径构建的
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html 不存在，请先构建：')
  console.error(`  $env:PAGES_BASE='${basePath}'; npm run build`)
  process.exit(1)
}
const html = readFileSync(join(dist, 'index.html'), 'utf8')
if (!html.includes(`"${basePath}assets/`)) {
  console.error(`dist/ 里的资源前缀不是 ${basePath}，直接发布会导致资源 404。请重新构建：`)
  console.error(`  $env:PAGES_BASE='${basePath}'; npm run build`)
  process.exit(1)
}
console.log(`仓库：${owner}/${repo}    子路径：${basePath}`)

// 3. 组装发布目录
const stage = join(tmpdir(), `docbox-pages-${Date.now()}`)
rmSync(stage, { recursive: true, force: true })
mkdirSync(stage, { recursive: true })
cpSync(dist, stage, { recursive: true })
writeFileSync(join(stage, '.nojekyll'), '')
writeFileSync(join(stage, '404.html'), html) // Pages 不支持重写，深层链接靠它回退

// 4. 提交并强推 gh-pages
const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19)
run('git', ['init', '-q', '-b', 'gh-pages'], stage)
run('git', ['add', '-A'], stage)
run('git', ['-c', 'user.name=docbox-deploy', '-c', 'user.email=deploy@local', 'commit', '-q', '-m', `deploy: ${stamp}`], stage)
run('git', ['remote', 'add', 'origin', remote], stage)
run('git', ['push', '--force', 'origin', 'gh-pages'], stage)
rmSync(stage, { recursive: true, force: true })

console.log(`\n已发布：${site}`)
console.log(`自检：node scripts/verify-pages.mjs   （Pages 构建需要 30~90 秒）`)
