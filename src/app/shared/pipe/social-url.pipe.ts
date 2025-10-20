import { Pipe, PipeTransform } from '@angular/core';
import { SocialLink, buildSocialUrl } from '../utils/social.utils';

@Pipe({ name: 'socialUrl', standalone: true })
export class SocialUrlPipe implements PipeTransform {
  transform(soc: SocialLink | null | undefined): string {
    return soc ? buildSocialUrl(soc) : '#';
  }
}
