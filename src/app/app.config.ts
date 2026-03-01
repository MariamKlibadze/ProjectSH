// app.config.ts - Application configuration for Angular standalone app
// Defines providers and services used throughout the application

import { ApplicationConfig } from '@angular/core'; // Type for application configuration
import { provideHttpClient } from '@angular/common/http'; // Provider for HTTP client service
import { provideRouter } from '@angular/router'; // Provider for Angular router
import { routes } from './app.routes'; // Route definitions
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core'; // Translation service providers
import { HttpClient } from '@angular/common/http'; // HTTP client for API calls
import { Observable } from 'rxjs'; // Observable type for async operations

// Custom loader class for ngx-translate to load translation files
class CustomLoader implements TranslateLoader {
  constructor(private http: HttpClient) { }

  // Method to load translation file for a specific language
  getTranslation(lang: string): Observable<any> {
    return this.http.get(`./assets/i18n/${lang}.json`);
  }
}

// Application configuration object with all providers
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), // Router provider with route definitions
    provideHttpClient(), // HTTP client provider for API calls
    provideTranslateService({ // Translation service configuration
      fallbackLang: 'en', // Fallback language is English
      loader: { // Custom loader for translation files
        provide: TranslateLoader,
        useClass: CustomLoader,
        deps: [HttpClient] // Dependencies for the loader
      }
    }),
  ],
};