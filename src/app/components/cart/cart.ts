import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CartService } from '../services/cart.service';
import { OrdersService, Order } from '../services/orders.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, TranslateModule],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  showCheckoutModal = false;
  showConfirmationModal = false;
  currentOrderNumber: string | null = null;
  errorMessage = '';

  constructor(
    public cartService: CartService,
    private ordersService: OrdersService,
    private authService: AuthService,
    private translate: TranslateService
  ) { }

  items() {
    return this.cartService.items();
  }

  totalItems() {
    return this.items().reduce((sum, item) => sum + item.quantity, 0);
  }

  totalPrice() {
    return this.items().reduce((sum, item) => sum + (item.product.price.current * item.quantity), 0);
  }

  currency() {
    return this.items().length > 0 ? this.items()[0].product.price.currency : '₾';
  }

  increment(productId: string) {
    this.cartService.increment(productId);
  }

  decrement(productId: string) {
    this.cartService.decrement(productId);
  }

  remove(productId: string) {
    this.cartService.remove(productId);
  }

  checkout() {
    this.showCheckoutModal = true;
  }

  closeCheckoutModal() {
    this.showCheckoutModal = false;
  }

  confirmCheckout() {
    const items = this.items();
    const orderNumber = this.ordersService.generateOrderNumber();

    const orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
      orderNumber,
      orderDate: new Date().toISOString(),
      status: 'confirmed',
      customerEmail: this.authService.currentUserEmail() || null,
      customerName: this.authService.currentUserName() || null,
      items: items.map(item => ({
        productId: item.product._id,
        productTitle: item.product.title,
        productThumbnail: item.product.thumbnail,
        quantity: item.quantity,
        unitPrice: item.product.price.current,
        currency: item.product.price.currency
      })),
      totalItems: this.totalItems(),
      subtotal: this.totalPrice(),
      totalAmount: this.totalPrice(),
      currency: this.currency()
    };

    this.ordersService.createOrder(orderData).subscribe({
      next: (createdOrder) => {
        if (createdOrder) {
          this.currentOrderNumber = createdOrder.orderNumber;
          this.showConfirmationModal = true;
        } else {
          // Handle error - could show error message
          this.errorMessage = this.translate.instant('CART.ORDER_CREATION_FAILED');
        }
      },
      error: (error) => {
        console.error('Order creation failed:', error);
        this.errorMessage = this.translate.instant('CART.ORDER_CREATION_FAILED');
      }
    });
  }

  closeConfirmationModal() {
    this.cartService.clearCart();
    this.showConfirmationModal = false;
    this.showCheckoutModal = false;
    this.currentOrderNumber = null;
  }
}
