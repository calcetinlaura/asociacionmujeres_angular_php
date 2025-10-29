import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { ImgBrokenDirective } from 'src/app/shared/directives/img-broken.directive';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css'],
  imports: [
    CommonModule,
    ImgBrokenDirective,
    ItemImagePipe,
    TextBackgroundComponent,
    TextEditorComponent,
  ],
})
export class CardComponent {
  @Input() type: TypeList = TypeList.Books;
  @Input() item: any = {};
  readonly TypeList = TypeList;
  formattedStartDate: string | null = null;
  formattedEndDate: string | null = null;
  datesEquals = false;

  constructor() {}
  palette: string[] = [
    '#F3E8FF', // very light lilac
    '#EDE9FE', // lilac haze
    '#E9D5FF', // soft lilac
    '#E5D4FF', // pale mauve
    '#EADCF8', // lavender mist
    '#DCCEF4', // light lavender
    '#DFCCFF', // pastel lilac
    '#EBDDFB', // icy lilac
    '#CDB4DB', // soft mauve-lilac
    '#D8BFD8', // thistle
  ];

  private colorCache = new Map<string, string>();

  colorFor(item: { title?: string }): string {
    const key = item?.title ?? ''; // o solo title si es único
    if (!this.colorCache.has(key)) {
      const idx = this.hash(key) % this.palette.length;
      this.colorCache.set(key, this.palette[idx]);
    }
    return this.colorCache.get(key)!;
  }

  private hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  textColorFor(hex: string): string {
    const c = hex.replace('#', '');
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#111827' /* gris-900 */ : '#ffffff';
  }
}
