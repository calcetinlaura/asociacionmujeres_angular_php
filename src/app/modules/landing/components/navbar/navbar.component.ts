
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RouterLinkActive } from '@angular/router';
@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.css',
    imports: [RouterLink, RouterLinkActive]
})
export class NavbarComponent implements OnInit {
  mainMenu: {
    defaultOptions: Array<any>;
    accessLink: Array<any>;
  } = { defaultOptions: [], accessLink: [] };

  customOptions: Array<any> = [];
  selectedMenuItem: string = '';

  setSelectedMenuItem(name: string): void {
    this.selectedMenuItem = name;
  }

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.setSelectedMenuItem('Programación');
    this.router.navigate(['/events']);
    this.mainMenu.defaultOptions = [
      // {
      //   name: 'Home',
      //   icon: 'uil uil-estate',
      //   router: ['/'],
      // },
      {
        name: 'Eventos',
        router: ['/', 'events'],
        title: 'Programación',
      },
      {
        name: 'Biblioteca',
        router: ['/', 'books'],
        title: 'Catálogo biblioteca',
      },
      {
        name: 'Filmoteca',
        router: ['/', 'movies'],
        title: 'Catálogo filmoteca',
      },
      {
        name: 'Piteras',
        router: ['/', 'piteras'],
        title: 'Catálogo Piteras',
      },
      {
        name: 'Recetas',
        router: ['/', 'recipes'],
        title: 'Recetario',
      },
      {
        name: 'Fotos',
        router: ['/', 'photos'],
        title: 'Fotografías',
      },
    ];
  }
}
