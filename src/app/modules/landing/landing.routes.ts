import { Routes } from '@angular/router';
import { EventsPageLandingComponent } from './pages/events/pages/events-page-landing.component';
import { BooksPageLandingComponent } from './pages/books/pages/books-page-landing.component';
import { MoviesPageLandingComponent } from './pages/movies/pages/movies-page-landing.component';
import { RecipesPageLandingComponent } from './pages/recipes/pages/recipes-page-landing.component';
import { LandingPageComponent } from './landing-page.component';
import { PiterasPageLandingComponent } from './pages/piteras/pages/piteras-page-landing.component';
import { PhotosPageLandingComponent } from './pages/photos/photos-page-landing.component';

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
      { path: 'photos', component: PhotosPageLandingComponent },
      { path: '**', redirectTo: 'events' },
    ],
  },
];
