function FilterBar({ className = '', children }) {
  return <div className={['form-grid', 'filter-bar', className].filter(Boolean).join(' ')}>{children}</div>
}

export default FilterBar
