import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../service/api.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-update-match',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule],
  templateUrl: './update-match.component.html',
  styleUrls: ['./update-match.component.css']
})
export class UpdateMatchComponent implements OnInit {
  matchId!: number;
  matchForm!: FormGroup;
  notification: { message: string, type: 'success' | 'error' } | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadMatchData();
  }

  private initializeForm(): void {
    this.matchForm = this.fb.group({
      score_team1: [0, [Validators.required, Validators.min(0)]],
      score_team2: [0, [Validators.required, Validators.min(0)]],
      status: ['', Validators.required],
      yellow_cards: [0, [Validators.required, Validators.min(0)]]
    });
  }

  private loadMatchData(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('matchId');
      if (id) {
        this.matchId = +id;
        this.apiService.getMatchDetails(this.matchId).subscribe({
          next: (data) => this.patchFormValues(data),
          error: (error) => console.error('Error fetching match details:', error)
        });
      }
    });
  }

  private patchFormValues(data: any): void {
    this.matchForm.patchValue({
      score_team1: data.score_team1,
      score_team2: data.score_team2,
      status: data.status,
      yellow_cards: data.yellow_cards
    });
  }

  onSubmit(): void {
    if (this.matchForm.valid) {
      this.apiService.updateMatch(this.matchId, this.matchForm.value).subscribe({
        next: (data) => {
          this.showNotification('Match updated successfully!', 'success');
          setTimeout(() => this.router.navigate(['/']), 2000);
        },
        error: (error) => {
          this.showNotification('Error updating match. Please try again.', 'error');
          console.error('Error updating match:', error);
          setTimeout(() => this.router.navigate(['/']), 3000);
        }
      });
    } else {
      this.matchForm.markAllAsTouched();
      this.showNotification('Please correct the form errors.', 'error');
    }
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    this.notification = { message, type };
    setTimeout(() => this.notification = null, 5000); // Clear after 5 seconds
  }

  get score_team1() { return this.matchForm.get('score_team1')!; }
  get score_team2() { return this.matchForm.get('score_team2')!; }
  get status() { return this.matchForm.get('status')!; }
  get yellow_cards() { return this.matchForm.get('yellow_cards')!; }
}