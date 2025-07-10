
import { Component, Input } from '@angular/core';
import { AgentModel } from 'src/app/core/interfaces/agent.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextIconComponent } from 'src/app/shared/components/text/text-icon/text-icon.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { PhoneFormatPipe } from 'src/app/shared/pipe/phoneFormat.pipe';

@Component({
    selector: 'app-modal-show-agent',
    imports: [
    TextBackgroundComponent,
    TextTitleComponent,
    TextSubTitleComponent,
    TextIconComponent,
    TextEditorComponent,
    PhoneFormatPipe
],
    templateUrl: './modal-show-agent.component.html',
    styleUrl: './modal-show-agent.component.css'
})
export class ModalShowAgentComponent {
  @Input() item!: AgentModel;
  type: TypeList = TypeList.Agents;

  ngOnInit(): void {}
}
