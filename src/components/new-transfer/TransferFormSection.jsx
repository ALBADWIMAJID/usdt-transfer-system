import FieldShell from '../ui/FieldShell.jsx'
import InfoCard from '../ui/InfoCard.jsx'
import ReadonlyField from '../ui/ReadonlyField.jsx'
import SectionCard from '../ui/SectionCard.jsx'
import TransferSubmitFeedback from './TransferSubmitFeedback.jsx'

function TransferFormSection({
  customersError,
  customersLoading,
  customers,
  customersReady,
  description = '',
  formValues,
  infoMessage = '',
  isConfigured,
  onChange,
  onSubmit,
  selectedCustomer,
  showNoCustomersWarning,
  submitError,
  submitting,
  submittingLabel = '',
  submitLabel = '',
  submitSuccess = '',
  valueAfterPercentageLabel,
  valueBeforePercentageLabel,
}) {
  return (
    <SectionCard
      title="نموذج الحوالة"
      description={
        description ||
        'يبقى سير العمل مبسطا للمشغل، ويتم تخصيص رقم المرجع تلقائيا عند إنشاء الحوالة.'
      }
    >
      <TransferSubmitFeedback
        customersError={customersError}
        infoMessage={infoMessage}
        submitError={submitError}
        submitSuccess={submitSuccess}
        showNoCustomersWarning={showNoCustomersWarning}
      />

      <form className="form-grid" onSubmit={onSubmit}>
        <FieldShell label="العميل" htmlFor="customer_id">
          <select
            id="customer_id"
            name="customer_id"
            value={formValues.customer_id}
            onChange={onChange}
            disabled={customersLoading || Boolean(customersError) || customers.length === 0}
            required
          >
            <option value="">
              {customersLoading
                ? 'جار تحميل العملاء...'
                : customers.length === 0
                  ? 'لا يوجد عملاء'
                  : 'اختر عميلا'}
            </option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.full_name}
              </option>
            ))}
          </select>
        </FieldShell>

        {selectedCustomer ? (
          <InfoCard
            title="العميل المختار"
            value={selectedCustomer.full_name}
            className="info-card--accent info-card--full"
          >
            <p className="support-text">سيتم حفظ هذه الحوالة مباشرة ضمن ملف العميل المحدد.</p>
          </InfoCard>
        ) : null}

        <FieldShell
          label="كمية USDT"
          htmlFor="amount"
          helpText="أدخل كمية الحوالة المطلوب تسويتها لهذا العميل."
        >
          <input
            id="amount"
            name="amount"
            type="number"
            step="any"
            min="0"
            value={formValues.amount}
            onChange={onChange}
            placeholder="1000"
            required
          />
        </FieldShell>

        <FieldShell
          label="السعر العام"
          htmlFor="global_rate"
          helpText="السعر الأساسي قبل تطبيق النسبة على الحوالة."
        >
          <input
            id="global_rate"
            name="global_rate"
            type="number"
            step="any"
            min="0"
            value={formValues.global_rate}
            onChange={onChange}
            placeholder="95.10"
            required
          />
        </FieldShell>

        <ReadonlyField
          id="value_before_percentage"
          label="القيمة قبل النسبة"
          value={valueBeforePercentageLabel}
          placeholder="يتم احتسابها تلقائيا"
        />

        <FieldShell
          label="نسبة الزيادة"
          htmlFor="percentage"
          helpText={
            <>
              إدخال <code>2</code> يعني <code>2%</code>.
            </>
          }
        >
          <input
            id="percentage"
            name="percentage"
            type="number"
            step="any"
            min="0"
            value={formValues.percentage}
            onChange={onChange}
            placeholder="0"
          />
        </FieldShell>

        <ReadonlyField
          id="value_after_percentage"
          label="مبلغ التسوية"
          value={valueAfterPercentageLabel}
          placeholder="يتم احتسابه تلقائيا"
        />

        <FieldShell label="ملاحظات" htmlFor="notes">
          <textarea
            id="notes"
            name="notes"
            value={formValues.notes}
            onChange={onChange}
            placeholder="ملاحظات داخلية اختيارية على الحوالة"
          />
        </FieldShell>

        <button
          type="submit"
          className="button primary"
          disabled={!customersReady || submitting || !isConfigured}
        >
          {submitting ? submittingLabel || 'جار الحفظ...' : submitLabel || 'إنشاء الحوالة'}
        </button>
      </form>
    </SectionCard>
  )
}

export default TransferFormSection
