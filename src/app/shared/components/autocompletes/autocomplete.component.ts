import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { combineLatest, map, startWith } from 'rxjs';
import { CreditorsFacade } from 'src/app/application/creditors.facade';
import { CreditorModel } from 'src/app/core/interfaces/creditor.interface';

@Component({
  standalone: true,
  selector: 'app-autocomplete',
  templateUrl: './autocomplete.component.html',
  styleUrls: ['./autocomplete.component.css'],
  imports: [CommonModule, ReactiveFormsModule],
})
export class InputSearchComponent implements OnInit {
  private readonly creditorsFacade = inject(CreditorsFacade);

  // Control del input
  readonly searchControl = new FormControl<string>('');

  // Resultado filtrado (stream reactivo)
  readonly filteredCreditors$ = combineLatest([
    this.creditorsFacade.creditors$,
    this.searchControl.valueChanges.pipe(startWith('')),
  ]).pipe(
    map(([creditors, value]) => {
      const filterValue = (value ?? '').toLowerCase().trim();
      if (!filterValue) return creditors ?? [];
      return creditors.filter((c) =>
        c.company.toLowerCase().includes(filterValue)
      );
    })
  );

  ngOnInit(): void {
    // Cargamos todos los acreedores al iniciar
    this.creditorsFacade.loadAllCreditors();
    console.log('Acreedores cargados');
  }

  // ───────────────────────────────
  // Selección de acreedor
  // ───────────────────────────────
  creditorSelected(creditor: CreditorModel): void {
    if (!creditor) return;
    this.searchControl.setValue(creditor.company, { emitEvent: false });
  }
}
