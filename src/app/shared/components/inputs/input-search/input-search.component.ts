import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  OnInit,
  Output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject, tap } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-input-search',
  templateUrl: './input-search.component.html',
  styleUrls: ['./input-search.component.css'],
  imports: [CommonModule, FormsModule],
})
export class InputSearchComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  searchTerm: string = '';
  private debouncer: Subject<string> = new Subject<string>();

  // @Output() searchTriggered = new EventEmitter<string>();
  @Output() onValue = new EventEmitter<string>();
  @Output() onDebounce = new EventEmitter<string>();

  ngOnInit(): void {
    this.debouncer
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(300),
        tap((value) => {
          this.onDebounce.emit(value);
        })
      )
      .subscribe();
  }
  onKeyPress(searchTerm: string) {
    this.debouncer.next(searchTerm);
  }

  clearInput(): void {
    this.searchTerm = '';
    this.debouncer.next('');
    this.onDebounce.emit('');
  }
}
