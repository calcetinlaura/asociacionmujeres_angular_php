import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chart-card.component.html',
  styleUrls: ['./chart-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCardComponent {
  /** Título principal del card */
  @Input() title = '';

  /** Subtítulo opcional (debajo del título, alineado a la izquierda) */
  @Input() subtitle?: string;

  /** Alt de accesibilidad para el contenido (úsalo si el gráfico no es autoexplicativo) */
  @Input() ariaDescription?: string;
}
