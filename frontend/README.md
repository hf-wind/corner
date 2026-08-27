# Corner 前端

本目录是 Vue 3 + Vite + Vue Router 的单页应用（SPA），不是 Nuxt 项目。

- 应用入口：`main.ts`
- 路由定义：`router.ts`
- 页面组件：`pages/`
- 构建命令：`npm run build`
- 环境变量：由根目录 `.env` 和 `vite.config.ts` 注入 `import.meta.env.VITE_*`

`pages/` 仅用于组织页面文件，不会按 Nuxt 的文件约定自动生成路由；新增页面必须同步修改
`router.ts`。
