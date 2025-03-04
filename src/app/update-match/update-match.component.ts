import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-update-match',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './update-match.component.html',
  styleUrls: ['./update-match.component.css']
})
export class UpdateMatchComponent implements OnInit {
  matchForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

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
  }

  onSubmit(): void {
    if (this.matchForm.valid) {
      console.log(this.matchForm.value);
      // Implement your update logic here
    }
  }
}
