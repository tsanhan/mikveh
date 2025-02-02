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
    const nw = this.numberToHebrew(value as number);
    return nw;
  }

  numberToHebrew(num: number): string {
    if (num === 0) return 'אפס';

    if (this.hebrewFractions[num.toString()])
      return this.hebrewFractions[num.toString()];

    const [integerPart, decimalPart] = num.toString().split('.');
    let result: string = this.convertIntegerToHebrew(parseInt(integerPart));

    if (decimalPart) {
      const fraction: string = this.simplifyFraction(
        parseFloat(`0.${decimalPart}`)
      );
      if (this.hebrewFractions[fraction]) {
        result += ' ' + this.hebrewFractions[fraction];
      } else {
        const decimalWords: string = decimalPart
          .split('')
          .map((digit) => this.hebrewOnes[parseInt(digit)])
          .join(' ');
        result += ' נקודה ' + decimalWords;
      }
    }

    return result.trim();
  }

  convertIntegerToHebrew(num: number): string {
    if (num === 0) return '';

    let words: string = '';

    if (num >= 1000) {
      const thousands: number = Math.floor(num / 1000);
      words +=
        (thousands <= 2
          ? this.hebrewThousands[thousands]
          : this.hebrewOnes[thousands] + ' אלף') + ' ';
      num %= 1000;
    }
    if (num >= 100) {
      words += this.hebrewHundreds[Math.floor(num / 100)] + ' ';
      num %= 100;
    }
    if (num >= 10) {
      if (num >= 11 && num <= 19) {
        words += 'עשרה';
        words = this.hebrewOnes[num % 10] + ' ' + words;
      } else {
        words += this.hebrewTens[Math.floor(num / 10)] + ' ';
        if (num % 10 !== 0) words += this.hebrewOnes[num % 10] + ' ';
      }
    } else {
      words += this.hebrewOnes[num] + ' ';
    }

    return words.trim();
  }

  simplifyFraction(decimal: number): string {
    const fractions: Record<number, string> = {
      0.5: '1/2',
      0.25: '1/4',
      0.75: '3/4',
      0.333: '1/3',
      0.666: '2/3',
    };

    const closest: number = Object.keys(fractions)
      .map(parseFloat)
      .reduce((prev, curr) =>
        Math.abs(curr - decimal) < Math.abs(prev - decimal) ? curr : prev
      );
    return fractions[closest];
  }
}
