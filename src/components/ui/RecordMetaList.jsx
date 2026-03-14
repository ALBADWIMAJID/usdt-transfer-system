import RecordMeta from './RecordMeta.jsx'

function RecordMetaList({ items = [], className = '' }) {
  const visibleItems = items.filter((item) => item && item.value !== undefined && item.value !== null)

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <div className={['record-meta-list', className].filter(Boolean).join(' ')}>
      {visibleItems.map((item, index) => (
        <RecordMeta
          key={item.key || item.label || index}
          label={item.label}
          value={item.value}
          className={item.className}
          valueClassName={item.valueClassName}
          ltr={item.ltr}
          as={item.as}
        />
      ))}
    </div>
  )
}

export default RecordMetaList
