import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, map, of } from 'rxjs';

export type Review = {
    id?: string;
    productId: string;
    userEmail: string;
    rating: number;
    comment: string;
    createdAt: string;
};

type ReviewsByProduct = Record<string, Review[]>;

const REVIEWS_ENDPOINT = 'https://699dd36183e60a406a4787b2.mockapi.io/Reviews';

@Injectable({ providedIn: 'root' })
export class ReviewsService {
    private readonly http = inject(HttpClient);
    private readonly reviewsByProduct = signal<ReviewsByProduct>({});

    constructor() {
        this.loadFromApi();
    }

    get allReviews() {
        return this.reviewsByProduct.asReadonly();
    }

    private parseJsonString<T>(payload: T): T {
        if (typeof payload !== 'string') return payload;
        try {
            return JSON.parse(payload) as T;
        } catch {
            return payload;
        }
    }

    private normalizeReview(item: unknown): Review | null {
        const parsed = this.parseJsonString(item);
        if (!parsed || typeof parsed !== 'object') return null;

        const record = parsed as Record<string, unknown>;
        const productId = String(record['productId'] ?? '').trim();
        const userEmail = String(record['userEmail'] ?? '').trim();
        const comment = String(record['comment'] ?? '').trim();
        if (!productId || !userEmail || !comment) return null;

        const rawRating = Number(record['rating']);
        const rating = Math.max(1, Math.min(5, Number.isFinite(rawRating) ? Math.round(rawRating) : 1));

        const createdAtValue = String(record['createdAt'] ?? '').trim();
        const createdAt = createdAtValue || new Date().toISOString();

        const rawId = record['id'] ?? record['id'];
        const id = rawId === undefined || rawId === null ? undefined : String(rawId);

        return {
            id,
            productId,
            userEmail,
            rating,
            comment,
            createdAt,
        };
    }

    private toReviewsByProduct(reviews: Review[]): ReviewsByProduct {
        const grouped: ReviewsByProduct = {};
        for (const review of reviews) {
            const list = grouped[review.productId] ?? [];
            grouped[review.productId] = [...list, review].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        }
        return grouped;
    }

    private loadFromApi(): void {
        this.http
            .get<unknown[]>(REVIEWS_ENDPOINT)
            .pipe(
                map((items) => {
                    const parsed = this.parseJsonString(items);
                    const list = Array.isArray(parsed) ? parsed : [];
                    return list
                        .map((item) => this.normalizeReview(item))
                        .filter((review): review is Review => review !== null);
                }),
                catchError(() => of([] as Review[]))
            )
            .subscribe((reviews) => {
                this.reviewsByProduct.set(this.toReviewsByProduct(reviews));
            });
    }

    getReviews(productId: string): Review[] {
        if (!productId) return [];
        const all = this.reviewsByProduct();
        return all[productId] ?? [];
    }

    getAllReviews(): Review[] {
        const all = this.reviewsByProduct();
        return Object.values(all).flat();
    }

    addReview(productId: string, review: Omit<Review, 'id' | 'productId' | 'createdAt'>): void {
        if (!productId) return;

        const nextPayload: Omit<Review, 'id'> = {
            productId,
            ...review,
            rating: Math.max(1, Math.min(5, Math.round(review.rating))),
            createdAt: new Date().toISOString(),
        };

        this.http
            .post<unknown>(REVIEWS_ENDPOINT, nextPayload)
            .pipe(
                map((saved) => this.normalizeReview(saved) ?? nextPayload),
                catchError(() => of(nextPayload))
            )
            .subscribe((savedReview) => {
                const current = this.reviewsByProduct();
                const list = current[productId] ?? [];
                this.reviewsByProduct.set({
                    ...current,
                    [productId]: [savedReview, ...list],
                });
            });
    }

    deleteReview(reviewId: string): void {
        if (!reviewId) return;

        this.http
            .delete(`${REVIEWS_ENDPOINT}/${reviewId}`)
            .pipe(catchError(() => of(null)))
            .subscribe(() => {
                const current = this.reviewsByProduct();
                const updated: ReviewsByProduct = {};
                for (const [productId, reviews] of Object.entries(current)) {
                    updated[productId] = reviews.filter((r) => r.id !== reviewId);
                }
                this.reviewsByProduct.set(updated);
            });
    }

    ratingCount(productId: string): number {
        return this.getReviews(productId).length;
    }

    averageRating(productId: string, fallback = 0): number {
        const reviews = this.getReviews(productId);
        if (reviews.length === 0) return fallback;

        const sum = reviews.reduce((total, review) => total + review.rating, 0);
        return sum / reviews.length;
    }
}
