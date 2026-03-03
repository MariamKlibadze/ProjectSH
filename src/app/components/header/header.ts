import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from "@angular/router";
import { AuthService } from '../services/auth.service';
import { CartService } from '../services/cart.service';
import { FavoritesService } from '../services/favorites.service';
import { TranslateService } from '@ngx-translate/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, TranslateModule, CommonModule, FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  isMobileMenuOpen = false;
  isDarkMode = false;
  showProfileModal = signal(false);
  profileName = signal('');
  profileSurname = signal('');
  profileEmail = signal('');
  profileMobile = signal('');
  profileDateOfBirth = signal('');
  profileMessage = signal('');

  constructor(
    public auth: AuthService,
    public cart: CartService,
    public favorites: FavoritesService,
    private translate: TranslateService
  ) {
    // Set default language
    this.translate.setDefaultLang('en');
    const savedLang = localStorage.getItem('language') || 'en';
    this.translate.use(savedLang);

    // Set default theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    this.isDarkMode = savedTheme === 'dark';
    this.applyTheme();
  }

  cartCount() {
    return this.cart.items().reduce((sum, it) => sum + it.quantity, 0);
  }

  favoritesCount() {
    return this.favorites.items().length;
  }

  switchLanguage(lang: string) {
    this.translate.use(lang);
    localStorage.setItem('language', lang);
  }

  get currentLang() {
    return this.translate.currentLang || 'en';
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

  private applyTheme() {
    const body = document.body;
    if (this.isDarkMode) {
      body.setAttribute('data-theme', 'dark');
    } else {
      body.removeAttribute('data-theme');
    }
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  openProfileModal() {
    const user = this.getCurrentUser();
    if (user) {
      this.profileName.set(user.name || '');
      this.profileSurname.set(user.surname || '');
      this.profileEmail.set(user.email || '');
      this.profileDateOfBirth.set(user.dateOfBirth || '');
      this.profileMessage.set('');
      this.showProfileModal.set(true);
      this.closeMobileMenu(); // Close mobile menu when opening profile modal
    }
  }

  closeProfileModal() {
    this.showProfileModal.set(false);
  }

  saveProfile() {
    const result = this.auth.updateUser({
      name: this.profileName(),
      surname: this.profileSurname(),
      email: this.profileEmail(),
      dateOfBirth: this.profileDateOfBirth(),
    });
    this.profileMessage.set(result.message);
    if (result.ok) {
      setTimeout(() => this.closeProfileModal(), 2000);
    }
  }

  private getCurrentUser() {
    const email = this.auth.currentUserEmail();
    if (!email) return null;
    return this.auth['users']().find((u: any) => u.email === email);
  }
}
