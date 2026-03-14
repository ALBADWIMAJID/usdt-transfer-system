import EmptyState from './EmptyState.jsx'

function NoResultsState({ className = '', children }) {
  return <EmptyState className={className}>{children}</EmptyState>
}

export default NoResultsState
