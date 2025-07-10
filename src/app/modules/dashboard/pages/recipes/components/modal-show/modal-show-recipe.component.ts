import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RecipeModel } from 'src/app/core/interfaces/recipe.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextBorderComponent } from 'src/app/shared/components/text/text-border/text-border.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';

@Component({
    selector: 'app-modal-show-recipe',
    imports: [
        CommonModule,
        TextBackgroundComponent,
        TextBorderComponent,
        TextTitleComponent,
        TextSubTitleComponent,
        TextEditorComponent,
    ],
    templateUrl: './modal-show-recipe.component.html'
})
export class ModalShowRecipeComponent {
  @Input() item!: RecipeModel;
  type: TypeList = TypeList.Recipes;
}
