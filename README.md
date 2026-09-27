# DocBox · 免费的在线图片与 PDF 处理工具

一个完全在浏览器本地运行的图片 / PDF 工具箱，界面与视觉为独立设计。
核心选择：**所有运算都在访问者的浏览器里完成，文件不上传任何服务器。**

这样做的直接好处：

| | 传统在线转换站 | DocBox |
|---|---|---|
| 文件去向 | 上传到别人的服务器 | 从不离开本机 |
| 服务器成本 | 随用量线性增长 | 静态托管，几乎为零 |
| 使用限制 | 每日额度、大小分级、会员墙 | 不限次数、不限体积 |
| 断网可用 | 否 | 页面加载后可以 |
| 分享给别人 | 需要扩容 | 部署一次，多少人用都一样 |

---

## 工具（16 个，全部可用）

按「图片工具」（8 个）与「PDF 工具」（8 个）两大分组展示，均可直接在首页使用。

**图片处理**

| 工具 | 路径 | 说明 |
|---|---|---|
| 图片压缩 | `/image-compress` | 按画质或按目标体积（自动二分搜索质量 + 降分辨率） |
| 图片裁剪 | `/image-crop` | 可视化裁剪框，比例锁定，同一裁剪框可套用到整批图片 |
| 图片改尺寸 | `/image-resize` | 按像素 / 百分比 / 常用规格（证件照、封面等） |
| 图片旋转 | `/image-rotate` | 90° 倍数 + 任意角度微调、镜像翻转 |
| 图片分割 | `/image-split` | 九宫格均分或按固定尺寸切块 |
| 图片拼接 | `/image-concat` | 纵向长图 / 横向拼接 / 宫格，可调间距、留白、圆角 |
| 图片转 PDF | `/image-to-pdf` | 每页一张图，可选 A4 / Letter / 跟随图片尺寸 |
| 图片格式转换 | `/image-convert` | JPG / PNG / WebP 互转 |

**PDF 处理**

| 工具 | 路径 | 说明 |
|---|---|---|
| PDF 合并 | `/pdf-merge` | 无损合并，支持每个文件指定页码范围 |
| PDF 分割 | `/pdf-split` | 每页一个 / 每 N 页一个 / 平均 N 份 / 自定义范围 |
| PDF 压缩 | `/pdf-compress` | 重新栅格化压缩，五档预设 + 自定义（注意文字会变图片） |
| PDF 旋转 | `/pdf-rotate` | 全部页面或指定页面，无损 |
| PDF 删页面 | `/pdf-delete-pages` | 可视化选页，支持"删除选中"或"保留选中" |
| PDF 提取页面 | `/pdf-extract` | 挑出若干页组成新文档，或逐页导出 |
| PDF 调整页面顺序 | `/pdf-reorder` | 按点击顺序重排，支持整体倒序 |
| PDF 转图片 | `/pdf-to-image` | 72–300 DPI，JPG / PNG / WebP，可转灰度 |

> 未纳入的功能（自动抠图、图片变高清、GIF 逐帧处理、PDF↔Word/Excel/PPT 等）需要 AI 模型、
> OCR 引擎或服务端排版引擎，无法在纯浏览器里可靠完成，因此没有上线，也不会以「假入口」的形式出现。
> 以后若接入后端，可在 `src/lib/api/` 加一层，再按 registry 的约定逐步启用。

---

## 技术选型

- **Vite 6 + React 18 + TypeScript 5.7**，不引入 UI 组件库，组件与图标全部手写
- **Tailwind CSS v4**（通过 `@tailwindcss/vite`，不用 tailwind.config.js）
- **pdf-lib** —— 结构性编辑（合并 / 拆分 / 旋转 / 删页 / 重排），无损，文字仍可搜索
- **pdfjs-dist v4** —— 渲染（PDF 转图片、缩略图、栅格化压缩）
- **JSZip** —— 批量结果打包下载
- 图片处理全部基于 Canvas API，无第三方图像库

运行时依赖只有 6 个（`react`、`react-dom`、`react-router-dom`、`pdf-lib`、`pdfjs-dist`、`jszip`），
裁剪框等交互都是手写的，没有引入 `cropperjs` 之类的重型库。

### 为什么把 pdf-lib 和 pdf.js 一起用？

两者分工明确，缺一不可：

- `pdf-lib` 操作的是 PDF 的对象结构，合并页面只是把页面对象搬过去，**不重新编码内容**，
  所以文件小、速度快、文字可搜索；
