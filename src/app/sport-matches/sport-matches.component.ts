import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../service/api.service';

@Component({
  selector: 'app-sport-matches',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sport-matches.component.html',
  styleUrls: ['./sport-matches.component.css']
})
export class SportMatchesComponent implements OnInit {
  matches: any[] = [];
  loading = true;
  error: string | null = null;
  sportId: string | null = null;
  sportConfig: any = null;

  constructor(private route: ActivatedRoute, private apiService: ApiService, private router: Router) {}

  onMatchClick(match: any) {
    this.router.navigate(['/update-match-data', match.id], { state: { sportConfig: this.sportConfig } });
  }

  ngOnInit(): void {
    this.sportId = this.route.snapshot.paramMap.get('sportId');
    this.sportConfig = history.state.sportConfig;
    if (this.sportId) {
      this.apiService.getMatchList({ sport: this.sportId }).subscribe({
        next: (data) => {
          this.matches = data;
          console.log('Matches for sport loaded:', this.matches);
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load matches.';
          this.loading = false;
        }
      });
    } else {
      this.error = 'No sport ID provided.';
      this.loading = false;
    }
  }
}
