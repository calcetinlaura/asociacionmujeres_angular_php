import { Component, Input } from '@angular/core';
import { PodcastModel } from 'src/app/core/interfaces/podcast.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';

@Component({
  selector: 'app-modal-show-podcast',
  imports: [TextTitleComponent, TextSubTitleComponent],
  templateUrl: './modal-show-podcast.component.html',
})
export class ModalShowPodcastComponent {
  @Input() item!: PodcastModel;
  typeModal: TypeList = TypeList.Podcasts;
}
