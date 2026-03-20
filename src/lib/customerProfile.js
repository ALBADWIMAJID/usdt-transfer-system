const EMPTY_CUSTOMER_FORM_TEMPLATE = Object.freeze({
  full_name: '',
  phone: '',
  notes: '',
})

export function createEmptyCustomerForm() {
  return { ...EMPTY_CUSTOMER_FORM_TEMPLATE }
}

export function createCustomerFormValues(customer) {
  return {
    full_name: String(customer?.full_name || ''),
    phone: String(customer?.phone || ''),
    notes: String(customer?.notes || ''),
  }
}

export function normalizeCustomerProfilePayload(formValues) {
  return {
    full_name: String(formValues?.full_name || '').trim(),
    phone: String(formValues?.phone || '').trim() || null,
    notes: String(formValues?.notes || '').trim() || null,
  }
}

export function validateCustomerProfilePayload(payload) {
  if (!payload?.full_name) {
    return 'اسم العميل مطلوب.'
  }

  return ''
}
