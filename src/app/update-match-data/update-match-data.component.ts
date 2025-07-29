import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../service/api.service';

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
  dynamicFields: Array<{ key: string, label: string, type: string, options?: string[] }> = [];
  teams: any[] = [];
  playersData: { [teamId: number]: any[] } = {};
  selectedTeam: number | null = null;
  showPlayerStats = false;
  
  // New properties for advanced UI
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private apiService: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.loading = true;
    this.sportConfig = history.state.sportConfig;
    const matchId = this.route.snapshot.paramMap.get('matchId');
    if (matchId) {
      this.apiService.getMatchDetails(Number(matchId)).subscribe({
        next: (match) => {
          this.match = match;
          this.teams = match.matchteams || [];
          this.buildDynamicForm();
          this.loadPlayersForAllTeams();
          this.loading = false;
          console.log('Match data loaded:', this.match);
          console.log('Sport config:', this.sportConfig);
          console.log('Teams:', this.teams);
        },
        error: (err) => {
          this.error = 'Failed to load match data. Please try again.';
          this.loading = false;
          console.error('Error loading match:', err);
        }
      });
    } else {
      this.loading = false;
      this.error = 'No match ID provided';
    }
  }

  // Get icon for different field types
  getFieldIcon(fieldType: string): string {
    const iconMap: { [key: string]: string } = {
      'text': 'fas fa-font',
      'number': 'fas fa-hashtag',
      'datetime-local': 'fas fa-calendar-alt',
      'checkbox': 'fas fa-check-square',
      'select': 'fas fa-list'
    };
    return iconMap[fieldType] || 'fas fa-edit';
  }

  buildDynamicForm(): void {
    this.dynamicFields = [];
    
    // Common fields for all sports
    this.dynamicFields.push({ 
      key: 'status', 
      label: 'Status', 
      type: 'select', 
      options: ['upcoming', 'live', 'finished', 'postponed', 'cancelled'] 
    });
    this.dynamicFields.push({ key: 'match_date', label: 'Match Date', type: 'datetime-local' });
    this.dynamicFields.push({ key: 'start_date', label: 'Start Date', type: 'datetime-local' });
    this.dynamicFields.push({ key: 'is_active', label: 'Is Active', type: 'checkbox' });
    this.dynamicFields.push({ key: 'replay', label: 'Replay', type: 'checkbox' });
    this.dynamicFields.push({ key: 'week', label: 'Week', type: 'number' });
    this.dynamicFields.push({ key: 'group_name', label: 'Group Name', type: 'text' });

    // Football specific fields
    if (this.sportConfig?.name === 'Football' || this.sportConfig?.scoring_system === 'goals') {
      this.dynamicFields.push({ key: 'red_cards', label: 'Red Cards', type: 'number' });
      this.dynamicFields.push({ key: 'yellow_cards', label: 'Yellow Cards', type: 'number' });
      this.dynamicFields.push({ key: 'fouls', label: 'Fouls', type: 'number' });
      this.dynamicFields.push({ key: 'corners', label: 'Corners', type: 'number' });
      this.dynamicFields.push({ key: 'offsides', label: 'Offsides', type: 'number' });
      this.dynamicFields.push({ key: 'shots_on_target', label: 'Shots on Target', type: 'number' });
      this.dynamicFields.push({ key: 'total_shots', label: 'Total Shots', type: 'number' });
      this.dynamicFields.push({ key: 'total_goals', label: 'Total Goals', type: 'number' });
      if (this.sportConfig?.penalty_kicks) {
        this.dynamicFields.push({ key: 'penalty_goals_scored', label: 'Penalty Goals', type: 'number' });
      }
    }

    // Basketball specific fields
    if (this.sportConfig?.name === 'Basketball' || this.sportConfig?.scoring_system === 'points') {
      this.dynamicFields.push({ key: 'total_points', label: 'Total Points', type: 'number' });
      this.dynamicFields.push({ key: 'two_pointers_made', label: 'Two Pointers Made', type: 'number' });
      this.dynamicFields.push({ key: 'two_pointers_attempted', label: 'Two Pointers Attempted', type: 'number' });
      this.dynamicFields.push({ key: 'three_pointers_made', label: 'Three Pointers Made', type: 'number' });
      this.dynamicFields.push({ key: 'three_pointers_attempted', label: 'Three Pointers Attempted', type: 'number' });
      this.dynamicFields.push({ key: 'one_pointers_made', label: 'Free Throws Made', type: 'number' });
      this.dynamicFields.push({ key: 'one_pointers_attempted', label: 'Free Throws Attempted', type: 'number' });
      this.dynamicFields.push({ key: 'total_rebounds', label: 'Total Rebounds', type: 'number' });
      this.dynamicFields.push({ key: 'total_assists', label: 'Total Assists', type: 'number' });
      this.dynamicFields.push({ key: 'total_steals', label: 'Total Steals', type: 'number' });
      this.dynamicFields.push({ key: 'total_blocks', label: 'Total Blocks', type: 'number' });
      this.dynamicFields.push({ key: 'total_turnovers', label: 'Total Turnovers', type: 'number' });
      this.dynamicFields.push({ key: 'total_personal_fouls', label: 'Personal Fouls', type: 'number' });
      if (this.sportConfig?.quarters) {
        this.dynamicFields.push({ key: 'quarters_played', label: 'Quarters Played', type: 'number' });
      }
    }

    // Water Polo specific fields
    if (this.sportConfig?.name === 'Waterpolo') {
      this.dynamicFields.push({ key: 'total_goals', label: 'Total Goals', type: 'number' });
      this.dynamicFields.push({ key: 'total_saves', label: 'Total Saves', type: 'number' });
      this.dynamicFields.push({ key: 'total_exclusions', label: 'Total Exclusions', type: 'number' });
      this.dynamicFields.push({ key: 'total_exclusion_time', label: 'Exclusion Time', type: 'number' });
      this.dynamicFields.push({ key: 'major_fouls_committed', label: 'Major Fouls', type: 'number' });
      this.dynamicFields.push({ key: 'minor_fouls_committed', label: 'Minor Fouls', type: 'number' });
      this.dynamicFields.push({ key: 'quarters_played_water_polo', label: 'Quarters Played', type: 'number' });
    }

    // Gymnastics specific fields
    if (this.sportConfig?.name === 'Gymnastics') {
      this.dynamicFields.push({ key: 'total_difficulty_score', label: 'Difficulty Score', type: 'number' });
      this.dynamicFields.push({ key: 'total_execution_score', label: 'Execution Score', type: 'number' });
      this.dynamicFields.push({ key: 'total_combined_score', label: 'Combined Score', type: 'number' });
      this.dynamicFields.push({ key: 'total_deductions', label: 'Total Deductions', type: 'number' });
      this.dynamicFields.push({ key: 'total_falls', label: 'Total Falls', type: 'number' });
      this.dynamicFields.push({ key: 'routines_completed', label: 'Routines Completed', type: 'number' });
      this.dynamicFields.push({ key: 'apparatus_rotation_count', label: 'Apparatus Rotations', type: 'number' });
    }

    // Duration fields based on sport config
    if (this.sportConfig?.match_duration) {
      this.dynamicFields.push({ key: 'match_duration', label: 'Match Duration (minutes)', type: 'number' });
    }
    if (this.sportConfig?.extra_time_duration) {
      this.dynamicFields.push({ key: 'extra_time_duration', label: 'Extra Time Duration', type: 'number' });
    }

    // Build the form group dynamically
    const group: any = {};
    this.dynamicFields.forEach(field => {
      let defaultValue = this.match?.[field.key] || '';
      
      // Handle different field types
      if (field.type === 'checkbox') {
        defaultValue = this.match?.[field.key] || false;
      } else if (field.type === 'number') {
        defaultValue = this.match?.[field.key] || 0;
      } else if (field.type === 'datetime-local' && this.match?.[field.key]) {
        // Convert ISO date to datetime-local format
        defaultValue = new Date(this.match[field.key]).toISOString().slice(0, 16);
      }
      
      group[field.key] = [defaultValue];
    });
    this.form = this.fb.group(group);
  }

  onSubmit() {
    if (this.form.valid) {
      const formData = this.form.value;
      
      // Convert datetime-local back to ISO format
      ['match_date', 'start_date', 'second_half_start_time'].forEach(field => {
        if (formData[field]) {
          formData[field] = new Date(formData[field]).toISOString();
        }
      });
      
      console.log('Updating match with data:', formData);
      // TODO: Call API to update match
      this.apiService.updateMatch(this.match.id, formData).subscribe(response => {
        alert('Match updated successfully!');
        // this.goBack();
      });
      // alert('Match updated successfully! Data: ' + JSON.stringify(formData, null, 2));
    }
  }

  goBack() {
    this.router.navigate(['/sport-matches', history.state.sportId], { 
      state: { sportConfig: this.sportConfig } 
    });
  }

  loadPlayersForAllTeams(): void {
    this.teams.forEach(teamData => {
      const teamId = teamData.team.id;
      this.apiService.getplayerlist(teamId).subscribe(players => {
        this.playersData[teamId] = players;
        console.log(`Players loaded for team ${teamId}:`, players);
      });
    });
  }

  togglePlayerStats(): void {
    this.showPlayerStats = !this.showPlayerStats;
  }

  // Debug method to test player update API
  testPlayerUpdate(): void {
    if (this.teams.length > 0 && this.selectedTeam) {
      const players = this.playersData[this.selectedTeam];
      if (players && players.length > 0) {
        const testPlayer = players[0];
        const testData = {
          match: this.match.id,
          team: this.selectedTeam,
          player: testPlayer.id,
          goals: 1,
          assists: 1,
          minutes_played: 90
        };
        
        console.log('Testing player update with:', testData);
        this.apiService.updateplayer(testData).subscribe({
          next: (response) => {
            console.log('Test update successful:', response);
            alert('Test update successful!');
          },
          error: (error) => {
            console.error('Test update failed:', error);
            alert('Test update failed. Check console for details.');
          }
        });
      }
    }
  }

  selectTeam(teamId: number): void {
    this.selectedTeam = teamId;
  }

  getPlayerFields(): Array<{ key: string, label: string, type: string }> {
    const fields: Array<{ key: string, label: string, type: string }> = [];
    
    // Common fields for all sports
    fields.push({ key: 'minutes_played', label: 'Minutes Played', type: 'number' });
    
    // Football specific fields
    if (this.sportConfig?.name === 'Football' || this.sportConfig?.scoring_system === 'goals') {
      fields.push({ key: 'goals', label: 'Goals', type: 'number' });
      fields.push({ key: 'assists', label: 'Assists', type: 'number' });
      fields.push({ key: 'red_cards', label: 'Red Cards', type: 'number' });
      fields.push({ key: 'yellow_cards', label: 'Yellow Cards', type: 'number' });
      fields.push({ key: 'fouls', label: 'Fouls', type: 'number' });
      fields.push({ key: 'shots', label: 'Shots', type: 'number' });
      fields.push({ key: 'shots_on_target', label: 'Shots on Target', type: 'number' });
      fields.push({ key: 'passes', label: 'Passes', type: 'number' });
      fields.push({ key: 'tackles', label: 'Tackles', type: 'number' });
      fields.push({ key: 'offsides', label: 'Offsides', type: 'number' });
      fields.push({ key: 'corners', label: 'Corners', type: 'number' });
      if (this.sportConfig?.penalty_kicks) {
        fields.push({ key: 'penalties_shots', label: 'Penalty Shots', type: 'number' });
        fields.push({ key: 'penalties_score', label: 'Penalty Goals', type: 'number' });
      }
    }

    // Basketball specific fields
    if (this.sportConfig?.name === 'Basketball' || this.sportConfig?.scoring_system === 'points') {
      fields.push({ key: 'points', label: 'Points', type: 'number' });
      fields.push({ key: 'two_pointers_made', label: 'Two Pointers Made', type: 'number' });
      fields.push({ key: 'two_pointers_attempted', label: 'Two Pointers Attempted', type: 'number' });
      fields.push({ key: 'three_pointers_made', label: 'Three Pointers Made', type: 'number' });
      fields.push({ key: 'three_pointers_attempted', label: 'Three Pointers Attempted', type: 'number' });
      fields.push({ key: 'one_pointers_made', label: 'Free Throws Made', type: 'number' });
      fields.push({ key: 'one_pointers_attempted', label: 'Free Throws Attempted', type: 'number' });
      fields.push({ key: 'rebounds', label: 'Total Rebounds', type: 'number' });
      fields.push({ key: 'offensive_rebounds', label: 'Offensive Rebounds', type: 'number' });
      fields.push({ key: 'defensive_rebounds', label: 'Defensive Rebounds', type: 'number' });
      fields.push({ key: 'assists', label: 'Assists', type: 'number' });
      fields.push({ key: 'steals', label: 'Steals', type: 'number' });
      fields.push({ key: 'blocks', label: 'Blocks', type: 'number' });
      fields.push({ key: 'turnovers', label: 'Turnovers', type: 'number' });
      fields.push({ key: 'personal_fouls', label: 'Personal Fouls', type: 'number' });
    }

    // Water Polo specific fields
    if (this.sportConfig?.name === 'Waterpolo') {
      fields.push({ key: 'goals', label: 'Goals', type: 'number' });
      fields.push({ key: 'saves', label: 'Saves', type: 'number' });
      fields.push({ key: 'exclusions', label: 'Exclusions', type: 'number' });
      fields.push({ key: 'penalty_goals', label: 'Penalty Goals', type: 'number' });
      fields.push({ key: 'power_play_goals', label: 'Power Play Goals', type: 'number' });
      fields.push({ key: 'shots_attempted', label: 'Shots Attempted', type: 'number' });
      fields.push({ key: 'shots_on_target', label: 'Shots on Target', type: 'number' });
      fields.push({ key: 'exclusion_time', label: 'Exclusion Time', type: 'number' });
      fields.push({ key: 'major_fouls', label: 'Major Fouls', type: 'number' });
      fields.push({ key: 'minor_fouls', label: 'Minor Fouls', type: 'number' });
    }

    // Gymnastics specific fields
    if (this.sportConfig?.name === 'Gymnastics') {
      fields.push({ key: 'difficulty_score', label: 'Difficulty Score', type: 'number' });
      fields.push({ key: 'execution_score', label: 'Execution Score', type: 'number' });
      fields.push({ key: 'total_score', label: 'Total Score', type: 'number' });
      fields.push({ key: 'deductions', label: 'Deductions', type: 'number' });
      fields.push({ key: 'fall_count', label: 'Fall Count', type: 'number' });
      fields.push({ key: 'artistic_score', label: 'Artistic Score', type: 'number' });
      fields.push({ key: 'technical_score', label: 'Technical Score', type: 'number' });
      fields.push({ key: 'routine_completion', label: 'Routine Completed', type: 'checkbox' });
      fields.push({ key: 'apparatus_performed', label: 'Apparatus', type: 'text' });
      fields.push({ key: 'routine_duration', label: 'Routine Duration', type: 'number' });
    }

    return fields;
  }

  updatePlayerStats(player: any, teamId: number): void {
    // First get current player stats from the API
    this.apiService.getPlayerStats(this.match.id, teamId, player.id).subscribe({
      next: (currentPlayerStats) => {
        console.log('Current player stats from API:', currentPlayerStats);
        this.showPlayerEditDialog(player, teamId, currentPlayerStats);
      },
      error: (error) => {
        console.error('Error fetching player stats:', error);
        // Fallback to using player data from the team list
        const playerFields = this.getPlayerFields();
        const playerFormData: any = {};
        playerFields.forEach(field => {
          playerFormData[field.key] = player[field.key] || (field.type === 'checkbox' ? false : 0);
        });
        this.showPlayerEditDialog(player, teamId, playerFormData);
      }
    });
  }

  showPlayerEditDialog(player: any, teamId: number, currentStats: any): void {
    const playerFields = this.getPlayerFields();
    let formHtml = `
      <div style="max-height: 400px; overflow-y: auto;">
        <h6>${player.first_name} ${player.last_name} - #${player.uniform || player.displayid}</h6>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
    `;

    playerFields.forEach(field => {
      const currentValue = currentStats[field.key] || 0;
      if (field.type === 'checkbox') {
        formHtml += `
          <div>
            <label><strong>${field.label}:</strong></label><br>
            <input type="checkbox" class="form-check-input" id="${field.key}" ${currentValue ? 'checked' : ''}>
          </div>
        `;
      } else {
        formHtml += `
          <div>
            <label><strong>${field.label}:</strong></label><br>
            <input type="number" class="form-control" id="${field.key}" value="${currentValue}" min="0" style="width: 100%; padding: 5px;">
          </div>
        `;
      }
    });

    formHtml += `</div></div>`;

    // Create a temporary div for the dialog
    const dialogDiv = document.createElement('div');
    dialogDiv.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
          ${formHtml}
          <div style="margin-top: 20px; text-align: right;">
            <button id="cancelBtn" style="margin-right: 10px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
            <button id="saveBtn" style="padding: 8px 16px; background: #198754; color: white; border: none; border-radius: 4px; cursor: pointer;">Save</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(dialogDiv);

    // Handle cancel
    const cancelBtn = dialogDiv.querySelector('#cancelBtn') as HTMLButtonElement;
    cancelBtn.onclick = () => {
      document.body.removeChild(dialogDiv);
    };

    // Handle save
    const saveBtn = dialogDiv.querySelector('#saveBtn') as HTMLButtonElement;
    saveBtn.onclick = () => {
      const updatedStats: any = {
        match: this.match.id,
        team: teamId,
        player: player.id
      };

      playerFields.forEach(field => {
        const input = dialogDiv.querySelector(`#${field.key}`) as HTMLInputElement;
        if (field.type === 'checkbox') {
          updatedStats[field.key] = input.checked;
        } else {
          const value = parseInt(input.value) || 0;
          // Ensure non-negative values for stats
          updatedStats[field.key] = Math.max(0, value);
        }
      });

      console.log('Sending player update with data:', updatedStats);

      // Validate required fields
      if (!updatedStats.match || !updatedStats.team || !updatedStats.player) {
        alert('Missing required match, team, or player information');
        return;
      }

      // Disable save button during request
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      // Try PUT first, if it fails, try POST
      this.apiService.updateplayer(updatedStats).subscribe({
        next: (response) => {
          console.log('Player update response:', response);
          alert(`Player stats updated successfully for ${player.first_name} ${player.last_name}!`);
          document.body.removeChild(dialogDiv);
          // Reload players data
          this.loadPlayersForAllTeams();
        },
        error: (error) => {
          console.error('PUT request failed, trying POST:', error);
          
          // Try POST method as fallback
          this.apiService.updateplayerPost(updatedStats).subscribe({
            next: (response) => {
              console.log('Player update response (POST):', response);
              alert(`Player stats updated successfully for ${player.first_name} ${player.last_name}!`);
              document.body.removeChild(dialogDiv);
              this.loadPlayersForAllTeams();
            },
            error: (postError) => {
              console.error('POST request also failed, trying PATCH:', postError);
              
              // Try PATCH method as last resort
              this.apiService.updateplayerPatch(updatedStats).subscribe({
                next: (response) => {
                  console.log('Player update response (PATCH):', response);
                  alert(`Player stats updated successfully for ${player.first_name} ${player.last_name}!`);
                  document.body.removeChild(dialogDiv);
                  this.loadPlayersForAllTeams();
                },
                error: (patchError) => {
                  console.error('All methods failed:', patchError);
                  // Re-enable save button
                  saveBtn.disabled = false;
                  saveBtn.textContent = 'Save';
                  
                  let errorMessage = 'All HTTP methods failed. ';
                  if (patchError.error?.message) {
                    errorMessage += patchError.error.message;
                  } else if (patchError.error?.detail) {
                    errorMessage += patchError.error.detail;
                  } else {
                    errorMessage += 'Please check console for details.';
                  }
                  
                  alert(`Error updating player stats: ${errorMessage}`);
                }
              });
            }
          });
        }
      });
    };
  }
}
