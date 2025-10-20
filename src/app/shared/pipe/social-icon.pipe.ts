import { Pipe, PipeTransform } from '@angular/core';
import { SocialNetwork, getSocialIconClass } from '../utils/social.utils';

@Pipe({ name: 'socialIcon', standalone: true })
export class SocialIconPipe implements PipeTransform {
  transform(net: SocialNetwork | null | undefined): string {
    return net ? getSocialIconClass(net) : 'uil uil-external-link-alt';
  }
}
