import { environments } from 'src/environments/environments';
import { buildShareUrl, localISODate, pickShareDate } from './share-url.util';

export function computeMultiShare(
  date: Date | null,
  events: any[],
  path: string
) {
  const d = pickShareDate(date, events);
  const url = d
    ? buildShareUrl({
        base: environments.publicBaseUrl,
        path: path?.startsWith('/') ? path : `/${path || 'events'}`,
        params: { multiDate: localISODate(d) },
      })
    : '';
  return { date: d, url };
}
