import FieldShell from '../ui/FieldShell.jsx'
import FormMessages from '../ui/FormMessages.jsx'

function PaymentForm({
  actionTitle,
  actionDescription,
  actionTone = 'neutral',
  actionMeta = [],
  errorMessage,
  successMessage,
  values,
  paymentMethodOptions,
  onChange,
  onSubmit,
  remainingHelpText,
  remainingHelpClassName,
  submitting,
  disabled,
  submitLabel,
}) {
  return (
    <>
      <FormMessages
        items={[
          { kind: 'error', text: errorMessage },
          { kind: 'success', text: successMessage },
        ]}
      />

      <div className={['payment-action-panel', `payment-action-panel--${actionTone}`].join(' ')}>
        <div className="payment-action-head">
          <div className="payment-action-copy">
            <p className="eyebrow">منطقة الإجراء</p>
            <h3>{actionTitle}</h3>
            <p>{actionDescription}</p>
          </div>
        </div>

        {actionMeta.length > 0 ? (
          <div className="payment-action-meta">
            {actionMeta.map((item) => (
              <div key={`${item.label}-${item.value}`} className="payment-action-meta-item">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <form className="form-grid payment-action-form transfer-payment-action-form" onSubmit={onSubmit}>
        <div className="payment-form-row">
          <FieldShell
            label="المبلغ بالروبل"
            htmlFor="amount_rub"
            className="transfer-payment-amount-field"
          >
            <input
              id="amount_rub"
              name="amount_rub"
              type="number"
              step="any"
              min="0.01"
              value={values.amount_rub}
              onChange={onChange}
              placeholder="25000"
              required
            />
          </FieldShell>

          <FieldShell label="البنك أو وسيلة الدفع" htmlFor="payment_method">
            <select
              id="payment_method"
              name="payment_method"
              value={values.payment_method}
              onChange={onChange}
              required
            >
              <option value="">اختر وسيلة الدفع</option>
              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldShell>
        </div>

        <FieldShell label="ملاحظة" htmlFor="note">
          <textarea
            id="note"
            name="note"
            value={values.note}
            onChange={onChange}
            placeholder="ملاحظة اختيارية على الدفعة"
          />
        </FieldShell>

        {remainingHelpText ? <p className={remainingHelpClassName}>{remainingHelpText}</p> : null}

        <div className="transfer-payment-submit-slot">
          <button type="submit" className="button primary payment-submit-button" disabled={disabled}>
            {submitting ? 'جار الحفظ...' : submitLabel}
          </button>
        </div>
      </form>
    </>
  )
}

export default PaymentForm
