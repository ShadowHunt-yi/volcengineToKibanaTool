import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// 创建Pinia store
const pinia = createPinia()

// 创建Vue应用
const app = createApp(App)
app.use(pinia)

// 导出应用实例供其他地方使用
export { app, pinia } 