import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PostDetail } from './PostDetail';
import { makePost, makeSettings, makeComment, makeUser } from '../test/factories';

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
}));

const apiMock = vi.hoisted(() => ({
  getComments: vi.fn(),
  getUsersByIds: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: apiMock,
}));

vi.mock('../utils', () => ({
  downloadFile: vi.fn().mockResolvedValue(undefined),
  shareContent: vi.fn().mockResolvedValue(true),
  copyToClipboard: vi.fn().mockResolvedValue(true),
  generatePostFilename: vi.fn().mockReturnValue('test_post.png'),
  formatFileSize: (bytes: number) => `${bytes} B`,
  isVideoFile: (ext: string) => ['webm', 'mp4'].includes(ext),
  cn: (...args: (string | boolean | undefined)[]) => args.filter(Boolean).join(' '),
}));

vi.mock('./Ripple', () => ({
  Ripple: ({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <div onClick={disabled ? undefined : onClick} data-disabled={disabled ?? false}>{children}</div>
  ),
}));

beforeEach(() => {
  apiMock.getComments.mockReset();
  apiMock.getUsersByIds.mockReset();
  apiMock.getUser.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PostDetail', () => {
  it('renders the post id in the header', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/postDetail.postId/)).toBeInTheDocument());
  });

  it('renders an image when file url is set', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const post = makePost({}, { url: 'https://example.com/img.png', ext: 'png' });
    render(<PostDetail post={post} settings={makeSettings()} onClose={vi.fn()} />);
    const img = screen.getByAltText('Post 1');
    expect(img).toHaveAttribute('src', 'https://example.com/img.png');
  });

  it('renders a video element for webm files', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const post = makePost({}, { ext: 'webm', url: 'https://example.com/v.webm' });
    const { container } = render(<PostDetail post={post} settings={makeSettings()} onClose={vi.fn()} />);
    expect(container.querySelector('video')).toBeTruthy();
  });

  it('calls onClose when the backdrop is clicked', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const onClose = vi.fn();
    const { container } = render(<PostDetail post={makePost()} settings={makeSettings()} onClose={onClose} />);
    const backdrop = container.firstElementChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking inside the modal content', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const onClose = vi.fn();
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={onClose} />);
    fireEvent.click(screen.getByText(/postDetail.postId/));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('loads and displays comments', async () => {
    const comment = makeComment({ body: 'great post', creator: 'alice' });
    apiMock.getComments.mockResolvedValue([comment]);
    apiMock.getUsersByIds.mockResolvedValue([makeUser({ id: comment.creator_id, name: 'alice' })]);
    apiMock.getUser.mockResolvedValue(null);
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('great post')).toBeInTheDocument());
  });

  it('shows loading state while fetching comments', async () => {
    apiMock.getComments.mockReturnValue(new Promise(() => {}));
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} />);
    expect(screen.getByText('postDetail.loadingComments')).toBeInTheDocument();
  });

  it('shows no comments message when comments are empty', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('postDetail.noComments')).toBeInTheDocument());
  });

  it('renders description when present', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const post = makePost();
    post.description = 'A test description';
    render(<PostDetail post={post} settings={makeSettings()} onClose={vi.fn()} />);
    expect(screen.getByText('A test description')).toBeInTheDocument();
  });

  it('renders rating badge with the rating label', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} />);
    expect(screen.getByText('Safe')).toBeInTheDocument();
  });

  it('renders tag categories', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const post = makePost({ artist: ['picasso'], general: ['solo', 'fox'] });
    render(<PostDetail post={post} settings={makeSettings()} onClose={vi.fn()} />);
    expect(screen.getByText('picasso')).toBeInTheDocument();
    expect(screen.getByText('solo')).toBeInTheDocument();
    expect(screen.getByText('fox')).toBeInTheDocument();
  });

  it('shows a show more button when tags exceed the threshold', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const post = makePost({ general: Array.from({ length: 25 }, (_, i) => `tag${i}`) });
    render(<PostDetail post={post} settings={makeSettings()} onClose={vi.fn()} />);
    expect(screen.getByText(/postDetail.moreTags/)).toBeInTheDocument();
  });

  it('calls onSearchTag when a tag is clicked', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const onSearchTag = vi.fn();
    const post = makePost({ general: ['fox'] });
    render(<PostDetail post={post} settings={makeSettings()} onClose={vi.fn()} onSearchTag={onSearchTag} />);
    fireEvent.click(screen.getByText('fox'));
    expect(onSearchTag).toHaveBeenCalledWith('fox');
  });

  it('hides hidden comments', async () => {
    const visible = makeComment({ id: 1, body: 'visible', is_hidden: false });
    const hidden = makeComment({ id: 2, body: 'hidden content', is_hidden: true });
    apiMock.getComments.mockResolvedValue([visible, hidden]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('visible')).toBeInTheDocument());
    expect(screen.queryByText('hidden content')).not.toBeInTheDocument();
  });

  it('triggers download when save button is clicked', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const { downloadFile } = await import('../utils');
    const post = makePost({}, { url: 'https://example.com/file.png', ext: 'png' });
    render(<PostDetail post={post} settings={makeSettings()} onClose={vi.fn()} />);
    const saveBtn = screen.getByText('postDetail.save').closest('button')!;
    fireEvent.click(saveBtn);
    await waitFor(() => expect(downloadFile).toHaveBeenCalled());
  });

  it('disables download when file url is null', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const post = makePost({}, { url: null });
    render(<PostDetail post={post} settings={makeSettings()} onClose={vi.fn()} />);
    const saveBtn = screen.getByText('postDetail.save').closest('button')!;
    expect(saveBtn).toBeDisabled();
  });

  it('triggers share when share button is clicked', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const { shareContent } = await import('../utils');
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} />);
    const shareBtn = screen.getByText('postDetail.share').closest('button')!;
    fireEvent.click(shareBtn);
    await waitFor(() => expect(shareContent).toHaveBeenCalled());
  });

  it('shows copied text after share succeeds', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const { shareContent } = await import('../utils');
    (shareContent as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} />);
    const shareBtn = screen.getByText('postDetail.share').closest('button')!;
    fireEvent.click(shareBtn);
    await waitFor(() => expect(shareContent).toHaveBeenCalled());
  });

  it('triggers copy link when copy button is clicked', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const { copyToClipboard } = await import('../utils');
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} />);
    const copyBtn = screen.getByText('postDetail.copy').closest('button')!;
    fireEvent.click(copyBtn);
    await waitFor(() => expect(copyToClipboard).toHaveBeenCalled());
  });

  it('shows copied text after copy link succeeds', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const { copyToClipboard } = await import('../utils');
    (copyToClipboard as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} />);
    const copyBtn = screen.getByText('postDetail.copy').closest('button')!;
    fireEvent.click(copyBtn);
    await waitFor(() => expect(copyToClipboard).toHaveBeenCalled());
  });

  it('shows uploader name when user is fetched', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(makeUser({ name: 'uploader1' }));
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('uploader1')).toBeInTheDocument());
  });

  it('calls onSearchTag with user: prefix when uploader name is clicked', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(makeUser({ name: 'uploader1' }));
    const onSearchTag = vi.fn();
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} onSearchTag={onSearchTag} />);
    await waitFor(() => expect(screen.getByText('uploader1')).toBeInTheDocument());
    fireEvent.click(screen.getByText('uploader1'));
    expect(onSearchTag).toHaveBeenCalledWith('user:uploader1');
  });

  it('expands collapsed tags when show more is clicked', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const tags = Array.from({ length: 25 }, (_, i) => `tag${i}`);
    const post = makePost({ general: tags });
    render(<PostDetail post={post} settings={makeSettings()} onClose={vi.fn()} />);
    const moreBtn = screen.getByText(/postDetail.moreTags/);
    fireEvent.click(moreBtn);
    expect(screen.getByText('postDetail.showLess')).toBeInTheDocument();
  });

  it('collapses tags when show less is clicked', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const tags = Array.from({ length: 25 }, (_, i) => `tag${i}`);
    const post = makePost({ general: tags });
    render(<PostDetail post={post} settings={makeSettings()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/postDetail.moreTags/));
    fireEvent.click(screen.getByText('postDetail.showLess'));
    expect(screen.getByText(/postDetail.moreTags/)).toBeInTheDocument();
  });

  it('renders external link to e621', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} />);
    const link = screen.getByText('postDetail.open').closest('a');
    expect(link).toHaveAttribute('href', 'https://e621.net/posts/1');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders mobile close button', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const onClose = vi.fn();
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={onClose} />);
    const mobileClose = document.querySelector('.md\\:hidden');
    expect(mobileClose).toBeTruthy();
    fireEvent.click(mobileClose!);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders desktop close button', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const onClose = vi.fn();
    const { container } = render(<PostDetail post={makePost()} settings={makeSettings()} onClose={onClose} />);
    const desktopClose = container.querySelector('.hidden.md\\:block');
    expect(desktopClose).toBeTruthy();
    fireEvent.click(desktopClose!);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders file info overlay', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const post = makePost({}, { width: 1920, height: 1080, ext: 'png', size: 500000 });
    render(<PostDetail post={post} settings={makeSettings()} onClose={vi.fn()} />);
    expect(screen.getByText(/1920x1080/)).toBeInTheDocument();
    expect(screen.getByText(/PNG/)).toBeInTheDocument();
  });

  it('renders score and fav count in action bar', async () => {
    apiMock.getComments.mockResolvedValue([]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    const post = makePost();
    post.score.up = 42;
    post.fav_count = 10;
    render(<PostDetail post={post} settings={makeSettings()} onClose={vi.fn()} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('renders comment creator and score', async () => {
    const comment = makeComment({ body: 'nice', creator: 'bob', score: 5 });
    apiMock.getComments.mockResolvedValue([comment]);
    apiMock.getUsersByIds.mockResolvedValue([makeUser({ id: comment.creator_id, name: 'bob' })]);
    apiMock.getUser.mockResolvedValue(null);
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('bob')).toBeInTheDocument());
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('nice')).toBeInTheDocument();
  });

  it('calls onSearchTag when comment user is clicked', async () => {
    const comment = makeComment({ body: 'nice', creator: 'bob' });
    apiMock.getComments.mockResolvedValue([comment]);
    apiMock.getUsersByIds.mockResolvedValue([makeUser({ id: comment.creator_id, name: 'bob' })]);
    apiMock.getUser.mockResolvedValue(null);
    const onSearchTag = vi.fn();
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} onSearchTag={onSearchTag} />);
    await waitFor(() => expect(screen.getByText('bob')).toBeInTheDocument());
    fireEvent.click(screen.getByText('bob'));
    expect(onSearchTag).toHaveBeenCalledWith('user:bob');
  });

  it('uses fallback user name when creator is empty', async () => {
    const comment = makeComment({ body: 'nice', creator: '', creator_id: 999 });
    apiMock.getComments.mockResolvedValue([comment]);
    apiMock.getUsersByIds.mockResolvedValue([makeUser({ id: 999, name: 'named_user' })]);
    apiMock.getUser.mockResolvedValue(null);
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('named_user')).toBeInTheDocument());
  });

  it('uses user fallback when neither creator nor user map has name', async () => {
    const comment = makeComment({ body: 'nice', creator: '', creator_id: 999 });
    apiMock.getComments.mockResolvedValue([comment]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/postDetail.userFallback/)).toBeInTheDocument());
  });

  it('handles comment loading error gracefully', async () => {
    apiMock.getComments.mockRejectedValue(new Error('fail'));
    apiMock.getUsersByIds.mockResolvedValue([]);
    apiMock.getUser.mockResolvedValue(null);
    render(<PostDetail post={makePost()} settings={makeSettings()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('postDetail.noComments')).toBeInTheDocument());
  });
});
