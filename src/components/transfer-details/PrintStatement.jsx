import { branding } from '../../config/branding.js'
import BrandLockup from '../ui/BrandLockup.jsx'
import DetailList from '../ui/DetailList.jsx'
import InlineMessage from '../ui/InlineMessage.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'

function PrintStatement({
  className = '',
  errorMessage,
  loading,
  hasTransfer,
  referenceNumber,
  transferId,
  customerName,
  status,
  createdAtLabel,
  transferRows,
  pricingRows,
  paymentsError,
  paymentsLoading,
  paymentRows,
  totalPaidValue,
  remainingValue,
  remainingClassName,
  finalAmountValue,
}) {
  const rootClassName = ['page-card', 'print-statement-card', className].filter(Boolean).join(' ')

  if (errorMessage) {
    return (
      <section className={rootClassName}>
        <InlineMessage kind="error">{errorMessage}</InlineMessage>
      </section>
    )
  }

  if (loading || !hasTransfer) {
    return (
      <section className={rootClassName}>
        <p>جار تحميل كشف الحوالة للطباعة...</p>
      </section>
    )
  }

  return (
    <section className={rootClassName}>
      <div className="statement-sheet">
        <div className="statement-header">
          <div className="statement-branding">
            <BrandLockup tone="print" size="sm" showOffice={false} showTagline={false} />
            <div className="statement-brand-copy">
              <p className="eyebrow">{branding.printTitle}</p>
              <h2>{referenceNumber || `حوالة #${transferId}`}</h2>
              <p>صادر من {branding.officeName} لصالح {customerName}</p>
            </div>
          </div>

          <div className="statement-meta">
            <StatusBadge status={status} />
            <p>رقم المرجع: {referenceNumber}</p>
            <p className="ltr">ID: {transferId}</p>
            <p>تاريخ الإنشاء: {createdAtLabel}</p>
          </div>
        </div>

        <div className="statement-grid">
          <article className="statement-card">
            <h3>ملخص الحوالة</h3>
            <DetailList rows={transferRows} className="statement-list" rowClassName="statement-row" />
          </article>

          <article className="statement-card">
            <h3>ملخص التسعير</h3>
            <DetailList rows={pricingRows} className="statement-list" rowClassName="statement-row" />
          </article>
        </div>

        <article className="statement-card">
          <h3>سجل المدفوعات</h3>
          {paymentsError ? (
            <InlineMessage kind="error">{paymentsError}</InlineMessage>
          ) : paymentsLoading && paymentRows.length === 0 ? (
            <p>جار تحميل المدفوعات...</p>
          ) : paymentRows.length === 0 ? (
            <p>لا توجد مدفوعات مسجلة حتى الآن.</p>
          ) : (
            <table className="statement-table">
              <thead>
                <tr>
                  <th>المبلغ</th>
                  <th>وسيلة الدفع</th>
                  <th>التاريخ / الوقت</th>
                  <th>ملاحظة</th>
                </tr>
              </thead>
              <tbody>
                {paymentRows.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.amountLabel}</td>
                    <td>{payment.methodLabel}</td>
                    <td>
                      {payment.paidAtLabel}
                      <br />
                      <small>تم التسجيل: {payment.createdAtLabel}</small>
                    </td>
                    <td>{payment.noteText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>

        <div className="statement-totals">
          <article className="statement-card">
            <h3>إجمالي المدفوع</h3>
            <p>{totalPaidValue}</p>
          </article>
          <article className="statement-card">
            <h3>المبلغ المتبقي</h3>
            <p className={remainingClassName}>{remainingValue}</p>
          </article>
          <article className="statement-card">
            <h3>المبلغ النهائي</h3>
            <p>{finalAmountValue}</p>
          </article>
        </div>
      </div>
    </section>
  )
}

export default PrintStatement
