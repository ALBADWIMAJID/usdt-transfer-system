import FieldShell from '../ui/FieldShell.jsx'
import FormMessages from '../ui/FormMessages.jsx'
import SectionCard from '../ui/SectionCard.jsx'

function CustomersFormSection({
  description = 'أضف عميلا جديدا حتى يتمكن فريق التشغيل من إنشاء الحوالات ومتابعة التسويات له.',
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
}) {
  return (
    <SectionCard
      title="إنشاء ملف عميل"
      description={description}
    >
      <FormMessages
        items={[
          { kind: 'error', text: submitError },
          { kind: 'info', text: infoMessage },
          { kind: 'success', text: submitSuccess },
        ]}
      />

      <form className="form-grid" onSubmit={onSubmit}>
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

        <button type="submit" className="button primary" disabled={submitting || !isConfigured}>
          {submitting ? submittingLabel : submitLabel}
        </button>
      </form>
    </SectionCard>
  )
}

export default CustomersFormSection
