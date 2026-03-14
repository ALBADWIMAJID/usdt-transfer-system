import CustomerRecordCard from './CustomerRecordCard.jsx'

function CustomerPortfolioGroup({ title, description, count, tone = 'default', customers = [] }) {
  return (
    <section className={['customer-portfolio-group', `customer-portfolio-group--${tone}`].filter(Boolean).join(' ')}>
      <div className="customer-portfolio-group-head">
        <div className="customer-portfolio-group-copy">
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        <span className="customer-portfolio-group-count">{count}</span>
      </div>

      <div className="record-list customer-portfolio-group-list">
        {customers.map((customer) => (
          <CustomerRecordCard key={customer.id} customer={customer} />
        ))}
      </div>
    </section>
  )
}

export default CustomerPortfolioGroup
