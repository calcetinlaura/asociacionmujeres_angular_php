import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AgentModel } from 'src/app/core/interfaces/agent.interface';

@Component({
  selector: 'app-agent-array-control',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './array-agents.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class AgentArrayControlComponent {
  @Input() formArray!: FormArray;
  @Input() agents: AgentModel[] = [];
  @Input() label: string = 'Agente';
  @Output() remove = new EventEmitter<number>();

  getFormGroupAt(index: number): FormGroup {
    return this.formArray.at(index) as FormGroup;
  }
}
