import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Trash2, Bot, Zap, ChevronDown } from 'lucide-react'
import { faqs } from './FAQ'

/** Woyofal AI Chat — appel direct OpenRouter (pas de backend requis) */

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || ''

const SYSTEM_PROMPT = `Tu es l'assistant Woyofal, expert en tarifs électriques Senelec 2026 au Sénégal.

=== GRILLES TARIFAIRES WOYOFAL 2026 — PRÉPAIEMENT (Décision CRSE 2025-140) ===
Ces tarifs s'appliquent UNIQUEMENT aux compteurs prépayés Woyofal.
Particularité importante : en prépaiement, la 3e tranche (T3) est facturée au MÊME tarif que T2.

DPP — Domestique Petite Puissance (monophasé, ménages ≤ 6 kVA) :
- T1 : 0–150 kWh/mois → 82,00 FCFA/kWh (tarif social)
- T2 : 151–250 kWh/mois → 136,49 FCFA/kWh
- T3 : >250 kWh/mois → 136,49 FCFA/kWh (= T2, avantage prépayé)

PPP — Professionnel Petite Puissance (monophasé, pro ≤ 6 kVA) :
- T1 : 0–50 kWh → 147,43 FCFA/kWh
- T2 : 51–500 kWh → 189,84 FCFA/kWh
- T3 : >500 kWh → 189,84 FCFA/kWh (= T2, avantage prépayé)

DMP — Domestique Moyenne Puissance (mono ou triphasé, 7–36 kVA) :
- T1 : 0–150 kWh → 111,23 FCFA/kWh
- T2 : 151–400 kWh → 143,54 FCFA/kWh
- T3 : >400 kWh → 143,54 FCFA/kWh (= T2, avantage prépayé)

PMP — Professionnel Moyenne Puissance (triphasé, 7–36 kVA) :
- T1 : 0–100 kWh → 165,01 FCFA/kWh
- T2 : 101–500 kWh → 191,01 FCFA/kWh
- T3 : >500 kWh → 191,01 FCFA/kWh (= T2, avantage prépayé)

=== TARIFS POSTPAYÉS 2026 (Usage Domestique UD / Usage Professionnel UP) ===
Ces tarifs s'appliquent aux abonnés classiques (facture mensuelle). En postpayé, la T3 est plus chère qu'en prépayé.

DPP (UD postpayé) : T1=82,00 | T2=136,49 | T3=159,36 FCFA/kWh
DMP (UD postpayé) : T1=111,23 | T2=143,54 | T3=158,46 FCFA/kWh
PPP (UP postpayé) : T1=147,43 | T2=189,84 | T3=208,63 FCFA/kWh
PMP (UP postpayé) : T1=165,01 | T2=191,01 | T3=210,81 FCFA/kWh

Avantage Woyofal (prépayé vs postpayé sur la T3) :
- DPP : économie de 159,36 − 136,49 = 22,87 FCFA/kWh
- DMP : économie de 158,46 − 143,54 = 14,92 FCFA/kWh
- PPP : économie de 208,63 − 189,84 = 18,79 FCFA/kWh
- PMP : économie de 210,81 − 191,01 = 19,80 FCFA/kWh

=== REDEVANCE MENSUELLE ===
- Compteur monophasé (1φ) : 429 FCFA
- Compteur triphasé (3φ) : 1 427 FCFA
- IMPORTANT : si le client n'a pas rechargé depuis N mois, la redevance = redevance_base × N
  Exemples : 2 mois → 429 × 2 = 858 FCFA (mono) ou 1 427 × 2 = 2 854 FCFA (tri)
             10 mois → 429 × 10 = 4 290 FCFA (mono) ou 1 427 × 10 = 14 270 FCFA (tri)

=== COMMENT RENSEIGNER LA REDEVANCE DANS LE SIMULATEUR ===
Le simulateur propose deux étapes :
  Étape 1 — Deux boutons :
    • "Déjà rechargé ce mois" → redevance = 0 (déjà prélevée, non redéduite)
    • "Première recharge du mois" → redevance sera déduite
  Étape 2 (si "Première recharge") — Un curseur apparaît :
    • "Depuis combien de mois n'avez-vous pas rechargé ?" (de 1 à 12)
    • 1 = cas habituel : redevance normale (429 ou 1 427 FCFA)
    • N > 1 = redevance × N (client qui n'a pas rechargé depuis plusieurs mois)
  Quand quelqu'un demande quoi mettre dans la redevance / le nb_mois, expliquer ces 2 étapes.

=== TAXE COMMUNALE ===
- 2,5% du montant brut, prélevée sur CHAQUE recharge

=== ALGORITHME DE CALCUL ===
1. Redevance = redevance_base × nb_mois (si nb_mois > 0)
2. Taxe = montant_brut × 2,5%
3. Montant net = montant_brut − redevance − taxe
4. Distribuer le montant net en kWh par tranches selon le cumul mensuel actuel (code 814)

=== AVERTISSEMENT IMPORTANT ===
Ce simulateur ne prend PAS en compte les dettes éventuelles présentes sur le compteur. En cas de dette, une partie du crédit rechargé sera d'abord affectée au remboursement avant conversion en kWh.

Réponds en français, de façon concise et pratique. Si on te demande un calcul, montre les étapes.`

