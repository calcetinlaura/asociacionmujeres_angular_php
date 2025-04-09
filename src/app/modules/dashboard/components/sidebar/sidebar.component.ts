import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

interface MenuOption {
  name: string;
  icon: string;
  router: string[];
  query?: any;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SideBarComponent implements OnInit {
  mainMenu: MenuOption[] = [];
  customOptions: MenuOption[] = [];
  accountingOptions: MenuOption[] = [];
  footerOptions: MenuOption[] = [];

  ngOnInit(): void {
    this.mainMenu = [
      {
        name: 'Macroeventos',
        icon: 'uil-calculator-alt',
        router: ['/dashboard/macroevents'],
      },
      { name: 'Eventos', icon: 'uil-ticket', router: ['/dashboard/events'] },
      { name: 'Biblioteca', icon: 'uil-book', router: ['/dashboard/books'] },
      { name: 'Filmoteca', icon: 'uil-video', router: ['/dashboard/movies'] },
      { name: 'Recetas', icon: 'uil-utensils', router: ['/dashboard/recipes'] },
      {
        name: 'Piteras',
        icon: 'uil-newspaper',
        router: ['/dashboard/piteras'],
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
        name: 'Contabilidad',
        icon: 'uil-calculator',
        router: ['/dashboard/invoices'],
      },
      {
        name: 'Subvenciones',
        icon: 'uil-euro-circle',
        router: ['/dashboard/subsidies'],
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
