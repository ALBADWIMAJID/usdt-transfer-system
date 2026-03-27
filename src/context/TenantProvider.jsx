import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './auth-context.js'
import useNetworkStatus from '../hooks/useNetworkStatus.js'
import { TenantContext } from './tenant-context.js'
import {
  clearTenantBootstrapCache,
  readTenantBootstrapCache,
  saveTenantBootstrapCache,
} from '../lib/bootstrapCache.js'
import { isLikelyOfflineReadFailure, withLiveReadTimeout } from '../lib/offline/readCache.js'
import { supabase } from '../lib/supabase.js'

const offlineBootstrapMessage =
  'لا يوجد اتصال حالياً ولا توجد جهة تشغيل محفوظة محلياً لهذا الحساب. أعد الاتصال ثم افتح النظام مرة واحدة على الأقل لحفظ بيئة التشغيل.'

const initialTenantState = {
  bootstrapError: '',
  bootstrapStatus: 'idle',
  orgId: null,
  organization: null,
  profile: null,
  userId: '',
}

function createLoadingTenantState(userId = '') {
  return {
    ...initialTenantState,
    bootstrapStatus: 'loading',
    userId,
  }
}

function createReadyTenantState({ orgId = null, organization = null, profile = null, userId = '' }) {
  return {
    ...initialTenantState,
    bootstrapStatus: 'ready',
    orgId,
    organization,
    profile,
    userId,
  }
}

function createErrorTenantState({ bootstrapError = '', orgId = null, profile = null, userId = '' }) {
  return {
    ...initialTenantState,
    bootstrapError,
    bootstrapStatus: 'error',
    orgId,
    profile,
    userId,
  }
}

function createUnprovisionedTenantState({ orgId = null, profile = null, userId = '' }) {
  return {
    ...initialTenantState,
    bootstrapStatus: 'unprovisioned',
    orgId,
    profile,
    userId,
  }
}

function getCachedTenantState(userId = '') {
  const cachedTenant = readTenantBootstrapCache(userId)

  if (!cachedTenant) {
    return null
  }

  return createReadyTenantState({
    orgId: cachedTenant.orgId,
    organization: cachedTenant.organization,
    profile: cachedTenant.profile,
    userId,
  })
}

