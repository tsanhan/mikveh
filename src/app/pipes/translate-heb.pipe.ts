import { inject, Pipe, PipeTransform } from '@angular/core';
import { LocationService } from '../services/location.service';

@Pipe({
  name: 'translateHeb',
  standalone: true,
})
export class TranslateHebPipe implements PipeTransform {
  location = inject(LocationService);

  hebrewOnes: string[] = [
    '',
    'אחת',
    'שתיים',
    'שלוש',
    'ארבע',
    'חמש',
    'שש',
    'שבע',
    'שמונה',
    'תשע',
  ];
  hebrewTens: string[] = [
    '',
    'עשר',
    'עשרים',
    'שלושים',
    'ארבעים',
    'חמישים',
    'שישים',
    'שבעים',
    'שמונים',
    'תשעים',
  ];
  hebrewHundreds: string[] = [
    '',
    'מאה',
    'מאתיים',
    'שלוש מאות',
    'ארבע מאות',
    'חמש מאות',
    'שש מאות',
    'שבע מאות',
    'שמונה מאות',
    'תשע מאות',
  ];
  hebrewThousands: string[] = ['', 'אלף', 'אלפיים'];
  hebrewFractions: Record<string, string> = {
    '0.5': 'חצי',
    '1/2': 'חצי',
    '1/3': 'שליש',
    '2/3': 'שני שלישים',
    '1/4': 'רבע',
    '3/4': 'שלושת רבעי',
  };
  transform(value: unknown, ...args: unknown[]): unknown {
    const nw = this.translateHours(value as number);
    return nw;
  }

  translateHours(num: number): string {
    if (num === 0.5) return 'חצי שעה';
    if (num === 0.25) return 'רבע שעה';

    const integerPart = Math.floor(num);
    const fractionalPart = num % 1;

    let integerStr = '';
    switch (integerPart) {
      case 0:
        break;
      case 1:
        integerStr = fractionalPart !== 0 ? 'שעה' : 'שעה אחת';
        break;
      case 2:
        integerStr = 'שעתיים';
        break;
      default:
        integerStr = `${this.getFeminineNumber(integerPart)} שעות`;
    }

    let fractionalStr = '';
    if (fractionalPart === 0.5) {
      fractionalStr = 'וחצי';
    } else if (fractionalPart === 0.25) {
      fractionalStr = 'ורבע';
    }

    return [integerStr, fractionalStr].filter(Boolean).join(' ');
  }

  getFeminineNumber(n: number): string {
    const numbers: { [key: number]: string } = {
      3: 'שלוש',
      4: 'ארבע',
      5: 'חמש',
      6: 'שש',
      7: 'שבע',
      8: 'שמונה',
      9: 'תשע',
      10: 'עשר',
      11: 'אחת עשרה',
      12: 'שתים עשרה',
      13: 'שלוש עשרה',
      14: 'ארבע עשרה',
      15: 'חמש עשרה',
      16: 'שש עשרה',
      17: 'שבע עשרה',
      18: 'שמונה עשרה',
      19: 'תשע עשרה',
      20: 'עשרים',
    };

    return numbers[n] || n.toString();
  }
}
