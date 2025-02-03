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
    const nw = this.translateNumberToHebrewHours(value as number);
    return nw;
  }

  translateNumberToHebrewHours(hours: number): string {
    const integerPart = Math.floor(hours);
    const fractionalPart = hours - integerPart;

    let result = "";

    if (integerPart > 0) {
        switch (integerPart) {
            case 1:
                result += "שעה";
                break;
            case 2:
                result += "שעתיים";
                break;
            default:
                result += `${integerPart} שעות`;
                break;
        }
    }

    if (fractionalPart > 0) {
        if (integerPart > 0) {
            result += " ו"; // Add "and" (ו) if there's an integer part
        }

        if (fractionalPart === 0.5) {
            result += "חצי שעה"; //  "חצי שעה" specifically for 0.5
        } else if (fractionalPart === 0.25) {
            result += "רבע שעה";  // "רבע שעה" specifically for 0.25
        } else if (fractionalPart === 0.75) {
            result += "שלושה רבעי שעה"; // Three-quarters of an hour
        } else if (fractionalPart > 0 && fractionalPart < 1) {
          const minutes = Math.round(fractionalPart * 60);
          result += `${minutes} דקות`; //For other fractions, show minutes
        }
    }

    if (result === "") {
        return "אפס שעות"; // Handle zero case
    }

    return result;
}
}
