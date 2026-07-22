export default defineNuxtConfig({
  compatibilityDate: '2026-07-19',
  devtools: { enabled: false },
  css: ['~/assets/styles/main.scss', 'ant-design-vue/dist/reset.css'],
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
          innerHTML: '!function(){try{var d=document.documentElement;d.classList.add("no-transition");var t=localStorage.getItem("theme");if(t==="dark"||(t==="auto"&&window.matchMedia("(prefers-color-scheme:dark)").matches)){d.classList.add("dark");var l=document.querySelector("link[rel=icon]");if(l)l.href="/logo-dark.svg"}}catch(e){}}()',
          tagPosition: 'head',
        },
      ],
    },
  },
  routeRules: {
    '/admin/**': { ssr: false },
  },
})
