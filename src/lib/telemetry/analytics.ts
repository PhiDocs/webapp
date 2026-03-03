'use client';

import { app } from '@/firebase/config';

type EventParams = Record<string, string | number | boolean | null | undefined>;

let initialized = false;
let warnedMissingMeasurementId = false;
const gaDebugModeEnabled = process.env.NODE_ENV !== 'production';

function isValidMeasurementId(measurementId: unknown): measurementId is string {
  if (typeof measurementId !== 'string') return false;
  const normalized = measurementId.trim();
  if (!normalized) return false;
  if (normalized === 'undefined' || normalized === 'null') return false;
  return /^G-[A-Z0-9]+$/i.test(normalized);
}

async function getAnalyticsModule() {
  if (!isValidMeasurementId(app.options.measurementId)) {
    if (!warnedMissingMeasurementId) {
      warnedMissingMeasurementId = true;
      console.warn('[telemetry] analytics disabled: invalid NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID');
    }
    return null;
  }

  const analyticsLib = await import('firebase/analytics');
  const supported = await analyticsLib.isSupported();
  if (!supported) return null;
  const analytics = analyticsLib.getAnalytics(app);
  return { analyticsLib, analytics };
}

export async function initAnalytics(): Promise<void> {
  if (initialized) return;
  try {
    const moduleRef = await getAnalyticsModule();
    if (!moduleRef) return;
    initialized = true;
  } catch (error) {
    console.warn('[telemetry] analytics init failed:', error);
  }
}

export async function trackEvent(name: string, params?: EventParams): Promise<void> {
  try {
    const moduleRef = await getAnalyticsModule();
    if (!moduleRef) return;
    const eventParams = gaDebugModeEnabled
      ? { ...params, debug_mode: true }
      : params;

    moduleRef.analyticsLib.logEvent(moduleRef.analytics, name, eventParams);
  } catch (error) {
    console.warn(`[telemetry] trackEvent failed (${name}):`, error);
  }
}

export async function setAnalyticsUser(user: { uid: string; role?: string; activeCompanyId?: string | null }): Promise<void> {
  try {
    const moduleRef = await getAnalyticsModule();
    if (!moduleRef) return;
    moduleRef.analyticsLib.setUserId(moduleRef.analytics, user.uid);
    moduleRef.analyticsLib.setUserProperties(moduleRef.analytics, {
      role: user.role ?? 'unknown',
      active_company_id: user.activeCompanyId ?? 'none',
    });
  } catch (error) {
    console.warn('[telemetry] setAnalyticsUser failed:', error);
  }
}

export async function clearAnalyticsUser(): Promise<void> {
  try {
    const moduleRef = await getAnalyticsModule();
    if (!moduleRef) return;
    moduleRef.analyticsLib.setUserId(moduleRef.analytics, null);
  } catch (error) {
    console.warn('[telemetry] clearAnalyticsUser failed:', error);
  }
}
