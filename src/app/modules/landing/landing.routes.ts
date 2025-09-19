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
      { path: 'events', component: EventsPageLandingComponent },
      { path: 'books', component: BooksPageLandingComponent },
      { path: 'movies', component: MoviesPageLandingComponent },
      { path: 'piteras', component: PiterasPageLandingComponent },
      { path: 'recipes', component: RecipesPageLandingComponent },
      { path: 'podcasts', component: PodcastsPageLandingComponent },
      { path: 'photos', component: PhotosPageLandingComponent },
      { path: '', pathMatch: 'full', redirectTo: 'events' },
      { path: '**', redirectTo: 'events' },
    ],
  },
];
