import { Component, OnInit } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  standalone: true,
  selector: 'app-spinner-loading',
  templateUrl: './spinner-loading.component.html',
  styleUrls: ['./spinner-loading.component.css'],
  imports: [MatProgressSpinnerModule],
})
export class SpinnerLoadingComponent {
  constructor() {}

  ngOnInit() {}
}
