import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GeneralService {
  transformTime(value: any): { time: string } {
    let time = value.toString();
    time = time.slice(0, -3);
    return { time };
  }
  currentYear = new Date().getFullYear();

  loadYears(currentYear: number, sinceYear: number): number[] {
    const years = [];
    for (let year = sinceYear; year <= currentYear; year++) {
      years.push(year);
    }
    return years;
  }
}
