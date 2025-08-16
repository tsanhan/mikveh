import { Locale, Location } from "@hebcal/core";

export function cityToHebrewName(city: Location): string {
    const cityName = city.getName() as string;
    const hebrewName = Locale.lookupTranslation(cityName, 'he') as string;

    return hebrewName;
}