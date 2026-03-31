export default function CodeBlock({ lang, html, children }) {
  return (
    <div className="code-block">
      <span className="lang-tag">{lang}</span>
      {html
        ? <div dangerouslySetInnerHTML={{ __html: html }} />
        : <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{children}</pre>
      }
    </div>
  )
}
