import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../service/api.service';

@Component({
  selector: 'app-sport-matches',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sport-matches.component.html',
  styleUrls: ['./sport-matches.component.css']
})
export class SportMatchesComponent implements OnInit {
  matches: any[] = [];
  filteredMatches: any[] = [];
  loading = true;
  error: string | null = null;
  sportId: string | null = null;
  sportConfig: any = null;
  
  // Filter properties
  selectedStatus: string = '';
  selectedTeam: string = '';
  selectedDate: string = '';
  
  // Available filter options
  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'live', label: 'Live' },
    { value: 'finished', label: 'Finished' },
    { value: 'postponed', label: 'Postponed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];
  
  teams: any[] = [];

  constructor(private route: ActivatedRoute, private apiService: ApiService, private router: Router) {}

  onMatchClick(match: any) {
    this.router.navigate(['/update-match-data', match.id], { 
      state: { 
        sportConfig: this.sportConfig,
        sportId: this.sportId 
      } 
    });
  }

  ngOnInit(): void {
    this.sportId = this.route.snapshot.paramMap.get('sportId');
    this.sportConfig = history.state.sportConfig;
    this.loadMatches();
  }

  loadMatches(): void {
    if (this.sportId) {
      this.loading = true;
      this.apiService.getMatchList({ sport: this.sportId }).subscribe({
        next: (data) => {
          this.matches = data;
          this.filteredMatches = [...this.matches];
          this.extractTeams();
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

  extractTeams(): void {
    const teamsSet = new Set();
    this.matches.forEach(match => {
      if (match.matchteams && match.matchteams.length > 0) {
        match.matchteams.forEach((teamData: any) => {
          if (teamData.team) {
            teamsSet.add(JSON.stringify({ id: teamData.team.id, name: teamData.team.name }));
          }
        });
      }
    });
    
    this.teams = Array.from(teamsSet).map(teamStr => JSON.parse(teamStr as string));
    this.teams.sort((a, b) => a.name.localeCompare(b.name));
  }

  applyFilters(): void {
    this.filteredMatches = this.matches.filter(match => {
      let matchesFilter = true;

      // Status filter
      if (this.selectedStatus && match.status !== this.selectedStatus) {
        matchesFilter = false;
      }

      // Team filter
      if (this.selectedTeam) {
        const hasTeam = match.matchteams?.some((teamData: any) => 
          teamData.team?.id.toString() === this.selectedTeam
        );
        if (!hasTeam) {
          matchesFilter = false;
        }
      }

      // Date filter
      if (this.selectedDate) {
        const matchDate = new Date(match.match_date).toDateString();
        const filterDate = new Date(this.selectedDate).toDateString();
        if (matchDate !== filterDate) {
          matchesFilter = false;
        }
      }

      return matchesFilter;
    });
  }

  clearFilters(): void {
    this.selectedStatus = '';
    this.selectedTeam = '';
    this.selectedDate = '';
    this.filteredMatches = [...this.matches];
  }

  getMatchScore(match: any): string {
    if (!match.matchteams || match.matchteams.length === 0) {
      return 'No teams';
    }

    if (match.status === 'upcoming') {
      return 'vs';
    }

    if (match.matchteams.length === 2) {
      const team1Score = match.matchteams[0].score || 0;
      const team2Score = match.matchteams[1].score || 0;
      return `${team1Score} - ${team2Score}`;
    }

    return 'TBD';
  }

  getMatchTeams(match: any): string {
    if (!match.matchteams || match.matchteams.length === 0) {
      return 'No teams assigned';
    }

    return match.matchteams
      .map((teamData: any) => teamData.team?.name || 'Unknown Team')
      .join(' vs ');
  }

  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'live':
        return 'badge bg-success';
      case 'finished':
        return 'badge bg-secondary';
      case 'upcoming':
        return 'badge bg-primary';
      case 'postponed':
        return 'badge bg-warning';
      case 'cancelled':
        return 'badge bg-danger';
      default:
        return 'badge bg-light text-dark';
    }
  }

  formatMatchDate(dateString: string): string {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