- `pdfjs-dist` 负责"把一页画成像素"，PDF 转图片、缩略图预览、栅格化压缩都得靠它。

---

## 本地开发

```bash
npm install
npm run dev        # http://localhost:5180
npm run typecheck  # tsc --noEmit
npm test           # 纯逻辑 + PDF 结构操作的自动化测试（无需浏览器）
npm run build      # 类型检查 + 产出 dist/
npm run preview    # 用 Vite 预览构建产物 http://localhost:4180
npm run serve      # 零依赖静态服务器预览 dist/ http://127.0.0.1:4180
```

> **网络较慢时**（例如国内直连 npm 官方源）安装可能非常久。
> 可以临时切换镜像加速：
> ```bash
> npm install --registry=https://registry.npmmirror.com
> ```
> 项目的 `.npmrc` 只放宽了超时与重试，没有锁定镜像源。

### 关于 `public/pdfjs/`

`npm run dev` / `npm run build` 之前会自动执行 `scripts/copy-pdfjs-assets.mjs`，
把 pdf.js 的两份运行时资源从 `node_modules` 复制到 `public/pdfjs/`：

- `standard_fonts/` —— PDF 使用 Helvetica / Times 等 14 种标准字体且**未内嵌**时，
  pdf.js 需要它来替代渲染，否则这些文字会直接消失；
- `cmaps/` —— 中日韩 PDF 常用预定义 CMap 而不内嵌字体，缺少它**中文会整段丢失**。

它们只在解析到这类 PDF 时才被浏览器按需请求，不会进入 JS bundle。
目录已在 `.gitignore` 中，克隆后 `npm install` + 构建会自动补齐。

### 测试

`npm test` 有两组，都不需要浏览器：

- `scripts/smoke.mjs` —— 页码区间解析、体积/尺寸格式化等纯函数；
- `scripts/smoke-pdf.mjs` —— 真实调用 `src/lib/pdf/edit.ts`，
  用 pdf-lib 造带「宽度标记」的测试 PDF，验证合并 / 四种拆分 / 提取 / 删页 /
  重排 / 旋转的实际结果与错误分支，并用 **pdf.js 把文字提取出来**，
  以此证明这些操作确实无损（文字仍是可搜索的真实文本，而不是被转成图片）。

图片工具依赖浏览器的 Canvas，无法在 Node 下自动化测试，需要手动在页面上验证。

---

## 部署

构建产物 `dist/` 是纯静态文件，可以放在任何静态托管上。
但因为使用 `BrowserRouter`（为了网址干净、利于 SEO），**必须配置 SPA 回退**，
否则直接访问 `/pdf-merge` 会 404。

仓库里已经准备好配置文件：

| 平台 | 需要的东西 | 状态 |
|---|---|---|
| Cloudflare Pages / Netlify | `public/_redirects` | 已包含 |
| Vercel | `vercel.json` | 已包含 |
| Nginx / 自建 | `try_files $uri $uri/ /index.html;` | 自行配置 |
| 对象存储（OSS / COS） | 设置 404 页面为 `index.html` | 自行配置 |

如果托管平台不支持重写规则，把 `src/main.tsx` 里的 `BrowserRouter` 换成 `HashRouter`
即可（网址会变成 `/#/pdf-merge`，但不需要任何服务端配置，也能在 `file://` 下打开）。

### 各平台的构建参数

- 构建命令：`npm run build`
- 输出目录：`dist`
- Node 版本：18 以上（开发时使用 26.x）

---

## 项目结构

