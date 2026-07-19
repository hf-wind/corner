export default defineNuxtConfig({
  compatibilityDate: '2026-07-19',
  devtools: { enabled: true },
  css: ['~/assets/styles/main.scss'],
  modules: ['nuxt-icon'],
  app: {
    head: {
      htmlAttrs: {
        lang: 'zh-CN',
      },
    },
  },
})
