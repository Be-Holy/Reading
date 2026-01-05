import { Component, computed, effect, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

interface TextMetadata {
  volumes: Array<{
    name: string;
    books: Array<{
      name: string;
      chapters: Array<{
        chapter: number;
        verses: Array<{
          verse: number;
          words: number;
        }>;
      }>;
    }>;
  }>;
}

interface Text {
  id: string;
  name: string;
  "display-name": string;
  faiths?: Array<{
    id: string;
    name: string;
    texts: string[];
  }>;
  links: {
    metadata: string;
  }
}

@Component({
  selector: 'app-reading-tracker',
  imports: [DecimalPipe],
  template: `
    <h3>Reading Tracker</h3>
    <div>
      <label><input type="radio" name="mode" [value]="'entire'" [checked]="readingMode() === 'entire'" (change)="readingMode.set('entire')"> Read entire text</label><br/>
      <label><input type="radio" name="mode" [value]="'volumes'" [checked]="readingMode() === 'volumes'" (change)="readingMode.set('volumes')"> Read selected volumes</label><br/>
      <label><input type="radio" name="mode" [value]="'books'" [checked]="readingMode() === 'books'" (change)="readingMode.set('books')"> Read selected books</label>
    </div>
    @if (readingMode() === 'volumes' && availableVolumes().length > 0) {
      <div>
        <h4>Select Volumes:</h4>
        @for (volume of availableVolumes(); track volume) {
          <label><input type="checkbox" [checked]="selectedVolumes().includes(volume)" (change)="toggleVolume(volume)"> {{volume}}</label><br/>
        }
      </div>
    }
    @if (readingMode() === 'books' && availableBooks().length > 0) {
      <div>
        <h4>Select Books:</h4>
        @for (book of availableBooks(); track book) {
          <label><input type="checkbox" [checked]="selectedBooks().includes(book)" (change)="toggleBook(book)"> {{book}}</label><br/>
        }
      </div>
    }
    <form>
      <label>Start Date: <input type="date" [value]="startDate()" (input)="startDate.set(($any($event.target)).value)"></label><br/>
      <label>End Date: <input type="date" [value]="endDate()" (input)="endDate.set(($any($event.target)).value)"></label>
    </form>
    @if (days() > 0) {
      <div>
          To read {{readingScopeName()}} between {{formatDate(startDate())}} and {{formatDate(endDate())}} ({{days()}} days), you need to read
          about {{wordsPerDay()}} words per day (that's roughly {{chaptersPerDay()}} chapters or {{versesPerDay()}} verses).

      </div>
      @if (currentDay() > 0 && currentDay() <= days()) {
        <div>Today (day {{currentDay()}}) you should be at:</div>
        <ul>
          <li>{{currentVerseInfo()?.bookName}} {{currentVerseInfo()?.chapter}}:{{currentVerseInfo()?.verse}}</li>
          <li>{{currentWords() | number}} words read so far</li>
        </ul>
      }
    }
  `,
  styles: ``
})
export class ReadingTrackerComponent {
  text = input<Text | undefined>();
  textMetadata = input<TextMetadata | undefined>();
  textId = input<string | undefined>();

  readonly startDate = signal('');
  readonly endDate = signal('');

  readonly readingMode = signal<'entire' | 'volumes' | 'books'>('entire');
  readonly selectedVolumes = signal<string[]>([]);
  readonly selectedBooks = signal<string[]>([]);

  readonly availableVolumes = computed(() => this.volumes()?.map(v => v.name) || []);
  readonly availableBooks = computed(() => this.volumes()?.flatMap(v => v.books).map(b => b.name) || []);

  readonly filteredVolumes = computed(() => {
    const mode = this.readingMode();
    const volumes = this.volumes();
    if (!volumes) return volumes;
    if (mode === 'entire') return volumes;
    if (mode === 'volumes') {
      return volumes.filter(v => this.selectedVolumes().includes(v.name));
    }
    if (mode === 'books') {
      return volumes.map(v => ({
        ...v,
        books: v.books.filter(b => this.selectedBooks().includes(b.name))
      })).filter(v => v.books.length > 0);
    }
    return volumes;
  });

  readonly readingScopeName = computed(() => {
    const mode = this.readingMode();
    const textName = this.text()?.name || 'Text';
    if (mode === 'entire') return textName;
    if (mode === 'volumes') {
      const selected = this.selectedVolumes();
      return selected.length > 0 ? selected.join(', ') : textName;
    }
    if (mode === 'books') {
      const selected = this.selectedBooks();
      if (selected.length === 0) return textName;
      if (selected.length <= 3) return selected.join(', ');
      return `${selected.length} selected books`;
    }
    return textName;
  });

  readonly volumes = computed(() => this.textMetadata()?.volumes);
  readonly books = computed(() => this.filteredVolumes()?.flatMap(v => v.books));
  readonly chapters = computed(() => this.books()?.flatMap(b => b.chapters));
  readonly verses = computed(() => this.chapters()?.flatMap(c => c.verses));
  readonly words = computed(() => this.verses()?.reduce((n, v) => n + v.words, 0));

  readonly totalChapters = computed(() => this.chapters()?.length ?? 0);
  readonly totalVerses = computed(() => this.verses()?.length ?? 0);
  readonly totalWords = computed(() => this.words() ?? 0);

  readonly days = computed(() => {
    const start = this.startDate() ? new Date(this.startDate()) : null;
    const end = this.endDate() ? new Date(this.endDate()) : null;
    if (start && end && start <= end) {
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    return 0;
  });

  readonly chaptersPerDay = computed(() => {
    const d = this.days();
    const tc = this.totalChapters();
    return d > 0 ? Math.ceil(tc / d) : 0;
  });

  readonly versesPerDay = computed(() => {
    const d = this.days();
    const tv = this.totalVerses();
    return d > 0 ? Math.ceil(tv / d) : 0;
  });

  readonly wordsPerDay = computed(() => {
    const d = this.days();
    const tw = this.totalWords();
    return d > 0 ? Math.ceil(tw / d) : 0;
  });

  readonly currentDay = computed(() => {
    const start = this.startDate() ? new Date(this.startDate()) : null;
    const now = new Date();
    if (start && now >= start) {
      return Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    return 0;
  });

  readonly currentChapter = computed(() => {
    const cd = this.currentDay();
    const cpd = this.chaptersPerDay();
    const tc = this.totalChapters();
    return Math.min(Math.ceil(cd * cpd), tc);
  });

  readonly currentVerse = computed(() => {
    const cd = this.currentDay();
    const vpd = this.versesPerDay();
    const tv = this.totalVerses();
    return Math.min(Math.ceil(cd * vpd), tv);
  });

  readonly currentWords = computed(() => {
    const cd = this.currentDay();
    const wpd = this.wordsPerDay();
    return cd * wpd;
  });

  readonly currentChapterInfo = computed(() => {
    const books = this.books();
    if (!books) return null;
    let cumulativeChapter = 0;
    for (const book of books) {
      for (const chapter of book.chapters) {
        cumulativeChapter++;
        if (cumulativeChapter === this.currentChapter()) {
          return {
            bookName: book.name,
            chapter: chapter.chapter
          };
        }
      }
    }
    return null;
  });

  readonly currentVerseInfo = computed(() => {
    const books = this.books();
    if (!books) return null;
    let cumulativeVerse = 0;
    for (const book of books) {
      for (const chapter of book.chapters) {
        for (const verse of chapter.verses) {
          cumulativeVerse++;
          if (cumulativeVerse === this.currentVerse()) {
            return {
              bookName: book.name,
              chapter: chapter.chapter,
              verse: verse.verse
            };
          }
        }
      }
    }
    return null;
  });

  constructor() {
    effect(() => {
      const id = this.textId();
      if (id) {
        const key = `${id}-reading`;
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        this.startDate.set(data.start || '');
        this.endDate.set(data.end || '');
        this.readingMode.set(data.mode || 'entire');
        this.selectedVolumes.set(data.selectedVolumes || []);
        this.selectedBooks.set(data.selectedBooks || []);
      }
    });

    effect(() => {
      const id = this.textId();
      const start = this.startDate();
      const end = this.endDate();
      const mode = this.readingMode();
      const selectedVolumes = this.selectedVolumes();
      const selectedBooks = this.selectedBooks();
      if (id) {
        const key = `${id}-reading`;
        const data = { start, end, mode, selectedVolumes, selectedBooks };
        localStorage.setItem(key, JSON.stringify(data));
      }
    });
  }

  toggleVolume(volume: string) {
    const current = this.selectedVolumes();
    if (current.includes(volume)) {
      this.selectedVolumes.set(current.filter(v => v !== volume));
    } else {
      this.selectedVolumes.set([...current, volume]);
    }
  }

  toggleBook(book: string) {
    const current = this.selectedBooks();
    if (current.includes(book)) {
      this.selectedBooks.set(current.filter(b => b !== book));
    } else {
      this.selectedBooks.set([...current, book]);
    }
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
}