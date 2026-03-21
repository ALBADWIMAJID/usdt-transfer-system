import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './auth-context.js'
import { TenantContext } from './tenant-context.js'
import { supabase } from '../lib/supabase.js'

const initialTenantState = {
  bootstrapError: '',
  bootstrapStatus: 'idle',
  orgId: null,
  organization: null,
  profile: null,
}

function TenantProvider({ children }) {
  const { configError, isConfigured, loading: authLoading, user } = useAuth()
  const [reloadKey, setReloadKey] = useState(0)
  const [tenantState, setTenantState] = useState(initialTenantState)

  const refreshTenantContext = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  useEffect(() => {
    if (authLoading) {
      return undefined
    }

    if (!user) {
      return undefined
    }

    let cancelled = false

    const bootstrapTenantContext = async () => {
      if (!isConfigured || !supabase) {
        setTenantState({
          ...initialTenantState,
          bootstrapError: configError,
          bootstrapStatus: 'error',
        })
        return
      }

      setTenantState({
        ...initialTenantState,
        bootstrapStatus: 'loading',
      })

      const [profileResult, currentOrgResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('user_id, org_id, full_name, role, is_active, created_at, updated_at')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.rpc('current_org_id'),
      ])

      if (cancelled) {
        return
      }

      if (profileResult.error || currentOrgResult.error) {
        setTenantState({
          ...initialTenantState,
          bootstrapError:
            profileResult.error?.message ||
            currentOrgResult.error?.message ||
            'تعذر تحميل بيانات التهيئة الخاصة بجهة التشغيل الحالية.',
          bootstrapStatus: 'error',
        })
        return
      }

      const profile = profileResult.data ?? null
      const currentOrgId = currentOrgResult.data ?? null
      const profileOrgId = profile?.org_id ?? null

      if (profile && profile.is_active === false) {
        setTenantState({
          ...initialTenantState,
          bootstrapStatus: 'unprovisioned',
          profile,
        })
        return
      }

      if (profileOrgId && currentOrgId && profileOrgId !== currentOrgId) {
        setTenantState({
          ...initialTenantState,
          bootstrapError:
            'تم رصد تعارض في جهة التشغيل النشطة لهذه الجلسة. أعد المحاولة أو تواصل مع مسؤول النظام.',
          bootstrapStatus: 'error',
          orgId: currentOrgId,
          profile,
        })
        return
      }

      const resolvedOrgId = currentOrgId ?? null

      if (!profile || !resolvedOrgId) {
        setTenantState({
          ...initialTenantState,
          bootstrapStatus: 'unprovisioned',
          orgId: resolvedOrgId,
          profile,
        })
        return
      }

      const { data: organization, error: organizationError } = await supabase
        .from('organizations')
        .select('id, name, owner_user_id, created_at')
        .eq('id', resolvedOrgId)
        .maybeSingle()

      if (cancelled) {
        return
      }

      if (organizationError) {
        setTenantState({
          ...initialTenantState,
          bootstrapError:
            organizationError.message ||
            'تعذر تحميل جهة التشغيل الحالية الخاصة بهذه الجلسة.',
          bootstrapStatus: 'error',
          orgId: resolvedOrgId,
          profile,
        })
        return
      }

      if (!organization) {
        setTenantState({
          ...initialTenantState,
          bootstrapStatus: 'unprovisioned',
          orgId: resolvedOrgId,
          profile,
        })
        return
      }

      setTenantState({
        bootstrapError: '',
        bootstrapStatus: 'ready',
        orgId: resolvedOrgId,
        organization,
        profile,
      })
    }

    bootstrapTenantContext()

    return () => {
      cancelled = true
    }
  }, [authLoading, configError, isConfigured, reloadKey, user])

  const value = useMemo(
    () => ({
      bootstrapError: tenantState.bootstrapError,
      bootstrapStatus: tenantState.bootstrapStatus,
      isProvisioned: tenantState.bootstrapStatus === 'ready',
      isUnprovisioned: tenantState.bootstrapStatus === 'unprovisioned',
      loading: tenantState.bootstrapStatus === 'loading',
      orgId: tenantState.orgId,
      organization: tenantState.organization,
      profile: tenantState.profile,
      refreshTenantContext,
    }),
    [refreshTenantContext, tenantState]
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export default TenantProvider
