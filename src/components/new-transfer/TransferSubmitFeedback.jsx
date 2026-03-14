import FormMessages from '../ui/FormMessages.jsx'

function TransferSubmitFeedback({
  customersError,
  infoMessage,
  submitError,
  submitSuccess,
  showNoCustomersWarning,
}) {
  return (
    <FormMessages
      items={[
        { kind: 'error', text: customersError },
        { kind: 'error', text: submitError },
        { kind: 'success', text: submitSuccess },
        { kind: 'info', text: infoMessage },
        {
          kind: 'warning',
          text: showNoCustomersWarning
            ? 'لا يوجد عملاء بعد. أنشئ ملف عميل أولا قبل إضافة حوالة جديدة.'
            : '',
        },
      ]}
    />
  )
}

export default TransferSubmitFeedback
