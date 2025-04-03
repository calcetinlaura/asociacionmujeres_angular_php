import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { EditorModule } from '@tinymce/tinymce-angular';
import townsData from 'data/towns.json';
import { filter, tap } from 'rxjs';
import { CreditorsFacade } from 'src/app/application/creditors.facade';
import {
  categoryFilterCreditors,
  CreditorModel,
} from 'src/app/core/interfaces/creditor.interface';
@Component({
  selector: 'app-form-creditor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EditorModule],
  templateUrl: './form-creditor.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormCreditorComponent {
  private creditorsFacade = inject(CreditorsFacade);
  private destroyRef = inject(DestroyRef);

  @Input() itemId!: number;
  @Output() sendFormCreditor = new EventEmitter<{
    itemId: number;
    newCreditorData: CreditorModel;
  }>();

  creditorData: any;
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar acreedor/a';
  buttonAction: string = 'Guardar';
  categoryFilterCreditors = categoryFilterCreditors;
  formCreditor = new FormGroup({
    company: new FormControl('', [Validators.required]),
    cif: new FormControl(''),
    contact: new FormControl(''),
    phone: new FormControl(''),
    email: new FormControl(''),
    province: new FormControl(''),
    town: new FormControl(''),
    address: new FormControl(''),
    post_code: new FormControl(''),
    category: new FormControl(''),
    key_words: new FormControl(''),
    observations: new FormControl(''),
  });
  provincias: {
    label: string;
    code: string;
    towns: { label: string; code: string }[];
  }[] = [];
  municipios: { label: string; code: string }[] = [];

  private creditor_id!: number;

  ngOnInit(): void {
    this.provincias = townsData
      .flatMap((region) => region.provinces)
      .sort((a, b) => a.label.localeCompare(b.label));
    if (this.itemId) {
      this.creditorsFacade.loadCreditorById(this.itemId);
      this.creditorsFacade.selectedCreditor$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((creditor: CreditorModel | null) => creditor !== null),
          tap((creditor: CreditorModel | null) => {
            if (creditor) {
              // 🔹 Primero actualizamos los municipios basándonos en la provincia recibida
              const province = this.provincias.find(
                (p) => p.label === creditor.province
              );
              this.municipios = province?.towns ?? [];

              // 🔹 Luego seteamos los valores del formulario
              this.formCreditor.patchValue(creditor);

              this.creditor_id = creditor.id;
              this.titleForm = 'Editar Acreedor/a';
              this.buttonAction = 'Guardar cambios';
            }
          })
        )
        .subscribe();
    }
  }

  onProvinceChange(): void {
    const selectedProvince = this.formCreditor.value.province;
    const province = this.provincias.find((p) => p.label === selectedProvince);
    this.municipios = province?.towns ?? [];
    this.formCreditor.patchValue({ town: '' }); // limpia el municipio
  }

  onSendFormCreditor(): void {
    if (this.formCreditor.invalid) {
      this.submitted = true;
      console.log('Formulario inválido', this.formCreditor.errors);
      return;
    }

    // Convertimos el formulario a un objeto JSON (CreditorModel)
    const newCreditorData: CreditorModel = {
      id: this.creditor_id || 0, // Si es nuevo, se envía 0 o se omite
      company: this.formCreditor.value.company!,
      cif: this.formCreditor.value.cif || '',
      contact: this.formCreditor.value.contact || '',
      phone: this.formCreditor.value.phone!,
      email: this.formCreditor.value.email || '',
      province: this.formCreditor.value.province || '',
      town: this.formCreditor.value.town || '',
      address: this.formCreditor.value.address || '',
      post_code: this.formCreditor.value.post_code || '',
      category: this.formCreditor.value.category || '',
      key_words: this.formCreditor.value.key_words || '',
      observations: this.formCreditor.value.observations || '',
    };

    this.sendFormCreditor.emit({
      itemId: this.itemId,
      newCreditorData: newCreditorData,
    });
  }
}
