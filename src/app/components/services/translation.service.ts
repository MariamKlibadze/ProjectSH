import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class TranslationService {
    private googleTranslateUrl = 'https://translation.googleapis.com/language/translate/v2';
    private apiKey = 'YOUR_GOOGLE_API_KEY'; // Replace with actual API key

    constructor(private http: HttpClient, private translate: TranslateService) { }

    translateText(text: string, targetLang: string): Observable<string> {
        if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_API_KEY') {
            return of(text); // Fallback to original text
        }

        const body = {
            q: text,
            target: targetLang,
            source: 'en',
            key: this.apiKey
        };

        return this.http.post<any>(this.googleTranslateUrl, body).pipe(
            map(response => response.data.translations[0].translatedText),
            catchError(() => of(text))
        );
    }

    getTranslation(key: string): Observable<string> {
        return this.translate.get(key).pipe(
            map(translation => {
                if (translation === key) {
                    // If translation not found, try Google Translate
                    const currentLang = this.translate.currentLang;
                    if (currentLang !== 'en') {
                        return this.translateText(key, currentLang);
                    }
                }
                return of(translation);
            }),
            catchError(() => of(of(key))),
            map(obs => obs) // obs is Observable<string>
        ).pipe(
            // Flatten the inner observable
            switchMap(obs => obs)
        );
    }
}