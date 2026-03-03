'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/auth/session-provider';
import { clearAnalyticsUser, initAnalytics, setAnalyticsUser, trackEvent } from '@/lib/telemetry/analytics';
import { installGlobalCrashHandlers } from '@/lib/telemetry/crash-reporter';

export function TelemetryBootstrap() {
  const { user } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    void initAnalytics();
    const uninstall = installGlobalCrashHandlers();
    return uninstall;
  }, []);

  useEffect(() => {
    if (!user) {
      void clearAnalyticsUser();
      return;
    }

    void setAnalyticsUser({
      uid: user.uid,
      role: user.role,
      activeCompanyId: user.activeCompanyId ?? user.companyId ?? null,
    });
  }, [user]);

  useEffect(() => {
    const search = searchParams?.toString();
    void trackEvent('page_view', {
      page_path: pathname,
      page_location: search ? `${pathname}?${search}` : pathname,
    });
  }, [pathname, searchParams]);

  return null;
}

