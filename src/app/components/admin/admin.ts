import { Component, OnInit, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductsService, Product } from '../services/products.service';
import { ReviewsService, Review } from '../services/reviews.service';
import { AuthService } from '../services/auth.service';

@Component({
    selector: 'app-admin',
    standalone: true,
    imports: [FormsModule, TranslateModule],
    templateUrl: './admin.html',
    styleUrls: ['./admin.css'],
})
export class AdminComponent implements OnInit {
    products: Product[] = [];
    loading = false;
    errorMessage = '';
    reviews = computed(() => Object.values(this.reviewsApi.allReviews()).flat());

    private editId: string | null = null;

    // dropdown options
    categories: string[] = [];
    brands: string[] = [];

    // form model
    editing: Product | null = null;
    title = '';
    brand = '';
    price = 0;
    currency = '₾';
    stock = 0;
    categoryName = '';
    thumbnail = '';
    description = '';


    constructor(private productsApi: ProductsService, private reviewsApi: ReviewsService, private auth: AuthService, private router: Router, private route: ActivatedRoute) {
        effect(() => {
            if (!this.auth.isAdmin()) {
                this.router.navigateByUrl('/mainpage');
            }
        });
    }

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            this.editId = params['edit'] || null;
        });
        this.load();
    }

    load(): void {
        this.loading = true;
        this.errorMessage = '';
        // Match the working page size used on the cards page.
        this.productsApi.getAll(1, 120).subscribe({
            next: (res) => {
                this.products = res.products;
                this.loading = false;
                this.updateDropdowns();
                this.checkEdit();
                if (this.products.length === 0) {
                    this.productsApi.getAllUnpaged().subscribe({
                        next: (products) => {
                            this.products = products;
                            this.updateDropdowns();
                            this.checkEdit();
                        },
                        error: () => {
                            this.errorMessage = 'Failed to load products.';
                        }
                    });
                }
            },
            error: () => {
                this.loading = false;
                this.errorMessage = 'Failed to load products.';
            }
        });
    }

    updateDropdowns(): void {
        this.categories = [...new Set(this.products.map(p => p.category.name))].sort();
        this.brands = [...new Set(this.products.map(p => p.brand))].sort();
    }

    startAdd(): void {
        this.editing = null;
        this.title = '';
        this.brand = '';
        this.price = 0;
        this.currency = '₾';
        this.stock = 0;
        this.categoryName = '';
        this.thumbnail = '';
        this.description = '';
    }

    edit(p: Product): void {
        this.editing = p;
        this.title = p.title;
        this.brand = p.brand;
        this.price = p.price.current;
        this.currency = p.price.currency;
        this.stock = p.stock;
        this.categoryName = p.category.name;
        this.thumbnail = p.thumbnail;
        this.description = p.description;
    }

    save(): void {
        // Validate required fields
        if (!this.title.trim() || !this.brand.trim() || !this.categoryName.trim()) {
            alert('Please fill in all required fields: Title, Brand, and Category');
            return;
        }

        if (this.price <= 0) {
            alert('Please enter a valid price greater than 0');
            return;
        }

        if (this.stock < 0) {
            alert('Please enter a valid stock quantity (0 or greater)');
            return;
        }

        const input: Partial<Product> = {
            title: this.title.trim(),
            brand: this.brand.trim(),
            price: { current: this.price, currency: this.currency },
            stock: this.stock,
            category: { id: this.categoryName.toLowerCase().replace(/\s+/g, '-'), name: this.categoryName.trim(), image: '' },
            thumbnail: this.thumbnail?.trim() || '',
            description: this.description?.trim() || '',
            rating: this.editing?.rating ?? 0,
        };

        if (this.editing) {
            const updated: Product = { ...this.editing, ...input, price: input.price ?? this.editing.price, category: input.category ?? this.editing.category } as Product;
            this.productsApi.updateProductRemote(updated).subscribe({
                next: () => {
                    this.load();
                    this.startAdd();
                },
                error: (error) => {
                    console.error('Error updating product:', error);
                    alert('Failed to update product. Please try again.');
                }
            });
        } else {
            this.productsApi.addProductRemote(input).subscribe({
                next: () => {
                    this.load();
                    this.startAdd();
                },
                error: (error) => {
                    console.error('Error adding product:', error);
                    alert('Failed to add product. Please try again.');
                }
            });
        }
    }

    remove(id: string): void {
        if (!confirm('Delete product?')) return;
        this.productsApi.deleteProductRemote(id).subscribe(() => this.load());
    }

    removeReview(reviewId: string): void {
        if (!confirm('Delete review?')) return;
        this.reviewsApi.deleteReview(reviewId);
    }

    getProductTitle(productId: string): string {
        const product = this.products.find(p => p._id === productId);
        return product ? product.title : 'Unknown Product';
    }

    goToProduct(productId: string): void {
        this.router.navigate(['/product', productId]);
    }

    private checkEdit(): void {
        if (this.editId) {
            const product = this.products.find(p => p._id === this.editId);
            if (product) {
                this.edit(product);
            }
            this.editId = null;
        }
    }

}
