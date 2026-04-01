export default function ComingUp({ kicker, title, desc }) {
  return (
    <div className="conversion-teaser">
      <div className="teaser-kicker">// coming up — {kicker}</div>
      <h2>{title}</h2>
      <p>{desc}</p>
    </div>
  )
}
