function PagePlaceholder({ eyebrow, title, description, note }) {
  return (
    <section className="placeholder-card">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
      {note ? <div className="placeholder-meta">{note}</div> : null}
    </section>
  )
}

export default PagePlaceholder
