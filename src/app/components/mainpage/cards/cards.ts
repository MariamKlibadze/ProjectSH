import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { ProductsService, Product } from '../../services/products.service';
import { CartService } from '../../services/cart.service';
import { FavoritesService } from '../../services/favorites.service';
import { AuthService } from '../../services/auth.service';
import { Subscription, finalize } from 'rxjs';
import { ReviewsService } from '../../services/reviews.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LowerCasePipe } from '@angular/common';

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [RouterLink, TranslateModule, LowerCasePipe],
  templateUrl: './cards.html',
  styleUrls: ['./cards.css'],
})
export class CardsComponent implements OnInit, OnDestroy {
  products = signal<Product[]>([]);
  loading = false;
  errorMessage = '';
  authMessage = '';
  showLoginModal = false;
  searchQuery = signal('');
  selectedCategory = signal('');
  selectedBrand = signal('');
  maxPrice = signal<number | null>(null);
  minRating = signal(0);
  sortBy = signal<'price-asc' | 'price-desc' | 'rating-asc' | 'rating-desc' | ''>('');
  sidebarOpen = signal(true);

  pageIndex = 1;
  pageSize = 120;

  heroImages = signal<string[]>([
    'assets/hero1.jpg',
    'assets/hero2.jpg',
    'assets/hero3.jpg'
  ]);
  heroSlideIndex = signal(0);

  private routerSub: Subscription = new Subscription();
  private loadSub: Subscription = new Subscription();

