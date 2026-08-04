import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostCard } from './PostCard';
import { makePost, makeSettings } from '../test/factories';

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

describe('PostCard', () => {
  it('renders the post id and preview image', () => {
    const post = makePost({}, { ext: 'png' });
    post.preview.url = 'https://example.com/preview.png';
    render(<PostCard post={post} settings={makeSettings()} onClick={() => {}} />);

    const img = screen.getByAltText('Post 1');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/preview.png');
  });

  it('calls onClick with the post when clicked', () => {
    const post = makePost();
    post.preview.url = 'https://example.com/preview.png';
    const onClick = vi.fn();
    render(<PostCard post={post} settings={makeSettings()} onClick={onClick} />);

    fireEvent.click(screen.getByAltText('Post 1'));
    expect(onClick).toHaveBeenCalledWith(post);
  });

  it('shows a video badge when the file ext is webm', () => {
    const post = makePost({}, { ext: 'webm' });
    post.preview.url = 'https://example.com/preview.png';
    render(<PostCard post={post} settings={makeSettings()} onClick={() => {}} />);

    expect(screen.getByText('WEBM')).toBeInTheDocument();
  });

  it('shows a video badge when the file ext is mp4', () => {
    const post = makePost({}, { ext: 'mp4' });
    post.preview.url = 'https://example.com/preview.png';
    render(<PostCard post={post} settings={makeSettings()} onClick={() => {}} />);

    expect(screen.getByText('MP4')).toBeInTheDocument();
  });

  it('does not show a video badge for non-video files', () => {
    const post = makePost({}, { ext: 'png' });
    post.preview.url = 'https://example.com/preview.png';
    render(<PostCard post={post} settings={makeSettings()} onClick={() => {}} />);

    expect(screen.queryByText('PNG')).not.toBeInTheDocument();
  });

  it('shows a children badge when the post has children', () => {
    const post = makePost();
    post.preview.url = 'https://example.com/preview.png';
    post.relationships.has_children = true;
    const { container } = render(
      <PostCard post={post} settings={makeSettings()} onClick={() => {}} />,
    );

    expect(container.querySelector('.fa-images')).toBeInTheDocument();
  });

  it('blurs the image when safeMode is on and rating is not s', () => {
    const post = makePost();
    post.preview.url = 'https://example.com/preview.png';
    post.rating = 'q';
    render(<PostCard post={post} settings={makeSettings({ safeMode: true })} onClick={() => {}} />);

    expect(screen.getByAltText('Post 1')).toHaveClass('blur-xl');
  });

  it('does not blur the image when safeMode is on but rating is s', () => {
    const post = makePost();
    post.preview.url = 'https://example.com/preview.png';
    post.rating = 's';
    render(<PostCard post={post} settings={makeSettings({ safeMode: true })} onClick={() => {}} />);

    expect(screen.getByAltText('Post 1')).not.toHaveClass('blur-xl');
  });

  it('shows the unknownArtist translation when there are no artist tags', () => {
    const post = makePost({ artist: [] });
    post.preview.url = 'https://example.com/preview.png';
    render(<PostCard post={post} settings={makeSettings()} onClick={() => {}} />);

    expect(screen.getByText('postCard.unknownArtist')).toBeInTheDocument();
  });

  it('shows artist names when present', () => {
    const post = makePost({ artist: ['alice', 'bob'] });
    post.preview.url = 'https://example.com/preview.png';
    render(<PostCard post={post} settings={makeSettings()} onClick={() => {}} />);

    expect(screen.getByText('alice, bob')).toBeInTheDocument();
  });

  it('shows a fallback icon when preview.url is null', () => {
    const post = makePost();
    post.preview.url = null;
    const { container } = render(
      <PostCard post={post} settings={makeSettings()} onClick={() => {}} />,
    );

    expect(container.querySelector('.fa-image-slash')).toBeInTheDocument();
    expect(screen.queryByAltText('Post 1')).not.toBeInTheDocument();
  });
});
