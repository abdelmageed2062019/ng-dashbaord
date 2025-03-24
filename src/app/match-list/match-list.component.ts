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
  loading: boolean = true;
  private ngUnsubscribe$ = new Subject<void>();
  private liveUpdateInterval: any;

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

  startLiveUpdates(): void {
    this.liveUpdateInterval = setInterval(() => {
      this.updateLiveMatches();
    }, 10000); // 10 seconds
  }
}