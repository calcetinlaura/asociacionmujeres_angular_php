import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { FitTextDirective } from 'src/app/shared/directives/fit-text.directive';
import { ImgBrokenDirective } from 'src/app/shared/directives/img-broken.directive';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';
import {
  DictTranslatePipe,
  DictType,
} from '../../../../../shared/pipe/dict-translate.pipe';

@Component({
  selector: 'app-card-events',
  templateUrl: './card-events.component.html',
  styleUrls: ['./card-events.component.css'],
  imports: [
    CommonModule,
    ImgBrokenDirective,
    ItemImagePipe,
    TextBackgroundComponent,
    FitTextDirective,
    DictTranslatePipe,
  ],
})
export class CardEventsComponent {
  @Input() type: TypeList = TypeList.Books;
  @Input() item: any = {};
  typeList = TypeList;
  formattedStartDate: string | null = null;
  formattedEndDate: string | null = null;
  datesEquals = false;
  isMobile = window.matchMedia('(max-width: 450px)').matches;
  dictType = DictType;

  constructor(private bo: BreakpointObserver) {
    this.bo.observe(['(max-width: 450px)']).subscribe((res) => {
      this.isMobile = res.matches;
    });
  }
  //Esta función borra la hora y se queda solo con día, mes y año.
  private toDateOnly(
    d: Date | string | number | null | undefined
  ): Date | null {
    if (d == null) return null;
    const x = new Date(d);
    if (isNaN(+x)) return null;
    return new Date(x.getFullYear(), x.getMonth(), x.getDate());
  }

  //Compara dos fechas y mira si tienen el mismo día, mes y año.
  private sameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
  //Mira la fecha d, le borra la hora (con toDateOnly) y compara con la ficha de hoy.Si d es hoy, devuelve verdadero; si no, falso.
  isToday(d: Date | string | number | null | undefined): boolean {
    const dd = this.toDateOnly(d);
    const today = this.toDateOnly(new Date())!;
    return !!dd && this.sameDay(dd, today);
  }

  // Decide si en la primera cajita del rango hay que escribir “HOY”. Dice verdadero cuando: start es hoy, o start es antes de hoy y end es después de hoy (o sea, hoy está dentro del tramo).
  //Si falta alguna fecha, devuelve falso.
  shouldShowHoyForStart(
    start: Date | string | number | null | undefined,
    end: Date | string | number | null | undefined
  ): boolean {
    const s = this.toDateOnly(start);
    const e = this.toDateOnly(end);
    const today = this.toDateOnly(new Date())!;
    if (!s || !e) return false;
    return this.sameDay(s, today) || (s < today && e > today);
  }

  // Decide si hay que quitar el rango y mostrar solo una cajita con “HOY”.
  //Devuelve verdadero cuando end es hoy y start es pasado
  shouldCollapseToOnlyHoy(
    end: Date | string | number | null | undefined
  ): boolean {
    const e = this.toDateOnly(end);
    const today = this.toDateOnly(new Date())!;
    return !!e && this.sameDay(e, today);
  }

  isTodayOrFuture(d: Date | string | number | null | undefined): boolean {
    const dd = this.toDateOnly(d);
    if (!dd) return false;
    const today = this.toDateOnly(new Date())!;
    return dd >= today;
  }
  /**
   * Si hay alguna fecha >= hoy, devolvemos solo las >= hoy.
   * Si no hay ninguna >= hoy, devolvemos todas (todas son pasadas).
   */
  getPeriodicEventsToShow(
    events: Array<{ start: Date | string | number }> | null | undefined
  ) {
    if (!events?.length) return [];
    const todayOrFutureExists = events.some((e) =>
      this.isTodayOrFuture(e.start)
    );
    return todayOrFutureExists
      ? events.filter((e) => this.isTodayOrFuture(e.start))
      : events;
  }
}
