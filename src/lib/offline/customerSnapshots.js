import {
  getCustomersListSnapshotKey,
  getNewTransferCustomersSnapshotKey,
  getCustomerDetailsSnapshotKey,
} from './cacheKeys.js'
import { deleteFromStore } from './db.js'
import { loadReadSnapshot, saveReadSnapshot } from './readCache.js'

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function formatSnapshotDate(value) {
  if (!value) {
    return ''
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate)
}

function matchesCustomerEntry(entry, customerId) {
  if (!entry || !customerId) {
    return false
  }

  const normalizedCustomerId = String(customerId)
  const entryId = String(entry.id || entry.internalId || '')
  const entryRoute = String(entry.to || '')

  return entryId === normalizedCustomerId || entryRoute === `/customers/${normalizedCustomerId}`
}

function patchActiveCustomerEntry(entry, customer) {
  const nextName = customer.full_name || 'عميل بدون اسم'
  const nextPhone = customer.phone || 'غير مضاف'
  const nextNote = customer.notes || 'لا توجد ملاحظات داخلية.'

  return {
    ...entry,
    archivedAt: customer.archived_at || entry.archivedAt || '',
    isArchived: Boolean(customer.is_archived),
    internalId: customer.id || entry.internalId || '',
    name: nextName,
    note: nextNote,
    phone: nextPhone,
    searchText: `${nextName} ${nextPhone} ${entry.stateSummary || ''} ${customer.notes || ''}`.toLowerCase(),
  }
}

function createArchivedCustomerEntry(customer, entry = {}) {
  const nextName = customer.full_name || entry.name || 'عميل بدون اسم'
  const nextPhone = customer.phone || entry.phone || 'غير مضاف'
  const nextNote = customer.notes || entry.note || 'لا توجد ملاحظات داخلية.'
  const archivedAt = customer.archived_at || entry.archivedAt || ''
  const archivedAtLabel = formatSnapshotDate(archivedAt)

  return {
    ...entry,
    archivedAt,
    cardClassName: 'customer-portfolio-card--archived',
    eyebrow: 'ملف مؤرشف',
    followUpNote: archivedAtLabel
      ? `تمت أرشفة هذا العميل في ${archivedAtLabel} وأصبح متاحا للمراجعة التاريخية فقط.`
      : 'تمت أرشفة هذا العميل وأصبح متاحا للمراجعة التاريخية فقط.',
    hasActiveCollection: false,
    hasActivityToday: false,
    hasOverpaid: false,
    id: customer.id || entry.id,
    internalId: customer.id || entry.internalId || '',
    isArchived: true,
    name: nextName,
    needsFollowUp: false,
    note: nextNote,
    phone: nextPhone,
    queueClassName: 'queue-chip--neutral',
    queueLabel: 'مؤرشف',
    searchText: `${nextName} ${nextPhone} عميل مؤرشف ${customer.notes || ''}`.toLowerCase(),
    stateSummary: 'عميل مؤرشف',
    to: customer.id ? `/customers/${customer.id}` : entry.to || '/customers',
  }
}

