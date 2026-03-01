// app.ts - Root component of the Angular application
// Manages the overall application layout and shell visibility

import { Component, inject, signal } from '@angular/core'; // Angular core components and signals
import { NavigationEnd, Router, RouterOutlet } from '@angular/router'; // Router components for navigation
import { Header } from './components/header/header'; // Application header component
import { Footer } from './components/footer/footer'; // Application footer component

@Component({
  selector: 'app-root', // Root selector for the application
  imports: [RouterOutlet, Footer, Header], // Components to import for this module
  templateUrl: './app.html', // Template file for the component
  styleUrl: './app.css' // Stylesheet for the component
})
export class App {
  private readonly router = inject(Router); // Injected router service for navigation
  protected readonly title = signal('projectSH'); // Application title signal
  protected readonly showShell = signal(true); // Signal to control header/footer visibility

  constructor() {
    // Initialize shell visibility based on current URL
    this.updateShellVisibility(this.router.url);

    // Subscribe to router events to update shell visibility on navigation
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateShellVisibility(event.urlAfterRedirects);
      }
    });
  }

  // Method to update header/footer visibility based on current route
  private updateShellVisibility(url: string) {
    // Hide shell (header/footer) on welcome page, show on other pages
    this.showShell.set(url !== '/' && url !== '/welcome');
  }
}
