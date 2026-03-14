import ActionRow from './ActionRow.jsx'

function PageActions({ className = '', children, ...props }) {
  return (
    <ActionRow className={['page-actions', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </ActionRow>
  )
}

export default PageActions
