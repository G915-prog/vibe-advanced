import { Link } from 'react-router-dom'

export default function ModuleCard({ mod, dotClass, onClick }) {
  return (
    <Link className="module-card" to={mod.to} onClick={onClick}>
      <div className="module-num">
        {mod.num}
        <div className={dotClass} />
      </div>
      <div className="module-title">
        {mod.title.split('\n').map((line, i) => (
          <span key={i}>{line}{i === 0 && <br />}</span>
        ))}
      </div>
      <div className="module-desc">{mod.desc}</div>
      <div className="module-tags">
        {mod.tags.map(t => <span key={t} className="module-tag">{t}</span>)}
      </div>
    </Link>
  )
}
