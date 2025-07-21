import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextBorderComponent } from 'src/app/shared/components/text/text-border/text-border.component';
import { TextLinkComponent } from 'src/app/shared/components/text/text-link/text-link.component';
import { ImgBrokenDirective } from 'src/app/shared/directives/img-broken.directive';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';

@Component({
  selector: 'app-card-player',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css'],
  imports: [
    CommonModule,
    ImgBrokenDirective,
    ItemImagePipe,
    TextBorderComponent,
    TextBackgroundComponent,
    TextLinkComponent,
  ],
})
export class CardPlayerComponent {
  @Input() type: TypeList = TypeList.Books;
  @Input() item: any = {};
  typeList = TypeList;
  formattedStartDate: string | null = null;
  formattedEndDate: string | null = null;
  datesEquals = false;

  constructor() {}
}
