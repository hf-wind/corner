function authHeaders(): Record<string, string> {
  const { token } = useAuth()
  const accessToken = token.value || localStorage.getItem('token')
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
}

function base() {
  const config = useRuntimeConfig()
  return config.public.apiBase as string
}

async function handleResponse<T>(response: any): Promise<T> {
  if (response && typeof response === 'object' && 'code' in response && 'data' in response) {
    if (response.code !== 200) {
      throw new Error(response.message || 'Request failed')
    }
    return response.data as T
  }
  return response as T
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  for (const [key, value] of Object.entries(authHeaders())) headers.set(key, value)

  let body = options.body
  if (body && !(body instanceof FormData) && typeof body !== 'string') {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(body)
  }

  const response = await fetch(`${base()}${path}`, { ...options, headers, body })

  if (response.status === 401) {
    const { clearSession } = useAuth()
    clearSession()
  }

  const text = response.status === 204 ? '' : await response.text()
  let payload: any = undefined
  if (text) {
    try { payload = JSON.parse(text) } catch { payload = text }
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || `Request failed (${response.status})`
    throw new Error(String(message))
  }
  return handleResponse<T>(payload)
}

export function useApi() {
  return {
    async get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
      const query = params ? '?' + new URLSearchParams(
        Object.entries(params)
          .filter(([_, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => [k, String(v)])
      ).toString() : ''
      return request<T>(`${path}${query}`)
    },
    async post<T = any>(path: string, body?: any): Promise<T> {
      return request<T>(path, {
        method: 'POST',
        body: body as BodyInit,
      })
    },
    async postStream(
      path: string,
      body: any,
      onEvent: (event: { event: string; data: any }) => void,
      signal?: AbortSignal,
    ): Promise<void> {
      const response = await fetch(`${base()}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
        signal,
      })
      if (!response.ok) throw new Error(`Request failed (${response.status})`)
      if (!response.body) throw new Error('Streaming response is not supported')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const dispatch = (block: string) => {
        if (!block.trim()) return
        let event = 'message'
        const dataLines: string[] = []
        for (const line of block.split(/\r?\n/)) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
        }
        const raw = dataLines.join('\n')
        if (!raw) return
        let data: any = raw
        try { data = JSON.parse(raw) } catch { /* plain text SSE payload */ }
        onEvent({ event, data })
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split(/\r?\n\r?\n/)
        buffer = blocks.pop() || ''
        blocks.forEach(dispatch)
      }
      buffer += decoder.decode()
      if (buffer) dispatch(buffer)
    },
    async put<T = any>(path: string, body?: any): Promise<T> {
      return request<T>(path, {
        method: 'PUT',
        body: body as BodyInit,
      })
    },
    async delete<T = any>(path: string): Promise<T> {
      return request<T>(path, { method: 'DELETE' })
    },
    async upload<T = any>(path: string, formData: FormData): Promise<T> {
      return request<T>(path, {
        method: 'POST',
        body: formData,
      })
    },
  }
}
