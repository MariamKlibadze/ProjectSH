import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FavoritesService } from '../services/favorites.service';

@Component({
  selector: 'app-favorites',
  imports: [RouterLink, TranslateModule],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css',
})
export class Favorites {
  constructor(public favoritesService: FavoritesService) { }

  items() {
    return this.favoritesService.items();
  }

  remove(productId: string) {
    this.favoritesService.remove(productId);
  }
}
