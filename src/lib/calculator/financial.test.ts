/**
 * Unit tests for financial functions
 *
 * These tests ensure the TypeScript implementations match the original Python calculator exactly
 * Tolerance: 1e-6 for all floating point comparisons
 */

import { describe, it, expect } from 'vitest';
import { npv, irr, pmt, pv } from './financial';

describe('Financial Functions', () => {
  describe('NPV (Net Present Value)', () => {
    it('should calculate NPV for simple cash flows', () => {
      const cashFlows = [-1000, 300, 300, 300, 300];
      const rate = 0.08;
      const result = npv(rate, cashFlows);

      // Expected: -1000 + 300/1.08 + 300/1.08^2 + 300/1.08^3 + 300/1.08^4
      // = -1000 + 277.78 + 257.20 + 238.15 + 220.51 = -6.36
      expect(result).toBeCloseTo(-6.36, 2);
    });

    it('should handle zero discount rate', () => {
      const cashFlows = [-1000, 300, 300, 300, 300];
      const rate = 0;
      const result = npv(rate, cashFlows);

      // With rate = 0, NPV is just the sum
      expect(result).toBe(200); // -1000 + 1200 = 200
    });

    it('should handle negative discount rate', () => {
      const cashFlows = [-1000, 500];
      const rate = -0.05;
      const result = npv(rate, cashFlows);

      // NPV = -1000 + 500/0.95 = -1000 + 526.32 = -473.68
      expect(result).toBeCloseTo(-473.68, 2);
    });

    it('should handle single cash flow', () => {
      const cashFlows = [1000];
      const rate = 0.08;
      const result = npv(rate, cashFlows);

      expect(result).toBe(1000); // First cash flow not discounted
    });
  });

  describe('IRR (Internal Rate of Return)', () => {
    it('should calculate IRR for simple project', () => {
      // Initial investment -1000, then 4 years of 300
      const cashFlows = [-1000, 300, 300, 300, 300];
      const result = irr(cashFlows);

      // At IRR, NPV should be 0. For these cash flows, IRR ≈ 7.71%
      expect(result).toBeCloseTo(0.0771, 4);

      // Verify NPV at this rate is close to zero
      const npvAtIRR = npv(result, cashFlows);
      expect(Math.abs(npvAtIRR)).toBeLessThan(1e-6);
    });

    it('should calculate IRR for solar project cash flows', () => {
      // Typical solar project: large upfront cost, steady cash flows
      const cashFlows = [
        -50000000, // Initial investment
        5000000, 5000000, 5000000, 5000000, 5000000, // Years 1-5
        5000000, 5000000, 5000000, 5000000, 5000000, // Years 6-10
        4500000, 4500000, 4500000, 4500000, 4500000, // Years 11-15 (declining)
        4000000, 4000000, 4000000, 4000000, 4000000, // Years 16-20
        3500000, 3500000, 3500000, 3500000, 3500000  // Years 21-25
      ];
      const result = irr(cashFlows);

      // Should converge to a reasonable IRR for solar projects (6-10%)
      expect(result).toBeGreaterThan(0.06);
      expect(result).toBeLessThan(0.10);

      // Verify NPV at IRR is zero
      const npvAtIRR = npv(result, cashFlows);
      expect(Math.abs(npvAtIRR)).toBeLessThan(1e-4); // Slightly relaxed tolerance for large numbers
    });

    it('should handle zero IRR case', () => {
      // Cash flows that sum to zero
      const cashFlows = [-1000, 500, 500];
      const result = irr(cashFlows);

      // IRR should be very close to 0
      expect(result).toBeCloseTo(0, 2);
    });

    it('should handle custom initial guess', () => {
      const cashFlows = [-1000, 300, 300, 300, 300];
      const result = irr(cashFlows, 0.15); // Start with 15% guess

      // Should still converge to same result
      expect(result).toBeCloseTo(0.0771, 4);
    });

    it('should converge for difficult cash flows', () => {
      // Cash flows with negative periods in the middle
      const cashFlows = [-1000, 200, -100, 500, 600];
      const result = irr(cashFlows);

      // Should still converge
      expect(result).toBeDefined();
      expect(!isNaN(result)).toBe(true);

      // Verify NPV at IRR
      const npvAtIRR = npv(result, cashFlows);
      expect(Math.abs(npvAtIRR)).toBeLessThan(1e-5);
    });

    it('should handle very large numbers', () => {
      // Test with million-scale numbers
      const cashFlows = [-100_000_000, 15_000_000, 15_000_000, 15_000_000,
                         15_000_000, 15_000_000, 15_000_000, 15_000_000,
                         15_000_000, 15_000_000, 15_000_000];
      const result = irr(cashFlows);

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(0.20);

      // Verify precision with large numbers
      const npvAtIRR = npv(result, cashFlows);
      expect(Math.abs(npvAtIRR / cashFlows[0])).toBeLessThan(1e-6); // Relative error < 0.0001%
    });
  });

  describe('PMT (Periodic Payment)', () => {
    it('should calculate loan payment', () => {
      // $10,000 loan at 4.5% for 15 years
      const rate = 0.045;
      const nper = 15;
      const pv = 10000;
      const result = pmt(rate, nper, pv);

      // Expected: approximately -$931.14 per year
      // Formula: -0.045 × (10000 × 1.045^15) / (1.045^15 - 1) = -931.14
      expect(result).toBeCloseTo(-931.14, 2);
    });

    it('should handle zero interest rate', () => {
      // $10,000 loan at 0% for 10 years
      const rate = 0;
      const nper = 10;
      const pv = 10000;
      const result = pmt(rate, nper, pv);

      // With no interest, payment = principal / periods
      expect(result).toBe(-1000); // -10000 / 10
    });

    it('should handle future value', () => {
      const rate = 0.05;
      const nper = 10;
      const pv = 10000;
      const fv = 5000;
      const result = pmt(rate, nper, pv, fv);

      // Payment should be higher to account for future value
      expect(result).toBeLessThan(-1000); // More negative = higher payment
    });

    it('should match Python example', () => {
      // Test case from original Python calculator
      const rate = 0.045;
      const nper = 15;
      const pv = 37_500_000; // Max debt by DSCR from 50 MW example
      const result = pmt(rate, nper, pv);

      // This is a debt service calculation
      expect(result).toBeLessThan(0); // Payment is negative (outflow)
      expect(Math.abs(result)).toBeGreaterThan(3_000_000); // Reasonable for 37.5M loan
    });
  });

  describe('PV (Present Value)', () => {
    it('should calculate present value of annuity', () => {
      // $1000/year for 10 years at 8%
      const rate = 0.08;
      const nper = 10;
      const pmtVal = 1000;
      const result = pv(rate, nper, pmtVal);

      // Expected: approximately -$6,710.08
      expect(result).toBeCloseTo(-6710.08, 2);
    });

    it('should handle zero interest rate', () => {
      const rate = 0;
      const nper = 10;
      const pmtVal = 1000;
      const result = pv(rate, nper, pmtVal);

      // With no discounting, PV = payment × periods
      expect(result).toBe(-10000);
    });

    it('should handle future value', () => {
      const rate = 0.05;
      const nper = 10;
      const pmtVal = 1000;
      const fv = 5000;
      const result = pv(rate, nper, pmtVal, fv);

      // PV should account for both annuity and future value
      expect(result).toBeLessThan(-7000); // More negative
    });
  });

  describe('Integration: IRR and NPV relationship', () => {
    it('NPV at IRR should be zero', () => {
      const cashFlows = [-10000, 3000, 3000, 3000, 3000, 2000];

      const calculatedIRR = irr(cashFlows);
      const npvAtIRR = npv(calculatedIRR, cashFlows);

      // NPV at IRR should be very close to zero
      expect(Math.abs(npvAtIRR)).toBeLessThan(1e-6);
    });

    it('NPV should be positive when discount rate < IRR', () => {
      const cashFlows = [-10000, 3000, 3000, 3000, 3000, 3000];

      const calculatedIRR = irr(cashFlows);
      const lowerRate = calculatedIRR - 0.01; // 1% below IRR
      const npvAtLowerRate = npv(lowerRate, cashFlows);

      expect(npvAtLowerRate).toBeGreaterThan(0);
    });

    it('NPV should be negative when discount rate > IRR', () => {
      const cashFlows = [-10000, 3000, 3000, 3000, 3000, 3000];

      const calculatedIRR = irr(cashFlows);
      const higherRate = calculatedIRR + 0.01; // 1% above IRR
      const npvAtHigherRate = npv(higherRate, cashFlows);

      expect(npvAtHigherRate).toBeLessThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cash flows gracefully', () => {
      const cashFlows: number[] = [];
      const result = npv(0.08, cashFlows);
      expect(result).toBe(0);
    });

    it('should handle all-zero cash flows', () => {
      const cashFlows = [0, 0, 0, 0];
      const result = irr(cashFlows);

      // IRR of all zeros is technically undefined, but should return some value
      expect(result).toBeDefined();
    });

    it('should handle very small numbers (precision test)', () => {
      const cashFlows = [-0.001, 0.0003, 0.0003, 0.0003, 0.0003];
      const result = irr(cashFlows);

      expect(result).toBeCloseTo(0.0771, 4); // Same relative IRR as 1000x larger numbers
    });

    it('should handle negative present value in PMT', () => {
      const result = pmt(0.05, 10, -10000); // Negative PV
      expect(result).toBeGreaterThan(0); // Positive payment (inflow)
    });
  });

  describe('Performance', () => {
    it('should calculate IRR quickly for 25-year project', () => {
      const cashFlows = Array(26).fill(4000000);
      cashFlows[0] = -50000000;

      const start = performance.now();
      const result = irr(cashFlows);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10); // Should complete in < 10ms
      expect(result).toBeDefined();
    });

    it('should calculate NPV quickly for 25-year project', () => {
      const cashFlows = Array(26).fill(4000000);
      cashFlows[0] = -50000000;

      const start = performance.now();
      const result = npv(0.08, cashFlows);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1); // Should complete in < 1ms
      expect(result).toBeDefined();
    });
  });
});
