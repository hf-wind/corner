import Antd from 'ant-design-vue'
import * as Icons from '@ant-design/icons-vue'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Antd)
  for (const [key, component] of Object.entries(Icons)) {
    nuxtApp.vueApp.component(key, component)
  }
})
