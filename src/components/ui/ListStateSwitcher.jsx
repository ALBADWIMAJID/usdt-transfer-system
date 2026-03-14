import EmptyState from './EmptyState.jsx'
import LoadingState from './LoadingState.jsx'
import NoResultsState from './NoResultsState.jsx'
import RetryBlock from './RetryBlock.jsx'

function ListStateSwitcher({
  errorMessage,
  onRetry,
  loading,
  hasItems,
  hasFilteredItems = true,
  loadingMessage,
  emptyMessage,
  noResultsMessage,
  refreshingMessage,
  children,
}) {
  if (errorMessage) {
    return <RetryBlock message={errorMessage} onRetry={onRetry} />
  }

  if (loading && !hasItems) {
    return <LoadingState>{loadingMessage}</LoadingState>
  }

  if (!hasItems) {
    return <EmptyState>{emptyMessage}</EmptyState>
  }

  if (!hasFilteredItems) {
    return <NoResultsState>{noResultsMessage}</NoResultsState>
  }

  return (
    <>
      {loading && refreshingMessage ? <LoadingState inline>{refreshingMessage}</LoadingState> : null}
      {children}
    </>
  )
}

export default ListStateSwitcher
