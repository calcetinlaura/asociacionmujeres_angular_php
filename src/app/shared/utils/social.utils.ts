// Tipos (o impórtalos desde tu interface)
export type SocialNetwork =
  | 'instagram'
  | 'facebook'
  | 'x'
  | 'tiktok'
  | 'youtube'
  | 'threads'
  | 'bluesky'
  | 'linkedin';

export interface SocialLink {
  network: SocialNetwork;
  url?: string;
  handle?: string;
}

export const SOCIAL_ICON_MAP: Record<SocialNetwork, string> = {
  instagram: 'uil uil-instagram',
  facebook: 'uil uil-facebook-f',
  x: 'uil uil-twitter', // fallback para X
  tiktok: 'uil uil-music', // usa 'uil-tiktok' si lo tienes
  youtube: 'uil uil-youtube',
  threads: 'uil uil-at',
  bluesky: 'uil uil-cloud',
  linkedin: 'uil uil-linkedin',
};

export function getSocialIconClass(net: SocialNetwork): string {
  return SOCIAL_ICON_MAP[net] ?? 'uil uil-external-link-alt';
}

export function buildSocialUrl(soc: SocialLink): string {
  const raw = (soc?.url || soc?.handle || '').trim();
  if (!raw) return '#';
  if (/^https?:\/\//i.test(raw)) return raw; // URL completa
  if (/^\/\//.test(raw)) return `https:${raw}`; // //domain/path
  const handle = raw.replace(/^@/, ''); // limpia @

  switch (soc.network) {
    case 'instagram':
      return `https://instagram.com/${handle}`;
    case 'facebook':
      return `https://facebook.com/${handle}`;
    case 'x':
      return `https://x.com/${handle}`;
    case 'tiktok':
      return `https://tiktok.com/@${handle}`;
    case 'youtube':
      return handle.startsWith('@')
        ? `https://youtube.com/${handle}`
        : `https://youtube.com/${handle}`;
    case 'threads':
      return `https://www.threads.net/@${handle}`;
    case 'bluesky':
      return `https://bsky.app/profile/${handle}`;
    case 'linkedin':
      return handle.startsWith('in/') || handle.startsWith('company/')
        ? `https://www.linkedin.com/${handle}`
        : `https://www.linkedin.com/in/${handle}`;
    default:
      return `https://${handle}`;
  }
}
