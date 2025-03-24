import { Routes } from '@angular/router';
import { LayoutPageComponent } from './pages/layout-page/layout-page.component';
import { EventsPageComponent } from './pages/events/events-page.component';
import { BooksPageComponent } from './pages/books/books-page.component';
import { MoviesPageComponent } from './pages/movies/movies-page.component';
import { RecipesPageComponent } from './pages/recipes/recipes-page.component';
import { PiterasPageComponent } from './pages/piteras/piteras-page.component';
import { PartnersPageComponent } from './pages/partners/partners-page.component';
import { InvoicesPageComponent } from './pages/invoices/invoices-page.component';
import { SubsidiesPageComponent } from './pages/subsidies/subsidies-page.component';
import { CreditorsPageComponent } from './pages/creditors/creditors-page.component';
import { SettingsPageComponent } from './pages/settings/settings-page.component';
import { PlacesPageComponent } from './pages/places/places-page.component';

export const dashboardRoutes: Routes = [
  {
    path: '',
    component: LayoutPageComponent,
    children: [
      { path: 'events', component: EventsPageComponent },
      { path: 'books', component: BooksPageComponent },
      { path: 'movies', component: MoviesPageComponent },
      { path: 'recipes', component: RecipesPageComponent },
      { path: 'piteras', component: PiterasPageComponent },
      { path: 'partners', component: PartnersPageComponent },
      { path: 'places', component: PlacesPageComponent },
      { path: 'invoices', component: InvoicesPageComponent },
      { path: 'subsidies', component: SubsidiesPageComponent },
      { path: 'creditors', component: CreditorsPageComponent },
      { path: 'settings', component: SettingsPageComponent },
      { path: '**', redirectTo: 'events' },
    ],
  },
];
