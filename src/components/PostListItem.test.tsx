import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostListItem } from './PostListItem';
import { makePost, makeSettings } from '../test/factories';
import { formatFileSize } from '../utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) =>
      typeof opts === 'object' && opts.count !== undefined ? `${key}_${opts.count}` : key,
  }),
}));

vi.mock('./Ripple', () => ({
  Ripple: ({ children, onClick, disabled }: any) => (
    <div onClick={disabled ? undefined : onClick} data-disabled={disabled ?? false}>
      {children}
    </div>
  ),
}));

describe('PostListItem', () => {
  it('renders the post id', () => {
    const post = makePost();
    post.preview.url = 'https://example.com/preview.png';
    render(<PostListItem post={post} settings={makeSettings()} onClick={() => {}} />);

    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('calls onClick with the post when clicked', () => {
    const post = makePost();
    post.preview.url = 'https://example.com/preview.png';
    const onClick = vi.fn();
    render(<PostListItem post={post} settings={makeSettings()} onClick={onClick} />);

    fireEvent.click(screen.getByText('#1'));
    expect(onClick).toHaveBeenCalledWith(post);
  });

  it('shows a video badge when the ext is webm', () => {
    const post = makePost({}, { ext: 'webm' });
    post.preview.url = 'https://example.com/preview.png';
    render(<PostListItem post={post} settings={makeSettings()} onClick={() => {}} />);

    expect(screen.getByText('WEBM')).toBeInTheDocument();
  });

  it('does not show a video badge for non-video files', () => {
    const post = makePost({}, { ext: 'png' });
    post.preview.url = 'https://example.com/preview.png';
    render(<PostListItem post={post} settings={makeSettings()} onClick={() => {}} />);

    expect(screen.queryByText('PNG')).not.toBeInTheDocument();
  });

  it('does not blur the image regardless of rating', () => {
    const post = makePost();
    post.preview.url = 'https://example.com/preview.png';
    post.rating = 'q';
    render(
      <PostListItem post={post} settings={makeSettings({ safeMode: true })} onClick={() => {}} />,
    );

    expect(screen.getByAltText('Post 1')).not.toHaveClass('blur-xl');
  });

  it('shows top tags from character and species, capped at 3', () => {
    const post = makePost({
      character: ['char_a', 'char_b'],
      species: ['sp_a', 'sp_b'],
    });
    post.preview.url = 'https://example.com/preview.png';
    render(<PostListItem post={post} settings={makeSettings()} onClick={() => {}} />);

    expect(screen.getByText('char_a')).toBeInTheDocument();
    expect(screen.getByText('char_b')).toBeInTheDocument();
    expect(screen.getByText('sp_a')).toBeInTheDocument();
    expect(screen.queryByText('sp_b')).not.toBeInTheDocument();
  });

  it('shows the formatted file size', () => {
    const post = makePost({}, { size: 1024 * 1024 * 5 });
    post.preview.url = 'https://example.com/preview.png';
    render(<PostListItem post={post} settings={makeSettings()} onClick={() => {}} />);

    expect(screen.getByText(formatFileSize(1024 * 1024 * 5))).toBeInTheDocument();
  });

  it('shows a pending placeholder when preview.url is null', () => {
    const post = makePost();
    post.preview.url = null;
    const { container } = render(
      <PostListItem post={post} settings={makeSettings()} onClick={() => {}} />,
    );

    expect(container.querySelector('.fa-hourglass-half')).toBeInTheDocument();
    expect(screen.getByText('postDetail.mediaPending')).toBeInTheDocument();
    expect(screen.queryByAltText('Post 1')).not.toBeInTheDocument();
  });

  it('does not show artist names in the list item', () => {
    const post = makePost({ artist: ['alice', 'bob'] });
    post.preview.url = 'https://example.com/preview.png';
    render(<PostListItem post={post} settings={makeSettings()} onClick={() => {}} />);

    expect(screen.queryByText('postList.byArtist')).not.toBeInTheDocument();
  });
});
