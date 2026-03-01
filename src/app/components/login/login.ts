import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, TranslateModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email = '';
  password = '';
  message = '';

  constructor(private auth: AuthService, private router: Router) { }

  submit(): void {
    const result = this.auth.login(this.email, this.password);
    this.message = result.message;

    if (result.ok) {
      // redirect admins to admin page
      if (this.auth.currentUserEmail() === 'admin@admin.ge') {
        this.router.navigateByUrl('/admin');
        return;
      }

      this.router.navigateByUrl('/mainpage');
    }
  }
}
