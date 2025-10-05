import { Component, computed, effect, signal } from '@angular/core';
import { DecimalPipe, Location } from '@angular/common';
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

interface Faith {
  id: string;
  name: string;
  texts: string[];
}

interface Text {
  id: string;
  name: string;
  "display-name": string;
  faiths?: Faith[];
  links: {
    metadata: string;
  }
}

@Component({
  selector: 'app-root',
  imports: [DecimalPipe],
  template: ` 
    @if (texts(); as texts) {
      @if (selectedText(); as selectedText) {
        <h2>{{selectedText.name}}</h2>
        @if (textMetadata(); as meta) {
          @if (volumes()!.length > 1) {
            <div>{{volumes()!.length | number}} volumes</div>
          }
          @if (books()!.length > 1) {
            <div>{{books()!.length | number}} books</div>
          }
          @if (chapters()!.length > 1) {
            <div>{{chapters()!.length | number}} chapters</div>
          }
          @if (verses()!.length > 1) {
            <div>{{verses()!.length | number}} verses</div>
          }
          @if (words()) {
            <div>{{words() | number}} words</div>
          }
        }
      } @else {
        <ul>
          @for(text of texts; track text.id) { 
            <li (click)="selectText(text)">
              <span>{{text['display-name']}}</span><br/>
              <span>Used by:</span>
              <ul>
                @for(faith of text.faiths; track faith.id) {
                  <li>{{faith.name}}</li>
                } @empty {
                  <span>Unknown</span>
                }
              </ul>
            </li>
          } 
        </ul>
      }
    } `,
  styles: ``,
  providers: [
    { provide: Window, useFactory: () => window }
  ]
})
export class App {
  readonly texts = signal<Text[] | undefined>(undefined);
  readonly selectedTextId = signal<string | undefined>(undefined);
  readonly selectedText = signal<Text | undefined>(undefined);
  readonly textMetadata = signal<TextMetadata | undefined>(undefined);
  readonly selectedTextEntry = computed(() => {
    const texts = this.texts();
    const selectedTextId = this.selectedTextId();
    if (texts && selectedTextId) {
      return texts.find(t => t.id === selectedTextId);
    } else {
      return undefined;
    }
  })
  readonly volumes = computed(() => this.textMetadata()?.volumes);
  readonly books = computed(() => this.volumes()?.flatMap(v => v.books));
  readonly chapters = computed(() => this.books()?.flatMap(b => b.chapters));
  readonly verses = computed(() => this.chapters()?.flatMap(c => c.verses));
  readonly words = computed(() => this.verses()?.reduce((n, v) => n + v.words, 0));

  constructor(private window: Window, private location: Location){
    effect(async () => {
      const selectedTextId = this.selectedTextId();
      if (selectedTextId) {
        const text = await (await fetch(`https://be-holy.github.io/Faith-Traditions/${selectedTextId}/${selectedTextId}.json`)).json();
        this.selectedText.set(text);
      } else {
        this.selectedText.set(undefined);
      }
    })

    effect(async () => {
      const selectedText = this.selectedText();
      if (selectedText) {
        const meta = await (await fetch(`https://be-holy.github.io/Faith-Traditions/${this.selectedTextId()}/${selectedText.links.metadata}`)).json()
        this.textMetadata.set(meta);
      } else {
        this.textMetadata.set(undefined);
      }
    })

    effect(() => console.log(this.books()?.map(b => b.name)));

    this.window.addEventListener('hashchange', () => this.onHashChange())
    this.onHashChange();
  }

  onHashChange() {
    const hash = this.window.location.hash;
    const id = (hash ?? '').substring(1); 
    this.selectedTextId.set(id);
  }

  async ngOnInit() {
    const [faiths, texts] = await Promise.all([
      Promise.all(
        (
          await (await fetch('https://be-holy.github.io/Faith-Traditions/faiths.json')).json()
        ).faiths.map((f: Faith) =>
          fetch(`https://be-holy.github.io/Faith-Traditions/${f.id}.json`).then((x) => x.json())
        )
      ),
      (await (await fetch('https://be-holy.github.io/Faith-Traditions/texts.json')).json()).texts,
    ]);
    this.texts.set(
      texts.map((t: Partial<Text>) => ({
        ...t,
        faiths: faiths.filter((f: Faith) => f.texts.includes(t.id!)).sort((a,b) => a.name.localeCompare(b.name)),
      }))
    );
  }

  selectText(text: Text) {
    this.window.location.hash = `#${text.id}`;
  }
}
