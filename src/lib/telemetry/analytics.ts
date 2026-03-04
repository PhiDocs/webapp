'use client';

import { firebaseMeasurementId } from '@/firebase/config';

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

type EventParams = Record<string, string | number | boolean | null | undefined>;

let initialized = false;
let warnedMissingId = false;
const gaDebugMode = process.env.NODE_ENV !== 'production';

function isValidMeasurementId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const v = id.trim();
  if (!v || v === 'undefined' || v === 'null') return false;
  return /^G-[A-Z0-9]+$/i.test(v);
}

function gtag(...args: unknown[]): void {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

function loadGtagScript(measurementId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src*="googletagmanager.com/gtag/js"]`
    );
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load gtag.js'));
    document.head.appendChild(script);
  });
}

export async function initAnalytics(): Promise<void> {
  if (initialized) return;
  if (!isValidMeasurementId(firebaseMeasurementId)) {
    if (!warnedMissingId) {
      warnedMissingId = true;
      console.warn('[telemetry] analytics disabled: invalid NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID');
    }
    return;
  }

  try {
    window.dataLayer = window.dataLayer || [];
    gtag('js', new Date());
    await loadGtagScript(firebaseMeasurementId);
    gtag('config', firebaseMeasurementId, {
      debug_mode: gaDebugMode,
      send_page_view: false,
    });
    initialized = true;
  } catch (error) {
    console.warn('[telemetry] analytics init failed:', error);
  }
}

export async function trackEvent(name: string, params?: EventParams): Promise<void> {
  if (!initialized) return;
  try {
    const eventParams = gaDebugMode ? { ...params, debug_mode: true } : params;
    gtag('event', name, eventParams);
  } catch (error) {
    console.warn(`[telemetry] trackEvent failed (${name}):`, error);
  }
}

export async function setAnalyticsUser(user: { uid: string; role?: string; activeCompanyId?: string | null }): Promise<void> {
  if (!initialized) return;
  try {
    gtag('set', { user_id: user.uid });
    gtag('set', 'user_properties', {
      role: user.role ?? 'unknown',
      active_company_id: user.activeCompanyId ?? 'none',
    });
  } catch (error) {
    console.warn('[telemetry] setAnalyticsUser failed:', error);
  }
}

export async function clearAnalyticsUser(): Promise<void> {
  if (!initialized) return;
  try {
    gtag('set', { user_id: null });
  } catch (error) {
    console.warn('[telemetry] clearAnalyticsUser failed:', error);
  }
}
