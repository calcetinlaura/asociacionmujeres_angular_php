import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImgBrokenDirective } from 'src/app/shared/directives/img-broken.directive';
import { TypeList } from 'src/app/core/models/general.model';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextBorderComponent } from 'src/app/shared/components/text/text-border/text-border.component';
import { TextLinkComponent } from 'src/app/shared/components/text/text-link/text-link.component';

@Component({
  selector: 'app-card-player',
  standalone: true,
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
export class CardPlayerComponent implements OnInit {
  @Input() type: TypeList = TypeList.Books;
  @Input() item: any = {};
  typeList = TypeList;
  formattedStartDate: string | null = null;
  formattedEndDate: string | null = null;
  datesEquals = false;

  constructor() {}

  ngOnInit(): void {
    if (this.type === this.typeList.Events) {
      const startDate = new Date(this.item.start);
      const endDate = new Date(this.item.end);
      if (this.item.start === this.item.end) {
        this.datesEquals = true;
      }
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      this.formattedStartDate = startDate.toLocaleDateString('es-ES', options);
      this.formattedEndDate = endDate.toLocaleDateString('es-ES', options);
    }
  }
}
