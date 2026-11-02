import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { Storage } from '@ionic/storage-angular';

import { CacheService } from './cache.service';
import { ApproachService } from './approach.service';
import { ApproachName } from '../interfaces/approaches';
import topics from '../../assets/data/topics.json';
import { CONTENT_SYNC_ENABLED } from './content-source';

describe('CacheService approach selection', () => {
  let values: Map<string, unknown>;
  let storage: jasmine.SpyObj<Storage>;

  beforeEach(() => {
    spyOn(console, 'log');
    values = new Map();
    storage = jasmine.createSpyObj<Storage>('Storage', ['create', 'get', 'set']);
    storage.create.and.resolveTo(storage);
    storage.get.and.callFake(async (key: string) => values.get(key));
    storage.set.and.callFake(async (key: string, value: unknown) => {
      values.set(key, value);
      return value;
    });
    TestBed.configureTestingModule({
      providers: [CacheService, ApproachService, { provide: Storage, useValue: storage },
        { provide: CONTENT_SYNC_ENABLED, useValue: false }],
    });
  });

  for (const [legacy, expected] of [
    ['sfarad', ApproachName.SEPHARDI_OVADIA],
    ['ashkenaz', ApproachName.SEPHARDI_MORDECHAI_ELIYAHU],
  ]) {
    for (const saved of [legacy, { name: legacy, nameHeb: 'old label', svg: '' }]) {
      it(`migrates saved ${JSON.stringify(saved)} to ${expected} and preserves it on reload`, async () => {
        values.set('approach', saved);
        const cache = TestBed.inject(CacheService);
        await cache.ready;
        const selected = TestBed.inject(ApproachService).approach$.getValue();
        expect(selected.name).toBe(expected);
        expect(selected.contentKey).toBe(expected);
        expect(values.get('approach')).toEqual(selected);
        expect(cache.getApproach(legacy)).toEqual(selected);
        for (const topic of topics) {
          expect(Array.isArray((topic.content as Record<string, unknown>)[selected.contentKey!])).toBeTrue();
        }
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({providers: [CacheService, ApproachService,
          { provide: Storage, useValue: storage }, { provide: CONTENT_SYNC_ENABLED, useValue: false }]});
        await TestBed.inject(CacheService).ready;
        expect(TestBed.inject(ApproachService).approach$.getValue()).toEqual(selected);
      });
    }
  }

  for (const id of [
    ApproachName.CHABAD,
    ApproachName.SEPHARDI_OVADIA,
    ApproachName.SEPHARDI_MORDECHAI_ELIYAHU,
  ]) {
    it(`selects and persists ${id}, resolving its content for every topic`, fakeAsync(() => {
      const cache = TestBed.inject(CacheService);
      flushMicrotasks();
      cache.setApproach(id);
      flushMicrotasks();

      const selected = TestBed.inject(ApproachService).approach$.getValue();
      expect(selected.name).toBe(id);
      expect(selected.contentKey).toBe(id);
      expect(values.get('approach')).toEqual(selected);
      expect(cache.getApproach(id)).toEqual(selected);
      for (const topic of topics) {
        expect(Array.isArray((topic.content as Record<string, unknown>)[id])).toBeTrue();
      }
    }));
  }
});
