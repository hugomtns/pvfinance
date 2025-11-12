import type { ProjectInputs, ProjectResults } from '../types';

const API_BASE_URL = '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public detail?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  async getHealth(): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new ApiError('Health check failed', response.status);
    }
    return response.json();
  },

  async getDefaults(): Promise<ProjectInputs> {
    const response = await fetch(`${API_BASE_URL}/defaults`);
    if (!response.ok) {
      throw new ApiError('Failed to fetch defaults', response.status);
    }
    return response.json();
  },

  async calculateProject(inputs: ProjectInputs): Promise<ProjectResults> {
    const response = await fetch(`${API_BASE_URL}/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inputs),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        'Calculation failed',
        response.status,
        errorData.detail || 'Unknown error'
      );
    }

    const data = await response.json();
    console.log('API Response received:', {
      hasYearlyData: !!data.yearly_data,
      keys: Object.keys(data)
    });
    return data;
  },
};
