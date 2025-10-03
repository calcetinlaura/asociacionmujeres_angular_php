import { AgentsModelFullData } from 'src/app/core/interfaces/agent.interface';
import { BookModel } from 'src/app/core/interfaces/book.interface';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { MacroeventModelFullData } from 'src/app/core/interfaces/macroevent.interface';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';

export const isEvent = (x: unknown): x is EventModelFullData =>
  !!x && typeof x === 'object' && 'periodic_id' in x;

export const isMacroevent = (x: unknown): x is MacroeventModelFullData =>
  !!x && typeof x === 'object' && 'events' in x;

export const isBook = (x: unknown): x is BookModel =>
  !!x && typeof x === 'object' && 'author' in x;

export const isMovie = (x: unknown): x is MovieModel =>
  !!x && typeof x === 'object' && 'director' in x;

export const isAgent = (x: unknown): x is AgentsModelFullData =>
  !!x && typeof x === 'object' && 'category' in x;
