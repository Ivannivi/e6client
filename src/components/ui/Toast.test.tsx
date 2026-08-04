import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastContainer } from './Toast';
import type { Toast } from '../../hooks/useToast';

function makeToast(overrides: Partial<Toast> = {}): Toast {
  return {
    id: 'toast-1',
    message: 'Hello world',
    type: 'info',
    ...overrides,
  };
}

describe('ToastContainer', () => {
  it('renders null when toasts array is empty', () => {
    const { container } = render(<ToastContainer toasts={[]} onRemove={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one toast with its message', () => {
    render(<ToastContainer toasts={[makeToast({ message: 'Saved successfully' })]} onRemove={vi.fn()} />);
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
  });

  it('calls onRemove when the toast div is clicked', () => {
    const onRemove = vi.fn();
    render(<ToastContainer toasts={[makeToast({ id: 't1' })]} onRemove={onRemove} />);
    fireEvent.click(screen.getByText('Hello world'));
    expect(onRemove).toHaveBeenCalledWith('t1');
  });

  it('calls onRemove when the close button is clicked (stopPropagation prevents double call)', () => {
    const onRemove = vi.fn();
    render(<ToastContainer toasts={[makeToast({ id: 't1' })]} onRemove={onRemove} />);
    const closeBtn = screen.getByRole('button');
    fireEvent.click(closeBtn);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith('t1');
  });

  it('renders multiple toasts', () => {
    const toasts = [
      makeToast({ id: 't1', message: 'First' }),
      makeToast({ id: 't2', message: 'Second' }),
      makeToast({ id: 't3', message: 'Third' }),
    ];
    render(<ToastContainer toasts={toasts} onRemove={vi.fn()} />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });

  it('applies the correct color class per type', () => {
    const cases: { type: Toast['type']; cls: string }[] = [
      { type: 'success', cls: 'bg-green-500' },
      { type: 'error', cls: 'bg-red-500' },
      { type: 'warning', cls: 'bg-yellow-500' },
      { type: 'info', cls: 'bg-blue-500' },
    ];

    for (const { type, cls } of cases) {
      const { unmount } = render(
        <ToastContainer toasts={[makeToast({ id: type, type })]} onRemove={vi.fn()} />,
      );
      const toastEl = screen.getByText('Hello world').closest('div.flex');
      expect(toastEl?.className).toContain(cls);
      unmount();
    }
  });
});