  constructor(
    private productsApi: ProductsService,
    private cartService: CartService,
    private favoritesService: FavoritesService,
    private reviewsService: ReviewsService,
    public auth: AuthService,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.load();

    const stored = localStorage.getItem('heroImages');
    if (stored) {
      try {
        const imgs = JSON.parse(stored);
        if (Array.isArray(imgs) && imgs.length === 3) {
          this.heroImages.set(imgs);
        }
      } catch { }
    }

    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects; // ← use urlAfterRedirects, not this.router.url
        if (url === '/mainpage' && !this.loading) {
          this.load();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSub.unsubscribe();
    this.loadSub.unsubscribe();
  }

  nextHeroSlide(): void {
    const imgs = this.heroImages();
    this.heroSlideIndex.set((this.heroSlideIndex() + 1) % imgs.length);
  }

  prevHeroSlide(): void {
    const imgs = this.heroImages();
    this.heroSlideIndex.set((this.heroSlideIndex() - 1 + imgs.length) % imgs.length);
  }

  goToHeroSlide(index: number): void {
    this.heroSlideIndex.set(index);
  }

  load() {
    this.loadSub.unsubscribe();
    this.loading = true;
    this.errorMessage = '';
    this.loadSub = this.productsApi
      .getAll(this.pageIndex, this.pageSize)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          this.products.set(res.products);
        },
        error: () => {
          this.errorMessage = 'Failed to load products. Check your internet/API and try again.';
        },
      });
  }

  stars(rating: number) {
    const full = Math.round(rating); // 4.2 -> 4
    return Array.from({ length: 5 }, (_, i) => (i + 1 <= full ? '★' : '☆')).join('');
  }

  starsArray(rating: number) {
    const full = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return Array.from({ length: 5 }, (_, i) => {
      if (i < full) return 'gold';
      if (i === full && hasHalf) return 'gold'; // or 'half' but for simplicity gold
      return 'gray';
    });
  }

  private normalizeRating(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.min(5, Math.max(0, value));
    }

    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value.replace(',', '.'));
      if (Number.isFinite(parsed)) {
        return Math.min(5, Math.max(0, parsed));
      }
    }

    return 0;
  }

  averageRating(product: Product): number {
    // If product has no reviews, return 0 rating
    if (this.ratingCount(product._id) === 0) {
      return 0;
    }

    const fallbackRating = this.normalizeRating(product.rating);
    const average = this.reviewsService.averageRating(product._id, fallbackRating);
    return this.normalizeRating(average);
  }

  ratingCount(productId: string): number {
    return this.reviewsService.ratingCount(productId);
  }

  addToCart(p: Product) {
    if (!this.auth.isLoggedIn()) {
      this.showLoginModal = true;
      return;
    }
    this.authMessage = '';
    this.cartService.add(p);
  }

  selectedQuantity(productId: string) {
    return this.cartService.selectedQuantity(productId);
  }

  stockLeft(p: Product) {
    return Math.max(p.stock - this.selectedQuantity(p._id), 0);
  }

  addToFavorites(p: Product) {
    if (!this.auth.isLoggedIn()) {
      this.showLoginModal = true;
      return;
    }
    this.authMessage = '';
    this.favoritesService.add(p);
  }

  removeFromFavorites(productId: string) {
    this.favoritesService.remove(productId);
  }

  toggleFavorite(p: Product) {
    if (this.isFavorite(p._id)) {
      this.removeFromFavorites(p._id);
    } else {
      this.addToFavorites(p);
    }
  }

  incrementCart(productId: string) {
    this.cartService.increment(productId);
  }

  decrementCart(productId: string) {
    this.cartService.decrement(productId);
  }

  removeFromCart(productId: string) {
    this.cartService.remove(productId);
  }

  closeLoginModal() {
    this.showLoginModal = false;
  }

  goToLogin() {
    this.showLoginModal = false;
    this.router.navigate(['/login']);
  }

  isFavorite(productId: string) {
    return this.favoritesService.isFavorite(productId);
  }

  categories = computed(() => {
    return [...new Set(this.products().map((product) => product.category.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  });

  brands = computed(() => {
    return [...new Set(this.products().map((product) => product.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  });

  filteredProducts = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const maxP = this.maxPrice();
    const minR = this.normalizeRating(this.minRating());
    const sortOption = this.sortBy();

    let filtered = this.products().filter((product) => {
      const matchesQuery = !query
        || product.title.toLowerCase().includes(query)
        || product.brand.toLowerCase().includes(query)
        || product.category.name.toLowerCase().includes(query);
      const matchesCategory = !this.selectedCategory() || product.category.name === this.selectedCategory();
      const matchesBrand = !this.selectedBrand() || product.brand === this.selectedBrand();
      const matchesPrice = maxP === null || Number.isNaN(maxP) || product.price.current <= maxP;
      const matchesRating = this.averageRating(product) >= minR;
      return matchesQuery && matchesCategory && matchesBrand && matchesPrice && matchesRating;
    });

    // Apply sorting
    if (sortOption) {
      filtered = [...filtered].sort((a, b) => {
        const ratingA = this.averageRating(a);
        const ratingB = this.averageRating(b);
        const hasRatingA = ratingA > 0;
        const hasRatingB = ratingB > 0;
        
        switch (sortOption) {
          case 'price-asc':
            return a.price.current - b.price.current;
          case 'price-desc':
            return b.price.current - a.price.current;
          case 'rating-asc':
          case 'rating-desc':
            // Prioritize products with ratings over those without
            if (hasRatingA && !hasRatingB) return -1; // A has rating, B doesn't - A comes first
            if (!hasRatingA && hasRatingB) return 1;  // B has rating, A doesn't - B comes first
            
            // Both have ratings or both don't - sort by rating value
            if (sortOption === 'rating-desc') {
              return ratingB - ratingA; // High to low
            } else {
              return ratingA - ratingB; // Low to high
            }
          default:
            return 0;
        }
      });
    }

    return filtered;
  });

  onSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  toggleSidebar() {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  onCategoryChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedCategory.set(target.value);
  }

  onBrandChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedBrand.set(target.value);
  }

  onPriceInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value.trim();
    this.maxPrice.set(value === '' ? null : Number(value));
  }

  onRatingChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const value = Number.parseFloat(target.value);
    this.minRating.set(Number.isFinite(value) ? Math.min(5, Math.max(0, value)) : 0);
  }

  onSortChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.sortBy.set(target.value as any);
  }

  clearFilters() {
    this.searchQuery.set('');
    this.selectedCategory.set('');
    this.selectedBrand.set('');
    this.maxPrice.set(null);
    this.minRating.set(0);
    this.sortBy.set('');
  }

  editProduct(p: Product): void {
    this.router.navigate(['/admin'], { queryParams: { edit: p._id } });
  }
}
