import {
  CUSTOMERS_LIST_SNAPSHOT_KEY,
  NEW_TRANSFER_CUSTOMERS_SNAPSHOT_KEY,
  getCustomerDetailsSnapshotKey,
} from './cacheKeys.js'
import { loadReadSnapshot, saveReadSnapshot } from './readCache.js'

function matchesCustomerEntry(entry, customerId) {
  if (!entry || !customerId) {
    return false
  }

  const normalizedCustomerId = String(customerId)
  const entryId = String(entry.id || entry.internalId || '')
  const entryRoute = String(entry.to || '')

  return (
    entryId === normalizedCustomerId ||
    entryRoute === `/customers/${normalizedCustomerId}`
  )
}

function patchCustomerPortfolioEntry(entry, customer) {
  if (!matchesCustomerEntry(entry, customer.id)) {
    return entry
  }

  const nextName = customer.full_name || 'عميل بدون اسم'
  const nextPhone = customer.phone || 'غير مضاف'
  const nextNote = customer.notes || 'لا توجد ملاحظات داخلية.'

  return {
    ...entry,
    name: nextName,
    note: nextNote,
    phone: nextPhone,
    searchText: `${nextName} ${nextPhone} ${entry.stateSummary || ''} ${customer.notes || ''}`.toLowerCase(),
  }
}

function patchCustomerActivityItem(entry, customer) {
  if (!entry || String(entry.to || '') !== `/customers/${customer.id}`) {
    return entry
  }

  const nextName = customer.full_name || 'عميل بدون اسم'

  return {
    ...entry,
    title: nextName,
    searchText: `${nextName} ${entry.subtitle || ''} ${entry.noteText || ''}`.toLowerCase(),
  }
}

async function persistUpdatedSnapshot(snapshot, fallbackMeta, data) {
  if (!snapshot) {
    return null
  }

  return saveReadSnapshot({
    data,
    key: snapshot.key || fallbackMeta.key,
    scope: snapshot.scope || fallbackMeta.scope,
    type: snapshot.type || fallbackMeta.type,
  })
}

export async function syncEditedCustomerSnapshots(customer) {
  if (!customer?.id) {
    return
  }

  const detailKey = getCustomerDetailsSnapshotKey(customer.id)
  const detailSnapshot = await loadReadSnapshot(detailKey)

  if (detailSnapshot?.data?.customer) {
    await persistUpdatedSnapshot(
      detailSnapshot,
      {
        key: detailKey,
        scope: `customer-details:${customer.id}`,
        type: 'customer_details',
      },
      {
        ...detailSnapshot.data,
        customer: {
          ...detailSnapshot.data.customer,
          ...customer,
        },
      }
    )
  }

  const customersSnapshot = await loadReadSnapshot(CUSTOMERS_LIST_SNAPSHOT_KEY)

  if (customersSnapshot?.data) {
    await persistUpdatedSnapshot(
      customersSnapshot,
      {
        key: CUSTOMERS_LIST_SNAPSHOT_KEY,
        scope: 'customers-list',
        type: 'customers_list',
      },
      {
        ...customersSnapshot.data,
        customers: Array.isArray(customersSnapshot.data.customers)
          ? customersSnapshot.data.customers.map((entry) => patchCustomerPortfolioEntry(entry, customer))
          : [],
        attentionCustomers: Array.isArray(customersSnapshot.data.attentionCustomers)
          ? customersSnapshot.data.attentionCustomers.map((entry) =>
              patchCustomerPortfolioEntry(entry, customer)
            )
          : [],
        recentActivityItems: Array.isArray(customersSnapshot.data.recentActivityItems)
          ? customersSnapshot.data.recentActivityItems.map((entry) =>
              patchCustomerActivityItem(entry, customer)
            )
          : [],
      }
    )
  }

  const newTransferSnapshot = await loadReadSnapshot(NEW_TRANSFER_CUSTOMERS_SNAPSHOT_KEY)

  if (newTransferSnapshot?.data?.customers) {
    const nextCustomers = newTransferSnapshot.data.customers
      .map((entry) =>
        String(entry?.id || '') === String(customer.id)
          ? {
              ...entry,
              full_name: customer.full_name || entry.full_name || '',
            }
          : entry
      )
      .sort((left, right) =>
        String(left?.full_name || '').localeCompare(String(right?.full_name || ''), 'ar')
      )

    await persistUpdatedSnapshot(
      newTransferSnapshot,
      {
        key: NEW_TRANSFER_CUSTOMERS_SNAPSHOT_KEY,
        scope: 'new-transfer-customer-options',
        type: 'customers_options',
      },
      {
        ...newTransferSnapshot.data,
        customers: nextCustomers,
      }
    )
  }
}
