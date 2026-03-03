// auth.service.ts - Service for user authentication and session management
// Handles user registration, login, logout, and admin privileges

import { Injectable, computed, signal } from '@angular/core'; // Angular core and signals
import { TranslateService } from '@ngx-translate/core'; // Translation service

// Type definition for user data structure
type AuthUser = {
  id?: string; // API ID
  name: string; // User's first name
  surname: string; // User's last name
  gender: string; // User's gender
  dateOfBirth: string; // User's date of birth
  email: string; // User's email (unique identifier)
  password: string; // User's password (should be hashed in production)
};

// Local storage keys for persistence
const USERS_KEY = 'projectsh_users'; // Key for storing user data
const SESSION_KEY = 'projectsh_session_email'; // Key for storing current session
const AUTH_API_BASE = 'https://699dd36183e60a406a4787b2.mockapi.io/Auth'; // API base URL
const AUTH_API_ENABLED = true; // Flag to enable/disable API integration

@Injectable({ providedIn: 'root' }) // Singleton service
export class AuthService {
  private users = signal<AuthUser[]>(this.loadUsers()); // Signal for user list
  readonly currentUserEmail = signal<string | null>(this.loadSession()); // Current user email
  readonly isLoggedIn = computed(() => !!this.currentUserEmail()); // Computed login status
  readonly isAdmin = computed(() => this.currentUserEmail() === 'admin@admin.ge'); // Computed admin status

  constructor(private translate: TranslateService) { }

  // Get current user's display name
  currentUserName(): string | null {
    const email = this.currentUserEmail();
    if (!email) return null;
    const user = this.users().find((u) => u.email === email);
    if (!user) return null;
    const name = (user.name ?? '').trim();
    const surname = (user.surname ?? '').trim();
    return (name || surname) ? `${name} ${surname}`.trim() : null;
  }

  async register(userInput: AuthUser): Promise<{ ok: boolean; message: string }> {
    const name = userInput.name.trim();
    const surname = userInput.surname.trim();
    const gender = userInput.gender.trim();
    const dateOfBirth = userInput.dateOfBirth.trim();
    const password = userInput.password;
    const normalizedEmail = userInput.email.trim().toLowerCase();

    if (!name || !surname || !gender || !dateOfBirth || !normalizedEmail || !password.trim()) {
      return { ok: false, message: this.translate.instant('AUTH.MESSAGES.ALL_FIELDS_REQUIRED') };
    }

    const exists = this.users().some((user) => user.email === normalizedEmail);
    if (exists) {
      return { ok: false, message: this.translate.instant('AUTH.MESSAGES.EMAIL_EXISTS') };
    }

    function toAuthApiPayload(u: AuthUser) {
      return {
        name: u.name,
        surname: u.surname,
        gender: u.gender,
        dateofbirth: u.dateOfBirth, // API field
        email: u.email,
        password: u.password,
      };
    }


    let remoteWarning = '';
    if (AUTH_API_ENABLED) {
      try {
        const response = await fetch(AUTH_API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            toAuthApiPayload({
              name,
              surname,
              gender,
              dateOfBirth: dateOfBirth,
              email: normalizedEmail,
              password,
            })
          ),
        });

        if (!response.ok) {
          remoteWarning = this.translate.instant('AUTH.MESSAGES.REMOTE_SAVE_FAILED', { status: response.status });
        }
      } catch {
        remoteWarning = this.translate.instant('AUTH.MESSAGES.REMOTE_SAVE_NETWORK_ERROR');
      }
    } else {
      remoteWarning = this.translate.instant('AUTH.MESSAGES.REMOTE_SYNC_DISABLED');
    }

    const nextUsers = [
      ...this.users(),
      { name, surname, gender, dateOfBirth, email: normalizedEmail, password },
    ];
    this.users.set(nextUsers);
    this.saveUsers(nextUsers);

    this.currentUserEmail.set(normalizedEmail);
    this.saveSession(normalizedEmail);

    return {
      ok: true,
      message: remoteWarning
        ? this.translate.instant('AUTH.MESSAGES.REGISTRATION_SUCCESS_LOCAL', { warning: remoteWarning })
        : this.translate.instant('AUTH.MESSAGES.REGISTRATION_SUCCESS'),
    };
  }

  login(email: string, password: string): { ok: boolean; message: string } {
    const normalizedEmail = email.trim().toLowerCase();
    // special admin credentials (not required to be registered)
    if (normalizedEmail === 'admin@admin.ge' && password === '12345') {
      this.currentUserEmail.set(normalizedEmail);
      this.saveSession(normalizedEmail);
      return { ok: true, message: this.translate.instant('AUTH.MESSAGES.LOGIN_ADMIN') };
    }

    const user = this.users().find((u) => u.email === normalizedEmail && u.password === password);

    if (!user) {
      return { ok: false, message: this.translate.instant('AUTH.MESSAGES.INVALID_CREDENTIALS') };
    }

    this.currentUserEmail.set(user.email);
    this.saveSession(user.email);
    return { ok: true, message: this.translate.instant('AUTH.MESSAGES.LOGIN_SUCCESS') };
  }

  logout(): void {
    this.currentUserEmail.set(null);
    localStorage.removeItem(SESSION_KEY);
  }

  updateUser(updates: Partial<Pick<AuthUser, 'name' | 'surname' | 'email' | 'dateOfBirth'>>): { ok: boolean; message: string } {
    const email = this.currentUserEmail();
    if (!email) {
      return { ok: false, message: 'Not logged in' };
    }
    const users = this.users();
    const userIndex = users.findIndex(u => u.email === email);
    if (userIndex === -1) {
      return { ok: false, message: 'User not found' };
    }
    const updatedUser = { ...users[userIndex], ...updates };
    if (updates.email && updates.email !== email) {
      // Check if new email is taken
      if (users.some(u => u.email === updates.email)) {
        return { ok: false, message: 'Email already in use' };
      }
      // Update session
      this.currentUserEmail.set(updates.email);
      this.saveSession(updates.email);
    }
    users[userIndex] = updatedUser;
    this.users.set(users);
    this.saveUsers(users);

    // Send to API if enabled and user has ID
    if (AUTH_API_ENABLED && updatedUser.id) {
      fetch(`${AUTH_API_BASE}/${updatedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      }).catch(() => {
        // API update failed, but local update succeeded
      });
    }

    return { ok: true, message: 'Profile updated successfully' };
  }

  private loadUsers(): AuthUser[] {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw) as Partial<AuthUser>[];
      return parsed
        .filter((user) => !!user?.email && !!user?.password)
        .map((user) => ({
          id: user.id,
          name: user.name ?? '',
          surname: user.surname ?? '',
          gender: user.gender ?? '',
          dateOfBirth: user.dateOfBirth ?? '',
          email: (user.email ?? '').toLowerCase(),
          password: user.password ?? '',
        }));
    } catch {
      return [];
    }
  }

  private saveUsers(users: AuthUser[]): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  private loadSession(): string | null {
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  }

  private saveSession(email: string): void {
    localStorage.setItem(SESSION_KEY, email);
  }
}
