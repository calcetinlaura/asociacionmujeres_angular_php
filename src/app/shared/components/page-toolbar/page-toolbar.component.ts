// src/app/shared/components/page-toolbar/page-toolbar.component.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, Signal } from '@angular/core';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ColumnMenuComponent } from '../table/column-menu.component';

@Component({
  selector: 'app-page-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    ButtonIconComponent,
    InputSearchComponent,
    IconActionComponent,
    ColumnMenuComponent,
  ],
  templateUrl: './page-toolbar.component.html',
  styleUrls: ['./page-toolbar.component.css'],
})
export class PageToolbarComponent {
  @Input() addText = 'Nuevo';
  @Input() addIcon = 'uil-plus';
  @Input({ required: true }) columns!: ColumnModel[];
  @Input({ required: true }) visibility!: Signal<Record<string, boolean>>;

  @Output() add = new EventEmitter<void>();
  @Output() search = new EventEmitter<string>();
  @Output() print = new EventEmitter<void>();
  @Output() toggle = new EventEmitter<string>();
}
