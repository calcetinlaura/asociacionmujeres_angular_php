import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import(`./modules/auth/auth.routes`).then((m) => m.authRoutes),
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import(`./modules/dashboard/dashboard.routes`).then(
        (m) => m.dashboardRoutes
      ),
    // canActivate: [SessionGuard], // Protege el dashboard
  },
  {
    path: '',
    loadChildren: () =>
      import(`./modules/landing/landing.routes`).then((m) => m.landingRoutes),
    // canActivate: [SessionGuard],
    // canActivate: [false],
  },
];
