import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, tap } from 'rxjs';
import { CreditorModel } from 'src/app/core/interfaces/creditor.interface';
import { CreditorsService } from 'src/app/core/services/creditors.services';

@Component({
  standalone: true,
  selector: 'app-autocomplete',
  templateUrl: './autocomplete.component.html',
  styleUrls: ['./autocomplete.component.css'],
  imports: [CommonModule],
})
export class InputSearchComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  creditors = new BehaviorSubject<CreditorModel[]>([]); // Cambia según tu lógica
  filteredCreditors: CreditorModel[] = [];
  searchControl = new FormControl(); // Control de formulario para la búsqueda

  constructor(private creditorsService: CreditorsService) {}

  ngOnInit(): void {
    // Cargar la lista de acreedores desde un servicio
    this.loadCreditors();

    // Escuchar cambios en el control de búsqueda
    this.searchControl.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((value) => {
          this.categoryFilterCreditors(value);
        })
      )
      .subscribe();
  }

  loadCreditors(): void {
    this.creditorsService
      .getCreditors()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditors: CreditorModel[]) => {
          this.creditors.next(creditors); // Actualiza la lista de acreedores
          this.filteredCreditors = creditors; // Asigna el valor actualizado a filteredCreditors
        })
      )
      .subscribe();
  }

  categoryFilterCreditors(value: string): void {
    const filterValue = value.toLowerCase();
    this.filteredCreditors = this.creditors
      .getValue()
      .filter((creditor) =>
        creditor.company.toLowerCase().includes(filterValue)
      );
  }

  creditorSelected(creditor: CreditorModel): void {
    this.searchControl.setValue(creditor.company); // Ajustar el valor del campo de búsqueda
    this.filteredCreditors = []; // Limpiar la lista de sugerencias
  }
}
