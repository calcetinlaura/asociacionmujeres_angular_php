import { Component, Input, OnInit } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-no-results',
  templateUrl: './no-results.component.html',
  styleUrls: ['./no-results.component.css'],
})
export class NoResultsComponent {
  @Input() text: string = '';
  constructor() {}
}
