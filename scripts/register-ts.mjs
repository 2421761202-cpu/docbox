import { registerHooks } from 'node:module'

/**
 * Vite 允许相对路径省略扩展名，Node 的 ESM 解析器则要求写全。
 * 这里在解析失败时补上 `.ts`，让 scripts/ 下的测试能直接 import 源码。
 */
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context)
      } catch {
        // 落回原始写法，让 Node 报出它自己的错误
      }
    }
    return nextResolve(specifier, context)
  },
})
