import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsModal } from './SettingsModal';
import { makeSettings, makeAccount } from '../../test/factories';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === 'object') {
        return Object.entries(opts).reduce(
          (acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)),
          key,
        );
      }
      return key;
    },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

const apiMock = vi.hoisted(() => ({
  getUserByName: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  api: apiMock,
}));

vi.mock('../ui/Ripple', () => ({
  Ripple: ({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <div onClick={disabled ? undefined : onClick} data-disabled={disabled ?? false}>{children}</div>
  ),
}));

beforeEach(() => {
  apiMock.getUserByName.mockReset();
  vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SettingsModal', () => {
  it('returns null when isOpen is false', () => {
    const { container } = render(
      <SettingsModal isOpen={false} onClose={vi.fn()} settings={makeSettings()} onUpdate={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the title when open', () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings()} onUpdate={vi.fn()} />,
    );
    expect(screen.getByText('settings.title')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <SettingsModal isOpen={true} onClose={onClose} settings={makeSettings()} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.title').nextElementSibling!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the cancel button is clicked', () => {
    const onClose = vi.fn();
    render(
      <SettingsModal isOpen={true} onClose={onClose} settings={makeSettings()} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('switches between tabs', () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings()} onUpdate={vi.fn()} />,
    );
    expect(screen.getByText('settings.account.title')).toBeInTheDocument();
    fireEvent.click(screen.getByText('settings.tabs.blacklist'));
    expect(screen.getByText('settings.blacklist.blacklistedTags')).toBeInTheDocument();
    fireEvent.click(screen.getByText('settings.tabs.network'));
    expect(screen.getByText('settings.network.enableProxy')).toBeInTheDocument();
  });

  it('shows keyboard shortcuts list in the shortcuts tab', () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings()} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.shortcuts'));
    expect(screen.getByText('shortcutsHelp.title')).toBeInTheDocument();
    expect(screen.getByText('shortcutsHelp.focusSearchBar')).toBeInTheDocument();
    expect(screen.getByText('shortcutsHelp.toggleViewMode')).toBeInTheDocument();
    expect(screen.getByText('shortcutsHelp.footer')).toBeInTheDocument();
  });

  it('shows no accounts message when accounts is empty', () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings()} onUpdate={vi.fn()} />,
    );
    expect(screen.getByText('settings.account.noAccounts')).toBeInTheDocument();
  });

  it('shows add account button and opens the editor form', () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings()} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.account.addFirstAccount'));
    expect(screen.getByText('settings.account.newAccount')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('settings.account.accountNamePlaceholder')).toBeInTheDocument();
  });

  it('renders existing accounts with name and host', () => {
    const account = makeAccount({ name: 'MyAccount', hostUrl: 'https://e621.net' });
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ accounts: [account], activeAccountId: account.id })} onUpdate={vi.fn()} />,
    );
    expect(screen.getByText('MyAccount')).toBeInTheDocument();
    expect(screen.getByText(/e621.net/)).toBeInTheDocument();
  });

  it('opens edit form when edit button is clicked', () => {
    const account = makeAccount({ name: 'EditMe' });
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ accounts: [account], activeAccountId: account.id })} onUpdate={vi.fn()} />,
    );
    // Click the account card to open the popout widget
    fireEvent.click(screen.getByText('EditMe'));
    fireEvent.click(screen.getByText('settings.account.edit'));
    expect(screen.getByText('settings.account.editAccount')).toBeInTheDocument();
  });

  it('removes an account from the list when delete is clicked', () => {
    const account = makeAccount({ name: 'DeleteMe' });
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ accounts: [account], activeAccountId: account.id })} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('DeleteMe'));
    fireEvent.click(screen.getByText('settings.account.delete'));
    expect(screen.getByText('settings.account.noAccounts')).toBeInTheDocument();
  });

  it('sets an account as active when set active button is clicked', () => {
    const acc1 = makeAccount({ id: 'a1', name: 'Alpha' });
    const acc2 = makeAccount({ id: 'a2', name: 'Beta' });
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ accounts: [acc1, acc2], activeAccountId: 'a1' })} onUpdate={vi.fn()} />,
    );
    // Open the popout for the inactive account and set it active
    fireEvent.click(screen.getByText('Beta'));
    fireEvent.click(screen.getByText('settings.account.setActive'));
    const greenDots = document.querySelectorAll('.bg-green-500.rounded-full');
    expect(greenDots).toHaveLength(1);
  });

  it('does not show a safe mode toggle in blacklist tab', () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings()} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.blacklist'));
    expect(screen.queryByText('settings.blacklist.safeMode')).not.toBeInTheDocument();
  });

  it('adds a blacklisted tag on Enter', () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings()} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.blacklist'));
    const input = screen.getByPlaceholderText('settings.blacklist.tagPlaceholder');
    fireEvent.keyDown(input, { key: 'Enter', target: { value: 'gore' } });
  });

  it('shows sync button when account has credentials', async () => {
    const account = makeAccount({ username: 'alice', apiKey: 'key' });
    apiMock.getUserByName.mockResolvedValue(makeAccount());
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ accounts: [account], activeAccountId: account.id })} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.blacklist'));
    await waitFor(() => expect(screen.getByTitle('settings.blacklist.refreshTitle')).toBeInTheDocument());
  });

  it('syncs blacklist from cloud', async () => {
    const account = makeAccount({ username: 'alice', apiKey: 'key' });
    apiMock.getUserByName.mockResolvedValue({ blacklisted_tags: 'gore\nscat\nyoung' });
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ accounts: [account], activeAccountId: account.id })} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.blacklist'));
    await waitFor(() => expect(screen.getByTitle('settings.blacklist.refreshTitle')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('settings.blacklist.refreshTitle'));
    await waitFor(() => expect(apiMock.getUserByName).toHaveBeenCalled());
  });

  it('shows network proxy settings when proxy is enabled', () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ enableProxy: true })} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.network'));
    expect(screen.getByPlaceholderText('settings.network.proxyPlaceholder')).toBeInTheDocument();
  });

  it('applies demo proxy when the demo button is clicked', () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ enableProxy: true })} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.network'));
    fireEvent.click(screen.getByText('settings.network.useDemoProxy'));
    expect(screen.getByDisplayValue('https://corsproxy.io/?')).toBeInTheDocument();
  });

  it('saves settings and closes on save button click', () => {
    const onClose = vi.fn();
    const onUpdate = vi.fn();
    render(
      <SettingsModal isOpen={true} onClose={onClose} settings={makeSettings()} onUpdate={onUpdate} />,
    );
    fireEvent.click(screen.getByText('settings.saveChanges'));
    expect(onUpdate).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('saves a new account via the editor form', () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings()} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.account.addFirstAccount'));
    fireEvent.change(screen.getByPlaceholderText('settings.account.accountNamePlaceholder'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('settings.account.hostUrlPlaceholder'), { target: { value: 'https://e621.net' } });
    fireEvent.change(screen.getByPlaceholderText('settings.account.usernamePlaceholder'), { target: { value: 'user1' } });
    fireEvent.click(screen.getByText('settings.account.saveAccount'));
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('edits an existing account and saves changes', () => {
    const account = makeAccount({ name: 'Original', username: 'user1' });
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ accounts: [account], activeAccountId: account.id })} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('Original'));
    fireEvent.click(screen.getByText('settings.account.edit'));
    fireEvent.change(screen.getByPlaceholderText('settings.account.accountNamePlaceholder'), { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByText('settings.account.saveAccount'));
    expect(screen.getByText('Renamed')).toBeInTheDocument();
  });

  it('cancels account editing without saving', () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings()} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.account.addFirstAccount'));
    // Click the cancel button inside the edit modal (the first one)
    const cancelButtons = screen.getAllByText('settings.cancel');
    fireEvent.click(cancelButtons[0]);
    expect(screen.getByText('settings.account.noAccounts')).toBeInTheDocument();
  });

  it('toggles api key visibility', () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings()} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.account.addFirstAccount'));
    const keyInput = screen.getByPlaceholderText('****************');
    expect(keyInput).toHaveAttribute('type', 'password');
    const eyeBtn = keyInput.parentElement!.querySelector('button')!;
    fireEvent.click(eyeBtn);
    expect(keyInput).toHaveAttribute('type', 'text');
  });

  it('adds a blacklisted tag and removes it', () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings()} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.blacklist'));
    const input = screen.getByPlaceholderText('settings.blacklist.tagPlaceholder');
    fireEvent.keyDown(input, { key: 'Enter', target: { value: 'gore' } });
    expect(screen.getByText('gore')).toBeInTheDocument();
    fireEvent.click(screen.getByText('gore').querySelector('button')!);
    expect(screen.queryByText('gore')).not.toBeInTheDocument();
  });

  it('does not add duplicate blacklisted tags', () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ blacklistedTags: ['gore'] })} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.blacklist'));
    const input = screen.getByPlaceholderText('settings.blacklist.tagPlaceholder');
    fireEvent.keyDown(input, { key: 'Enter', target: { value: 'gore' } });
    const tags = screen.getAllByText('gore');
    expect(tags.length).toBe(1);
  });

  it('shows no tag chips when blacklist is empty', () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings()} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.blacklist'));
    expect(screen.queryByText('settings.blacklist.empty')).not.toBeInTheDocument();
  });

  it('shows sync error when no account is set', async () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings()} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.blacklist'));
    // No sync button visible when no account
    expect(screen.queryByTitle('settings.blacklist.refreshTitle')).not.toBeInTheDocument();
  });

  it('syncs blacklist and shows up to date message', async () => {
    const account = makeAccount({ username: 'alice', apiKey: 'key' });
    apiMock.getUserByName.mockResolvedValue({ blacklisted_tags: 'gore' });
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ accounts: [account], activeAccountId: account.id, blacklistedTags: ['gore'] })} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.blacklist'));
    await waitFor(() => expect(screen.getByTitle('settings.blacklist.refreshTitle')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('settings.blacklist.refreshTitle'));
    await waitFor(() => expect(screen.getByText('settings.blacklist.syncUpToDate')).toBeInTheDocument());
  });

  it('syncs blacklist and shows synced count for new tags', async () => {
    const account = makeAccount({ username: 'alice', apiKey: 'key' });
    apiMock.getUserByName.mockResolvedValue({ blacklisted_tags: 'gore\nscat' });
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ accounts: [account], activeAccountId: account.id, blacklistedTags: [] })} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.blacklist'));
    await waitFor(() => expect(screen.getByTitle('settings.blacklist.refreshTitle')).toBeInTheDocument());
    // Auto-sync already merged tags, so manual sync shows up to date
    apiMock.getUserByName.mockResolvedValue({ blacklisted_tags: 'gore\nscat' });
    fireEvent.click(screen.getByTitle('settings.blacklist.refreshTitle'));
    await waitFor(() => expect(screen.getByText(/settings.blacklist.sync/)).toBeInTheDocument());
  });

  it('shows user not found when blacklist is empty', async () => {
    const account = makeAccount({ username: 'alice', apiKey: 'key' });
    apiMock.getUserByName.mockResolvedValue({ blacklisted_tags: '' });
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ accounts: [account], activeAccountId: account.id })} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.blacklist'));
    await waitFor(() => expect(screen.getByTitle('settings.blacklist.refreshTitle')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('settings.blacklist.refreshTitle'));
    await waitFor(() => expect(screen.getByText('settings.blacklist.syncUserNotFound')).toBeInTheDocument());
  });

  it('shows 403 error on sync failure', async () => {
    const account = makeAccount({ username: 'alice', apiKey: 'key' });
    apiMock.getUserByName.mockRejectedValue({ response: { status: 403 } });
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ accounts: [account], activeAccountId: account.id })} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.blacklist'));
    await waitFor(() => expect(screen.getByTitle('settings.blacklist.refreshTitle')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('settings.blacklist.refreshTitle'));
    await waitFor(() => expect(screen.getByText('settings.blacklist.syncFailed403')).toBeInTheDocument());
  });

  it('shows 401 error on sync failure', async () => {
    const account = makeAccount({ username: 'alice', apiKey: 'key' });
    apiMock.getUserByName.mockRejectedValue({ response: { status: 401 } });
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ accounts: [account], activeAccountId: account.id })} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.blacklist'));
    await waitFor(() => expect(screen.getByTitle('settings.blacklist.refreshTitle')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('settings.blacklist.refreshTitle'));
    await waitFor(() => expect(screen.getByText('settings.blacklist.syncFailed401')).toBeInTheDocument());
  });

  it('shows generic error on sync failure', async () => {
    const account = makeAccount({ username: 'alice', apiKey: 'key' });
    apiMock.getUserByName.mockRejectedValue(new Error('network'));
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ accounts: [account], activeAccountId: account.id })} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.blacklist'));
    await waitFor(() => expect(screen.getByTitle('settings.blacklist.refreshTitle')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('settings.blacklist.refreshTitle'));
    await waitFor(() => expect(screen.getByText('settings.blacklist.syncFailedGeneric')).toBeInTheDocument());
  });

  it('auto-syncs blacklist when modal opens with account', async () => {
    const account = makeAccount({ username: 'alice', apiKey: 'key' });
    apiMock.getUserByName.mockResolvedValue({ blacklisted_tags: 'gore\nscat' });
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ accounts: [account], activeAccountId: account.id })} onUpdate={vi.fn()} />,
    );
    await waitFor(() => expect(apiMock.getUserByName).toHaveBeenCalled());
  });

  it('toggles proxy enable in network tab', () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ enableProxy: false })} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.network'));
    const toggle = document.querySelector('.bg-outline') as HTMLElement;
    fireEvent.click(toggle);
    expect(screen.getByPlaceholderText('settings.network.proxyPlaceholder')).toBeInTheDocument();
  });

  it('updates proxy url when typed', () => {
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ enableProxy: true })} onUpdate={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('settings.tabs.network'));
    const input = screen.getByPlaceholderText('settings.network.proxyPlaceholder') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'https://proxy.example.com' } });
    expect(input.value).toBe('https://proxy.example.com');
  });

  it('shows active account indicator as a green dot on the pfp', () => {
    const account = makeAccount({ name: 'Active' });
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ accounts: [account], activeAccountId: account.id })} onUpdate={vi.fn()} />,
    );
    const greenDots = document.querySelectorAll('.bg-green-500.rounded-full');
    expect(greenDots).toHaveLength(1);
  });

  it('does not show the using account banner', () => {
    const account = makeAccount({ name: 'MyAcc', hostUrl: 'https://e621.net' });
    render(
      <SettingsModal isOpen={true} onClose={vi.fn()} settings={makeSettings({ accounts: [account], activeAccountId: account.id })} onUpdate={vi.fn()} />,
    );
    expect(screen.queryByText('settings.account.usingAccount')).not.toBeInTheDocument();
  });
});
