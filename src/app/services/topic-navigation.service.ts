import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TopicNavigationService {
  private readonly _topicRequests$ = new Subject<string>();
  readonly topicRequests$ = this._topicRequests$.asObservable();

  openTopic(topicId: string) {
    this._topicRequests$.next(topicId);
  }
}
