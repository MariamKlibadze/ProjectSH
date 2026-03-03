import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { Product } from './products.service';

export type CartItem = {
  product: Product;
  quantity: number;
};

@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<CartItem[]>([]);

  private readonly CARTS_BASE = 'https://699dd36183e60a406a4787b2.mockapi.io/Carts';
  private readonly CART_ID_KEY = 'projectsh_cart_id';
  private pendingPost = false; // ← prevents duplicate POSTs

  constructor(private http: HttpClient) {
    this.loadRemoteCart();
  }

  add(product: Product): void {
    // Ensure product has correct currency
    const correctedProduct = {
      ...product,
      price: {
        ...product.price,
        currency: product.price.currency === 'GEL' ? '₾' : product.price.currency
      }
    };

    this.items.update((items) => {
      const index = items.findIndex((item) => item.product._id === correctedProduct._id);
      if (index === -1) {
        if (correctedProduct.stock <= 0) return items;
        return [...items, { product: correctedProduct, quantity: 1 }];
      }
      const current = items[index];
      if (current.quantity >= current.product.stock) return items;
      const next = [...items];
      next[index] = { ...current, quantity: current.quantity + 1 };
      return next;
    });
    this.persist();
  }

  increment(productId: string): void {
    this.items.update((items) =>
      items.map((item) =>
        item.product._id !== productId
          ? item
          : { ...item, quantity: Math.min(item.quantity + 1, item.product.stock) }
      )
    );
    this.persist();
  }

  decrement(productId: string): void {
    this.items.update((items) =>
      items
        .map((item) =>
          item.product._id !== productId ? item : { ...item, quantity: item.quantity - 1 }
        )
        .filter((item) => item.quantity > 0)
    );
    this.persist();
  }

  remove(productId: string): void {
    this.items.update((items) => items.filter((item) => item.product._id !== productId));
    this.persist();
  }

  selectedQuantity(productId: string): number {
    return this.items().find((item) => item.product._id === productId)?.quantity ?? 0;
  }

  private persist(): void {
    const payload = { items: this.items() };
    const id = localStorage.getItem(this.CART_ID_KEY);

    // ── UPDATE existing cart ──────────────────────────────────────────
    if (id) {
      if (payload.items.length === 0) {
        // Cart is empty → delete the record
        this.http
          .delete(`${this.CARTS_BASE}/${id}`)
          .pipe(catchError(() => of(null)))
          .subscribe(() => localStorage.removeItem(this.CART_ID_KEY));
        return;
      }
      this.http
        .put(`${this.CARTS_BASE}/${id}`, payload)
        .pipe(catchError(() => of(null)))
        .subscribe();
      return;
    }

    // ── CREATE new cart (guard against duplicate POSTs) ───────────────
    if (this.pendingPost || payload.items.length === 0) return;
    this.pendingPost = true;

    this.http
      .post<{ id: string }>(this.CARTS_BASE, payload)
      .pipe(catchError(() => of(null)))
      .subscribe((res: any) => {
        this.pendingPost = false;
        if (res?.id) {
          localStorage.setItem(this.CART_ID_KEY, res.id);
        }
      });
  }

  private loadRemoteCart(): void {
    const id = localStorage.getItem(this.CART_ID_KEY);
    if (!id) return;

    this.http
      .get<{ items: CartItem[] }>(`${this.CARTS_BASE}/${id}`)
      .pipe(catchError(() => of(null)))
      .subscribe((res: any) => {
        if (res && Array.isArray(res.items)) {
          // Update currency for existing cart items
          const updatedItems = res.items.map((item: CartItem) => ({
            ...item,
            product: {
              ...item.product,
              price: {
                ...item.product.price,
                currency: item.product.price.currency === 'GEL' ? '₾' : item.product.price.currency
              }
            }
          }));
          this.items.set(updatedItems as CartItem[]);
        } else {
          // Cart record no longer exists on MockAPI, clean up
          localStorage.removeItem(this.CART_ID_KEY);
        }
      });
  }

  clearCart(): void {
    this.items.set([]);
    this.persist();
  }
}