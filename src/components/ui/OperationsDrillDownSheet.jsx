import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from './EmptyState.jsx'
import SearchField from './SearchField.jsx'

function OperationsDrillDownSheet({
  open,
  title,
  totalValue,
  subtitle = '',
  description = '',
  items = [],
  emptyMessage = 'لا توجد سجلات لعرضها ضمن هذا المؤشر.',
  searchPlaceholder = 'ابحث داخل هذه القائمة',
  searchLabel = 'البحث داخل القائمة',
  viewAllTo = '',
  viewAllLabel = 'فتح الكل في صف الحوالات',
  onViewAll,
  onClose,
  renderItem,
}) {
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open])

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredItems = useMemo(() => {
    if (!normalizedQuery) {
      return items
    }

    return items.filter((item) =>
      String(item.searchText || item.title || '')
        .toLowerCase()
        .includes(normalizedQuery)
    )
  }, [items, normalizedQuery])

  if (!open) {
    return null
  }

  const handleViewAll = () => {
    onViewAll?.()
    onClose?.()
  }

  const hasSearch = items.length > 5
  const hasViewAll = Boolean(onViewAll || viewAllTo)
  const hasActions = hasSearch || hasViewAll

  return (
    <>
      <button
        type="button"
        className="operations-sheet-backdrop"
        aria-label="إغلاق لوحة التفاصيل"
        onClick={onClose}
      />

      <aside className="operations-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="operations-sheet-panel">
          <header className="operations-sheet-header">
            <div className="operations-sheet-copy">
              <p className="eyebrow operations-sheet-kicker">تفصيل المؤشر</p>
              <h2>{title}</h2>
              {subtitle ? <p className="operations-sheet-subtitle">{subtitle}</p> : null}
            </div>

            <button
              type="button"
              className="icon-button operations-sheet-close"
              aria-label="إغلاق اللوحة"
              onClick={onClose}
            >
              ×
            </button>
          </header>

          <div className="operations-sheet-summary">
            <div className="operations-sheet-summary-main">
              <div className="operations-sheet-total">
                <span>الإجمالي الحالي</span>
                <strong>{totalValue}</strong>
              </div>
              <span className="operations-sheet-count-chip">{items.length} سجل</span>
            </div>

            {description ? <p className="operations-sheet-description">{description}</p> : null}
          </div>

          {hasActions ? (
            <div className="operations-sheet-actions">
              {hasSearch ? (
                <SearchField
                  id="operations_sheet_search"
                  name="operations_sheet_search"
                  label={searchLabel}
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={searchPlaceholder}
                  className="operations-sheet-search"
                />
              ) : null}

              {onViewAll ? (
                <button type="button" className="button secondary" onClick={handleViewAll}>
                  {viewAllLabel}
                </button>
              ) : null}

              {!onViewAll && viewAllTo ? (
                <Link className="button secondary" to={viewAllTo} onClick={onClose}>
                  {viewAllLabel}
                </Link>
              ) : null}
            </div>
          ) : null}

          <div className="operations-sheet-body">
            {filteredItems.length === 0 ? (
              <EmptyState>
                {normalizedQuery ? 'لا توجد نتائج مطابقة داخل هذا التفصيل.' : emptyMessage}
              </EmptyState>
            ) : (
              <div className="record-list operations-sheet-list">
                {filteredItems.map((item) => renderItem(item))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

export default OperationsDrillDownSheet
