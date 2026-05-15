import { useCallback, useEffect, useRef } from 'react'
import { crmToken } from './crmState'

const CRM_BASE = import.meta.env.VITE_CRM_API_BASE_URL || 'https://wa-slilg.avlokai.com'

export function useWebSocket(onMessage) {
  const ws = useRef(null)
  const retryCount = useRef(0)
  const onMsgRef = useRef(onMessage)
  onMsgRef.current = onMessage

  const connect = useCallback(() => {
    if (!crmToken) return null

    // If CRM_BASE is a relative path (e.g. /wa-api via Vite proxy), resolve to
    // an absolute WebSocket URL using the current page's host.
    let wsBase
    if (CRM_BASE.startsWith('/')) {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      wsBase = `${proto}://${window.location.host}${CRM_BASE}`
    } else {
      wsBase = CRM_BASE.replace(/^https/, 'wss').replace(/^http/, 'ws')
    }
    const socket = new WebSocket(`${wsBase}/ws?token=${crmToken}`)

    socket.onopen = () => { retryCount.current = 0 }

    socket.onmessage = (e) => {
      try { onMsgRef.current(JSON.parse(e.data)) } catch { /* ignore bad JSON */ }
    }

    socket.onclose = () => {
      if (retryCount.current >= 5) return
      const delay = Math.min(1000 * 2 ** retryCount.current, 30000)
      retryCount.current++
      setTimeout(connect, delay)
    }

    ws.current = socket
    return socket
  }, [])

  useEffect(() => {
    const socket = connect()
    return () => {
      retryCount.current = 99
      socket?.close()
      ws.current = null
    }
  }, [connect])

  const subscribe = useCallback((leadId) => {
    ws.current?.send(JSON.stringify({ action: 'subscribe', lead_id: leadId }))
  }, [])

  const unsubscribe = useCallback((leadId) => {
    ws.current?.send(JSON.stringify({ action: 'unsubscribe', lead_id: leadId }))
  }, [])

  return { subscribe, unsubscribe }
}
