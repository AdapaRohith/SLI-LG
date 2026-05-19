import { useCallback, useEffect, useRef } from 'react'
import { crmToken } from './crmState'
import { WHATSAPP_WS_BASE_URL } from '../config/endpoints'

const CRM_WS_BASE = WHATSAPP_WS_BASE_URL.replace(/\/$/, '')

export function useWebSocket(onMessage) {
  const ws = useRef(null)
  const retryCount = useRef(0)
  const onMsgRef = useRef(onMessage)

  useEffect(() => {
    onMsgRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!crmToken) return null
    let cancelled = false

    function connect() {
      if (cancelled) return null

      const socket = new WebSocket(`${CRM_WS_BASE}/ws?token=${crmToken}`)

      socket.onopen = () => { retryCount.current = 0 }

      socket.onmessage = (e) => {
        try { onMsgRef.current(JSON.parse(e.data)) } catch { /* ignore bad JSON */ }
      }

      socket.onclose = () => {
        if (cancelled || retryCount.current >= 5) return
        const delay = Math.min(1000 * 2 ** retryCount.current, 30000)
        retryCount.current++
        setTimeout(connect, delay)
      }

      ws.current = socket
      return socket
    }

    const socket = connect()
    return () => {
      cancelled = true
      retryCount.current = 99
      socket?.close()
      ws.current = null
    }
  }, [])

  const subscribe = useCallback((leadId) => {
    ws.current?.send(JSON.stringify({ action: 'subscribe', lead_id: leadId }))
  }, [])

  const unsubscribe = useCallback((leadId) => {
    ws.current?.send(JSON.stringify({ action: 'unsubscribe', lead_id: leadId }))
  }, [])

  return { subscribe, unsubscribe }
}
