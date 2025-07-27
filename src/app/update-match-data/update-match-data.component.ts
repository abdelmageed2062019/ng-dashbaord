import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-update-match-data',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-match-data.component.html',
  styleUrls: ['./update-match-data.component.css']
})
export class UpdateMatchDataComponent implements OnInit {
  match: any;
  sportConfig: any;
  form!: FormGroup;
  dynamicFields: Array<{ key: string, label: string, type: string }> = [];

  constructor(private fb: FormBuilder, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Get sportConfig from navigation state
    this.sportConfig = history.state.sportConfig;
    // Get matchId from route and fetch match (simulate fetch for now)
    const matchId = this.route.snapshot.paramMap.get('matchId');
    // TODO: Replace with real API call to fetch match by ID
    this.match = {};
    // Always include status
    this.dynamicFields.push({ key: 'status', label: 'Status', type: 'text' });
    // Add score if present in match or config
    if ('score' in (this.match || {})) {
      this.dynamicFields.push({ key: 'score', label: 'Score', type: 'text' });
    }
    // Add red/yellow cards if team sport
    if (this.sportConfig?.is_team_sport) {
      this.dynamicFields.push({ key: 'red_cards', label: 'Red Cards', type: 'number' });
      this.dynamicFields.push({ key: 'yellow_cards', label: 'Yellow Cards', type: 'number' });
    }
    // Add more fields based on sportConfig (example: fouls, corners, etc.)
    if (this.sportConfig?.fouls_penalty) {
      this.dynamicFields.push({ key: 'fouls', label: 'Fouls', type: 'number' });
    }
    if (this.sportConfig?.corner_kicks) {
      this.dynamicFields.push({ key: 'corners', label: 'Corners', type: 'number' });
    }
    // Build the form group dynamically
    const group: any = {};
    this.dynamicFields.forEach(field => {
      group[field.key] = [this.match?.[field.key] || ''];
    });
    this.form = this.fb.group(group);
  }

  onSubmit() {
    if (this.form.valid) {
      alert('Updated match data: ' + JSON.stringify(this.form.value));
    }
  }
}
