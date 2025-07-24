import { Routes } from '@angular/router';
import { AgentsPageComponent } from './pages/agents/agents-page.component';
import { ArticlesPageComponent } from './pages/articles/articles-page.component';
import { BooksPageComponent } from './pages/books/books-page.component';
import { CreditorsPageComponent } from './pages/creditors/creditors-page.component';
import { EventsPageComponent } from './pages/events/events-page.component';
import { HomePageComponent } from './pages/home/home-page.component';
import { InvoicesPageComponent } from './pages/invoices/invoices-page.component';
import { LayoutPageComponent } from './pages/layout-page/layout-page.component';
import { MacroeventsPageComponent } from './pages/macroevents/macroevents-page.component';
import { MoviesPageComponent } from './pages/movies/movies-page.component';
import { PartnersPageComponent } from './pages/partners/partners-page.component';
import { PiterasPageComponent } from './pages/piteras/piteras-page.component';
import { PlacesPageComponent } from './pages/places/places-page.component';
import { PodcastsPageComponent } from './pages/podcasts/podcasts-page.component';
import { ProjectsPageComponent } from './pages/projects/projects-page.component';
import { RecipesPageComponent } from './pages/recipes/recipes-page.component';
import { SettingsPageComponent } from './pages/settings/settings-page.component';
import { SubsidiesPageComponent } from './pages/subsidies/subsidies-page.component';

export const dashboardRoutes: Routes = [
  {
    path: '',
    component: LayoutPageComponent,
    children: [
      { path: 'home', component: HomePageComponent },
      { path: 'events', component: EventsPageComponent },
      { path: 'macroevents', component: MacroeventsPageComponent },
      { path: 'books', component: BooksPageComponent },
      { path: 'movies', component: MoviesPageComponent },
      { path: 'recipes', component: RecipesPageComponent },
      { path: 'piteras', component: PiterasPageComponent },
      { path: 'podcasts', component: PodcastsPageComponent },
      { path: 'articles', component: ArticlesPageComponent },
      { path: 'partners', component: PartnersPageComponent },
      { path: 'places', component: PlacesPageComponent },
      { path: 'projects', component: ProjectsPageComponent },
      { path: 'subsidies', component: SubsidiesPageComponent },
      { path: 'invoices', component: InvoicesPageComponent },
      { path: 'creditors', component: CreditorsPageComponent },
      { path: 'agents', component: AgentsPageComponent },
      { path: 'settings', component: SettingsPageComponent },
      { path: '**', redirectTo: 'events' },
    ],
  },
];
