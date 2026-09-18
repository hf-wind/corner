// frontend/types/geetest.ts

export interface GeeTestConfig {
  captchaId: string
  enabled: boolean
  theme?: 'light' | 'dark' | 'auto'
}

export interface GeeTestToken {
  lot_number: string
  captcha_output: string
  pass_token: string
  gen_time: string
  sign_token: string
}

export interface GeeTestSuccess {
  lot_number: string
  captcha_output: string
  pass_token: string
  gen_time: string
}

/** 极验 v4 bind 模式实例：无 UI 渲染，按需唤起验证面板 */
export interface GeeTestApi {
  onReady: (fn: () => void) => void
  onSuccess: (fn: () => void) => void
  onError: (fn: (err?: unknown) => void) => void
  onClose: (fn: () => void) => void
  showCaptcha: () => void
  getValidate?: () => GeeTestSuccess | null
  reset?: () => void
  destroy?: () => void
}

export interface GeeTestWidgetProps {
  modelValue?: string
  theme?: 'light' | 'dark' | 'auto'
}