function TenantProvider({ children }) {
  const { configError, isConfigured, loading: authLoading, user } = useAuth()
  const { isOffline } = useNetworkStatus()
  const activeUserId = user?.id ?? ''
  const [reloadKey, setReloadKey] = useState(0)
  const [tenantState, setTenantState] = useState(() => {
    if (!activeUserId || authLoading) {
      return initialTenantState
    }

    return getCachedTenantState(activeUserId) ?? createLoadingTenantState(activeUserId)
  })

  const refreshTenantContext = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  useEffect(() => {
    if (authLoading) {
      return undefined
    }

    if (!activeUserId) {
      return undefined
    }

    let cancelled = false
    const cachedTenantState = getCachedTenantState(activeUserId)

    const applyTenantState = (nextState) => {
      if (cancelled) {
        return
      }

      setTenantState(nextState)
    }

    const applyCachedTenantState = () => {
      if (!cachedTenantState) {
        return false
      }

      applyTenantState(cachedTenantState)
      return true
    }

    if (cachedTenantState) {
      applyTenantState(cachedTenantState)
    } else {
      applyTenantState(createLoadingTenantState(activeUserId))
    }

    if (!isConfigured || !supabase) {
      applyTenantState(
        createErrorTenantState({
          bootstrapError: configError,
          userId: activeUserId,
        })
      )
      return undefined
    }

    if (isOffline) {
      if (!applyCachedTenantState()) {
        applyTenantState(
          createErrorTenantState({
            bootstrapError: offlineBootstrapMessage,
            userId: activeUserId,
          })
        )
      }

      return undefined
    }

    const bootstrapTenantContext = async () => {
      try {
        const [profileResult, currentOrgResult] = await withLiveReadTimeout(
          Promise.all([
            supabase
              .from('user_profiles')
              .select('user_id, org_id, full_name, role, is_active, created_at, updated_at')
              .eq('user_id', activeUserId)
              .maybeSingle(),
            supabase.rpc('current_org_id'),
          ]),
          {
            timeoutMessage: 'Timed out while loading tenant bootstrap context.',
          }
        )

        if (cancelled) {
          return
        }

        if (profileResult.error || currentOrgResult.error) {
          const bootstrapError = profileResult.error || currentOrgResult.error

          if (isLikelyOfflineReadFailure(bootstrapError)) {
            if (!applyCachedTenantState()) {
              applyTenantState(
                createErrorTenantState({
                  bootstrapError: offlineBootstrapMessage,
                  userId: activeUserId,
                })
              )
            }

            return
          }

          applyTenantState(
            createErrorTenantState({
              bootstrapError: bootstrapError?.message || 'تعذر تحميل بيانات التهيئة الخاصة بجهة التشغيل الحالية.',
              userId: activeUserId,
            })
          )
          return
        }

        const profile = profileResult.data ?? null
        const currentOrgId = currentOrgResult.data ?? null
        const profileOrgId = profile?.org_id ?? null

        if (profile && profile.is_active === false) {
          clearTenantBootstrapCache()
          applyTenantState(
            createUnprovisionedTenantState({
              profile,
              userId: activeUserId,
            })
          )
          return
        }

        if (profileOrgId && currentOrgId && profileOrgId !== currentOrgId) {
          clearTenantBootstrapCache()
          applyTenantState(
            createErrorTenantState({
              bootstrapError:
                'تم رصد تعارض في جهة التشغيل النشطة لهذه الجلسة. أعد المحاولة أو تواصل مع مسؤول النظام.',
              orgId: currentOrgId,
              profile,
              userId: activeUserId,
            })
          )
          return
        }

        const resolvedOrgId = currentOrgId ?? null

        if (!profile || !resolvedOrgId) {
          clearTenantBootstrapCache()
          applyTenantState(
            createUnprovisionedTenantState({
              orgId: resolvedOrgId,
              profile,
              userId: activeUserId,
            })
          )
          return
        }

        const { data: organization, error: organizationError } = await withLiveReadTimeout(
          supabase
            .from('organizations')
            .select('id, name, owner_user_id, created_at')
            .eq('id', resolvedOrgId)
            .maybeSingle(),
          {
            timeoutMessage: 'Timed out while loading active organization.',
          }
        )

        if (cancelled) {
          return
        }

        if (organizationError) {
          if (isLikelyOfflineReadFailure(organizationError)) {
            if (!applyCachedTenantState()) {
              applyTenantState(
                createErrorTenantState({
                  bootstrapError: offlineBootstrapMessage,
                  userId: activeUserId,
                })
              )
            }

            return
          }

          applyTenantState(
            createErrorTenantState({
              bootstrapError: organizationError.message || 'تعذر تحميل جهة التشغيل الحالية الخاصة بهذه الجلسة.',
              orgId: resolvedOrgId,
              profile,
              userId: activeUserId,
            })
          )
          return
        }

        if (!organization) {
          clearTenantBootstrapCache()
          applyTenantState(
            createUnprovisionedTenantState({
              orgId: resolvedOrgId,
              profile,
              userId: activeUserId,
            })
          )
          return
        }

        saveTenantBootstrapCache({
          orgId: resolvedOrgId,
          organization,
          profile,
          userId: activeUserId,
        })

        applyTenantState(
          createReadyTenantState({
            orgId: resolvedOrgId,
            organization,
            profile,
            userId: activeUserId,
          })
        )
      } catch (error) {
        if (cancelled) {
          return
        }

        if (isLikelyOfflineReadFailure(error)) {
          if (!applyCachedTenantState()) {
            applyTenantState(
              createErrorTenantState({
                bootstrapError: offlineBootstrapMessage,
                userId: activeUserId,
              })
            )
          }

          return
        }

        applyTenantState(
          createErrorTenantState({
            bootstrapError:
              error instanceof Error
                ? error.message
                : 'تعذر تحميل بيانات التهيئة الخاصة بجهة التشغيل الحالية.',
            userId: activeUserId,
          })
        )
      }
    }

    bootstrapTenantContext()

    return () => {
      cancelled = true
    }
  }, [activeUserId, authLoading, configError, isConfigured, isOffline, reloadKey])

  const cachedTenantState = useMemo(() => {
    if (authLoading || !activeUserId) {
      return null
    }

    return getCachedTenantState(activeUserId)
  }, [activeUserId, authLoading])

  const exposedTenantState = useMemo(() => {
    if (authLoading || !activeUserId) {
      return initialTenantState
    }

    if (tenantState.userId !== activeUserId) {
      return cachedTenantState ?? createLoadingTenantState(activeUserId)
    }

    return tenantState
  }, [activeUserId, authLoading, cachedTenantState, tenantState])

  const value = useMemo(
    () => ({
      bootstrapError: exposedTenantState.bootstrapError,
      bootstrapStatus: exposedTenantState.bootstrapStatus,
      isProvisioned: exposedTenantState.bootstrapStatus === 'ready',
      isUnprovisioned: exposedTenantState.bootstrapStatus === 'unprovisioned',
      loading: exposedTenantState.bootstrapStatus === 'loading',
      orgId: exposedTenantState.orgId,
      organization: exposedTenantState.organization,
      profile: exposedTenantState.profile,
      refreshTenantContext,
    }),
    [exposedTenantState, refreshTenantContext]
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export default TenantProvider
