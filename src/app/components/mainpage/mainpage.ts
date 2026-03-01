import { Component } from '@angular/core';
import { CardsComponent } from './cards/cards';

@Component({
  selector: 'app-mainpage',
  imports: [CardsComponent],
  templateUrl: './mainpage.html',
  styleUrl: './mainpage.css',
})
export class Mainpage {

}
