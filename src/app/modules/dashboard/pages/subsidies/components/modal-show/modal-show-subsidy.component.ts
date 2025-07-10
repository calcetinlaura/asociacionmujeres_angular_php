import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SubsidyModel } from 'src/app/core/interfaces/subsidy.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';

@Component({
    selector: 'app-modal-show-subsidy',
    imports: [
        CommonModule,
        TextBackgroundComponent,
        TextTitleComponent,
        TextEditorComponent,
    ],
    templateUrl: './modal-show-subsidy.component.html'
})
export class ModalShowSubsidyComponent {
  @Input() item!: SubsidyModel;
  type: TypeList = TypeList.Subsidies;
}
