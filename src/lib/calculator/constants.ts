/**
 * Calculator Constants
 *
 * Seasonal energy production factors and month names for monthly calculations
 */

/**
 * Northern Hemisphere Monthly Energy Production Factors
 *
 * These factors represent the distribution of annual solar energy production across 12 months.
 * Based on typical Northern Hemisphere seasonal patterns with:
 * - Peak production in summer months (June-August)
 * - Lowest production in winter months (November-January)
 * - Peak/trough ratio: 3.49x
 *
 * Sum of all factors = 1.0 (100% of annual production)
 */
export const NORTHERN_HEMISPHERE_MONTHLY_FACTORS = [
  0.04464286,  // January - Winter low
  0.05654762,  // February
  0.07638889,  // March - Spring ramp-up
  0.09325397,  // April
  0.11011905,  // May
  0.12599206,  // June
  0.12797619,  // July - Peak summer (highest: 12.8%)
  0.11607143,  // August
  0.09325397,  // September - Fall decline
  0.07043651,  // October
  0.04861111,  // November
  0.03670635,  // December - Winter low (lowest: 3.7%)
];

/**
 * Month names for display in tables and charts
 */
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

/**
 * Abbreviated month names for compact displays
 */
export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
