import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { GeneralService } from 'src/app/shared/services/generalService.service';
@Component({
    selector: 'app-recipes-page',
    imports: [CommonModule, MatCheckboxModule, FormsModule],
    templateUrl: './settings-page.component.html',
    styleUrl: './settings-page.component.css'
})
export class SettingsPageComponent implements OnInit {
  private generalService = inject(GeneralService);

  years: number[] = [];
  editableYears: { [year: number]: boolean } = {};
  currentYear = this.generalService.currentYear;

  ngOnInit(): void {
    for (let y = 1995; y <= this.currentYear; y++) {
      this.years.push(y);
      this.editableYears[y] = false; // por defecto no editable
    }
  }
}
