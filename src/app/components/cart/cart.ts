import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CartService } from '../services/cart.service';

@Component({
  selector: 'app-cart',
  imports: [TranslateModule],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  constructor(public cartService: CartService) { }

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
    // For demo purposes, show an alert with order summary
    const summary = `Order Summary:\nTotal Items: ${this.totalItems()}\nTotal Price: ${this.totalPrice()} ${this.currency()}\n\nThank you for your purchase!`;
    alert(summary);

    // In a real app, this would navigate to a checkout page or process payment
    // this.router.navigate(['/checkout']);
  }
}
