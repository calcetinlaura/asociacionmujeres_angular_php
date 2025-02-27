import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class SideBarComponent implements OnInit {
  mainMenu: {
    defaultOptions: Array<any>;
    accessLink: Array<any>;
  } = { defaultOptions: [], accessLink: [] };

  customOptions: Array<any> = [];

  constructor() {}

  ngOnInit(): void {
    this.mainMenu.defaultOptions = [
      {
        name: 'Eventos',
        icon: 'uil uil-ticket',
        router: ['/dashboard/', 'events'],
      },

      {
        name: 'Biblioteca',
        icon: 'uil uil-book',
        router: ['/dashboard/', 'books'],
      },

      {
        name: 'Filmoteca',
        icon: 'uil uil-video',
        router: ['/dashboard/', 'movies'],
      },

      {
        name: 'Recetas',
        icon: 'uil uil-utensils',
        router: ['/dashboard/', 'recipes'],
      },

      {
        name: 'Piteras',
        icon: 'uil uil-newspaper',
        router: ['/dashboard/', 'piteras'],
      },
    ];

    this.customOptions = [
      {
        name: 'Socias',
        icon: 'uil uil-users-alt',
        router: ['/dashboard/', 'partners'],
      },
      {
        name: 'Contabilidad',
        icon: 'uil uil-calculator',
        router: ['/dashboard/', 'invoices'],
      },
      {
        name: 'Subvenciones',
        icon: 'uil uil-euro-circle',
        router: ['/dashboard/', 'subsidies'],
      },
      {
        name: 'Acreedores/as',
        icon: 'uil-plus-square',
        router: ['/dashboard/', 'creditors'],
      },
    ];
  }
}
