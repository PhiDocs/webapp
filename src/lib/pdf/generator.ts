'use client';

/**
 * Triggers the browser's print functionality.
 * This is the sole method for generating a PDF or printing.
 */
export function generatePdfOnClient(): void {
  window.print();
}
