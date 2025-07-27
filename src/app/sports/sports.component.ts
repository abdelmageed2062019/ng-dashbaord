import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../service/api.service';
import { Router } from '@angular/router';
import { NgModel } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sports',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sports.component.html',
  styleUrls: ['./sports.component.css']
})
export class SportsComponent implements OnInit {
  sports: any[] = [];
  loading = true;
  error: string | null = null;

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.apiService.GetSports().subscribe({
      next: (data) => {
        this.sports = data;
        console.log('Sports data loaded:', this.sports);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load sports.';
        this.loading = false;
      }
    });
  }

  goToSport(sport: any) {
    this.router.navigate(['/sport', sport.id], { state: { sportConfig: sport.sport_config } });
  }
}
