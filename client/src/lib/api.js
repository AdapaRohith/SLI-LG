const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'https://slilg-api.avlokai.com').replace(/\/$/, '')

async function request(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers ?? {}),
  }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const error = new Error(payload.message ?? 'Unable to reach the lead API right now.')
    error.status = response.status
    throw error
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response
}

function normalizeCollection(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  if (Array.isArray(payload?.items)) {
    return payload.items
  }

  return []
}

export function getApiBaseUrl() {
  return API_BASE_URL
}

export async function getHealth() {
  return request('/')
}

export async function getLeads() {
  const payload = await request('/leads')
  return normalizeCollection(payload)
}

export async function searchLeads(query) {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    return getLeads()
  }

  const payload = await request(`/search?q=${encodeURIComponent(trimmedQuery)}`)
  return normalizeCollection(payload)
}

export async function getLeadDetail(leadId) {
  const [detail, insights] = await Promise.all([
    request(`/leads/${leadId}`),
    request(`/insights/${leadId}`).catch(() => ({}))
  ]);

  if (detail && detail.lead) {
    // Merge insights into lead
    detail.lead = { ...detail.lead, ...insights };

    // If backend doesn't provide exact counts, calculate them from messages
    if (detail.messages && Array.isArray(detail.messages)) {
      if (detail.lead.messages_received === undefined) {
        detail.lead.messages_received = detail.messages.filter(m => m.role === 'user').length;
      }
      if (detail.lead.messages_sent === undefined) {
        detail.lead.messages_sent = detail.messages.filter(m => m.role !== 'user').length;
      }
      if (detail.lead.exact_message_count === undefined) {
        detail.lead.exact_message_count = detail.messages.length;
      }
    }
  }

  return detail;
}

export async function importLeads(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE_URL}/import-leads`, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error ?? 'Failed to import leads');
    error.status = response.status;
    throw error;
  }

  return response.json();
}
