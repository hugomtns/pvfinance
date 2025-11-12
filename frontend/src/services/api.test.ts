import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, ApiError } from './api';
import type { ProjectInputs } from '../types';

// Mock fetch
global.fetch = vi.fn();

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getHealth', () => {
    it('successfully fetches health status', async () => {
      const mockResponse = { status: 'healthy' };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.getHealth();

      expect(global.fetch).toHaveBeenCalledWith('/api/health');
      expect(result).toEqual(mockResponse);
    });

    it('throws ApiError when health check fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(api.getHealth()).rejects.toThrow(ApiError);
    });
  });

  describe('getDefaults', () => {
    it('successfully fetches default values', async () => {
      const mockDefaults: ProjectInputs = {
        capacity: 50,
        capacity_factor: 0.22,
        capex_per_mw: 1_000_000,
        ppa_price: 70,
        om_cost_per_mw_year: 15_000,
        degradation_rate: 0.004,
        ppa_escalation: 0.01,
        om_escalation: 0.01,
        gearing_ratio: 0.75,
        interest_rate: 0.045,
        debt_tenor: 15,
        target_dscr: 1.30,
        project_lifetime: 25,
        tax_rate: 0.25,
        discount_rate: 0.08,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDefaults,
      });

      const result = await api.getDefaults();

      expect(global.fetch).toHaveBeenCalledWith('/api/defaults');
      expect(result).toEqual(mockDefaults);
    });

    it('throws ApiError when fetching defaults fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(api.getDefaults()).rejects.toThrow(ApiError);
    });
  });

  describe('calculateProject', () => {
    const mockInputs: ProjectInputs = {
      capacity: 50,
      capacity_factor: 0.22,
      capex_per_mw: 1_000_000,
      ppa_price: 70,
      om_cost_per_mw_year: 15_000,
      degradation_rate: 0.004,
      ppa_escalation: 0.01,
      om_escalation: 0.01,
      gearing_ratio: 0.75,
      interest_rate: 0.045,
      debt_tenor: 15,
      target_dscr: 1.30,
      project_lifetime: 25,
      tax_rate: 0.25,
      discount_rate: 0.08,
    };

    it('successfully calculates project results', async () => {
      const mockResults = {
        project_summary: {
          capacity_mw: 50,
          capacity_factor: 0.22,
          project_lifetime: 25,
          total_capex: 50_000_000,
          capex_per_mw: 1_000_000,
        },
        financing_structure: {},
        key_metrics: {},
        first_year_operations: {},
        assessment: {},
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const result = await api.calculateProject(mockInputs);

      expect(global.fetch).toHaveBeenCalledWith('/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockInputs),
      });
      expect(result).toEqual(mockResults);
    });

    it('throws ApiError with detail when calculation fails', async () => {
      const mockErrorDetail = { detail: 'Invalid input: capacity must be positive' };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockErrorDetail,
      });

      try {
        await api.calculateProject(mockInputs);
        expect.fail('Should have thrown ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).detail).toBe('Invalid input: capacity must be positive');
      }
    });

    it('throws ApiError with unknown error when response is not JSON', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Not JSON');
        },
      });

      try {
        await api.calculateProject(mockInputs);
        expect.fail('Should have thrown ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).detail).toBe('Unknown error');
      }
    });
  });
});
