import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 本文件在 Node 中执行，但项目未引入 @types/node，这里只声明实际用到的那一部分
declare const process: { env: Record<string, string | undefined> }

export default defineConfig({
  // 部署到 GitHub Pages 的 /<repo>/ 子路径时必须带上前缀：
  //   $env:PAGES_BASE='/docbox/'; npm run build
  // 本地构建不设置该变量，走根路径 '/'。
  base: process.env.PAGES_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-pdf-lib': ['pdf-lib'],
          'vendor-pdfjs': ['pdfjs-dist'],
          'vendor-zip': ['jszip'],
        },
      },
    },
  },
  // pdf.js 的 worker 需要以 ES module 形式加载
  worker: { format: 'es' },
  server: { port: 5180, host: true },
  preview: { port: 4180, host: true },
})
