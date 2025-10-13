import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SafeHtmlPipe } from '../../../../shared/pipe/safe-html.pipe';
@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  imports: [RouterLink, RouterLinkActive, SafeHtmlPipe],
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

  constructor() {}

  ngOnInit(): void {
    this.setSelectedMenuItem('Programación');
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
        title: `
    <span class="block text-[12px] leading-tight opacity-80">Catálogo</span>
    <span class="block ">Biblioteca</span>
  `,
      },
      {
        name: 'Filmoteca',
        router: ['/', 'movies'],
        title: `
    <span class="block text-[12px] leading-tight opacity-80">Catálogo</span>
    <span class="block ">Filmoteca</span>
  `,
      },
      {
        name: 'Piteras',
        router: ['/', 'piteras'],
        title: `
    <span class="block text-[12px] leading-tight opacity-80">Catálogo</span>
    <span class="block ">Piteras</span>
  `,
      },
      {
        name: 'Podcasts',
        router: ['/', 'podcasts'],
        title: 'Podcasts',
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
