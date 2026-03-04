import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { Product, ProductsService } from '../services/products.service';
import { AuthService } from '../services/auth.service';
import { Review, ReviewsService } from '../services/reviews.service';
import { CartService } from '../services/cart.service';
import { FavoritesService } from '../services/favorites.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-product-details',
    imports: [RouterLink, TranslateModule],
    templateUrl: './product-details.html',
    styleUrl: './product-details.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailsComponent implements OnInit, OnDestroy {
    product: Product | null = null;
    loading = false;
    errorMessage = '';
    submitMessage = '';
    newRating = 5;
    newComment = '';
    showLoginModal = false;

    private routeSub = new Subscription();
    private loadSub = new Subscription();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private productsApi: ProductsService,
        private reviewsService: ReviewsService,
        private cartService: CartService,
        private favoritesService: FavoritesService,
        public auth: AuthService,
        private cdr: ChangeDetectorRef,
        private translate: TranslateService
    ) { }

    ngOnInit(): void {
        this.routeSub = this.route.paramMap.subscribe((params) => {
            const id = params.get('id')?.trim() ?? '';
            if (!id) {
                this.product = null;
                this.translate.get('PRODUCT_DETAILS.INVALID_ID').subscribe(msg => {
                    this.errorMessage = msg;
                    this.cdr.markForCheck();
                });
                return;
            }
            this.loadProduct(id);
        });
    }

    ngOnDestroy(): void {
        this.routeSub.unsubscribe();
        this.loadSub.unsubscribe();
    }

    private loadProduct(productId: string): void {
        this.loadSub.unsubscribe();
        this.loading = true;
        this.errorMessage = '';
        this.cdr.markForCheck();

        this.loadSub = this.productsApi
            .getById(productId)
            .pipe(finalize(() => {
                this.loading = false;
                this.cdr.markForCheck();
            }))
            .subscribe({
                next: (product) => {
                    if (!product) {
                        this.product = null;
                        this.translate.get('MESSAGES.NO_PRODUCTS').subscribe(msg => {
                            this.errorMessage = msg;
                            this.cdr.markForCheck();
                        });
                        return;
                    }
                    this.product = product;
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.product = null;
                    this.errorMessage = 'Failed to load product details.';
                    this.cdr.markForCheck();
                },
            });
    }

    stars(rating: number): string {
        // If rating is 0 (no reviews), all stars should be gray
        if (rating === 0) {
            return '☆☆☆☆☆';
        }
        const full = Math.round(rating);
        return Array.from({ length: 5 }, (_, index) => (index + 1 <= full ? '★' : '☆')).join('');
    }

    reviews(): Review[] {
        if (!this.product) return [];
        return this.reviewsService.getReviews(this.product._id);
    }

    averageRating(): number {
        // If product has no reviews, return 0 rating
        if (this.ratingCount() === 0) {
            return 0;
        }
        if (!this.product) return 0;
        return this.reviewsService.averageRating(this.product._id, this.product.rating);
    }

    ratingCount(): number {
        if (!this.product) return 0;
        return this.reviewsService.ratingCount(this.product._id);
    }

    onCommentInput(event: Event): void {
        const target = event.target as HTMLTextAreaElement;
        this.newComment = target.value;
    }

    onRatingChange(event: Event): void {
        const target = event.target as HTMLSelectElement;
        this.newRating = Number(target.value || 5);
    }

    submitReview(): void {
        if (!this.product) return;

        if (!this.auth.isLoggedIn()) {
            this.translate.get('PRODUCT_DETAILS.LOGIN_TO_REVIEW').subscribe(msg => {
                this.submitMessage = msg;
            });
            return;
        }

        const userEmail = this.auth.currentUserEmail();
        const comment = this.newComment.trim();
        if (!userEmail || !comment) {
            this.submitMessage = 'Please write a comment before submitting.';
            return;
        }

        this.reviewsService.addReview(this.product._id, {
            userEmail,
            rating: this.newRating,
            comment,
        });

        this.newComment = '';
        this.newRating = 5;
        this.translate.get('PRODUCT_DETAILS.REVIEW_SUBMITTED').subscribe(msg => {
            this.submitMessage = msg;
        });
    }

    deleteReview(reviewId: string): void {
        if (!confirm('Delete your review?')) return;
        this.reviewsService.deleteReview(reviewId);
        this.translate.get('PRODUCT_DETAILS.REVIEW_DELETED').subscribe(msg => {
            this.submitMessage = msg;
        });
    }

    addToCart(product: Product): void {
        if (!this.auth.isLoggedIn()) {
            this.showLoginModal = true;
            return;
        }
        this.cartService.add(product);
    }

    closeLoginModal(): void {
        this.showLoginModal = false;
    }

    goToLogin(): void {
        this.showLoginModal = false;
        this.router.navigate(['/login']);
    }

    isFavorite(productId: string): boolean {
        return this.favoritesService.isFavorite(productId);
    }

    toggleFavorite(product: Product): void {
        if (!this.auth.isLoggedIn()) {
            this.showLoginModal = true;
            return;
        }
        if (this.isFavorite(product._id)) {
            this.favoritesService.remove(product._id);
        } else {
            this.favoritesService.add(product);
        }
    }
}
