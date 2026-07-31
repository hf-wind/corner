import { createApp } from 'vue'
import { createHead } from '@unhead/vue/client'
import 'ant-design-vue/dist/reset.css'
import '@fontsource-variable/noto-sans-sc/wght.css'
import '@fontsource-variable/nunito/wght.css'
import './assets/styles/main.scss'
import App from './app.vue'
import router from './router'

const app = createApp(App)
const head = createHead()

app.use(router)
app.use(head)
app.mount('#app')
