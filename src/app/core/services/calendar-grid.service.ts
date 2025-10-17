import { Injectable } from '@angular/core';
import { isOnDate, toIsoDate } from 'src/app/shared/utils/events.utils';

@Injectable({ providedIn: 'root' })
export class CalendarGridService {
  buildMonthGrid(
    year: number,
    month: number,
    events: any[]
  ): { date: Date | null; events: any[] }[] {
    const out: { date: Date | null; events: any[] }[] = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Lunes=0

    for (let i = 0; i < startDow; i++) out.push({ date: null, events: [] });

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const iso = toIsoDate(date);
      const dayEvents = events.filter((e) => isOnDate(iso, e));
      out.push({ date, events: dayEvents });
    }
    return out;
  }
}
