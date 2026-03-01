import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, TranslateModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  name = '';
  surname = '';
  gender = '';
  dateOfBirth = '';
  email = '';
  password = '';
  message = '';
  submitting = false;

  constructor(private auth: AuthService, private router: Router) { }

  async submit(): Promise<void> {
    if (this.submitting) return;

    this.submitting = true;
    const result = await this.auth.register({
      name: this.name,
      surname: this.surname,
      gender: this.gender,
      dateOfBirth: this.dateOfBirth,
      email: this.email,
      password: this.password,
    });
    this.message = result.message;
    this.submitting = false;

    if (result.ok) {
      this.router.navigateByUrl('/mainpage');
    }
  }
}
