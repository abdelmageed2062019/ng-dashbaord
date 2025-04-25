import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../service/api.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-match-list',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './match-list.component.html',
  styleUrls: ['./match-list.component.css']
})
export class MatchListComponent implements OnInit, OnDestroy {
  matches: any[] = [];
  upcomingmatches: any[] = [];
  loading: boolean = true;
  private ngUnsubscribe$ = new Subject<void>();
  private liveUpdateInterval: any;
  notification: { message: string, type: 'success' | 'error' } | null = null;

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.loadInitialLiveMatches(); // Load initial data
    this.startLiveUpdates();
  }

  ngOnDestroy(): void {
    clearInterval(this.liveUpdateInterval);
    this.ngUnsubscribe$.next();
    this.ngUnsubscribe$.complete();
  }

  loadInitialLiveMatches(): void {
    this.loading = true;
    this.apiService.get_halftime_live_matches().pipe(takeUntil(this.ngUnsubscribe$)).subscribe({
      next: (data) => {
        this.matches = data;
        this.loading = false;
        console.log('Live matches:', data);
      },
      error: (error) => {
        console.error('Error fetching live matches:', error);
        this.loading = false;
      }
    });

    this.apiService.get_upcoming_matches().pipe(takeUntil(this.ngUnsubscribe$)).subscribe({
      next: (data) => {
        this.upcomingmatches = data;
        this.loading = false;
        console.log('upcoming matches:', data);
      },
      error: (error) => {
        console.error('Error fetching upcoming matches:', error);
        this.loading = false;
      }
    });
  }
  updateLiveMatches(): void {

    this.apiService.get_halftime_live_matches().pipe(takeUntil(this.ngUnsubscribe$)).subscribe({
      next: (data) => {
        this.matches = data;
        console.log('Live matches updated:', data);
      },
      error: (error) => {
        console.error('Error fetching live matches:', error);

      }
    });
  }
  updateupcomingMatches(): void {

    this.apiService.get_upcoming_matches().pipe(takeUntil(this.ngUnsubscribe$)).subscribe({
      next: (data) => {
        this.upcomingmatches = data;
        console.log('upcoming matches updated:', data);
      },
      error: (error) => {
        console.error('Error fetching upcoming matches:', error);

      }
    });
  }

  startLiveUpdates(): void {
    this.liveUpdateInterval = setInterval(() => {
      this.updateLiveMatches();
      this.updateupcomingMatches();
    }, 10000); // 10 seconds
  }
  updateMatchStatus(matchId:any) {
    const confirmation = window.confirm('Are you sure you want to mark the match as LIVE?');
    
    if (confirmation) {
      //this.matchStatus = 'Live';
      this.liveMatch(matchId);
      //console.log('Match status updated to:', this.matchStatus);
    }
  }
  liveMatch(matchId:any): void {
    const updateData = { status: 'live' }; // Prepare the update data

    this.apiService.updateMatch(matchId, updateData).subscribe({
      next: (data) => {
        this.showNotification('Status successfully switched to live!', 'success');
        // Optionally, navigate away or refresh the data
        alert('Status successfully switched to live!');
        
      },
      error: (error) => {
        this.showNotification('Error switched to live!. Please try again.', 'error');
        alert('Error switched to live!. Please try again.');
        console.error('Error switched to live!:', error);
      }
    });
  }
  private showNotification(message: string, type: 'success' | 'error'): void {
    this.notification = { message, type };
    setTimeout(() => this.notification = null, 5000);
  }

}