import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Link, LinksService } from './links.service';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private service = inject(LinksService);

  links = signal<Link[]>([]);
  created = signal<Link | null>(null);
  error = signal<string | null>(null);
  loading = signal(false);

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.service.list().subscribe({
      next: (links) => this.links.set(links),
      error: (err) => this.error.set(this.describe(err)),
    });
  }

  submit(event: Event, input: HTMLInputElement): void {
    event.preventDefault();
    const url = input.value.trim();
    this.created.set(null);

    if (!this.isHttpUrl(url)) {
      this.error.set('Enter a valid http:// or https:// URL.');
      return;
    }

    this.error.set(null);
    this.loading.set(true);
    this.service.create(url).subscribe({
      next: (link) => {
        this.created.set(link);
        this.loading.set(false);
        input.value = '';
        this.refresh();
      },
      error: (err) => {
        this.error.set(this.describe(err));
        this.loading.set(false);
      },
    });
  }

  private isHttpUrl(value: string): boolean {
    try {
      const { protocol } = new URL(value);
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  }

  private describe(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) return 'Cannot reach the backend at http://localhost:3000.';
      return err.error?.error ?? `Request failed (${err.status}).`;
    }
    return 'Something went wrong.';
  }
}
