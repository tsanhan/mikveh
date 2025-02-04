import { inject, Injectable } from '@angular/core';
import { from, map, Observable, of, switchMap, tap} from 'rxjs';
import { IMikveh } from '../interfaces/mikveh.interface';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root',
})
export class DalService {
  cache = inject(CacheService);

  constructor() {
  }

  getMikvehList():Observable<IMikveh[]> {
    return from(this.cache.getMikvehResults()).pipe(
      switchMap((cachedMikvehs: IMikveh[]) => {
        if (!!cachedMikvehs && cachedMikvehs.length) return of(cachedMikvehs);
        const mikvehs = from(fetch('https://firestore.googleapis.com/v1/projects/mikveh-bo/databases/(default)/documents/mikvehs').then((res) => res.json()));
          return mikvehs.pipe(
            map(({documents}) => documents),
            map(docs => docs.map((x:any) => this.documentToJson(x.fields))),
            tap((mikvehs) => this.cache.storeMikvehResults(mikvehs))
          )
      })
    );
  }

  documentToJson(fields: any): any {
    let result: { [key: string]: any } = {};
    for (let f in fields) {
        let key = f, value = fields[f],
            isDocumentType = ['stringValue', 'booleanValue', 'doubleValue',
                'integerValue', 'timestampValue', 'mapValue', 'arrayValue'].find(t => t === key);
        if (isDocumentType) {
            let item = ['stringValue', 'booleanValue', 'doubleValue', 'integerValue', 'timestampValue'].find(t => t === key)
            if (item)
                return value;
            else if ('mapValue' == key)
                return this.documentToJson(value.fields || {});
            else if ('arrayValue' == key) {
                let list = value.values;
                return !!list ? list.map((l:any) => this.documentToJson(l)) : [];
            }
        } else {
            result[key] = this.documentToJson(value)
        }
    }
    return result;
}

}
