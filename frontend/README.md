# Corner 前端

本目录是 Vue 3 + Vite + Vue Router 的单页应用（SPA）。

- 应用入口：`main.ts`
- 路由定义：`router.ts`
- 页面组件：`pages/`
- 构建命令：`npm run build`
- 环境变量：由根目录 `.env` 和 `vite.config.ts` 注入 `import.meta.env.VITE_*`
- OAuth callback 使用发起登录页面的当前 origin 动态生成，生产无需额外配置固定 host。

`pages/` 仅用于组织页面文件；新增页面必须同步修改
`router.ts`。
