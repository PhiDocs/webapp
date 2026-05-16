export function navigateCompanySection(companyId: string, section: string, filters?: Record<string, string>) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.set('section', section);
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  window.history.pushState(null, '', `/company/${companyId}?${params.toString()}`);
  window.dispatchEvent(new CustomEvent('phidocs:section-change', { detail: { section, filters } }));
}
