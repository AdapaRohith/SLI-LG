const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const error = new Error(payload.message ?? 'Something went wrong. Please try again.')
    error.status = response.status
    throw error
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response
}

function createAdminHeaders(adminKey) {
  return adminKey
    ? {
        'x-admin-key': adminKey,
      }
    : {}
}

export async function createLead(payload) {
  return request('/api/leads', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getLeads(params = {}, adminKey = '') {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value)
    }
  })

  return request(`/api/leads?${query.toString()}`, {
    headers: createAdminHeaders(adminKey),
  })
}

export async function exportLeadsCsv(params = {}, adminKey = '') {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value)
    }
  })

  const queryString = query.toString()
  const response = await fetch(`${API_BASE_URL}/api/leads/export${queryString ? `?${queryString}` : ''}`, {
    headers: {
      ...createAdminHeaders(adminKey),
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const error = new Error(payload.message ?? 'Unable to export leads right now.')
    error.status = response.status
    throw error
  }

  const blob = await response.blob()
  return {
    blob,
    fileName: 'leads.csv',
  }
}
