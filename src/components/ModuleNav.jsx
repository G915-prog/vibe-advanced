import { Link } from 'react-router-dom'

export default function ModuleNav({ prev, next }) {
  return (
    <div className="module-nav">
      {prev && <Link to={prev.to} className="nav-btn">← {prev.label}</Link>}
      {next && <Link to={next.to} className="nav-btn next">{next.label} →</Link>}
    </div>
  )
}
