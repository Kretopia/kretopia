export interface MediaInfo {
  platform: 'youtube' | 'vimeo' | 'soundcloud' | 'spotify' | 'tiktok' | 'instagram' | 'behance' | 'unknown';
  id: string;
  embedUrl: string;
  thumbnailUrl: string;
}

export const parseMediaUrl = (url: string): MediaInfo | null => {
  if (!url) return null;

  // YouTube
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    const id = youtubeMatch[1];
    return {
      platform: 'youtube',
      id,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`
    };
  }

  // Vimeo
  const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    const id = vimeoMatch[1];
    return {
      platform: 'vimeo',
      id,
      embedUrl: `https://player.vimeo.com/video/${id}`,
      thumbnailUrl: `https://vumbnail.com/${id}.jpg`
    };
  }

  // SoundCloud
  if (url.includes('soundcloud.com')) {
    return {
      platform: 'soundcloud',
      id: url,
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`,
      thumbnailUrl: 'https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=400&h=300&fit=crop' // SoundCloud placeholder
    };
  }

  // Spotify
  const spotifyRegex = /spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/;
  const spotifyMatch = url.match(spotifyRegex);
  if (spotifyMatch) {
    const [, type, id] = spotifyMatch;
    return {
      platform: 'spotify',
      id,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}`,
      thumbnailUrl: '' // Will be fetched from edge function
    };
  }

  // TikTok
  const tiktokRegex = /tiktok\.com\/.*\/video\/(\d+)/;
  const tiktokMatch = url.match(tiktokRegex);
  if (tiktokMatch) {
    const id = tiktokMatch[1];
    return {
      platform: 'tiktok',
      id,
      embedUrl: `https://www.tiktok.com/embed/v2/${id}`,
      thumbnailUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop' // TikTok placeholder
    };
  }

  // Instagram Reels
  const instagramRegex = /instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/;
  const instagramMatch = url.match(instagramRegex);
  if (instagramMatch) {
    const id = instagramMatch[1];
    return {
      platform: 'instagram',
      id,
      embedUrl: `https://www.instagram.com/p/${id}/embed`,
      thumbnailUrl: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=300&fit=crop'
    };
  }

  // Behance
  const behanceGalleryRegex = /behance\.net\/gallery\/(\d+)/;
  const behanceGalleryMatch = url.match(behanceGalleryRegex);
  if (behanceGalleryMatch) {
    const id = behanceGalleryMatch[1];
    return {
      platform: 'behance',
      id,
      embedUrl: `https://www.behance.net/gallery/${id}?embed=true`,
      thumbnailUrl: '' // Will be fetched via oEmbed
    };
  }
  
  // Behance profile URL
  if (url.includes('behance.net')) {
    const profileMatch = url.match(/behance\.net\/([a-zA-Z0-9_-]+)/);
    const id = profileMatch?.[1] || 'profile';
    return {
      platform: 'behance',
      id,
      embedUrl: url,
      thumbnailUrl: ''
    };
  }

  return null;
};

export const getMediaThumbnail = (item: { media_type: string; media_url: string; thumbnail_url?: string }): string => {
  // If custom thumbnail is set, use it (this is fetched from the platform)
  if (item.thumbnail_url) return item.thumbnail_url;

  // Try to parse as platform URL and extract thumbnail
  const mediaInfo = parseMediaUrl(item.media_url);
  if (mediaInfo?.thumbnailUrl) return mediaInfo.thumbnailUrl;

  // Fallback thumbnails based on media type (only if no platform-specific thumbnail found)
  if (item.media_type === 'video') {
    return 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&h=300&fit=crop';
  }
  if (item.media_type === 'audio') {
    return 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=300&fit=crop';
  }
  if (item.media_type === 'image') {
    return item.media_url;
  }

  return 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=300&fit=crop';
};
