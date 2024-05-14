import { AfterViewInit, ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, Directive, ElementRef, inject, OnInit, Renderer2, signal, Signal, ViewChild, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonGrid, IonRow, IonCol } from '@ionic/angular/standalone';
import { TopicComponent } from './topic/topic.component';
import { CacheService } from '../state/cache.service';
import Swiper from 'swiper';

@Component({
  selector: 'app-topics',
  templateUrl: './topics.page.html',
  styleUrls: ['./topics.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonCol, IonRow, IonGrid, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TopicComponent]
})
export class TopicsPage implements AfterViewInit{
  cache = inject(CacheService);
  topics = this.cache.topics;
  activeIndex: WritableSignal<number> = signal(0);
  title = computed(() => this.topics()[this.activeIndex()]['title']);
  subtitle = computed(() => this.topics()[this.activeIndex()]['subtitle']);

  @ViewChild('mySwiper2', {static: true}) mySwiper2?: ElementRef;
  @ViewChild('div', {static: true,read: ElementRef}) div?: ElementRef;

  constructor(private renderer: Renderer2) {
  }

  ngAfterViewInit(): void {

  }

  onSlideChange({detail}: any) {
    const swiper: Swiper = detail[0];
    if (!swiper.destroyed) {
      this.activeIndex.set(swiper.activeIndex);
    }
  }



}
