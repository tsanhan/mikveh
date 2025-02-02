import { Pipe, PipeTransform } from '@angular/core';
import n2words from 'n2words/lib/n2words.mjs';

@Pipe({
  name: 'translateHeb',
  standalone: true
})
export class TranslateHebPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    const nw = n2words(value, {lang: 'fr'})

    return nw;
  }

}
