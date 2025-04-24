import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../service/api.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule,CommonModule],
  // Removed 'imports' as it is not valid for non-standalone components
})
export class LoginComponent {
  loginForm: FormGroup;
  loginError: string | null = null;

  constructor(private fb: FormBuilder, private apiService: ApiService, private cookieService: CookieService) {
    // Check if token is already available in local storage
    const token = localStorage.getItem('authToken');
    if (token) {
      // If token exists, redirect to the main page or wherever you want
      this.cookieService.set('authToken', token, { secure: true });
      window.location.href = '/'; // Redirect to the main page
    }
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.apiService.getToken(this.loginForm.value.username, this.loginForm.value.password)
        .subscribe({
          next: (response) => {
            localStorage.setItem('authToken', response.token);
            window.location.href = ''; // Redirect on success
          },
          error: (err) => {
            this.loginError = 'Invalid username or password. Please try again.';
          }
        });
      }
    }

}