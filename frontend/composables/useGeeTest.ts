// frontend/composables/useGeeTest.ts
// 极验 v4 bind 模式：低风险请求无感直接通过，高风险时才弹出勾选面板。

import { ref } from 'vue'
import type { GeeTestApi, GeeTestSuccess } from '~/types/geetest'

declare global {
  interface Window {
    initGeetest4?: (
      config: Record<string, unknown>,
      callback: (captcha: GeeTestApi) => void,
    ) => void
    __cornerGeetestScript?: Promise<void>
  }
}

export class GeeTestCanceledError extends Error {
  constructor() {
    super('验证已取消')
    this.name = 'GeeTestCanceledError'
  }
}

export function useGeeTest() {
  const status = ref<'idle' | 'loading' | 'ready' | 'validating' | 'passed' | 'error'>('idle')
  const error = ref<string | null>(null)

  let captchaInstance: GeeTestApi | null = null
  let initPromise: Promise<void> | null = null
  let validatePromise: Promise<string> | null = null
  let token = ''
  let pendingResolve: ((value: string) => void) | null = null
  let pendingReject: ((reason: Error) => void) | null = null

  const captchaId = String(import.meta.env.VITE_GEETEST_CAPTCHA_ID || '').trim()
  const configured = String(import.meta.env.VITE_GEETEST_ENABLED || '').trim().toLowerCase()
  const enabled = configured
    ? !['0', 'false', 'off', 'no'].includes(configured)
    : Boolean(import.meta.env.PROD && captchaId)

  const loadScript = (): Promise<void> => {
    if (window.initGeetest4) return Promise.resolve()
    if (window.__cornerGeetestScript) return window.__cornerGeetestScript

    const promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.dataset.cornerGeetest = 'true'
      script.src = 'https://static.geetest.com/v4/gt4.js'
      script.async = true

      const timeout = window.setTimeout(() => reject(new Error('极验脚本加载超时')), 12000)
      script.onload = () => {
        window.clearTimeout(timeout)
        resolve()
      }
      script.onerror = () => {
        window.clearTimeout(timeout)
        reject(new Error('极验脚本加载失败'))
      }
      document.head.appendChild(script)
    }).catch((err) => {
      document.querySelector('script[data-corner-geetest="true"]')?.remove()
      window.__cornerGeetestScript = undefined
      throw err
    })

    window.__cornerGeetestScript = promise
    return promise
  }

  function packToken(result: GeeTestSuccess): string {
    return JSON.stringify({
      lot_number: String(result.lot_number ?? ''),
      captcha_output: String(result.captcha_output ?? ''),
      pass_token: String(result.pass_token ?? ''),
      gen_time: String(result.gen_time ?? ''),
    })
  }

  async function init(): Promise<void> {
    if (!enabled || !captchaId) {
      status.value = 'ready'
      return
    }
    if (initPromise) return initPromise

    status.value = 'loading'
    initPromise = (async () => {
      await loadScript()
      if (!window.initGeetest4) throw new Error('极验 API 不可用')

      await new Promise<void>((resolve, reject) => {
        window.initGeetest4!(
          {
            captchaId,
            product: 'bind',
            language: 'zh-cn',
          },
          (captcha) => {
            captchaInstance = captcha
            captcha.onReady(() => {
              status.value = 'ready'
              resolve()
            })
            captcha.onSuccess(() => {
              const result = captchaInstance?.getValidate?.() ?? null
              if (result && result.lot_number && result.captcha_output) {
                token = packToken(result)
                status.value = 'passed'
                error.value = null
                pendingResolve?.(token)
              } else {
                pendingReject?.(new Error('验证结果无效，请重试'))
              }
              pendingResolve = null
              pendingReject = null
            })
            captcha.onError((err) => {
              error.value = '验证服务异常，请稍后重试'
              status.value = 'error'
              pendingReject?.(err instanceof Error ? err : new Error('验证服务异常'))
              pendingResolve = null
              pendingReject = null
            })
            captcha.onClose(() => {
              status.value = 'ready'
              pendingReject?.(new GeeTestCanceledError())
              pendingResolve = null
              pendingReject = null
            })
            // 兜底：个别环境下 onReady 可能不触发
            window.setTimeout(() => {
              if (status.value === 'loading') {
                status.value = 'ready'
                resolve()
              }
            }, 6000)
          },
        )
      })
    })().catch((err) => {
      status.value = 'error'
      error.value = (err as Error).message || '验证初始化失败'
      captchaInstance = null
      initPromise = null
      throw err
    })

    return initPromise
  }

  /** 触发验证：返回打包后的 token；低风险直接通过，高风险会弹出极验面板 */
  function validate(): Promise<string> {
    if (!enabled) return Promise.resolve('local-development-bypass')
    if (token) return Promise.resolve(token)
    if (validatePromise) return validatePromise

    validatePromise = (async () => {
      await init()
      if (token) return token
      if (!captchaInstance) throw new Error(error.value || '验证组件不可用')

      status.value = 'validating'
      return new Promise<string>((resolve, reject) => {
        pendingResolve = resolve
        pendingReject = reject
        try {
          captchaInstance!.showCaptcha()
        } catch (err) {
          pendingResolve = null
          pendingReject = null
          status.value = 'error'
          error.value = '验证组件唤起失败'
          reject(err instanceof Error ? err : new Error('验证组件唤起失败'))
        }
      })
    })().finally(() => {
      validatePromise = null
    })

    return validatePromise
  }

  function reset() {
    token = ''
    error.value = null
    if (status.value !== 'loading') status.value = 'ready'
    try {
      captchaInstance?.reset?.()
    } catch {
      // 忽略重置异常
    }
  }

  return {
    enabled,
    status,
    error,
    init,
    validate,
    reset,
  }
}
