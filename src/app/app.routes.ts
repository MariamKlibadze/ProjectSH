// app.routes.ts - Route definitions for the Angular application
// Maps URL paths to components and defines navigation structure

import { Routes } from '@angular/router'; // Type for route configuration
import { Mainpage } from './components/mainpage/mainpage'; // Main product listing page
import { Favorites } from './components/favorites/favorites'; // User's favorite products page
import { Cart } from './components/cart/cart'; // Shopping cart page
import { Login } from './components/login/login'; // User login page
import { ProductDetailsComponent } from './components/product-details/product-details'; // Individual product details page
import { AdminComponent } from './components/admin/admin'; // Admin panel for managing products
import { Register } from './components/register/register'; // User registration page
import { AdminGuard } from './components/services/admin.guard'; // Guard to protect admin routes
import { Welcome } from './components/welcome/welcome'; // Welcome/landing page

// Route configuration array defining all application routes
export const routes: Routes = [
    { path: '', component: Welcome }, // Default route - welcome page
    { path: 'welcome', component: Welcome }, // Explicit welcome route
    { path: 'mainpage', component: Mainpage }, // Main product browsing page
    { path: 'favorites', component: Favorites }, // User's saved favorite products
    { path: 'cart', component: Cart }, // Shopping cart contents
    { path: 'login', component: Login }, // User authentication page
    { path: 'register', component: Register }, // New user registration page
    { path: 'admin', component: AdminComponent, canActivate: [AdminGuard] }, // Admin panel (protected by guard)
    { path: 'product/:id', component: ProductDetailsComponent }, // Dynamic route for product details (id parameter)
    { path: '**', redirectTo: '' }, // Wildcard route - redirect unknown paths to home
];
