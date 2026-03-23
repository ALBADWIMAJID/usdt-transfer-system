import { branding } from '../../config/branding.js'
import BrandLogo from '../ui/BrandLogo.jsx'
import DetailList from '../ui/DetailList.jsx'
import InlineMessage from '../ui/InlineMessage.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'

function formatStatementReference(referenceNumber) {
  const normalizedReference = String(referenceNumber || '')
    .replace(/\s+/g, ' ')
    .trim()

  return normalizedReference || 'حوالة'
}

function formatStatementDate(value) {
  if (!value) {
    return '--'
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ar', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate)
}

function PrintStatement({
  className = '',
  errorMessage,
  loading,
  hasTransfer,
  referenceNumber,
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
  compactView = false,
  onPrint,
}) {
  const rootClassName = [
    'page-card',
    'print-statement-card',
    compactView ? 'print-statement-card--compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const displayReference = formatStatementReference(referenceNumber)
  const displayCreatedAtLabel = formatStatementDate(createdAtLabel)
  const clientTransferRows = transferRows.filter((row) => {
    const rowLabel = String(row?.label || '')

    return !/المعرّف الداخلي|المعرف الداخلي|(^|\s)id($|\s)/i.test(rowLabel)
  })
  const previewPaymentRows = paymentRows.slice(0, 4)

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
      {compactView ? (
        <div className="statement-screen-preview no-print" aria-hidden="true">
          <div className="statement-preview-head">
            <div className="statement-preview-copy">
              <p className="eyebrow">معاينة الطباعة</p>
              <h3>{displayReference}</h3>
              <p>كشف مختصر باسم {customerName} قبل الطباعة.</p>
            </div>
            <button type="button" className="button primary statement-preview-print-button" onClick={onPrint}>
              طباعة الكشف
            </button>
          </div>

          <div className="statement-preview-totals">
            <article className="statement-preview-card">
              <span>المبلغ النهائي</span>
              <strong>{finalAmountValue}</strong>
            </article>
            <article className="statement-preview-card">
              <span>إجمالي المدفوع</span>
              <strong>{totalPaidValue}</strong>
            </article>
            <article className="statement-preview-card">
              <span>المتبقي</span>
              <strong className={remainingClassName}>{remainingValue}</strong>
            </article>
          </div>

          <details className="statement-preview-disclosure">
            <summary>عرض معاينة مختصرة</summary>
            <div className="statement-preview-stack">
              <div className="statement-preview-section">
                <strong>بيانات الحوالة</strong>
                <div className="statement-preview-list">
                  {clientTransferRows.slice(0, 3).map((row) => (
                    <div key={`${row.label}-${row.value}`} className="statement-preview-row">
                      <span>{row.label}</span>
                      <bdi>{row.value}</bdi>
                    </div>
                  ))}
                </div>
              </div>

              <div className="statement-preview-section">
                <strong>التسعير</strong>
                <div className="statement-preview-list">
                  {pricingRows.slice(0, 3).map((row) => (
                    <div key={`${row.label}-${row.value}`} className="statement-preview-row">
                      <span>{row.label}</span>
                      <bdi>{row.value}</bdi>
                    </div>
                  ))}
                </div>
              </div>

              <div className="statement-preview-section">
                <strong>آخر المدفوعات</strong>
                {paymentsError ? (
                  <InlineMessage kind="error">{paymentsError}</InlineMessage>
                ) : paymentsLoading && paymentRows.length === 0 ? (
                  <p>جار تحميل المدفوعات...</p>
                ) : previewPaymentRows.length === 0 ? (
                  <p>لا توجد مدفوعات مسجلة حتى الآن.</p>
                ) : (
                  <div className="statement-preview-payments">
                    {previewPaymentRows.map((payment) => (
                      <article key={payment.id} className="statement-preview-payment">
                        <div>
                          <strong>{payment.amountLabel}</strong>
                          <p>{payment.methodLabel}</p>
                        </div>
                        <time>{formatStatementDate(payment.paidAtLabel)}</time>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </details>
        </div>
      ) : null}

      <div className="statement-sheet statement-sheet-full">
        <div className="statement-header">
          <div className="statement-branding">
            <BrandLogo variant="print" className="statement-brand-logo" />
            <div className="statement-brand-copy">
              <p className="eyebrow">{branding.printTitle}</p>
              <h2>{displayReference}</h2>
              <p>كشف حوالة باسم {customerName}</p>
            </div>
          </div>

          <div className="statement-meta">
            <StatusBadge status={status} />
            <p>جهة الإصدار: {branding.officeName}</p>
            <p>رقم المرجع: {displayReference}</p>
            <p>تاريخ الإنشاء: {displayCreatedAtLabel}</p>
          </div>
        </div>

        <div className="statement-grid">
          <article className="statement-card">
            <h3>ملخص الحوالة</h3>
            <DetailList rows={clientTransferRows} className="statement-list" rowClassName="statement-row" />
          </article>

          <article className="statement-card">
            <h3 className="statement-section-heading--pricing">ملخص التسعير</h3>
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
                      {formatStatementDate(payment.paidAtLabel)}
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
