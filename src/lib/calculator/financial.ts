/**
 * Financial Functions Module
 *
 * Pure TypeScript implementations of core financial calculations
 * Ported from original Python calculator
 *
 * All functions use IEEE 754 double precision (same as Python)
 * No external dependencies - pure mathematics
 */

/**
 * Calculate Net Present Value (NPV)
 *
 * @param rate - Discount rate (decimal, e.g., 0.08 for 8%)
 * @param values - Array of cash flows, starting with year 0
 * @returns NPV of the cash flow series
 *
 * Formula: NPV = Σ(value_i / (1 + rate)^i) for i = 0 to n
 */
export function npv(rate: number, values: number[]): number {
  return values.reduce((sum, val, i) => {
    return sum + val / Math.pow(1 + rate, i);
  }, 0);
}

/**
 * Calculate Internal Rate of Return (IRR) using Newton's method
 *
 * This is the MOST CRITICAL function - requires exact precision match with Python
 *
 * @param values - Array of cash flows, starting with year 0 (typically negative for initial investment)
 * @param guess - Initial guess for IRR (default 0.1 = 10%)
 * @returns IRR as decimal (e.g., 0.0824 for 8.24%)
 *
 * Algorithm: Newton-Raphson method
 * - Iteratively solves NPV(rate) = 0
 * - Uses derivative of NPV for faster convergence
 * - Convergence criteria: |NPV| < 1e-6
 * - Max iterations: 100
 */
export function irr(values: number[], guess: number = 0.1): number {
  // Helper: Calculate NPV at a given rate
  const npvAtRate = (rate: number): number => {
    return values.reduce((sum, val, i) => {
      return sum + val / Math.pow(1 + rate, i);
    }, 0);
  };

  // Helper: Calculate derivative of NPV at a given rate
  // d(NPV)/d(rate) = Σ(-i × value_i / (1 + rate)^(i+1))
  const npvDerivative = (rate: number): number => {
    return values.reduce((sum, val, i) => {
      return sum - i * val / Math.pow(1 + rate, i + 1);
    }, 0);
  };

  let rate = guess;

  // Newton-Raphson iteration
  for (let iteration = 0; iteration < 100; iteration++) {
    const npvVal = npvAtRate(rate);

    // Check convergence: NPV close enough to zero
    if (Math.abs(npvVal) < 1e-6) {
      return rate;
    }

    const npvDeriv = npvDerivative(rate);

    // Check if derivative is too small (avoid division by zero)
    if (Math.abs(npvDeriv) < 1e-10) {
      break;
    }

    // Newton step: rate_new = rate_old - f(rate) / f'(rate)
    rate = rate - npvVal / npvDeriv;
  }

  // If didn't converge, return the last computed rate
  return rate;
}

/**
 * Calculate periodic payment for a loan (PMT)
 *
 * @param rate - Interest rate per period (decimal)
 * @param nper - Number of periods
 * @param pv - Present value (loan principal, typically positive)
 * @param fv - Future value (default 0)
 * @returns Periodic payment amount (negative indicates outflow)
 *
 * Formula: PMT = -rate × (pv × (1 + rate)^nper + fv) / ((1 + rate)^nper - 1)
 * Special case: rate = 0 → PMT = -(pv + fv) / nper
 */
export function pmt(
  rate: number,
  nper: number,
  pv: number,
  fv: number = 0
): number {
  // Handle zero interest rate edge case
  if (rate === 0) {
    return -(pv + fv) / nper;
  }

  // Match Python formula exactly
  return -rate * (pv * Math.pow(1 + rate, nper) + fv) / (Math.pow(1 + rate, nper) - 1);
}

/**
 * Calculate present value of annuity (PV)
 *
 * @param rate - Interest rate per period (decimal)
 * @param nper - Number of periods
 * @param pmt - Payment per period
 * @param fv - Future value (default 0)
 * @returns Present value (negative indicates investment)
 *
 * Formula: PV = -(pmt × ((1 + rate)^nper - 1) / rate + fv) / (1 + rate)^nper
 * Special case: rate = 0 → PV = -(pmt × nper + fv)
 */
export function pv(
  rate: number,
  nper: number,
  pmt: number,
  fv: number = 0
): number {
  // Handle zero interest rate edge case
  if (rate === 0) {
    return -(pmt * nper + fv);
  }

  const annuity = pmt * (Math.pow(1 + rate, nper) - 1) / rate;
  return -(annuity + fv) / Math.pow(1 + rate, nper);
}
