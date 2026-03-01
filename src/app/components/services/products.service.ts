// products.service.ts - Service for managing product data and API interactions
// Handles fetching, creating, updating, and deleting products from the mock API

import { Injectable } from '@angular/core'; // Injectable decorator for services
import { HttpClient } from '@angular/common/http'; // HTTP client for API calls
import { catchError, map, Observable, of, switchMap, timeout, retry } from 'rxjs'; // RxJS operators for handling async operations

// Type definition for Product object structure
export type Product = {
  _id: string; // Unique identifier for the product
  title: string; // Product name/title
  thumbnail: string; // URL to product thumbnail image
  brand: string; // Product brand/manufacturer
  price: { current: number; currency: string }; // Price with amount and currency
  stock: number; // Available stock quantity
  images: string[]; // Array of product image URLs
  category: { id: string; name: string; image: string }; // Product category information
  rating: number; // Average product rating
  description: string; // Detailed product description
};

// Type for API response structure when fetching multiple products
type ProductsResponse = {
  total: number; // Total number of products available
  limit: number; // Number of products per page
  page: number; // Current page number
  skip: number; // Number of products skipped
  products: Product[]; // Array of product objects
};

// Service class for product-related operations
@Injectable({ providedIn: 'root' }) // Singleton service available app-wide
export class ProductsService {
  private base = 'https://699dd36183e60a406a4787b2.mockapi.io/productcard'; // Base API URL

  private parseJsonString<T>(payload: T): T {
    if (typeof payload !== 'string') return payload;
    try {
      return JSON.parse(payload) as T;
    } catch {
      return payload;
    }
  }

  constructor(private http: HttpClient) { }

  private toProductsResponse(items: any, pageIndex: number, pageSize: number, start: number): ProductsResponse {
    const parsed = this.parseJsonString(items);
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as any)?.products)
        ? (parsed as any).products
        : [];
    const products = arr.map((it: any) => this.normalizeRemoteProduct(it));

    return {
      total: products.length,
      limit: pageSize,
      page: pageIndex,
      skip: start,
      products,
    } as ProductsResponse;
  }

  private normalizeRemoteProduct(item: any): Product {
    const id = String(item._id ?? item.id ?? item.productId ?? item.product_id ?? '').trim();
    const title = item.title ?? item.name ?? 'Untitled';
    const thumbnail = item.thumbnail ?? item.thumblain ?? item.image ?? item.imageUrl ?? '';
    const brand = item.brand ?? item.company ?? '';

    let priceCurrent = 0;
    let priceCurrency = '₾';
    if (typeof item.price === 'number') {
      priceCurrent = item.price;
      priceCurrency = (item.currency === 'GEL' ? '₾' : item.currency) ?? '₾';
    } else if (item.price && typeof item.price === 'object') {
      priceCurrent = item.price.current ?? 0;
      priceCurrency = (item.price.currency === 'GEL' ? '₾' : item.price.currency) ?? '₾';
    } else if (item.priceCurrent) {
      priceCurrent = item.priceCurrent;
      priceCurrency = (item.priceCurrency === 'GEL' ? '₾' : item.priceCurrency) ?? '₾';
    }

    const stock = item.stock ?? item.quantity ?? (typeof item.inStock === 'boolean' ? (item.inStock ? 1 : 0) : 0);
    const images = item.images ?? (item.image ? [item.image] : item.imageUrl ? [item.imageUrl] : []);
    const category = (typeof item.category === 'string')
      ? { id: (item.category || '').toLowerCase().replace(/\s+/g, '-'), name: item.category, image: '' }
      : (item.category ?? { id: item.category?.id ?? '', name: item.category?.name ?? '', image: item.category?.image ?? '' });

    const rawRating = typeof item.rating === 'string'
      ? Number.parseFloat(item.rating.replace(',', '.'))
      : Number(item.rating);
    const rating = Number.isFinite(rawRating)
      ? Math.min(5, Math.max(0, rawRating))
      : 0;
    const description = item.description ?? item.desc ?? item.decription ?? '';

    return {
      _id: id,
      title,
      thumbnail,
      brand,
      price: { current: priceCurrent, currency: priceCurrency },
      stock,
      images,
      category,
      rating,
      description,
    } as Product;
  }
  // Method to fetch paginated products from the API
  getAll(pageIndex = 1, pageSize = 12): Observable<ProductsResponse> {
    const start = (pageIndex - 1) * pageSize; // Calculate skip offset for pagination

    return this.http
      .get<any[]>(`${this.base}?page=${pageIndex}&limit=${pageSize}`) // HTTP GET request to API
      .pipe(
        retry(2), // Retry failed requests up to 2 times
        timeout(10000), // Timeout after 10 seconds
        map((items) => this.toProductsResponse(items, pageIndex, pageSize, start)), // Transform response
        catchError(() => // Handle errors by returning empty response
          of({
            total: 0,
            limit: pageSize,
            page: pageIndex,
            skip: start,
            products: [],
          })
        )
      );
  }

  getAllUnpaged(): Observable<Product[]> {
    return this.http.get<any[]>(this.base).pipe(
      timeout(10000),
      map((items) => {
        const parsed = this.parseJsonString(items);
        const arr = Array.isArray(parsed)
          ? parsed
          : Array.isArray((parsed as any)?.products)
            ? (parsed as any).products
            : [];
        return arr.map((it: any) => this.normalizeRemoteProduct(it));
      }),
      catchError(() => of([]))
    );
  }


  getById(id: string): Observable<Product | null> {
    const requestedId = String(id).trim();
    const encodedId = encodeURIComponent(requestedId);
    return this.http.get<any>(`${this.base}/${encodedId}`).pipe(
      timeout(10000),
      map((it) => this.normalizeRemoteProduct(this.parseJsonString(it))),
      switchMap((product) => (product._id === requestedId ? of(product) : this.findByIdQuery(requestedId))),
      catchError(() => this.findByIdQuery(requestedId))
    );
  }

  private findByIdQuery(id: string): Observable<Product | null> {
    return this.http.get<any[]>(this.base).pipe(
      timeout(10000),
      map((items) => {
        const parsed = this.parseJsonString(items);
        const arr = Array.isArray(parsed) ? parsed : [];
        if (arr.length === 0) return null;

        const requestedId = String(id).trim();
        const exactRawMatch = arr.find((item: any) => {
          const candidateId = String(item?._id ?? item?.id ?? item?.productId ?? item?.product_id ?? '').trim();
          return candidateId === requestedId;
        });

        if (!exactRawMatch) return null;

        const normalized = this.normalizeRemoteProduct(exactRawMatch);
        return normalized._id ? normalized : null;
      }),
      catchError(() => of(null))
    );
  }

  // admin CRUD against mockapi
  addProductRemote(input: Partial<Product>): Observable<Product> {
    return this.http
      .post<any>(this.base, input)
      .pipe(map((it: any) => this.normalizeRemoteProduct(this.parseJsonString(it))));
  }

  updateProductRemote(product: Product): Observable<Product> {
    return this.http
      .put<any>(`${this.base}/${product._id}`, product)
      .pipe(map((it: any) => this.normalizeRemoteProduct(this.parseJsonString(it))));
  }

  deleteProductRemote(productId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${productId}`);
  }
}
