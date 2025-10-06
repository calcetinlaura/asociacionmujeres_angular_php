import { Routes } from '@angular/router';
import { LandingPageComponent } from './landing-page.component';
import { BooksPageLandingComponent } from './pages/books/books-page-landing.component';
import { EventsPageLandingComponent } from './pages/events/events-page-landing.component';
import { MoviesPageLandingComponent } from './pages/movies/movies-page-landing.component';
import { PhotosPageLandingComponent } from './pages/photos/photos-page-landing.component';
import { PiterasPageLandingComponent } from './pages/piteras/piteras-page-landing.component';
import { PodcastsPageLandingComponent } from './pages/podcasts/podcasts-page-landing.component';
import { RecipesPageLandingComponent } from './pages/recipes/recipes-page-landing.component';

export const landingRoutes: Routes = [
  {
    path: '',
    component: LandingPageComponent,
    children: [
      { path: 'events/:id', component: EventsPageLandingComponent },
      { path: 'events', component: EventsPageLandingComponent },

      { path: 'books/:id', component: BooksPageLandingComponent },
      { path: 'books', component: BooksPageLandingComponent },

      { path: 'movies/:id', component: MoviesPageLandingComponent },
      { path: 'movies', component: MoviesPageLandingComponent },

      { path: 'piteras/:id', component: PiterasPageLandingComponent },
      { path: 'piteras', component: PiterasPageLandingComponent },

      { path: 'recipes/:id', component: RecipesPageLandingComponent },
      { path: 'recipes', component: RecipesPageLandingComponent },

      { path: 'podcasts/:id', component: PodcastsPageLandingComponent },
      { path: 'podcasts', component: PodcastsPageLandingComponent },

      { path: 'macroevents/:id', component: EventsPageLandingComponent },
      { path: 'macroevents', component: EventsPageLandingComponent },

      { path: 'photos', component: PhotosPageLandingComponent },

      { path: '', pathMatch: 'full', redirectTo: 'events' },
      { path: '**', redirectTo: 'events' },
    ],
  },
];
