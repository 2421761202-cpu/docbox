/**
 * GitHub Pages 线上自检：等待 Pages 构建完成，然后逐个资源发真实请求。
 *
 *   node scripts/verify-pages.mjs
 *   node scripts/verify-pages.mjs https://example.com/sub/
 *
 * 检查项：首页可达、资源前缀与子路径一致、HTML 引用的每个 JS/CSS 都能取到、
 * pdf.js 的 CMap 与标准字体存在（中文 PDF 依赖）、深层链接能回退到应用外壳。
 */

const BASE = (process.argv[2] ?? 'https://2421761202-cpu.github.io/docbox/').replace(/\/?$/, '/')
const PREFIX = new URL(BASE).pathname
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function get(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' })
    const body = Buffer.from(await res.arrayBuffer())
    return {
      ok: res.ok,
      status: res.status,
      type: (res.headers.get('content-type') ?? '').split(';')[0],
      bytes: body.length,
      body,
    }
  } catch (e) {
    return { ok: false, status: 0, type: '', bytes: 0, body: Buffer.alloc(0), error: e.message }
  }
}

// 1. 等首页就绪（Pages 首次构建通常 30~90 秒）
let home = null
for (let i = 1; i <= 20; i++) {
  home = await get(BASE)
  if (home.ok && home.bytes > 0) {
    console.log(`首页就绪（第 ${i} 次尝试）\n`)
    break
  }
  console.log(`等待构建… 第 ${i} 次：${home.status || home.error}`)
  await sleep(15000)
}
if (!home?.ok) {
  console.log('\n首页始终未就绪，放弃验证')
  process.exit(1)
}

console.log(`首页  HTTP ${home.status}  ${home.type}  ${home.bytes} bytes`)
const html = home.body.toString('utf8')
console.log(`  资源前缀  ${html.includes(`"${PREFIX}assets/`) ? `✓ ${PREFIX} 正确` : `✗ 前缀不是 ${PREFIX}`}`)
console.log(`  页面标题  ${(html.match(/<title>([^<]*)<\/title>/) ?? [, '(无)'])[1]}`)

// 2. 逐个验证 HTML 引用的静态资源
const refs = [...new Set([...html.matchAll(new RegExp(`"(${PREFIX}[^"]+)"`, 'g'))].map((m) => m[1]))]
console.log(`\n引用资源 ${refs.length} 个：`)
let bad = 0
for (const ref of refs) {
  const r = await get(new URL(ref, BASE).href)
  const good = r.ok && r.bytes > 0
  if (!good) bad++
  console.log(`  ${good ? '✓' : '✗'} ${r.status} ${String(r.bytes).padStart(8)}  ${r.type.padEnd(26)} ${ref}`)
}

// 3. pdf.js 的 CMap / 标准字体（中文 PDF 转图片依赖）
console.log('\npdf.js 资源：')
for (const ref of ['pdfjs/cmaps/UniGB-UCS2-H.bcmap', 'pdfjs/standard_fonts/FoxitDingbats.pfb']) {
  const r = await get(new URL(ref, BASE).href)
  const good = r.ok && r.bytes > 0
  if (!good) bad++
  console.log(`  ${good ? '✓' : '✗'} ${r.status} ${String(r.bytes).padStart(8)}  ${ref}`)
}

// 4. 深层链接：Pages 不支持重写，靠 404.html 副本回退，应返回应用外壳
const deep = await get(new URL('pdf/merge', BASE).href)
const deepOk = deep.body.toString('utf8').includes(`"${PREFIX}assets/`)
console.log(`\n深层链接 pdf/merge  HTTP ${deep.status}（Pages 的 404.html 回退），返回应用外壳：${deepOk ? '✓' : '✗'}`)
if (!deepOk) bad++

console.log(`\n结果：${bad === 0 ? '全部通过 ✓' : `${bad} 项异常 ✗`}`)
process.exit(bad === 0 ? 0 : 1)
