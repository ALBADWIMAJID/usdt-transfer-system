const MISSING_CURRENT_ORG_MESSAGE = 'تعذر تحديد جهة التشغيل الحالية لهذه الجلسة.'

function withOrgScope(query, orgId) {
  return orgId ? query.eq('org_id', orgId) : query
}

function withStampedOrg(payload, orgId) {
  return orgId ? { ...payload, org_id: orgId } : payload
}

export { MISSING_CURRENT_ORG_MESSAGE, withOrgScope, withStampedOrg }
