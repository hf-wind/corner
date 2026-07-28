function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
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

export function useApi() {
  return {
    async get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
      const query = params ? '?' + new URLSearchParams(
        Object.entries(params)
          .filter(([_, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => [k, String(v)])
      ).toString() : ''
      const res = await $fetch(`${base()}${path}${query}`, {
        headers: { ...authHeaders() },
      })
      return handleResponse<T>(res)
    },
    async post<T = any>(path: string, body?: any): Promise<T> {
      const res = await $fetch(`${base()}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body,
      })
      return handleResponse<T>(res)
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
      const res = await $fetch(`${base()}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body,
      })
      return handleResponse<T>(res)
    },
    async delete<T = any>(path: string): Promise<T> {
      const res = await $fetch(`${base()}${path}`, {
        method: 'DELETE',
        headers: { ...authHeaders() },
      })
      return handleResponse<T>(res)
    },
    async upload<T = any>(path: string, formData: FormData): Promise<T> {
      const res = await $fetch(`${base()}${path}`, {
        method: 'POST',
        headers: { ...authHeaders() },
        body: formData,
      })
      return handleResponse<T>(res)
    },
  }
}
