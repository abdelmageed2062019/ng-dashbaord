import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service'; // Import CookieService

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})

export class AppComponent {
  
  constructor(private router: Router, private cookieService: CookieService) {}
  title = 'NGSC Admin Panel';
  isLoggedIn = !!localStorage.getItem('authToken'); // Check if token exists
  logout() {
    localStorage.clear();  // Clear local storage
    this.cookieService.deleteAll();  // Clear all cookies
    this.router.navigate(['/login']);  // Redirect to login page
  }
}

