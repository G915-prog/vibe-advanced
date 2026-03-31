import { useState } from 'react'

export default function PromptCard({ label, text, tag }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(text.trim()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="prompt-card">
      <div className="prompt-header">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="prompt-label">{label}</span>
          {tag && <span style={{ fontSize: 9, padding: '2px 7px', border: '1px solid var(--rule)', color: 'var(--faint)', letterSpacing: '0.1em' }}>{tag}</span>}
        </div>
        <button className={`copy-btn${copied ? ' copied' : ''}`} onClick={copy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="prompt-body">{text}</div>
    </div>
  )
}
