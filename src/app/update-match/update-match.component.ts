import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../service/api.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-update-match',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule],
  templateUrl: './update-match.component.html',
  styleUrls: ['./update-match.component.css']
})
export class UpdateMatchComponent implements OnInit {
  matchId!: number;
  matchData: any = {};

  constructor(private fb: FormBuilder, private apiService: ApiService, private route: ActivatedRoute) { }


  getMatchDetails(matchId: number): void {
    this.apiService.getMatchDetails(matchId).subscribe({
      next: (data) => {
        this.matchData = data;
      },
      error: (error) => {
        console.error('Error fetching match details:', error);
      }
    });
  }
  matchForm!: FormGroup;

  ngOnInit(): void {
    this.matchForm = this.fb.group({
      match_date: ['', Validators.required],
      score_team1: [0, Validators.required],
      score_team2: [0, Validators.required],
      num_of_teams: [0, Validators.required],
      is_active: [false],
      replay: [false],
      week: [0, Validators.required],
      status: ['', Validators.required],
      start_date: ['', Validators.required],
      red_cards: [0, Validators.required],
      yellow_cards: [0, Validators.required],
      predict_total: [0, Validators.required],
      predict_draw: [0, Validators.required],
      created_at: ['', Validators.required],
      updated_at: ['', Validators.required],
      league: [0, Validators.required],
      venue: [0, Validators.required],
    });

    this.route.paramMap.subscribe((params) => {
      const id = params.get('matchId');
      if (id) {
        this.matchId = +id;
        this.getMatchDetails(this.matchId);
      }
    });
  }

  onSubmit(): void {
    if (this.matchForm.valid) {
      console.log(this.matchForm.value);
      // Implement your update logic here
    }
  }
}
