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
