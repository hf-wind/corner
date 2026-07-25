export default defineNuxtConfig({
  compatibilityDate: '2026-07-19',
  devtools: { enabled: false },
  css: [
    'ant-design-vue/dist/reset.css',
    'misans/lib/Normal/MiSans-Regular.min.css',
    'misans/lib/Normal/MiSans-Semibold.min.css',
    '~/assets/styles/main.scss',
  ],
  modules: ['nuxt-icon'],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:4000/api',
    },
  },
  app: {
    head: {
      htmlAttrs: {
        lang: 'zh-CN',
      },
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
        { rel: 'apple-touch-icon', href: '/logo_192.png' },
      ],
      script: [
        {
          innerHTML: '!function(){try{var d=document.documentElement;d.classList.add("no-transition");var f=localStorage.getItem("font-preset");d.dataset.font=f||"rounded";var t=localStorage.getItem("theme")||"light";var r=t==="dark"||(t==="auto"&&window.matchMedia("(prefers-color-scheme:dark)").matches)?"dark":"light";d.classList.toggle("dark",r==="dark");d.dataset.theme=r;d.style.colorScheme=r;var l=document.querySelector("link[rel=icon]");if(l)l.href=r==="dark"?"/logo-dark.svg":"/logo.svg"}catch(e){}}()',
          tagPosition: 'head',
        },
      ],
    },
  },
  vite: {
    optimizeDeps: {
      include: ['ant-design-vue', '@ant-design/icons-vue'],
    },
  },
  routeRules: {
    '/': { ssr: false },
    '/home': { ssr: false },
    '/article/**': { ssr: false },
    '/tags': { ssr: false },
    '/category': { ssr: false },
    '/archive': { ssr: false },
    '/friends': { ssr: false },
    '/about': { ssr: false },
    '/login': { ssr: false },
    '/admin/**': { ssr: false },
  },
})