function patchCustomerPortfolioEntry(entry, customer) {
  if (!matchesCustomerEntry(entry, customer.id)) {
    return entry
  }

  if (customer.is_archived || entry.isArchived) {
    return createArchivedCustomerEntry(customer, entry)
  }

  return patchActiveCustomerEntry(entry, customer)
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

function removeCustomerFromCollection(entries, customerId) {
  if (!Array.isArray(entries)) {
    return []
  }

  return entries.filter((entry) => !matchesCustomerEntry(entry, customerId))
}

function removeCustomerFromActivity(entries, customerId) {
  if (!Array.isArray(entries)) {
    return []
  }

  return entries.filter((entry) => String(entry?.to || '') !== `/customers/${customerId}`)
}

function compareArchivedCustomers(left, right) {
  const rightArchivedAt = new Date(right?.archivedAt || 0).getTime()
  const leftArchivedAt = new Date(left?.archivedAt || 0).getTime()

  if (rightArchivedAt !== leftArchivedAt) {
    return rightArchivedAt - leftArchivedAt
  }

  return String(left?.name || '').localeCompare(String(right?.name || ''), 'ar')
}

function buildPortfolioStats(customers) {
  const safeCustomers = Array.isArray(customers) ? customers : []

  return {
    activeCollectionCustomers: safeCustomers.filter(
      (customer) => customer.hasActiveCollection && !customer.hasOverpaid
    ).length,
    followUpCustomers: safeCustomers.filter((customer) => customer.needsFollowUp).length,
    openAwaitingCustomers: safeCustomers.filter(
      (customer) => customer.openAwaitingCount > 0 && customer.partialCount === 0 && !customer.hasOverpaid
    ).length,
    overpaidCustomers: safeCustomers.filter((customer) => customer.hasOverpaid).length,
    todayFollowUpCustomers: safeCustomers.filter(
      (customer) => customer.needsFollowUp && customer.hasActivityToday
    ).length,
    totalCustomers: safeCustomers.length,
    totalOutstandingRub: roundCurrency(
      safeCustomers.reduce((sum, customer) => sum + (Number(customer.outstandingRub) || 0), 0)
    ),
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

function buildCustomersSnapshotData(snapshotData, activeCustomers, archivedCustomers, customerIdToRemove) {
  const nextActiveCustomers = Array.isArray(activeCustomers) ? activeCustomers : []
  const nextArchivedCustomers = Array.isArray(archivedCustomers) ? archivedCustomers : []
  const followUpCustomers = nextActiveCustomers.filter((customer) => customer.needsFollowUp)

  return {
    ...snapshotData,
    archivedCustomers: [...nextArchivedCustomers].sort(compareArchivedCustomers),
    attentionCustomers: followUpCustomers.slice(0, 4),
    customers: nextActiveCustomers,
    portfolioStats: buildPortfolioStats(nextActiveCustomers),
    recentActivityItems: customerIdToRemove
      ? removeCustomerFromActivity(snapshotData?.recentActivityItems, customerIdToRemove)
      : Array.isArray(snapshotData?.recentActivityItems)
        ? snapshotData.recentActivityItems
        : [],
  }
}

function sortCustomerOptions(customers) {
  return [...customers].sort((left, right) =>
    String(left?.full_name || '').localeCompare(String(right?.full_name || ''), 'ar')
  )
}

async function syncCustomerDetailsSnapshot(customer, orgId) {
  if (!customer?.id || !orgId) {
    return
  }

  const detailKey = getCustomerDetailsSnapshotKey(orgId, customer.id)
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
}

export async function syncEditedCustomerSnapshots(customer, orgId) {
  if (!customer?.id || !orgId) {
    return
  }

  const customersListSnapshotKey = getCustomersListSnapshotKey(orgId)
  const newTransferCustomersSnapshotKey = getNewTransferCustomersSnapshotKey(orgId)

  await syncCustomerDetailsSnapshot(customer, orgId)

  const customersSnapshot = await loadReadSnapshot(customersListSnapshotKey)

  if (customersSnapshot?.data) {
    await persistUpdatedSnapshot(
      customersSnapshot,
      {
        key: customersListSnapshotKey,
        scope: 'customers-list',
        type: 'customers_list',
      },
      {
        ...customersSnapshot.data,
        archivedCustomers: Array.isArray(customersSnapshot.data.archivedCustomers)
          ? customersSnapshot.data.archivedCustomers.map((entry) =>
              patchCustomerPortfolioEntry(entry, customer)
            )
          : [],
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

  const newTransferSnapshot = await loadReadSnapshot(newTransferCustomersSnapshotKey)

  if (newTransferSnapshot?.data?.customers) {
    const nextCustomers = customer.is_archived
      ? newTransferSnapshot.data.customers.filter(
          (entry) => String(entry?.id || '') !== String(customer.id)
        )
      : newTransferSnapshot.data.customers.map((entry) =>
          String(entry?.id || '') === String(customer.id)
            ? {
                ...entry,
                full_name: customer.full_name || entry.full_name || '',
              }
            : entry
        )

    await persistUpdatedSnapshot(
      newTransferSnapshot,
      {
        key: newTransferCustomersSnapshotKey,
        scope: 'new-transfer-customer-options',
        type: 'customers_options',
      },
      {
        ...newTransferSnapshot.data,
        customers: sortCustomerOptions(nextCustomers),
      }
    )
  }
}

export async function syncArchivedCustomerSnapshots(customer, orgId) {
  if (!customer?.id || !orgId) {
    return
  }

  const customersListSnapshotKey = getCustomersListSnapshotKey(orgId)
  const newTransferCustomersSnapshotKey = getNewTransferCustomersSnapshotKey(orgId)

  await syncCustomerDetailsSnapshot(customer, orgId)

  const customersSnapshot = await loadReadSnapshot(customersListSnapshotKey)

  if (customersSnapshot?.data) {
    const existingActiveEntry = Array.isArray(customersSnapshot.data.customers)
      ? customersSnapshot.data.customers.find((entry) => matchesCustomerEntry(entry, customer.id))
      : null
    const existingArchivedEntry = Array.isArray(customersSnapshot.data.archivedCustomers)
      ? customersSnapshot.data.archivedCustomers.find((entry) => matchesCustomerEntry(entry, customer.id))
      : null
    const nextArchivedEntry = createArchivedCustomerEntry(
      customer,
      existingActiveEntry || existingArchivedEntry || {}
    )

    await persistUpdatedSnapshot(
      customersSnapshot,
      {
        key: customersListSnapshotKey,
        scope: 'customers-list',
        type: 'customers_list',
      },
      buildCustomersSnapshotData(
        customersSnapshot.data,
        removeCustomerFromCollection(customersSnapshot.data.customers, customer.id),
        [
          ...removeCustomerFromCollection(customersSnapshot.data.archivedCustomers, customer.id),
          nextArchivedEntry,
        ],
        customer.id
      )
    )
  }

  const newTransferSnapshot = await loadReadSnapshot(newTransferCustomersSnapshotKey)

  if (newTransferSnapshot?.data?.customers) {
    await persistUpdatedSnapshot(
      newTransferSnapshot,
      {
        key: newTransferCustomersSnapshotKey,
        scope: 'new-transfer-customer-options',
        type: 'customers_options',
      },
      {
        ...newTransferSnapshot.data,
        customers: sortCustomerOptions(
          newTransferSnapshot.data.customers.filter(
            (entry) => String(entry?.id || '') !== String(customer.id)
          )
        ),
      }
    )
  }
}

export async function syncDeletedCustomerSnapshots(customerId, orgId) {
  if (!customerId || !orgId) {
    return
  }

  const detailKey = getCustomerDetailsSnapshotKey(orgId, customerId)
  const customersListSnapshotKey = getCustomersListSnapshotKey(orgId)
  const newTransferCustomersSnapshotKey = getNewTransferCustomersSnapshotKey(orgId)

  try {
    await deleteFromStore(detailKey)
  } catch (error) {
    console.warn('Failed to remove customer detail snapshot:', customerId, error)
  }

  const customersSnapshot = await loadReadSnapshot(customersListSnapshotKey)

  if (customersSnapshot?.data) {
    await persistUpdatedSnapshot(
      customersSnapshot,
      {
        key: customersListSnapshotKey,
        scope: 'customers-list',
        type: 'customers_list',
      },
      buildCustomersSnapshotData(
        customersSnapshot.data,
        removeCustomerFromCollection(customersSnapshot.data.customers, customerId),
        removeCustomerFromCollection(customersSnapshot.data.archivedCustomers, customerId),
        customerId
      )
    )
  }

  const newTransferSnapshot = await loadReadSnapshot(newTransferCustomersSnapshotKey)

  if (newTransferSnapshot?.data?.customers) {
    await persistUpdatedSnapshot(
      newTransferSnapshot,
      {
        key: newTransferCustomersSnapshotKey,
        scope: 'new-transfer-customer-options',
        type: 'customers_options',
      },
      {
        ...newTransferSnapshot.data,
        customers: sortCustomerOptions(
          newTransferSnapshot.data.customers.filter(
            (entry) => String(entry?.id || '') !== String(customerId)
          )
        ),
      }
    )
  }
}
