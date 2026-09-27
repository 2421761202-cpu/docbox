/**
 * 零依赖静态预览服务器（部署产物 dist/ 的真实预览）。
 *
 *   npm run serve              # 仅本机 http://127.0.0.1:4180
 *   npm run serve -- 5000      # 指定端口
 *   npm run serve -- --lan     # 监听 0.0.0.0，手机等局域网设备可访问
 *
 * 为什么不用 `vite preview`：那个会先加载 vite.config.ts（需要 esbuild 子进程），
 * 而这个脚本只做静态文件服务，行为和 Cloudflare Pages / Netlify / Vercel 上
 * 的 SPA 回退一致，用来验证「真实部署产物」比 dev server 更可靠。
 */

import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { networkInterfaces } from 'node:os'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

const args = process.argv.slice(2)
const lan = args.includes('--lan') || process.env.HOST === '0.0.0.0'
const host = lan ? '0.0.0.0' : '127.0.0.1'
const port = Number(args.find((a) => /^\d+$/.test(a)) ?? process.env.PORT ?? 4180)

/** 列出本机所有非回环 IPv4 地址，用于打印局域网访问地址 */
function lanUrls() {
  const urls = []
  for (const list of Object.values(networkInterfaces())) {
    for (const ni of list ?? []) {
      if (ni.family === 'IPv4' && !ni.internal) urls.push(`http://${ni.address}:${port}`)
    }
  }
  return urls
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pfb': 'application/octet-stream',
  '.bcmap': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

async function resolveFile(urlPath) {
  // 去掉查询串与 hash，并阻止路径穿越
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0])
  const safe = normalize(clean).replace(/^([/\\])+/, '')
  if (safe.startsWith('..') || safe.includes(`..${sep}`)) return null

  const target = join(root, safe)
  try {
    const info = await stat(target)
    if (info.isFile()) return { path: target, size: info.size }
    if (info.isDirectory()) {
      const index = join(target, 'index.html')
      const indexInfo = await stat(index)
      if (indexInfo.isFile()) return { path: index, size: indexInfo.size }
    }
  } catch {
    // 交给下面的 SPA 回退处理
  }
  return null
}

async function spaFallback() {
  const index = join(root, 'index.html')
  try {
    const info = await stat(index)
    return { path: index, size: info.size }
  } catch {
    return null
  }
}

const server = createServer(async (req, res) => {
  const urlPath = req.url ?? '/'
  let file = await resolveFile(urlPath)
  let usedFallback = false

  // SPA 回退：像 Cloudflare Pages 的 _redirects 那样，把未知路径交给前端路由
  if (!file && req.method === 'GET' && !extname(urlPath.split('?')[0])) {
    file = await spaFallback()
    usedFallback = true
  }

  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('404 Not Found')
    console.log(`404 ${urlPath}`)
    return
  }

  const ext = extname(file.path).toLowerCase()
  const headers = {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'content-length': file.size,
    // 带 hash 的构建产物可以长缓存，入口 HTML 必须每次都校验
    'cache-control': usedFallback || ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  }

  res.writeHead(200, headers)
  createReadStream(file.path).pipe(res)
  console.log(`200 ${urlPath}${usedFallback ? ' → index.html (SPA)' : ''} [${headers['content-type'].split(';')[0]}]`)
})

server.listen(port, host, () => {
  console.log(`\n静态预览已启动：http://127.0.0.1:${port}`)
  if (lan) {
    console.log('\n局域网访问（手机 / 其他设备）：')
    for (const u of lanUrls()) console.log(`  ${u}`)
    console.log('\n（若手机打不开：请确认电脑与手机在同一 Wi-Fi，并在 Windows 防火墙放行 Node.js 的专用/专用网络。）')
  }
  console.log(`\n服务目录：${root}\n`)
})
