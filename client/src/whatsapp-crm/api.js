import axios from 'axios'
import { crmToken, clearCrmToken } from './crmState'

const BASE = import.meta.env.VITE_CRM_API_BASE_URL || 'https://wa-slilg.avlokai.com'

const api = axios.create({ baseURL: `${BASE}/api` })

api.interceptors.request.use(cfg => {
  if (crmToken) cfg.headers.Authorization = `Bearer ${crmToken}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) clearCrmToken()
    return Promise.reject(err)
  }
)

export const conversationsApi = {
  list: (params = {}) => api.get('/conversations', { params }),
  get: (id) => api.get(`/conversations/${id}`),
}

export const leadsApi = {
  takeover: (id) => api.put(`/leads/${id}/takeover`),
  resumeAI: (id) => api.delete(`/leads/${id}/takeover`),
  assign: (id, agentId) => api.put(`/leads/${id}/assign`, null, { params: { agent_id: agentId } }),
}

export const chatApi = {
  sendText: (leadId, text) => api.post(`/chat/${leadId}/send-text`, { text }),
  sendMedia: (leadId, file, caption = '') => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('caption', caption)
    return api.post(`/chat/${leadId}/send-media`, fd)
  },
}

export const mediaUrl = (mediaId) => `${BASE}/api/media/${mediaId}`

export default api
