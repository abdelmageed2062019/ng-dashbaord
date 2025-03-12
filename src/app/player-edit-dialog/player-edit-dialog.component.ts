import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms'; //Import FormControl
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-player-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './player-edit-dialog.component.html',
  styleUrls: ['./player-edit-dialog.component.css']
})
export class PlayerEditDialogComponent {
  form: FormGroup;
  yellow_cards = new FormControl(0);
  red_cards = new FormControl(0);

  constructor(
    public dialogRef: MatDialogRef<PlayerEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      yellow_cards: [data.yellow_cards],
      red_cards: [data.red_cards]
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  onSaveClick(): void {
    this.dialogRef.close(this.form.value);
  }
  get yellowCardsControl() {
    return this.form.get('yellow_cards') as FormControl;
  }

  get redCardsControl() {
    return this.form.get('red_cards') as FormControl;
  }
}