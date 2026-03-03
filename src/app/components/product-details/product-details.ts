import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { Product, ProductsService } from '../services/products.service';
import { AuthService } from '../services/auth.service';
import { Review, ReviewsService } from '../services/reviews.service';
import { CartService } from '../services/cart.service';
import { FavoritesService } from '../services/favorites.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslationService } from '../services/translation.service';

@Component({
    selector: 'app-product-details',
    imports: [RouterLink, TranslateModule],
    templateUrl: './product-details.html',
    styleUrl: './product-details.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailsComponent implements OnInit, OnDestroy {
    product: Product | null = null;
    translatedDescription = '';
    translatedTitle = '';
    translatedCategory = '';
    translatedBrand = '';
    loading = false;
    errorMessage = '';
    submitMessage = '';
    newRating = 5;
    newComment = '';
    showLoginModal = false;

    private routeSub = new Subscription();
    private loadSub = new Subscription();
    private langSub = new Subscription();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private productsApi: ProductsService,
        private reviewsService: ReviewsService,
        private cartService: CartService,
        private favoritesService: FavoritesService,
        public auth: AuthService,
        private cdr: ChangeDetectorRef,
        private translate: TranslateService,
        private translationService: TranslationService
    ) { }

    ngOnInit(): void {
        // Subscribe to language changes to re-translate all product details
        this.langSub = this.translate.onLangChange.subscribe(() => {
            if (this.product) {
                this.translateDescription(this.product.description);
                this.translateTitle(this.product.title);
                this.translateCategory(this.product.category.name);
                this.translateBrand(this.product.brand);
            }
        });

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
        this.langSub.unsubscribe();
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
                    this.translateDescription(product.description);
                    this.translateTitle(product.title);
                    this.translateCategory(product.category.name);
                    this.translateBrand(product.brand);
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.product = null;
                    this.errorMessage = 'Failed to load product details.';
                    this.cdr.markForCheck();
                },
            });
    }

    private translateDescription(description: string): void {
        const currentLang = this.translate.currentLang || 'en';

        // If English, use the description as-is
        if (currentLang === 'en') {
            this.translatedDescription = description;
            this.cdr.markForCheck();
            return;
        }

        // Check cache first
        const cacheKey = `desc_${this.hashString(description)}_${currentLang}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            this.translatedDescription = cached;
            this.cdr.markForCheck();
            return;
        }

        // Try to translate using TranslationService
        this.translationService.translateText(description, currentLang === 'ka' ? 'ka' : currentLang).subscribe({
            next: (translated) => {
                localStorage.setItem(cacheKey, translated);
                this.translatedDescription = translated;
                this.cdr.markForCheck();
            },
            error: () => {
                // Fallback to original text
                this.translatedDescription = description;
                this.cdr.markForCheck();
            }
        });
    }

    private translateTitle(title: string): void {
        const currentLang = this.translate.currentLang || 'en';

        if (currentLang === 'en') {
            this.translatedTitle = title;
            this.cdr.markForCheck();
            return;
        }

        const cacheKey = `title_${this.hashString(title)}_${currentLang}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            this.translatedTitle = cached;
            this.cdr.markForCheck();
            return;
        }

        this.translationService.translateText(title, currentLang === 'ka' ? 'ka' : currentLang).subscribe({
            next: (translated) => {
                localStorage.setItem(cacheKey, translated);
                this.translatedTitle = translated;
                this.cdr.markForCheck();
            },
            error: () => {
                this.translatedTitle = title;
                this.cdr.markForCheck();
            }
        });
    }

    private translateCategory(category: string): void {
        const currentLang = this.translate.currentLang || 'en';

        if (currentLang === 'en') {
            this.translatedCategory = category;
            this.cdr.markForCheck();
            return;
        }

        const cacheKey = `category_${this.hashString(category)}_${currentLang}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            this.translatedCategory = cached;
            this.cdr.markForCheck();
            return;
        }

        this.translationService.translateText(category, currentLang === 'ka' ? 'ka' : currentLang).subscribe({
            next: (translated) => {
                localStorage.setItem(cacheKey, translated);
                this.translatedCategory = translated;
                this.cdr.markForCheck();
            },
            error: () => {
                this.translatedCategory = category;
                this.cdr.markForCheck();
            }
        });
    }

    private translateBrand(brand: string): void {
        const currentLang = this.translate.currentLang || 'en';

        if (currentLang === 'en') {
            this.translatedBrand = brand;
            this.cdr.markForCheck();
            return;
        }

        const cacheKey = `brand_${this.hashString(brand)}_${currentLang}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            this.translatedBrand = cached;
            this.cdr.markForCheck();
            return;
        }

        this.translationService.translateText(brand, currentLang === 'ka' ? 'ka' : currentLang).subscribe({
            next: (translated) => {
                localStorage.setItem(cacheKey, translated);
                this.translatedBrand = translated;
                this.cdr.markForCheck();
            },
            error: () => {
                this.translatedBrand = brand;
                this.cdr.markForCheck();
            }
        });
    }

    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    stars(rating: number): string {
        const full = Math.round(rating);
        return Array.from({ length: 5 }, (_, index) => (index + 1 <= full ? '★' : '☆')).join('');
    }

    reviews(): Review[] {
        if (!this.product) return [];
        return this.reviewsService.getReviews(this.product._id);
    }

    averageRating(): number {
        if (!this.product) return 0;
        return this.reviewsService.averageRating(this.product._id, this.product.rating);
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
