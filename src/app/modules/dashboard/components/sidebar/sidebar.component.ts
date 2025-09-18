import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';

interface MenuOption {
  name: string;
  icon: string;
  router: string[];
  query?: any;
}

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SideBarComponent implements OnInit {
  homeMenu: MenuOption[] = [];
  eventsMenu: MenuOption[] = [];
  mainMenu: MenuOption[] = [];
  customOptions: MenuOption[] = [];
  accountingOptions: MenuOption[] = [];
  footerOptions: MenuOption[] = [];

  ngOnInit(): void {
    this.homeMenu = [
      {
        name: 'Home',
        icon: 'uil-home',
        router: ['/dashboard/home'],
      },
    ];
    this.eventsMenu = [
      {
        name: 'Macroeventos',
        icon: 'uil-calculator-alt',
        router: ['/dashboard/macroevents'],
      },
      { name: 'Eventos', icon: 'uil-ticket', router: ['/dashboard/events'] },
    ];
    this.mainMenu = [
      { name: 'Biblioteca', icon: 'uil-book', router: ['/dashboard/books'] },
      { name: 'Filmoteca', icon: 'uil-video', router: ['/dashboard/movies'] },
      { name: 'Recetas', icon: 'uil-utensils', router: ['/dashboard/recipes'] },
      {
        name: 'Piteras',
        icon: 'uil uil-book',
        router: ['/dashboard/piteras'],
      },
      {
        name: 'Podcasts',
        icon: 'uil uil-microphone',
        router: ['/dashboard/podcasts'],
      },
      {
        name: 'Articulos',
        icon: 'uil-newspaper',
        router: ['/dashboard/articles'],
      },
    ];

    this.customOptions = [
      {
        name: 'Socias',
        icon: 'uil-users-alt',
        router: ['/dashboard/partners'],
      },
      {
        name: 'Espacios',
        icon: 'uil-building',
        router: ['/dashboard/places'],
      },
      {
        name: 'Agentes',
        icon: 'uil-comments',
        router: ['/dashboard/agents'],
      },
    ];
    this.accountingOptions = [
      {
        name: 'Proyectos',
        icon: 'uil uil-pen',
        router: ['/dashboard/projects'],
      },
      {
        name: 'Subvenciones',
        icon: 'uil-euro-circle',
        router: ['/dashboard/subsidies'],
      },
      {
        name: 'Contabilidad',
        icon: 'uil-calculator',
        router: ['/dashboard/invoices'],
      },
      {
        name: 'Acreedores/as',
        icon: 'uil-plus-square',
        router: ['/dashboard/creditors'],
      },
    ];

    this.footerOptions = [
      { name: 'Ajustes', icon: 'uil-cog', router: ['/dashboard/settings'] },
      { name: 'Cerrar sesión', icon: 'uil-signout', router: ['/logout'] },
    ];
  }
}
