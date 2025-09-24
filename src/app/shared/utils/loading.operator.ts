import { Observable, of } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';

export type LoadState<T> = {
  loading: boolean;
  data: T | null;
  error: any | null;
};

export function withLoading<T>(
  source$: Observable<T>
): Observable<LoadState<T>> {
  return source$.pipe(
    map((data) => ({ loading: false, data, error: null })),
    catchError((error) => of({ loading: false, data: null, error })),
    startWith({ loading: true, data: null, error: null })
  );
}
