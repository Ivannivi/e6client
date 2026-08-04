import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchHistory } from './SearchHistory';
import type { SearchHistoryItem } from '../hooks/useSearchHistory';

function makeItem(overrides: Partial<SearchHistoryItem> = {}): SearchHistoryItem {
  return { query: 'fox', timestamp: Date.now(), ...overrides };
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) =>
      typeof opts === 'object' && opts.count !== undefined ? `${key}_${opts.count}` : key,
  }),
}));

describe('SearchHistory', () => {
  it('returns null when visible is false', () => {
    const { container } = render(
      <SearchHistory history={[makeItem()]} onSelect={vi.fn()} onRemove={vi.fn()} onClear={vi.fn()} visible={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('returns null when history is empty', () => {
    const { container } = render(
      <SearchHistory history={[]} onSelect={vi.fn()} onRemove={vi.fn()} onClear={vi.fn()} visible />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders history items when visible and history is non-empty', () => {
    const history = [makeItem({ query: 'fox' }), makeItem({ query: 'wolf' })];
    render(<SearchHistory history={history} onSelect={vi.fn()} onRemove={vi.fn()} onClear={vi.fn()} visible />);
    expect(screen.getByText('fox')).toBeInTheDocument();
    expect(screen.getByText('wolf')).toBeInTheDocument();
  });

  it('calls onSelect with the query when an item is clicked', () => {
    const onSelect = vi.fn();
    const history = [makeItem({ query: 'fox' })];
    render(<SearchHistory history={history} onSelect={onSelect} onRemove={vi.fn()} onClear={vi.fn()} visible />);
    fireEvent.click(screen.getByText('fox'));
    expect(onSelect).toHaveBeenCalledWith('fox');
  });

  it('calls onRemove with the query when the remove button is clicked (stopPropagation)', () => {
    const onSelect = vi.fn();
    const onRemove = vi.fn();
    const history = [makeItem({ query: 'fox' })];
    render(<SearchHistory history={history} onSelect={onSelect} onRemove={onRemove} onClear={vi.fn()} visible />);
    const removeBtn = screen.getByText('fox').closest('.group')!.querySelector('button')!;
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith('fox');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('calls onClear when the clear all button is clicked', () => {
    const onClear = vi.fn();
    const history = [makeItem({ query: 'fox' })];
    render(<SearchHistory history={history} onSelect={vi.fn()} onRemove={vi.fn()} onClear={onClear} visible />);
    fireEvent.click(screen.getByText('searchHistory.clearAll'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
