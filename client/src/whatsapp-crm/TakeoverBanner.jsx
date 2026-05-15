import { leadsApi } from './api'

export default function TakeoverBanner({ lead, onResume }) {
  if (!lead || lead.ai_active) return null

  const until = lead.ai_paused_until
    ? new Date(lead.ai_paused_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  const handleResume = async () => {
    try { await leadsApi.resumeAI(lead.id); onResume() } catch { /* ignore */ }
  }

  return (
    <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center justify-between">
      <span className="text-sm text-orange-700">
        Human mode{until ? ` until ${until}` : ''}
      </span>
      <button onClick={handleResume}
        className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-full font-medium">
        Resume AI
      </button>
    </div>
  )
}
