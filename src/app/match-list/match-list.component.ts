import { Component, OnInit } from '@angular/core';
import { ApiService } from '../service/api.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-match-list',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './match-list.component.html',
  styleUrls: ['./match-list.component.css']
})
export class MatchListComponent implements OnInit {
  matches: any[] = [];
  loading: boolean = true;

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.loadLiveMatches();
  }

  loadLiveMatches(): void {
    this.loading = true;
    this.apiService.getLiveMatches().subscribe({
      next: (data) => {
        this.matches = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching live matches:', error);
        this.loading = false;
      }
    });
  }
}