```
src/
├── components/
│   ├── Layout.tsx           页头 / 页脚 / 页面容器
│   ├── ToolCard.tsx         工具卡片、宫格
│   ├── ToolPage.tsx         工具页通用骨架（面包屑、拖放区、选项、结果）
│   ├── FileDropzone.tsx     拖放上传
│   ├── SourceFileList.tsx   待处理文件列表（可拖动排序、缩略图预览）
│   ├── ResultList.tsx       结果列表（逐个下载 / 打包 ZIP）
│   ├── CropBox.tsx          自研裁剪框（归一化坐标，可套用到整批图片）
│   ├── PdfPageSelector.tsx  PDF 页面缩略图选择器
│   ├── controls.tsx         表单控件（面板、分段、滑块、颜色…）
│   └── icons.tsx            全部图标（手写 SVG，无图标库）
├── hooks/
│   ├── useToolJob.ts        所有工具共用的状态机：文件、进度、取消、结果
│   ├── useFileBytes.ts      把 File 读成 Uint8Array
│   └── usePdfPreview.ts     读取 PDF 信息 / 渲染页面缩略图
├── lib/
│   ├── format.ts            字节、尺寸、百分比的格式化与解析
│   ├── types.ts             OutputFile / SourceFile / JobState
│   ├── download.ts          单文件下载、批量下载、打包 ZIP
│   ├── image/
│   │   ├── core.ts          解码（含 EXIF 方向）、缩放、旋转、裁剪、翻转
│   │   ├── encode.ts        导出 JPG/PNG/WebP，按目标体积反推参数
│   │   ├── ops.ts           分割与拼接
│   │   └── batch.ts         批量串行处理 + 进度汇报
│   └── pdf/
│       ├── pdfjs.ts         pdf.js 封装（打开、渲染、缩略图）
│       ├── edit.ts          无损结构编辑（合并、拆分、旋转、删页、重排）
│       ├── ranges.ts        页码范围解析（独立无依赖，便于单测）
│       ├── convert.ts       PDF↔图片双向转换、栅格化压缩
│       ├── meta.ts          读取页数
│       └── thumb.ts         为生成的 PDF 生成首页缩略图
├── pages/
│   ├── Home.tsx             首页（搜索、分类筛选、工具宫格、FAQ）
│   ├── NotFound.tsx         404
│   └── tools/               16 个工具页面
└── tools/
    └── registry.ts          工具注册表 —— 站点的单一数据源

scripts/
├── copy-pdfjs-assets.mjs    把 pdf.js 的字体/CMap 复制到 public/（dev、build 前自动执行）
├── serve-dist.mjs           零依赖静态服务器，用于预览 dist/
├── register-ts.mjs          让 Node 能直接 import 源码里的 .ts（仅供测试）
├── smoke.mjs                纯函数测试
└── smoke-pdf.mjs            PDF 结构操作的端到端测试
```

### 新增一个工具需要改两处

1. `src/tools/registry.ts` 里加一条 `ToolMeta`（首页宫格、导航、页脚、相关推荐、搜索全部自动生效）；
2. `src/App.tsx` 的 `PAGES` 里挂上组件。

两处都登记后，工具即出现在首页并拥有自己的路由；只加注册表而不挂组件则不会生成路由。

---

## 一些实现上的取舍

**图片压缩为什么要有"按目标体积"模式？**
指定质量只是间接控制体积，用户真正想要的是"压到 200KB 以内"。
所以实现了两步搜索：先在质量维度做二分查找，达不到目标就按 0.85 倍逐步降低分辨率，
每轮取满足体积要求的最优解。

**PNG 为什么压不动？**
PNG 是无损格式，没有质量参数，重新编码后体积甚至可能变大。
界面里对此有明确提示，并引导用户改用 JPG/WebP，或使用会自动降分辨率的"按大小压缩"。

**PDF 压缩的代价说清楚了吗？**
说清楚了。栅格化压缩会把每页渲染成 JPEG 再拼回 PDF，文字因此变成图片、不能搜索、链接失效。
这一点在工具的选项面板里用醒目提示写明，而不是含糊地叫"智能压缩"。

**为什么 PDF 页面操作用 pdf-lib 而不是 pdf.js？**
pdf.js 是阅读器/渲染器，不提供写出 PDF 的能力。做无损结构编辑必须用 pdf-lib。

**批量处理为什么是串行的？**
图片解码和编码是内存大户，十几个大图并发处理很容易触发浏览器 OOM，反而更慢、更容易失败。
串行 + 每步让出主线程，进度条还能正常刷新。

**下载为什么要延迟释放 URL？**
Safari 在 `a.click()` 之后立刻 `revokeObjectURL` 会导致下载失败，
所以统一延迟 60 秒释放；ZIP 打包也是每 350ms 触发一个下载，避免浏览器把连续下载判定为弹窗。

---

## 浏览器支持

Chrome / Edge / Firefox / Safari 最近版本。桌面端体验最佳；移动端可用图片类工具，
但处理大文件时内存压力较大。

部分能力依赖较新的浏览器 API（如 `createImageBitmap` 的 EXIF 方向支持、
WebP 编码），代码里都做了降级处理：不支持时会回退到 `<img>` 解码或提示改用其他格式。

---

## 授权

仅供学习与自用。
