import { useCallback, useEffect, useRef, useState } from 'react'
import { chatApi, conversationsApi, leadsApi } from './api'
import MediaUpload from './MediaUpload'
import MessageBubble from './MessageBubble'
import TakeoverBanner from './TakeoverBanner'

export default function ChatPanel({ lead: initialLead }) {
  const [conv, setConv] = useState(null)
  const [lead, setLead] = useState(initialLead)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [convLoading, setConvLoading] = useState(false)
  const [convError, setConvError] = useState('')
  const [sendError, setSendError] = useState('')
  const bottomRef = useRef()

  const loadConv = useCallback(async () => {
    console.log('[ChatPanel] initialLead:', initialLead)
    if (!initialLead?.id) {
      console.warn('[ChatPanel] initialLead has no .id field — keys:', Object.keys(initialLead || {}))
      return
    }
    setConvLoading(true)
    setConvError('')
    try {
      const { data } = await conversationsApi.get(initialLead.id)
      console.log('[ChatPanel] conv data:', data)
      setConv(data)
      if (data?.lead) {
        setLead({
          ...initialLead,
          ai_active: data.lead.ai_active,
          ai_paused_until: data.lead.ai_paused_until,
        })
      }
    } catch (err) {
      setConvError(err?.response?.data?.detail || err?.message || 'Failed to load messages')
    } finally {
      setConvLoading(false)
    }
  }, [initialLead])

  useEffect(() => { loadConv() }, [loadConv])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv?.messages?.length])

  const handleSendText = async (e) => {
    e.preventDefault()
    if (!text.trim() || !conv || sending) return
    setSending(true)
    setSendError('')
    try { await chatApi.sendText(conv.lead.id, text); setText(''); await loadConv() }
    catch (err) { setSendError(err?.response?.data?.detail || err?.message || 'Send failed') }
    finally { setSending(false) }
  }

  const handleSendMedia = async (file) => {
    if (!conv || sending) return
    setSending(true)
    setSendError('')
    try { await chatApi.sendMedia(conv.lead.id, file); await loadConv() }
    catch (err) { setSendError(err?.response?.data?.detail || err?.message || 'Send failed') }
    finally { setSending(false) }
  }

  const handleTakeover = async () => {
    if (!conv) return
    try {
      await leadsApi.takeover(conv.lead.id)
      setLead(prev => ({ ...prev, ai_active: false }))
    } catch { /* ignore */ }
  }

  if (!initialLead) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
        <div className="text-center">
          <p className="text-4xl mb-2">💬</p>
          <p>Select a conversation</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-white">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">{lead?.name || lead?.phone}</h3>
          <p className="text-xs text-gray-500">{lead?.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          {lead?.ai_active && (
            <button onClick={handleTakeover}
              className="text-xs bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-700 px-3 py-1 rounded-full font-medium transition-colors">
              Take Over
            </button>
          )}
          <span className={`text-xs px-2 py-1 rounded-full font-medium
            ${lead?.ai_active ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
            {lead?.ai_active ? 'AI Active' : 'Human'}
          </span>
        </div>
      </div>
      <TakeoverBanner
        lead={lead}
        onResume={() => setLead(prev => ({ ...prev, ai_active: true, ai_paused_until: null }))}
      />
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
        {convLoading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">Loading messages…</p>
          </div>
        )}
        {!convLoading && convError && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <p className="text-sm font-medium text-red-600">{convError}</p>
            <button
              onClick={loadConv}
              className="rounded-full bg-[#075E54] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#128C7E]"
            >
              Retry
            </button>
          </div>
        )}
        {!convLoading && !convError && conv === null && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">Could not load conversation.</p>
          </div>
        )}
        {!convLoading && !convError && conv !== null && conv?.messages?.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">No messages yet.</p>
          </div>
        )}
        {!convLoading && !convError && conv?.messages?.map((m, i) => <MessageBubble key={m.id || i} msg={m} />)}
        <div ref={bottomRef} />
      </div>
      {sendError && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center justify-between gap-2">
          <p className="text-xs text-red-600">{sendError}</p>
          <button onClick={() => setSendError('')} className="text-xs text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      <form onSubmit={handleSendText}
        className="px-4 py-3 border-t border-gray-200 flex items-center gap-2 bg-white">
        <MediaUpload onFile={handleSendMedia} />
        <input type="text" value={text} onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        <button type="submit" disabled={sending || !text.trim()}
          className="bg-green-500 hover:bg-green-600 text-white rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-50 flex-shrink-0">
          ›
        </button>
      </form>
    </div>
  )
}
