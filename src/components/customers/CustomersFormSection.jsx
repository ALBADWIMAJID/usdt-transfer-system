import FieldShell from '../ui/FieldShell.jsx'
import FormMessages from '../ui/FormMessages.jsx'
import SectionCard from '../ui/SectionCard.jsx'

function CustomersFormSection({
  title = 'إنشاء ملف عميل',
  description = 'أضف عميلا جديدا حتى يتمكن فريق التشغيل من إنشاء الحوالات ومتابعة التسويات له.',
  className = '',
  submitError,
  submitLabel = 'إنشاء العميل',
  submitSuccess,
  submittingLabel = 'جار الحفظ...',
  formValues,
  infoMessage = '',
  onChange,
  onSubmit,
  submitting,
  isConfigured,
  submitDisabled = false,
  secondaryAction = null,
}) {
  const submitButton = (
    <button
      type="submit"
      className="button primary customers-form-submit"
      disabled={submitting || !isConfigured || submitDisabled}
    >
      {submitting ? submittingLabel : submitLabel}
    </button>
  )

  return (
    <SectionCard
      title={title}
      description={description}
      className={['customers-form-section', className].filter(Boolean).join(' ')}
    >
      <FormMessages
        items={[
          { kind: 'error', text: submitError },
          { kind: 'info', text: infoMessage },
          { kind: 'success', text: submitSuccess },
        ]}
      />

      <form className="form-grid customers-create-form" onSubmit={onSubmit}>
        <FieldShell label="الاسم الكامل" htmlFor="full_name">
          <input
            id="full_name"
            name="full_name"
            type="text"
            value={formValues.full_name}
            onChange={onChange}
            placeholder="اسم العميل الكامل"
            required
          />
        </FieldShell>

        <FieldShell label="رقم الهاتف" htmlFor="phone">
          <input
            id="phone"
            name="phone"
            type="text"
            value={formValues.phone}
            onChange={onChange}
            placeholder="+1 555 010 1000"
          />
        </FieldShell>

        <FieldShell label="ملاحظات" htmlFor="notes">
          <textarea
            id="notes"
            name="notes"
            value={formValues.notes}
            onChange={onChange}
            placeholder="ملاحظات داخلية اختيارية عن العميل"
          />
        </FieldShell>

        {secondaryAction ? (
          <div className="customers-form-actions">
            {submitButton}
            {secondaryAction}
          </div>
        ) : (
          submitButton
        )}
      </form>
    </SectionCard>
  )
}

export default CustomersFormSection
