/**
 * PDF Formatting Utilities
 *
 * Currency, percentage, and number formatting for PDF reports
 * Matches formatting from original Python implementation
 */

/**
 * Format number as currency (€)
 */
export function formatCurrency(value: number): string {
  return `€${formatNumber(value, 0)}`;
}

/**
 * Format number as percentage
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format number with thousands separators and decimals
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Format number with suffix (e.g., "1.23x" for DSCR)
 */
export function formatWithSuffix(value: number | null, decimals: number, suffix: string): string {
  if (value === null) {
    return '—';
  }
  return `${formatNumber(value, decimals)}${suffix}`;
}
