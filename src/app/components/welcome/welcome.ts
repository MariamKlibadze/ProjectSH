import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-welcome',
  imports: [RouterLink, TranslateModule],
  templateUrl: './welcome.html',
  styleUrl: './welcome.css',
})
export class Welcome {
  constructor(private translate: TranslateService) {
    // Set default language
    this.translate.setDefaultLang('en');
    const savedLang = localStorage.getItem('language') || 'en';
    this.translate.use(savedLang);
  }

  switchLanguage(lang: string) {
    this.translate.use(lang);
    localStorage.setItem('language', lang);
  }

  get currentLang() {
    return this.translate.currentLang || 'en';
  }
}