/* Fallback FAQ offline (si pas de clé API) — recherche dans toutes les Q&A de la FAQ */
const _norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// Mots vides à ignorer (conjonctions, auxiliaires, pronoms génériques)
const STOPWORDS = new Set(['avec', 'mais', 'donc', 'tres', 'bien', 'tout',
  'cette', 'peut', 'doit', 'faut', 'avoir', 'faire', 'dans', 'sont'])

// Mots-clés domaine courts à toujours conserver (≤ 3 lettres)
const DOMAIN_KEYWORDS = new Set(['dpp', 'ppp', 'dmp', 'pmp', 'kwh', 't1', 't2', 't3',
  'phi', 'mois', 'fils', 'kva', 'mono', 'tri'])

const faqFallback = (msg) => {
  const m = _norm(msg)
  const words = m.split(/\s+/)
    .map(w => w.replace(/[^a-z0-9φ]/g, ''))
    .filter(w => {
      if (!w) return false
      if (STOPWORDS.has(w)) return false
      // Conserver les mots-clés domaine courts, sinon exiger longueur ≥ 3
      return w.length >= 3 || DOMAIN_KEYWORDS.has(w)
    })

  if (words.length === 0) return `Je ne suis pas connecté à l'IA en ce moment, mais je peux vous orienter !\n\nPour des calculs précis, utilisez le **Simulateur** ⚡\nPour les tarifs, consultez le **Guide Tarifs** 📋`

  let best = null
  let bestScore = 0

  for (const cat of faqs) {
    for (const item of cat.questions) {
      const qNorm = _norm(item.q)
      const aNorm = _norm(item.a)
      // Les mots dans la question valent 3, dans la réponse valent 1
      const score = words.reduce((acc, w) => {
        if (qNorm.includes(w)) return acc + 3
        if (aNorm.includes(w)) return acc + 1
        return acc
      }, 0)
      if (score > bestScore) { bestScore = score; best = item.a }
    }
  }

  if (best && bestScore >= 2) return best

  return `Je ne suis pas connecté à l'IA en ce moment, mais je peux vous orienter !\n\nPour des calculs précis, utilisez le **Simulateur** ⚡\nPour les tarifs, consultez le **Guide Tarifs** 📋\n\nQuestions fréquentes : redevance, tranches T1/T2, cumul mensuel (code 814), différence DPP/PPP/DMP/PMP.`
}

const callOpenRouter = async (messages) => {
  const models = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-3-27b-it:free',
    'qwen/qwen3-8b:free',
    'mistralai/mistral-7b-instruct:free',
  ]
  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Woyofal Assistant',
        },
        body: JSON.stringify({ model, messages, max_tokens: 600, temperature: 0.5 }),
      })
      if (!res.ok) continue
      const json = await res.json()
      const reply = json.choices?.[0]?.message?.content
      if (reply) return reply
    } catch { continue }
  }
  return null
}

// Suggestions tirées directement des questions FAQ (1ère question de chaque catégorie + quelques autres)
const SUGGESTIONS = faqs.flatMap(cat => cat.questions.slice(0, 1).map(q => q.q)).slice(0, 8)

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
                  <th key={j} className="px-2 py-1 border border-gray-200 font-semibold text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-gray-50'}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1 border border-gray-200">{formatInline(cell)}</td>
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
      elements.push(<p key={i} className="font-bold text-black mt-2 mb-1">{line.slice(3)}</p>)
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
            : 'bg-gray-100 text-gray-800 rounded-tl-sm'
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
      let reply = null

      if (OPENROUTER_KEY) {
        const history = messages.map(m => ({ role: m.role, content: m.content }))
        const apiMessages = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history,
          { role: 'user', content: msg },
        ]
        reply = await callOpenRouter(apiMessages)
      }

      if (!reply) reply = faqFallback(msg)

      const botMsg = { role: 'assistant', content: reply }
      setMessages(prev => [...prev, botMsg])
      if (!open) setUnread(n => n + 1)
    } catch {
      setError('Erreur — réessayez dans un moment.')
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
        <div className="fixed bottom-24 right-6 z-40 flex flex-col w-[360px] max-h-[560px] bg-white rounded-3xl shadow-card-hover border border-gray-100 overflow-hidden animate-fade-up">

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
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-800">
                    Bonjour ! Je suis votre assistant Woyofal ⚡<br />
                    Posez-moi vos questions sur les tarifs Senelec 2026 et la gestion de votre énergie.
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide px-1">Suggestions</p>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition"
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
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm">
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
          <div className="shrink-0 px-4 pb-4 pt-3 border-t border-gray-100 bg-white">
            <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition px-3 py-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Posez votre question…"
                maxLength={1000}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 resize-none outline-none max-h-28 overflow-y-auto"
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="shrink-0 p-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition"
                title="Envoyer (Entrée)"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bouton flottant ────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center font-display font-bold text-white shadow-2xl transition-all duration-300 bg-primary-gradient hover:shadow-glow`}
        title="Ouvrir l'assistant Woyofal"
      >
        {open ? (
          <X size={20} />
        ) : (
          <div className="flex items-center justify-center gap-1">
            <MessageCircle size={20} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center animate-pulse">
                {unread}
              </span>
            )}
          </div>
        )}
      </button>
    </>
  )
}
