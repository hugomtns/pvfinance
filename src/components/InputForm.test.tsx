import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InputForm } from './InputForm';

describe('InputForm', () => {
  it('renders form with all required fields', () => {
    const mockSubmit = vi.fn();
    render(<InputForm onSubmit={mockSubmit} isLoading={false} />);

    // Check for main heading
    expect(screen.getByText('Project Parameters')).toBeInTheDocument();

    // Check for required input fields
    expect(screen.getByLabelText(/Capacity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Capacity Factor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CapEx per MW/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/PPA Price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/O&M Cost per MW/i)).toBeInTheDocument();
  });

  it('renders section headings', () => {
    const mockSubmit = vi.fn();
    render(<InputForm onSubmit={mockSubmit} isLoading={false} />);

    expect(screen.getByText('Core Parameters')).toBeInTheDocument();
    expect(screen.getByText('Technical Parameters')).toBeInTheDocument();
    expect(screen.getByText('Economic Parameters')).toBeInTheDocument();
    expect(screen.getByText('Financing Parameters')).toBeInTheDocument();
    expect(screen.getByText('Other Parameters')).toBeInTheDocument();
  });

  it('renders Calculate and Reset buttons', () => {
    const mockSubmit = vi.fn();
    render(<InputForm onSubmit={mockSubmit} isLoading={false} />);

    expect(screen.getByRole('button', { name: /Calculate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset to Defaults/i })).toBeInTheDocument();
  });

  it('shows "Calculating..." when loading', () => {
    const mockSubmit = vi.fn();
    render(<InputForm onSubmit={mockSubmit} isLoading={true} />);

    expect(screen.getByText('Calculating...')).toBeInTheDocument();
  });

  it('disables buttons when loading', () => {
    const mockSubmit = vi.fn();
    render(<InputForm onSubmit={mockSubmit} isLoading={true} />);

    const calculateButton = screen.getByRole('button', { name: /Calculating/i });
    const resetButton = screen.getByRole('button', { name: /Reset/i });

    expect(calculateButton).toBeDisabled();
    expect(resetButton).toBeDisabled();
  });

  it('calls onSubmit when form is submitted', () => {
    const mockSubmit = vi.fn();
    render(<InputForm onSubmit={mockSubmit} isLoading={false} />);

    const form = screen.getByRole('button', { name: /Calculate/i }).closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  it('updates input value when changed', () => {
    const mockSubmit = vi.fn();
    render(<InputForm onSubmit={mockSubmit} isLoading={false} />);

    const capacityInput = screen.getByLabelText(/Capacity/i) as HTMLInputElement;

    fireEvent.change(capacityInput, { target: { value: '100' } });

    expect(capacityInput.value).toBe('100');
  });

  it('has default values in inputs', () => {
    const mockSubmit = vi.fn();
    render(<InputForm onSubmit={mockSubmit} isLoading={false} />);

    const capacityInput = screen.getByLabelText(/Capacity/i) as HTMLInputElement;
    const capacityFactorInput = screen.getByLabelText(/Capacity Factor/i) as HTMLInputElement;

    expect(capacityInput.value).toBe('50');
    expect(capacityFactorInput.value).toBe('0.22');
  });

  it('resets form to defaults when reset button clicked', () => {
    const mockSubmit = vi.fn();
    render(<InputForm onSubmit={mockSubmit} isLoading={false} />);

    const capacityInput = screen.getByLabelText(/Capacity/i) as HTMLInputElement;
    const resetButton = screen.getByRole('button', { name: /Reset/i });

    // Change value
    fireEvent.change(capacityInput, { target: { value: '100' } });
    expect(capacityInput.value).toBe('100');

    // Reset
    fireEvent.click(resetButton);
    expect(capacityInput.value).toBe('50');
  });
});
