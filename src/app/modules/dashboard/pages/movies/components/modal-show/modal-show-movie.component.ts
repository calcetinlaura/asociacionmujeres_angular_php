import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';

@Component({
    selector: 'app-modal-show-movie',
    imports: [
        CommonModule,
        TextBackgroundComponent,
        TextTitleComponent,
        TextSubTitleComponent,
        TextEditorComponent,
    ],
    templateUrl: './modal-show-movie.component.html',
    styleUrls: ['./modal-show-movie.component.css']
})
export class ModalShowMovieComponent {
  @Input() item!: MovieModel;
  type: TypeList = TypeList.Movies;
}
