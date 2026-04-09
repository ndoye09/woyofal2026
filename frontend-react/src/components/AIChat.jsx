import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Trash2, Bot, Zap, ChevronDown } from 'lucide-react'
import api from '../services/api'

/** Woyofal AI Chat — assistant flottant OpenRouter + Llama 3.3 70B */

const SUGGESTIONS = [
  'Combien de kWh pour 5 000 FCFA ?',
  'C\'est quoi la redevance mensuelle ?',
  'Différence DPP et PPP ?',
  'C\'est quoi le cumul mensuel actuel ?',
  'Tarifs 2025 vs 2026, quelle différence ?',
  'Comment utiliser le calcul inverse ?',
  'Où recharger son compteur Woyofal ?',
  'Recharge non créditée, que faire ?',
]

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

/** Rendu Markdown simplifié : gras, italique, listes, tableaux */
function renderMarkdown(text) {
  const lines = text.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Tableau Markdown (ligne contenant |)
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
      const headers = line.split('|').map(h => h.trim()).filter(Boolean)
      i += 2 // skip separator
      const rows = []
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(lines[i].split('|').map(c => c.trim()).filter(Boolean))
        i++
      }
      elements.push(
        <div key={i} className="overflow-x-auto my-2">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr className="bg-primary/10">
                {headers.map((h, j) => (
                  <th key={j} className="px-2 py-1 border border-slate-200 font-semibold text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-slate-50'}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1 border border-slate-200">{formatInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // Ligne vide
    if (!line.trim()) {
      elements.push(<div key={i} className="h-1" />)
      i++
      continue
    }

    // Titre ##
    if (line.startsWith('## ')) {
      elements.push(<p key={i} className="font-bold text-slate-900 mt-2 mb-1">{line.slice(3)}</p>)
      i++; continue
    }

    // Puce • ou -
    if (/^[•\-\*]\s/.test(line)) {
      elements.push(
        <p key={i} className="leading-snug">
          <span className="text-primary">•</span>{' '}
          <span>{formatInline(line.slice(2).trim())}</span>
        </p>
      )
      i++; continue
    }

    // Numérotation 1. 2. ...
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)[1]
      const content = line.replace(/^\d+\.\s+/, '')
      elements.push(
        <p key={i} className="leading-snug">
          <span className="text-primary font-semibold">{num}.</span>{' '}
          <span>{formatInline(content)}</span>
        </p>
      )
      i++; continue
    }

    // Ligne normale
    elements.push(<p key={i} className="leading-snug">{formatInline(line)}</p>)
    i++
  }

  return elements
}

function formatInline(text) {
  // **gras** et *italique*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>
    return part
  })
}

function ChatBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-xl bg-primary-gradient flex items-center justify-center shadow-glow">
          <Bot size={14} className="text-white" />
        </div>
      )}
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-white rounded-tr-sm ml-auto'
            : 'bg-slate-100 text-slate-800 rounded-tl-sm'
        }`}
      >
        {isUser ? msg.content : <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>}
      </div>
    </div>
  )
}

export default function AIChat() {
  const [open, setOpen]         = useState(false)
  const [input, setInput]       = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [unread, setUnread]     = useState(0)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Scroll vers le bas à chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus l'input quand on ouvre
  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return

    setInput('')
    setError(null)
    const userMsg = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const { data } = await api.post('/ai/chat', { message: msg, history })
      const botMsg = { role: 'assistant', content: data.reply }
      setMessages(prev => [...prev, botMsg])
      if (!open) setUnread(n => n + 1)
    } catch (err) {
      const errText = err.response?.data?.error || 'Erreur — réessayez dans un moment.'
      setError(errText)
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const clearChat = () => { setMessages([]); setError(null); setUnread(0) }

  const isEmpty = messages.length === 0

  return (
    <>
      {/* ── Panneau chat ────────────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex flex-col w-[360px] max-h-[560px] bg-white rounded-3xl shadow-card-hover border border-slate-100 overflow-hidden animate-fade-up">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 bg-primary-gradient text-white shrink-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Bot size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-sm leading-tight">Woyofal Assistant</p>
              <p className="text-white/70 text-xs truncate">Propulsé par Llama 3.3 · gratuit</p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition"
                  title="Effacer la conversation"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition"
                title="Réduire"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-white">
            {isEmpty && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="shrink-0 w-8 h-8 rounded-xl bg-primary-gradient flex items-center justify-center shadow-glow">
                    <Bot size={14} className="text-white" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-slate-800">
                    Bonjour ! Je suis votre assistant Woyofal ⚡<br />
                    Posez-moi vos questions sur les tarifs Senelec 2026 et la gestion de votre énergie.
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide px-1">Suggestions</p>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:border-primary/40 hover:bg-primary/4 hover:text-primary transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}
            {loading && (
              <div className="flex gap-2">
                <div className="shrink-0 w-8 h-8 rounded-xl bg-primary-gradient flex items-center justify-center">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-tl-sm">
                  <TypingDots />
                </div>
              </div>
            )}
            {error && (
              <div className="text-xs text-danger bg-danger/10 rounded-xl px-3 py-2">{error}</div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 px-4 pb-4 pt-3 border-t border-slate-100 bg-white">
            <div className="flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition px-3 py-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Posez votre question…"
                maxLength={1000}
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 resize-none outline-none max-h-28 overflow-y-auto"
                style={{ fieldSizing: 'content' }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="shrink-0 w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white transition hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={14} />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-1.5">
              OpenRouter · Meta Llama 3.3 70B · 100 % gratuit
            </p>
          </div>
        </div>
      )}

      {/* ── Bouton flottant ─────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-primary-gradient text-white
          shadow-glow flex items-center justify-center transition-all duration-300
          hover:scale-110 hover:shadow-[0_0_40px_rgba(0,87,255,0.45)]
          ${open ? 'rotate-0' : 'rotate-0'}`}
        aria-label="Assistant IA"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-navy text-[10px] font-bold flex items-center justify-center border-2 border-white">
            {unread}
          </span>
        )}
        {!open && (
          <span className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-success animate-ping-slow" />
        )}
      </button>
    </>
  )
}
