import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { Product } from './products.service';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  readonly items = signal<Product[]>([]);

  private readonly FAVORITES_BASE = 'https://699dd36183e60a406a4787b2.mockapi.io/Favorites';
  private readonly FAVORITES_ID_KEY = 'projectsh_favorites_id';

  constructor(private http: HttpClient) {
    this.loadRemoteFavorites();
  }

  add(product: Product): void {
    this.items.update((items) => {
      if (items.some((item) => item._id === product._id)) {
        return items;
      }
      return [...items, product];
    });
    this.persist();
  }

  remove(productId: string): void {
    this.items.update((items) => items.filter((item) => item._id !== productId));
    this.persist();
  }

  isFavorite(productId: string): boolean {
    return this.items().some((item) => item._id === productId);
  }

  private persist(): void {
    const payload = { items: this.items() };
    const id = localStorage.getItem(this.FAVORITES_ID_KEY);

    if (id) {
      if (payload.items.length === 0) {
        this.http.delete(`${this.FAVORITES_BASE}/${id}`).pipe(catchError(() => of(null))).subscribe(() => {
          localStorage.removeItem(this.FAVORITES_ID_KEY);
        });
        return;
      }

      this.http.put(`${this.FAVORITES_BASE}/${id}`, payload).pipe(catchError(() => of(null))).subscribe();
      return;
    }

    if (payload.items.length === 0) return;

    this.http.post<{ id: string }>(this.FAVORITES_BASE, payload).pipe(catchError(() => of(null))).subscribe((res: any) => {
      if (res && res.id) {
        localStorage.setItem(this.FAVORITES_ID_KEY, res.id);
      }
    });
  }

  private loadRemoteFavorites(): void {
    const id = localStorage.getItem(this.FAVORITES_ID_KEY);
    if (!id) return;

    this.http.get<{ items: Product[] }>(`${this.FAVORITES_BASE}/${id}`).pipe(catchError(() => of(null))).subscribe((res: any) => {
      if (res && Array.isArray(res.items)) {
        this.items.set(res.items as Product[]);
      }
    });
  }
}
