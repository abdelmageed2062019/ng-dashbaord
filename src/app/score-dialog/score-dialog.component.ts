import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-score-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './score-dialog.component.html',
  styleUrls: ['./score-dialog.component.css']
})
export class ScoreDialogComponent {
  form: FormGroup;
  playerName: string;

  constructor(
    public dialogRef: MatDialogRef<ScoreDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder
  ) {
    this.playerName = data.player?.first_name + ' ' + data.player?.last_name || 'Player';
    
    this.form = this.fb.group({
      difficulty_score: [data.difficulty_score || 0, [Validators.min(0), Validators.max(10)]],
      execution_score: [data.execution_score || 0, [Validators.min(0), Validators.max(10)]],
      total_score: [data.total_score || 0, [Validators.min(0), Validators.max(20)]],
      fall_count: [data.fall_count || 0, [Validators.min(0)]],
      deductions: [data.deductions || 0, [Validators.min(0), Validators.max(10)]],
      landing_quality: [data.landing_quality || 0, [Validators.min(0), Validators.max(3)]],
      artistic_score: [data.artistic_score || 0, [Validators.min(0), Validators.max(10)]],
      technical_score: [data.technical_score || 0, [Validators.min(0), Validators.max(10)]]
    });

    // Auto-calculate total score when difficulty or execution changes
    this.form.get('difficulty_score')?.valueChanges.subscribe(() => this.calculateTotalScore());
    this.form.get('execution_score')?.valueChanges.subscribe(() => this.calculateTotalScore());
    this.form.get('deductions')?.valueChanges.subscribe(() => this.calculateTotalScore());
  }

  calculateTotalScore(): void {
    const difficulty = this.form.get('difficulty_score')?.value || 0;
    const execution = this.form.get('execution_score')?.value || 0;
    const deductions = this.form.get('deductions')?.value || 0;
    
    const total = Math.max(0, difficulty + execution - deductions);
    this.form.patchValue({ total_score: total }, { emitEvent: false });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  onSaveClick(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  onResetClick(): void {
    this.form.reset({
      difficulty_score: 0,
      execution_score: 0,
      total_score: 0,
      fall_count: 0,
      deductions: 0,
      landing_quality: 0,
      artistic_score: 0,
      technical_score: 0
    });
  }

  // Getters for form controls
  get difficultyScoreControl() {
    return this.form.get('difficulty_score') as FormControl;
  }

  get executionScoreControl() {
    return this.form.get('execution_score') as FormControl;
  }

  get totalScoreControl() {
    return this.form.get('total_score') as FormControl;
  }

  get fallCountControl() {
    return this.form.get('fall_count') as FormControl;
  }

  get deductionsControl() {
    return this.form.get('deductions') as FormControl;
  }

  get landingQualityControl() {
    return this.form.get('landing_quality') as FormControl;
  }

  get artisticScoreControl() {
    return this.form.get('artistic_score') as FormControl;
  }

  get technicalScoreControl() {
    return this.form.get('technical_score') as FormControl;
  }
}
