import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) =>
      typeof opts === 'object' && opts.count !== undefined ? `${key}_${opts.count}` : key,
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

describe('KeyboardShortcutsHelp', () => {
  it('returns null when isOpen is false', () => {
    const { container } = render(<KeyboardShortcutsHelp isOpen={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the modal with shortcut entries when isOpen is true', () => {
    render(<KeyboardShortcutsHelp isOpen onClose={vi.fn()} />);
    expect(screen.getByText('shortcutsHelp.title')).toBeInTheDocument();
    expect(screen.getByText('shortcutsHelp.focusSearchBar')).toBeInTheDocument();
    expect(screen.getByText('shortcutsHelp.refreshPosts')).toBeInTheDocument();
    expect(screen.getByText('shortcutsHelp.showHelp')).toBeInTheDocument();
    expect(screen.getAllByText('/')).toHaveLength(1);
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen onClose={onClose} />);
    const backdrop = screen.getByText('shortcutsHelp.title').closest('.fixed')!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen onClose={onClose} />);
    const closeBtn = screen.getByRole('button');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking inside the modal content', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen onClose={onClose} />);
    const title = screen.getByText('shortcutsHelp.title');
    fireEvent.click(title);
    expect(onClose).not.toHaveBeenCalled();
  });
});
