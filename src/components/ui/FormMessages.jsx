import InlineMessage from './InlineMessage.jsx'

function FormMessages({ items = [] }) {
  const visibleItems = items.filter((item) => item && item.text)

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <>
      {visibleItems.map((item) => (
        <InlineMessage
          key={`${item.kind ?? 'info'}-${item.text}`}
          kind={item.kind ?? 'info'}
          className={item.className}
        >
          {item.text}
        </InlineMessage>
      ))}
    </>
  )
}

export default FormMessages
