'use client';

/**
 * Triggers the browser's print functionality.
 */
export function generatePdfOnClient(): void {
  // This directly triggers the browser's print dialog.
  // The layout is controlled by @media print CSS rules.
  window.print();
}
