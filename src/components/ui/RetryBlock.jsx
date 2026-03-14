import ActionRow from './ActionRow.jsx'
import InlineMessage from './InlineMessage.jsx'

function RetryBlock({ message, onRetry, buttonLabel = 'إعادة المحاولة', className = '' }) {
  if (!message) {
    return null
  }

  return (
    <div className={className}>
      <InlineMessage kind="error">{message}</InlineMessage>
      <ActionRow>
        <button type="button" className="button secondary" onClick={onRetry}>
          {buttonLabel}
        </button>
      </ActionRow>
    </div>
  )
}

export default RetryBlock
