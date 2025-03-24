import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-recipes-page',
  standalone: true,
  imports: [CommonModule, MatCheckboxModule, FormsModule],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.css',
})
export class SettingsPageComponent implements OnInit {
  years: number[] = [];
  editableYears: { [year: number]: boolean } = {};

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    for (let y = 1995; y <= currentYear; y++) {
      this.years.push(y);
      this.editableYears[y] = false; // por defecto no editable
    }
  }
}
