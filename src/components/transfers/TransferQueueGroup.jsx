import TransferRecordCard from './TransferRecordCard.jsx'

function TransferQueueGroup({ title, description, count, tone = 'default', transfers = [] }) {
  return (
    <section className={['transfer-queue-group', `transfer-queue-group--${tone}`].filter(Boolean).join(' ')}>
      <div className="transfer-queue-group-head">
        <div className="transfer-queue-group-copy">
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        <span className="transfer-queue-group-count">{count}</span>
      </div>

      <div className="record-list transfer-queue-group-list">
        {transfers.map((transfer) => (
          <TransferRecordCard key={transfer.id} transfer={transfer} />
        ))}
      </div>
    </section>
  )
}

export default TransferQueueGroup
