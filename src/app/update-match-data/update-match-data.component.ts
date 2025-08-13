import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../service/api.service';
import { GymnasticsIntegrationService } from '../service/gymnastics-integration.service';
import Swal from 'sweetalert2';
import { throwDialogContentAlreadyAttachedError } from '@angular/cdk/dialog';

@Component({
  selector: 'app-update-match-data',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './update-match-data.component.html',
  styleUrls: ['./update-match-data.component.css']
})
export class UpdateMatchDataComponent implements OnInit, OnDestroy {
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
  
  // Validation properties
  fieldErrors: { [key: string]: string[] } = {};
  formSubmitted = false;

  // Gymnastics specific properties
  gymnasticsApparatus: string[] = [
    'floor_exercise',
    'pommel_horse', 
    'still_rings',
    'vault',
    'parallel_bars',
    'horizontal_bar',
    'uneven_bars',
    'balance_beam'
  ];
  
  gymnasticsCompetitionTypes: string[] = [
    'individual_all_around',
    'team_competition',
    'apparatus_finals',
    'qualification'
  ];

  gymnasticsJudgingPanels = {
    'difficulty_panel': 'Difficulty (D) Panel',
    'execution_panel': 'Execution (E) Panel',
    'reference_panel': 'Reference Panel',
    'superior_jury': 'Superior Jury'
  };

  gymnasticsScoreTypes: string[] = [
    'difficulty_score',
    'execution_score', 
    'neutral_deduction',
    'combined_score'
  ];

  selectedApparatus: string | null = null;
  selectedCompetitionType: string | null = null;
  gymnasticsScores: { [apparatus: string]: any } = {};
  gymnasticsRotations: any[] = [];

  // Clock and timer management
  competitionClock = {
    isRunning: false,
    currentTime: 0,
    rotationTime: 0,
    warmupTime: 0,
    touchWarmupTime: 0,
    routineTime: 0,
    breakTime: 0
  };

  // Session management
  sessionConfig = {
    sessionId: null as number | null,
    sessionName: '',
    startTime: null as Date | null,
    endTime: null as Date | null,
    subdivision: '',
    competitionLevel: '',
    gender: 'mixed',
    ageGroup: 'senior'
  };

  // Judge panels configuration
  judgePanels = {
    difficulty_panel: {
      judges: [],
      chief_judge: null,
      isActive: false
    },
    execution_panel: {
      judges: [],
      chief_judge: null,
      isActive: false
    },
    reference_panel: {
      judges: [],
      isActive: false
    },
    superior_jury: {
      members: [],
      isActive: false
    }
  };

  // Competition state
  competitionState = {
    initialized: false,
    currentRotation: 0,
    currentSubdivision: 0,
    currentPeriod: 1,
    currentApparatus: '',
    allRotationsComplete: false,
    awards_ceremony_ready: false,
    match_completed: false
  };

  // Routine management
  routineState = {
    activePlayer: null as any,
    activeApparatus: '',
    routineStartTime: null as Date | null,
    routineDuration: 0,
    isRoutineActive: false
  };

  // Timeout management
  timeoutState = {
    isActive: false,
    teamId: null as number | null,
    duration: '',
    reason: '',
    startTime: null as Date | null,
    endTime: null as Date | null
  };

  // Period and apparatus tracking
  gymnasticsFlow = {
    periods: [
      { number: 1, apparatus: 'floor_exercise', completed: false },
      { number: 2, apparatus: 'vault', completed: false },
      { number: 3, apparatus: 'uneven_bars', completed: false },
      { number: 4, apparatus: 'balance_beam', completed: false }
    ],
    currentPeriodIndex: 0,
    rotationDuration: 120, // seconds
    routineTimeLimit: 70 // seconds
  };

  // Match statistics
  matchStats = {
    totalRoutines: 0,
    completedRoutines: 0,
    totalTimeouts: 0,
    averageRoutineDuration: 0,
    highestScore: 0,
    lowestScore: 0
  };

  // Auto-refresh properties
  private autoRefreshInterval: any;
  private readonly AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

  // Gymnastics Integration Service access
  private gymnasticsService: ReturnType<GymnasticsIntegrationService['manageCompetitionClock']> | null = null;
  private realTimeData: ReturnType<GymnasticsIntegrationService['getRealTimeCompetitionData']> | null = null;
  private competitionResults: ReturnType<GymnasticsIntegrationService['getCompetitionResults']> | null = null;

  constructor(
    private fb: FormBuilder, 
    private route: ActivatedRoute, 
    private apiService: ApiService, 
    private router: Router,
    private gymnasticsIntegrationService: GymnasticsIntegrationService
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.sportConfig = history.state.sportConfig;
    const matchId = this.route.snapshot.paramMap.get('matchId');
    if (matchId) {
      this.loadMatchData(Number(matchId));
    } else {
      this.loading = false;
      this.error = 'No match ID provided';
      
      Swal.fire({
        icon: 'error',
        title: 'Invalid Match',
        text: 'No match ID was provided in the URL.',
        confirmButtonColor: '#dc3545'
      }).then(() => {
        this.goBack();
      });
    }
  }

  /**
   * Load or reload complete match data including teams and players
   * @param matchId - The match ID to load
   * @param showLoadingDialog - Whether to show loading dialog (default: false for refreshes)
   */
  loadMatchData(matchId: number, showLoadingDialog: boolean = false): void {
    if (showLoadingDialog) {
      Swal.fire({
        title: 'Refreshing Match Data...',
        text: 'Please wait while we reload the latest match information.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    }

    this.apiService.getMatchDetails(matchId).subscribe({
      next: (match) => {
        this.match = match;
        this.teams = match.matchteams || [];
        this.buildDynamicForm();
        this.loadPlayersForAllTeams();
        
          console.log(this.isGymnastics());
        // Check if this is a gymnastics match and load competition state
        if (this.isGymnastics()) {


          console.log(this);
          console.log('Loading gymnastics competition state...');
          this.checkCompetitionStatus(matchId);
          this.loadClockStatus(matchId);
        }
        
        this.loading = false;
        
        if (showLoadingDialog) {
          Swal.close();
        }
        
        console.log('Match data loaded/refreshed:', this.match);
        console.log('Sport config:', this.sportConfig);
        console.log('Teams:', this.teams);
        
        // Setup auto-refresh for live matches
        this.setupAutoRefresh();
      },
      error: (err) => {
        this.error = 'Failed to load match data. Please try again.';
        this.loading = false;
        console.error('Error loading match:', err);
        
        if (showLoadingDialog) {
          Swal.close();
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Failed to Load Match',
          text: 'Could not load match data. Please check your connection and try again.',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  /**
   * Setup auto-refresh for live matches
   */
  private setupAutoRefresh(): void {
    // Clear existing interval
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }

    // Only auto-refresh for live football matches
    if (this.isFootballMatch() && this.match?.status === 'live') {
      this.autoRefreshInterval = setInterval(() => {
        console.log('Auto-refreshing live match data...');
        this.loadMatchData(this.match.id, false); // Silent refresh
      }, this.AUTO_REFRESH_INTERVAL);
    }
  }

  /**
   * Stop auto-refresh
   */
  private stopAutoRefresh(): void {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
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
      // Basic match info
      this.dynamicFields.push({ key: 'competition_type', label: 'Competition Type', type: 'select', options: this.gymnasticsCompetitionTypes });
      this.dynamicFields.push({ key: 'session_number', label: 'Session Number', type: 'number' });
      this.dynamicFields.push({ key: 'subdivision', label: 'Subdivision', type: 'text' });
      this.dynamicFields.push({ key: 'rotation_number', label: 'Current Rotation', type: 'number' });
      this.dynamicFields.push({ key: 'total_rotations', label: 'Total Rotations', type: 'number' });
      
      // Overall scores
      this.dynamicFields.push({ key: 'total_difficulty_score', label: 'Total Difficulty Score', type: 'number' });
      this.dynamicFields.push({ key: 'total_execution_score', label: 'Total Execution Score', type: 'number' });
      this.dynamicFields.push({ key: 'total_combined_score', label: 'Total Combined Score', type: 'number' });
      this.dynamicFields.push({ key: 'total_deductions', label: 'Total Deductions', type: 'number' });
      this.dynamicFields.push({ key: 'total_falls', label: 'Total Falls', type: 'number' });
      this.dynamicFields.push({ key: 'routines_completed', label: 'Routines Completed', type: 'number' });
      this.dynamicFields.push({ key: 'apparatus_rotation_count', label: 'Apparatus Rotations', type: 'number' });
      
      // Team specific fields
      this.dynamicFields.push({ key: 'team_final_score', label: 'Team Final Score', type: 'number' });
      this.dynamicFields.push({ key: 'team_ranking', label: 'Team Ranking', type: 'number' });
      
      // Competition settings
      this.dynamicFields.push({ key: 'warmup_time', label: 'Warmup Time (minutes)', type: 'number' });
      this.dynamicFields.push({ key: 'touch_warmup_time', label: 'Touch Warmup Time (minutes)', type: 'number' });
      this.dynamicFields.push({ key: 'max_gymnasts_per_apparatus', label: 'Max Gymnasts per Apparatus', type: 'number' });
      
      // Judging panel configuration
      this.dynamicFields.push({ key: 'judges_per_panel', label: 'Judges per Panel', type: 'number' });
      this.dynamicFields.push({ key: 'chief_judges_count', label: 'Chief Judges Count', type: 'number' });
      
      // Special deductions
      this.dynamicFields.push({ key: 'line_deductions', label: 'Line Deductions', type: 'number' });
      this.dynamicFields.push({ key: 'time_deductions', label: 'Time Deductions', type: 'number' });
      this.dynamicFields.push({ key: 'conduct_deductions', label: 'Conduct Deductions', type: 'number' });
      
      // Initialize gymnastics specific data
      this.initializeGymnasticsData();
    }

    // Duration fields based on sport config
    if (this.sportConfig?.match_duration) {
      this.dynamicFields.push({ key: 'match_duration', label: 'Match Duration (minutes)', type: 'number' });
    }
    if (this.sportConfig?.extra_time_duration) {
      this.dynamicFields.push({ key: 'extra_time_duration', label: 'Extra Time Duration', type: 'number' });
    }

    // Build the form group dynamically with validators
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
      
      // Add validators based on field type
      const validators = [];
      if (field.type === 'number') {
        validators.push(Validators.min(0));
      }
      if (field.key === 'status') {
        validators.push(Validators.required);
      }
      if (field.type === 'datetime-local') {
        // Add custom validator for datetime format
        validators.push(this.dateTimeValidator);
      }
      
      group[field.key] = [defaultValue, validators];
    });
    this.form = this.fb.group(group);
  }

  onSubmit() {
    this.formSubmitted = true;
    this.fieldErrors = {};
    
    if (this.form.valid) {
      const formData = this.form.value;
      
      // Convert datetime-local back to ISO format
      ['match_date', 'start_date', 'second_half_start_time'].forEach(field => {
        if (formData[field]) {
          formData[field] = new Date(formData[field]).toISOString();
        }
      });
      
      // Show loading alert
      Swal.fire({
        title: 'Updating Match...',
        text: 'Please wait while we update the match data.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      console.log('Updating match with data:', formData);
      
      this.apiService.updateMatch(this.match.id, formData).subscribe({
        next: (response) => {
          console.log('Match updated successfully:', response);
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Match updated successfully!',
            confirmButtonColor: '#198754'
          }).then(() => {
            // Refresh match data after successful update
            this.loadMatchData(this.match.id, true);
          });
        },
        error: (error) => {
          console.error('Error updating match:', error);
          this.handleApiError(error, 'Failed to update match');
        }
      });
    } else {
      // Show validation error
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please fill in all required fields correctly.',
        confirmButtonColor: '#dc3545'
      });
      
      // Mark all invalid fields
      Object.keys(this.form.controls).forEach(key => {
        if (this.form.get(key)?.invalid) {
          this.form.get(key)?.markAsTouched();
        }
      });
    }
  }

  goBack() {
    this.router.navigate(['/sport-matches', history.state.sportId], { 
      state: { sportConfig: this.sportConfig } 
    });
  }

  // Error handling methods
  handleApiError(error: any, defaultMessage: string): void {
    console.error('API Error:', error);
    
    let errorTitle = 'Error';
    let errorMessage = defaultMessage;
    
    if (error.status === 400 && error.error) {
      // Handle validation errors
      errorTitle = 'Validation Error';
      this.fieldErrors = error.error;
      
      const errorMessages: string[] = [];
      Object.keys(error.error).forEach(field => {
        const fieldName = this.getFieldDisplayName(field);
        const messages = Array.isArray(error.error[field]) ? error.error[field] : [error.error[field]];
        messages.forEach((msg: string) => {
          errorMessages.push(`${fieldName}: ${msg}`);
        });
      });
      
      errorMessage = errorMessages.join('\n');
      
      // Mark form fields with errors as invalid
      this.markFieldsWithErrors();
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.error?.detail) {
      errorMessage = error.error.detail;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    Swal.fire({
      icon: 'error',
      title: errorTitle,
      text: errorMessage,
      confirmButtonColor: '#dc3545',
      customClass: {
        popup: 'error-popup'
      }
    });
  }

  getFieldDisplayName(fieldKey: string): string {
    const field = this.dynamicFields.find(f => f.key === fieldKey);
    return field ? field.label : fieldKey.replace('_', ' ').toUpperCase();
  }

  markFieldsWithErrors(): void {
    Object.keys(this.fieldErrors).forEach(fieldKey => {
      const control = this.form.get(fieldKey);
      if (control) {
        control.setErrors({ serverError: this.fieldErrors[fieldKey] });
        control.markAsTouched();
      }
    });
  }

  hasFieldError(fieldKey: string): boolean {
    const control = this.form.get(fieldKey);
    return !!(control && control.errors && (control.dirty || control.touched || this.formSubmitted));
  }

  getFieldErrorMessage(fieldKey: string): string {
    const control = this.form.get(fieldKey);
    if (!control || !control.errors) return '';
    
    if (control.errors['serverError']) {
      return Array.isArray(control.errors['serverError']) 
        ? control.errors['serverError'].join(', ')
        : control.errors['serverError'];
    }
    
    if (control.errors['required']) {
      return `${this.getFieldDisplayName(fieldKey)} is required`;
    }
    
    if (control.errors['min']) {
      return `${this.getFieldDisplayName(fieldKey)} must be at least ${control.errors['min'].min}`;
    }
    
    if (control.errors['invalidDateTime']) {
      return `${this.getFieldDisplayName(fieldKey)} has invalid date/time format`;
    }
    
    return 'Invalid value';
  }

  // Custom validator for datetime fields
  dateTimeValidator(control: any) {
    if (!control.value) return null;
    
    try {
      const date = new Date(control.value);
      if (isNaN(date.getTime())) {
        return { invalidDateTime: true };
      }
      return null;
    } catch (e) {
      return { invalidDateTime: true };
    }
  }

  handlePlayerUpdateError(error: any, player: any): void {
    console.error('Player update error:', error);
    
    let errorTitle = 'Error Updating Player';
    let errorMessage = 'Failed to update player statistics.';
    
    if (error.status === 400 && error.error) {
      errorTitle = 'Validation Error';
      const errorMessages: string[] = [];
      
      Object.keys(error.error).forEach(field => {
        const messages = Array.isArray(error.error[field]) ? error.error[field] : [error.error[field]];
        messages.forEach((msg: string) => {
          errorMessages.push(`${field.replace('_', ' ')}: ${msg}`);
        });
      });
      
      errorMessage = errorMessages.join('\n');
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.error?.detail) {
      errorMessage = error.error.detail;
    }
    
    Swal.fire({
      icon: 'error',
      title: errorTitle,
      text: `Error updating ${player.first_name} ${player.last_name}: ${errorMessage}`,
      confirmButtonColor: '#dc3545'
    });
  }

  loadPlayersForAllTeams(): void {
    this.teams.forEach(teamData => {
      const teamId = teamData.team.id;
      this.apiService.getplayerlist(teamId).subscribe({
        next: (players) => {
          this.playersData[teamId] = players;
          console.log(`Players loaded for team ${teamId}:`, players);
        },
        error: (error) => {
          console.error(`Error loading players for team ${teamId}:`, error);
          Swal.fire({
            icon: 'error',
            title: 'Error Loading Players',
            text: `Failed to load players for team ${teamData.team.name || teamId}`,
            confirmButtonColor: '#dc3545'
          });
        }
      });
    });
  }

  togglePlayerStats(): void {
    this.showPlayerStats = !this.showPlayerStats;
  }

  /**
   * Manual refresh method for users to reload match data
   */
  refreshMatchData(): void {
    if (this.match?.id) {
      this.loadMatchData(this.match.id, true);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No match data available to refresh.',
        confirmButtonColor: '#dc3545'
      });
    }
  }

  /**
   * Calculate team score based on player stats
   * @param teamId - The team ID to calculate score for
   * @returns The total score for the team
   */
  getTeamScore(teamId: number): number {
    // First try to get score from match teams data (official match score)
    const matchTeam = this.teams.find(t => t.team.id === teamId);
    if (matchTeam && matchTeam.score !== undefined && matchTeam.score !== null) {
      return matchTeam.score;
    }

    // Fallback: calculate from player stats if match score is not available
    const players = this.playersData[teamId] || [];
    let totalScore = 0;

    if (this.sportConfig?.name === 'Football' || this.sportConfig?.scoring_system === 'goals') {
      // For football, sum up all goals from players
      totalScore = players.reduce((sum, player) => sum + (player.goals || 0), 0);
    } else if (this.sportConfig?.name === 'Basketball' || this.sportConfig?.scoring_system === 'points') {
      // For basketball, sum up all points from players
      totalScore = players.reduce((sum, player) => sum + (player.points || 0), 0);
    } else if (this.sportConfig?.name === 'Gymnastics') {
      // For gymnastics, sum up total combined scores
      totalScore = players.reduce((sum, player) => sum + (player.total_combined_score || player.total_score || 0), 0);
    } else {
      // Default: try to find any score-like field
      totalScore = players.reduce((sum, player) => 
        sum + (player.goals || player.points || player.score || 0), 0);
    }

    return totalScore;
  }

  /**
   * Get team name by ID
   * @param teamId - The team ID
   * @returns The team name
   */
  getTeamName(teamId: number): string {
    const team = this.teams.find(t => t.team.id === teamId);
    return team?.team.name || `Team ${teamId}`;
  }

  /**
   * Get team match stats by ID
   * @param teamId - The team ID
   * @returns The team match stats object
   */
  getTeamMatchStats(teamId: number): any {
    const team = this.teams.find(t => t.team.id === teamId);
    return team || {};
  }

  /**
   * Get match time display
   * @returns Formatted match time string
   */
  getMatchTime(): string {
    if (!this.match) return '';
    
    if (this.match.status === 'live') {
      // For live matches, you might want to calculate elapsed time
      const startTime = new Date(this.match.start_date || this.match.match_date);
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
      
      if (elapsed >= 0 && elapsed <= 120) { // 0-120 minutes for football
        return `${elapsed}'`;
      }
      return 'LIVE';
    } else if (this.match.status === 'finished') {
      return 'FT';
    } else if (this.match.status === 'upcoming') {
      const matchTime = new Date(this.match.match_date || this.match.start_date);
      return matchTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }
    
    return this.match.status?.toUpperCase() || '';
  }

  /**
   * Check if this is a football match
   * @returns true if sport is football
   */
  isFootballMatch(): boolean {
    return this.sportConfig?.name === 'Football' || this.sportConfig?.scoring_system === 'goals';
  }

  /**
   * Check if this is a gymnastics match
   * @returns true if sport is gymnastics
   */
  isGymnasticsMatch(): boolean {
    return this.sportConfig?.name === 'Gymnastics' || this.sportConfig?.scoring_system === 'gymnastics';
  }

  /**
   * Get team's total gymnastics score
   * @param teamId - Team ID
   * @returns formatted total score string
   */
  getTeamGymnasticsScore(teamId: number): string {
    if (!teamId || !this.playersData[teamId]) {
      return '0.000';
    }

    // Check if there's an official team score first
    const teamData = this.teams.find(t => t.team?.id === teamId);
    if (teamData?.total_score) {
      return Number(teamData.total_score).toFixed(3);
    }

    // Calculate from player scores
    const players = this.playersData[teamId] || [];
    const totalScore = players.reduce((sum, player) => {
      return sum + (Number(player.total_score) || 0);
    }, 0);

    return totalScore.toFixed(3);
  }

  /**
   * Get team's highest individual score
   * @param teamId - Team ID
   * @returns highest individual score
   */
  getTeamHighestScore(teamId: number): string {
    if (!teamId || !this.playersData[teamId]) {
      return '0.000';
    }

    const players = this.playersData[teamId] || [];
    const highestScore = Math.max(...players.map(p => Number(p.total_score) || 0));
    return highestScore.toFixed(3);
  }

  /**
   * Get team's average score
   * @param teamId - Team ID
   * @returns average team score
   */
  getTeamAverageScore(teamId: number): string {
    if (!teamId || !this.playersData[teamId]) {
      return '0.000';
    }

    const players = this.playersData[teamId] || [];
    if (players.length === 0) return '0.000';

    const totalScore = players.reduce((sum, player) => {
      return sum + (Number(player.total_score) || 0);
    }, 0);

    return (totalScore / players.length).toFixed(3);
  }

  /**
   * Get team's difficulty score
   * @param teamId - Team ID
   * @returns team difficulty score
   */
  getTeamDifficultyScore(teamId: number): string {
    if (!teamId || !this.playersData[teamId]) {
      return '0.000';
    }

    const players = this.playersData[teamId] || [];
    const totalDifficulty = players.reduce((sum, player) => {
      return sum + (Number(player.difficulty_score) || 0);
    }, 0);

    return totalDifficulty.toFixed(3);
  }

  /**
   * Get team's execution score
   * @param teamId - Team ID
   * @returns team execution score
   */
  getTeamExecutionScore(teamId: number): string {
    if (!teamId || !this.playersData[teamId]) {
      return '0.000';
    }

    const players = this.playersData[teamId] || [];
    const totalExecution = players.reduce((sum, player) => {
      return sum + (Number(player.execution_score) || 0);
    }, 0);

    return totalExecution.toFixed(3);
  }

  // Debug method to test player update API
  testPlayerUpdate(): void {
    if (this.teams.length > 0 && this.selectedTeam) {
      const players = this.playersData[this.selectedTeam];
      if (players && players.length > 0) {
        const testPlayer = players[0];
        
        // Show confirmation dialog
        Swal.fire({
          title: 'Test Player Update',
          text: `This will test updating player ${testPlayer.first_name} ${testPlayer.last_name}. Continue?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#198754',
          cancelButtonColor: '#6c757d',
          confirmButtonText: 'Yes, test it!',
          cancelButtonText: 'Cancel'
        }).then((result) => {
          if (result.isConfirmed) {
            const testData = {
              match: this.match.id,
              team: this.selectedTeam,
              player: testPlayer.id,
              goals: 1,
              assists: 1,
              minutes_played: 90
            };
            
            // Show loading
            Swal.fire({
              title: 'Testing API...',
              text: 'Please wait while we test the player update.',
              allowOutsideClick: false,
              didOpen: () => {
                Swal.showLoading();
              }
            });
            
            console.log('Testing player update with:', testData);
            this.apiService.updateplayer(testData).subscribe({
              next: (response) => {
                console.log('Test update successful:', response);
                Swal.fire({
                  icon: 'success',
                  title: 'Test Successful!',
                  text: 'Player update API is working correctly.',
                  confirmButtonColor: '#198754'
                }).then(() => {
                  // Refresh match data after test update
                  this.loadMatchData(this.match.id, true);
                });
              },
              error: (error) => {
                console.error('Test update failed:', error);
                this.handlePlayerUpdateError(error, testPlayer);
              }
            });
          }
        });
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'No Players Found',
          text: 'No players available for the selected team.',
          confirmButtonColor: '#ffc107'
        });
      }
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'No Team Selected',
        text: 'Please select a team first.',
        confirmButtonColor: '#ffc107'
      });
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
      // Add all apparatus for gymnastics
      this.gymnasticsApparatus.forEach(apparatus => {
        fields.push({ 
          key: `${apparatus}_difficulty_score`, 
          label: `${apparatus.replace('_', ' ').toUpperCase()} - Difficulty Score`, 
          type: 'number' 
        });
        fields.push({ 
          key: `${apparatus}_execution_score`, 
          label: `${apparatus.replace('_', ' ').toUpperCase()} - Execution Score`, 
          type: 'number' 
        });
        fields.push({ 
          key: `${apparatus}_combined_score`, 
          label: `${apparatus.replace('_', ' ').toUpperCase()} - Combined Score`, 
          type: 'number' 
        });
        fields.push({ 
          key: `${apparatus}_deductions`, 
          label: `${apparatus.replace('_', ' ').toUpperCase()} - Deductions`, 
          type: 'number' 
        });
        fields.push({ 
          key: `${apparatus}_completed`, 
          label: `${apparatus.replace('_', ' ').toUpperCase()} - Completed`, 
          type: 'checkbox' 
        });
      });
      
      // General gymnastics fields
      fields.push({ key: 'total_difficulty_score', label: 'Total Difficulty Score', type: 'number' });
      fields.push({ key: 'total_execution_score', label: 'Total Execution Score', type: 'number' });
      fields.push({ key: 'total_combined_score', label: 'Total Combined Score', type: 'number' });
      fields.push({ key: 'total_deductions', label: 'Total Deductions', type: 'number' });
      fields.push({ key: 'fall_count', label: 'Fall Count', type: 'number' });
      fields.push({ key: 'line_deductions', label: 'Line Deductions', type: 'number' });
      fields.push({ key: 'time_deductions', label: 'Time Deductions', type: 'number' });
      fields.push({ key: 'conduct_deductions', label: 'Conduct Deductions', type: 'number' });
      fields.push({ key: 'routines_completed', label: 'Routines Completed', type: 'number' });
      fields.push({ key: 'all_around_total', label: 'All Around Total', type: 'number' });
      fields.push({ key: 'qualification_score', label: 'Qualification Score', type: 'number' });
      fields.push({ key: 'apparatus_rank', label: 'Apparatus Rank', type: 'number' });
      fields.push({ key: 'overall_rank', label: 'Overall Rank', type: 'number' });
    }

    return fields;
  }

  updatePlayerStats(player: any, teamId: number): void {
    // Show loading
    Swal.fire({
      title: 'Loading Player Stats...',
      text: 'Please wait while we fetch current player statistics.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // First get current player stats from the API
    this.apiService.getPlayerStats(this.match.id, teamId, player.id).subscribe({
      next: (currentPlayerStats) => {
        console.log('Current player stats from API:', currentPlayerStats);
        Swal.close(); // Close loading dialog
        this.showPlayerEditDialog(player, teamId, currentPlayerStats);
      },
      error: (error) => {
        console.error('Error fetching player stats:', error);
        Swal.close(); // Close loading dialog
        
        // Show warning and fallback to using player data from the team list
        Swal.fire({
          icon: 'warning',
          title: 'Stats Not Found',
          text: 'Could not load existing player stats. Starting with default values.',
          confirmButtonColor: '#ffc107'
        }).then(() => {
          const playerFields = this.getPlayerFields();
          const playerFormData: any = {};
          playerFields.forEach(field => {
            playerFormData[field.key] = player[field.key] || (field.type === 'checkbox' ? false : 0);
          });
          this.showPlayerEditDialog(player, teamId, playerFormData);
        });
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

      // Special handling for gymnastics player updates
      if (this.sportConfig?.name === 'Gymnastics') {
        this.updateGymnasticsPlayerStats(updatedStats, dialogDiv, saveBtn, player);
      } else {
        this.sendPlayerUpdate(updatedStats, dialogDiv, saveBtn, player);
      }
    };
  }

  // Gymnastics specific methods
  initializeGymnasticsData(): void {
    // Initialize apparatus scores
    this.gymnasticsApparatus.forEach(apparatus => {
      this.gymnasticsScores[apparatus] = {
        difficulty_score: 0,
        execution_score: 0,
        neutral_deduction: 0,
        combined_score: 0,
        completed: false
      };
    });

    // Initialize rotations if match data exists
    if (this.match?.gymnastics_rotations) {
      this.gymnasticsRotations = this.match.gymnastics_rotations;
    }
  }

  selectApparatus(apparatus: string): void {
    this.selectedApparatus = apparatus;
    console.log('Selected apparatus:', apparatus);
  }

  selectCompetitionType(type: string): void {
    this.selectedCompetitionType = type;
    this.buildApparatusFields();
    console.log('Selected competition type:', type);
  }

  buildApparatusFields(): void {
    if (!this.selectedCompetitionType) return;

    // Add apparatus-specific fields based on competition type
    if (this.selectedCompetitionType === 'apparatus_finals') {
      // For apparatus finals, focus on specific apparatus
      this.dynamicFields.push({ 
        key: 'target_apparatus', 
        label: 'Target Apparatus', 
        type: 'select', 
        options: this.gymnasticsApparatus 
      });
    } else if (this.selectedCompetitionType === 'individual_all_around' || this.selectedCompetitionType === 'team_competition') {
      // For all-around, include all apparatus
      this.gymnasticsApparatus.forEach((apparatus, index) => {
        this.dynamicFields.push({
          key: `${apparatus}_difficulty_score`,
          label: `${apparatus.replace('_', ' ').toUpperCase()} - Difficulty Score`,
          type: 'number'
        });
        this.dynamicFields.push({
          key: `${apparatus}_execution_score`, 
          label: `${apparatus.replace('_', ' ').toUpperCase()} - Execution Score`,
          type: 'number'
        });
        this.dynamicFields.push({
          key: `${apparatus}_combined_score`,
          label: `${apparatus.replace('_', ' ').toUpperCase()} - Combined Score`, 
          type: 'number'
        });
      });
    }
  }

  addRotation(): void {
    if (!this.selectedApparatus) {
      Swal.fire({
        icon: 'warning',
        title: 'No Apparatus Selected',
        text: 'Please select an apparatus before adding a rotation.',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    const newRotation = {
      rotation_number: this.gymnasticsRotations.length + 1,
      apparatus: this.selectedApparatus,
      start_time: new Date(),
      warmup_time: 30,
      touch_warmup_time: 50,
      status: 'pending'
    };
    
    this.gymnasticsRotations.push(newRotation);
    console.log('Added rotation:', newRotation);
    
    // Show success message
    Swal.fire({
      icon: 'success',
      title: 'Rotation Added!',
      text: `Rotation ${newRotation.rotation_number} for ${this.selectedApparatus.replace('_', ' ').toUpperCase()} has been added successfully.`,
      confirmButtonColor: '#198754',
      timer: 3000,
      timerProgressBar: true
    });
  }

  // ============================================================================
  // 🤸‍♀️ ENHANCED GYMNASTICS COMPETITION MANAGEMENT
  // Using comprehensive GymnasticsIntegrationService
  // ============================================================================

  /**
   * Initialize Gymnastics Competition with full setup
   */
  initializeCompetition(): void {
    if (!this.match?.id) {
      Swal.fire({
        icon: 'error',
        title: 'No Match Selected',
        text: 'Cannot initialize competition without a valid match.',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    Swal.fire({
      title: 'Initialize Gymnastics Competition',
      html: `
        <div class="text-start">
          <p><strong>Competition Setup:</strong></p>
          <ul>
            <li>Initialize competition clock and timers</li>
            <li>Setup ${this.gymnasticsApparatus.length} apparatus rotations</li>
            <li>Configure judge panels and scoring system</li>
            <li>Prepare real-time monitoring</li>
          </ul>
          <p class="text-muted mt-3">This will set up the complete gymnastics competition environment.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Initialize Competition',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.performCompetitionInitialization();
      }
    });
  }

  private performCompetitionInitialization(): void {
    Swal.fire({
      title: 'Initializing Gymnastics Competition...',
      html: '<div class="text-center"><i class="fas fa-dumbbell fa-spin fa-2x text-primary mb-3"></i><br>Setting up competition environment...</div>',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Initialize the gymnastics service for this match
    this.gymnasticsService = this.gymnasticsIntegrationService.manageCompetitionClock(this.match.id);
    this.realTimeData = this.gymnasticsIntegrationService.getRealTimeCompetitionData(this.match.id);
    this.competitionResults = this.gymnasticsIntegrationService.getCompetitionResults(this.match.id);

    // Initialize the competition
    this.gymnasticsService.initialize().subscribe({
      next: (response) => {
        console.log('✅ Competition initialized:', response);
        this.competitionState.initialized = true;
        
        // Setup default session configuration
        this.sessionConfig = {
          sessionId: response.session_id || null,
          sessionName: this.sessionConfig.sessionName || `${this.match.league?.name} - Session 1`,
          startTime: new Date(),
          endTime: null,
          subdivision: this.sessionConfig.subdivision || 'A',
          competitionLevel: this.sessionConfig.competitionLevel || 'Senior',
          gender: this.sessionConfig.gender || 'mixed',
          ageGroup: this.sessionConfig.ageGroup || 'senior'
        };

        // Setup default rotations if none exist
        if (this.gymnasticsRotations.length === 0) {
          this.setupDefaultRotations();
        }

        Swal.close();
        Swal.fire({
          icon: 'success',
          title: 'Competition Initialized!',
          html: `
            <div class="text-center">
              <i class="fas fa-trophy fa-3x text-warning mb-3"></i>
              <p><strong>Gymnastics competition is ready!</strong></p>
              <ul class="text-start">
                <li>Competition clock initialized</li>
                <li>${this.gymnasticsApparatus.length} apparatus configured</li>
                <li>Session "${this.sessionConfig.sessionName}" created</li>
                <li>Real-time monitoring active</li>
              </ul>
            </div>
          `,
          confirmButtonColor: '#198754',
          timer: 5000,
          timerProgressBar: true
        });

        // Start auto-refresh for live updates
        this.setupGymnasticsAutoRefresh();
      },
      error: (error) => {
        console.error('❌ Competition initialization failed:', error);
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'Initialization Failed',
          text: 'Failed to initialize the gymnastics competition. Please try again.',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  /**
   * Setup default apparatus rotations
   */
  private setupDefaultRotations(): void {
    const defaultRotations = this.gymnasticsApparatus.map((apparatus, index) => ({
      rotation_number: index + 1,
      apparatus: apparatus,
      status: index === 0 ? 'active' : 'pending',
      start_time: null,
      end_time: null,
      warmup_duration: 30,
      routine_duration: 90
    }));

    this.gymnasticsRotations = defaultRotations;
    console.log('✅ Default rotations setup:', this.gymnasticsRotations);
  }

  // Enhanced clock management with API service integration
  startClock(): void {
    if (!this.match?.id) {
      Swal.fire({
        icon: 'warning',
        title: 'No Match Selected',
        text: 'Cannot start clock without a valid match.',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    Swal.fire({
      title: 'Start Competition Clock',
      text: 'This will start the official competition timing.',
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Start Clock',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.apiService.startGymnasticsClock(this.match.id).subscribe({
          next: (response) => {
            console.log('✅ Clock started:', response);
            this.competitionClock.isRunning = true;
            
            // Parse time_remaining_in_period from API response
            if (response.time_remaining_in_period) {
              this.competitionClock.currentTime = this.parseTimeToSeconds(response.time_remaining_in_period);
            } else {
              this.competitionClock.currentTime = 0;
            }
            
            // Update other clock properties from response
            this.competitionClock.rotationTime = response.current_rotation || 1;
            this.competitionClock.warmupTime = 0;
            this.competitionClock.routineTime = 0;
            
            console.log('Clock initialized with time:', this.competitionClock.currentTime, 'seconds');
            
            Swal.fire({
              icon: 'success',
              title: 'Clock Started!',
              text: `Competition timing has begun. Time remaining: ${response.time_remaining_in_period || '00:00'}`,
              timer: 2000,
              showConfirmButton: false
            });

            // Start the clock interval
            this.startClockInterval();
          },
          error: (error) => {
            console.error('❌ Failed to start clock:', error);
            this.handleApiError(error, 'Failed to start competition clock');
          }
        });
      }
    });
  }

  stopClock(): void {
    if (!this.competitionClock.isRunning || !this.match?.id) {
      return;
    }

    console.log('Stopping gymnastics competition clock...');
    this.apiService.pauseGymnasticsClock(this.match.id).subscribe({
      next: (response) => {
        console.log('✅ Clock paused:', response);
        this.competitionClock.isRunning = false;
        this.stopClockInterval();
        
        Swal.fire({
          icon: 'info',
          title: 'Clock Paused',
          text: 'Competition timing has been paused.',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('❌ Failed to pause clock:', error);
        this.handleApiError(error, 'Failed to pause competition clock');
      }
    });
  }

  resumeClock(): void {
    if (!this.match?.id) return;

    this.apiService.resumeGymnasticsClock(this.match.id).subscribe({
      next: (response) => {
        console.log('Clock resumed:', response);
        this.competitionClock.isRunning = true;
        
        // Update current time from API response
        if (response.time_remaining_in_period) {
          this.competitionClock.currentTime = this.parseTimeToSeconds(response.time_remaining_in_period);
        }
        
        console.log('Clock resumed with time:', this.competitionClock.currentTime, 'seconds');
        
        Swal.fire({
          icon: 'success',
          title: 'Competition Clock Resumed!',
          text: `The gymnastics competition timer is now running again. Time remaining: ${response.time_remaining_in_period || '00:00'}`,
          confirmButtonColor: '#198754',
          timer: 2000,
          timerProgressBar: true
        });

        // Start local timer update
        this.startClockInterval();
      },
      error: (error) => {
        console.error('Failed to resume clock:', error);
        this.handleApiError(error, 'Failed to resume competition clock');
      }
    });
  }

  resetClock(): void {
    if (this.competitionClock.isRunning) {
      Swal.fire({
        icon: 'warning',
        title: 'Clock is Running',
        text: 'Please stop the clock before resetting.',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    if (!this.match?.id) {
      Swal.fire({
        icon: 'warning',
        title: 'No Match Selected',
        text: 'Cannot reset clock without a valid match.',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    Swal.fire({
      title: 'Reset Competition Clock',
      text: 'This will reset all timing data. Are you sure?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Reset Clock',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.apiService.resetGymnasticsClock(this.match.id).subscribe({
          next: (response) => {
            console.log('✅ Clock reset:', response);
            this.resetClockData();
            
            Swal.fire({
              icon: 'success',
              title: 'Clock Reset!',
              text: 'Competition timing has been reset.',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            console.error('❌ Failed to reset clock:', error);
            this.handleApiError(error, 'Failed to reset competition clock');
          }
        });
      }
    });
  }

  /**
   * Advanced rotation management
   */
  advanceRotation(): void {
    if (!this.match?.id) {
      Swal.fire({
        icon: 'warning',
        title: 'No Match Selected',
        text: 'Cannot advance rotation without a valid match.',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    const currentRotation = this.competitionState.currentRotation;
    const nextRotation = currentRotation + 1;
    const totalRotations = this.gymnasticsRotations.length || 6;

    if (nextRotation > totalRotations) {
      Swal.fire({
        icon: 'info',
        title: 'All Rotations Complete',
        text: 'All apparatus rotations have been completed.',
        confirmButtonColor: '#198754'
      });
      this.competitionState.allRotationsComplete = true;
      return;
    }

    Swal.fire({
      title: 'Advance to Next Rotation',
      html: `
        <div class="text-center">
          <p>Move from <strong>Rotation ${currentRotation}</strong> to <strong>Rotation ${nextRotation}</strong></p>
          <p class="text-muted">Current: ${this.getCurrentApparatus()}</p>
          <p class="text-muted">Next: ${this.getNextApparatus()}</p>
          
          <div class="mt-4">
            <label class="form-label"><i class="fas fa-clock me-1"></i><strong>Rotation Duration</strong></label>
            <div class="input-group">
              <input type="number" 
                     class="form-control text-center" 
                     id="rotationDurationInput" 
                     value="120" 
                     min="60" 
                     max="300"
                     style="font-size: 16px;">
              <span class="input-group-text">seconds</span>
            </div>
            <small class="text-muted">Standard duration: 120 seconds (2 minutes)</small>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Advance Rotation',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const durationInput = document.getElementById('rotationDurationInput') as HTMLInputElement;
        const duration = parseInt(durationInput.value) || 120;
        
        if (duration < 60 || duration > 300) {
          Swal.showValidationMessage('Duration must be between 60 and 300 seconds');
          return false;
        }
        
        return duration;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.performApparatusAdvancement(nextRotation, false, result.value);
      }
    });
  }

  /**
   * Handle period end and offer apparatus advancement
   */
  private handlePeriodEnd(): void {
    const currentRotation = this.competitionState.currentRotation;
    const nextRotation = currentRotation + 1;
    const totalRotations = this.gymnasticsRotations.length || 8;

    // Show period ended notification with advancement option
    Swal.fire({
      title: 'Period Ended!',
      html: `
        <div class="text-center">
          <i class="fas fa-clock fa-2x text-warning mb-3"></i>
          <p>The current period time has expired.</p>
          <p class="text-muted">Current apparatus: <strong>${this.getCurrentApparatus()}</strong></p>
          ${nextRotation <= totalRotations ? 
            `<p class="text-muted">Next apparatus: <strong>${this.getNextApparatus()}</strong></p>` : 
            '<p class="text-success"><strong>All rotations completed!</strong></p>'
          }
          
          ${nextRotation <= totalRotations ? `
          <div class="mt-4">
            <label class="form-label"><i class="fas fa-clock me-1"></i><strong>Next Rotation Duration</strong></label>
            <div class="input-group">
              <input type="number" 
                     class="form-control text-center" 
                     id="periodEndDurationInput" 
                     value="120" 
                     min="60" 
                     max="300"
                     style="font-size: 16px;">
              <span class="input-group-text">seconds</span>
            </div>
            <small class="text-muted">Standard duration: 120 seconds (2 minutes)</small>
          </div>` : ''}
        </div>
      `,
      icon: 'info',
      showCancelButton: nextRotation <= totalRotations,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      confirmButtonText: nextRotation <= totalRotations ? 'Advance to Next Apparatus' : 'Complete Competition',
      cancelButtonText: 'Stay on Current Apparatus',
      allowOutsideClick: false,
      preConfirm: () => {
        if (nextRotation <= totalRotations) {
          const durationInput = document.getElementById('periodEndDurationInput') as HTMLInputElement;
          const duration = parseInt(durationInput.value) || 120;
          
          if (duration < 60 || duration > 300) {
            Swal.showValidationMessage('Duration must be between 60 and 300 seconds');
            return false;
          }
          
          return duration;
        }
        return true;
      }
    }).then((result) => {
      if (result.isConfirmed && nextRotation <= totalRotations) {
        // Automatically advance to next apparatus with user-specified duration
        const rotationDuration = typeof result.value === 'number' ? result.value : 120;
        this.performApparatusAdvancement(nextRotation, true, rotationDuration);
      } else if (result.isConfirmed && nextRotation > totalRotations) {
        // Mark competition as complete
        this.competitionState.allRotationsComplete = true;
        this.competitionState.match_completed = true;
        this.showCompetitionCompleteDialog();
      }
    });
  }

  /**
   * Perform the actual apparatus advancement
   */
  private performApparatusAdvancement(nextRotation: number, isAutomatic: boolean = false, rotationDuration: number = 120): void {
    const nextApparatus = this.getNextApparatus();
    const nextApparatusKey = this.getNextApparatusKey();
    
    this.apiService.advanceApparatusRotation(this.match.id, {
      next_apparatus: nextApparatusKey,
      rotation_duration: rotationDuration
    }).subscribe({
      next: (response) => {
        console.log('✅ Rotation advanced:', response);
        this.competitionState.currentRotation = nextRotation;
        this.competitionState.currentApparatus = nextApparatusKey;
        
        // Update rotation status
        if (this.gymnasticsRotations.length > 0) {
          this.gymnasticsRotations.forEach((rotation, index) => {
            if (index < nextRotation - 1) {
              rotation.status = 'completed';
            } else if (index === nextRotation - 1) {
              rotation.status = 'active';
            } else {
              rotation.status = 'pending';
            }
          });
        }

        // Update clock with new period time
        if (response.time_remaining_in_period) {
          this.competitionClock.currentTime = this.parseTimeToSeconds(response.time_remaining_in_period);
        } else {
          this.competitionClock.currentTime = rotationDuration; // Use the selected duration
        }

        const totalRotations = this.gymnasticsRotations.length || 8;
        if (nextRotation >= totalRotations) {
          this.competitionState.allRotationsComplete = true;
        }

        Swal.fire({
          icon: 'success',
          title: isAutomatic ? 'Automatically Advanced!' : 'Rotation Advanced!',
          html: `
            <div class="text-center">
              <i class="fas fa-sync-alt fa-2x text-success mb-3"></i>
              <p>Now on <strong>Rotation ${nextRotation}</strong> of ${totalRotations}</p>
              <p class="text-muted">Apparatus: <strong>${nextApparatus}</strong></p>
              <p class="text-info">Duration: <strong>${rotationDuration} seconds</strong></p>
              <p class="text-info">Time: ${this.formatTime(this.competitionClock.currentTime)}</p>
            </div>
          `,
          confirmButtonColor: '#198754',
          timer: 4000,
          timerProgressBar: true
        });

        // Auto-restart clock if it was running before
        if (isAutomatic) {
          setTimeout(() => {
            this.competitionClock.isRunning = true;
            this.startClockInterval();
          }, 1000);
        }
      },
      error: (error) => {
        console.error('❌ Failed to advance rotation:', error);
        this.handleApiError(error, 'Failed to advance to the next rotation');
      }
    });
  }

  /**
   * Get next apparatus key for API call
   */
  private getNextApparatusKey(): string {
    const nextRotation = this.competitionState.currentRotation + 1;
    if (this.gymnasticsRotations.length > 0 && nextRotation <= this.gymnasticsRotations.length) {
      const rotation = this.gymnasticsRotations[nextRotation - 1];
      return rotation?.apparatus || 'floor_exercise';
    }
    
    // Default apparatus progression for gymnastics
    const apparatusProgression = [
      'floor_exercise',
      'vault', 
      'uneven_bars',
      'balance_beam',
      'pommel_horse',
      'still_rings',
      'parallel_bars',
      'horizontal_bar'
    ];
    
    const currentIndex = this.competitionState.currentRotation - 1;
    return apparatusProgression[(currentIndex + 1) % apparatusProgression.length] || 'floor_exercise';
  }

  /**
   * Show competition complete dialog
   */
  private showCompetitionCompleteDialog(): void {
    Swal.fire({
      title: 'Competition Complete!',
      html: `
        <div class="text-center">
          <i class="fas fa-trophy fa-3x text-warning mb-3"></i>
          <p><strong>All apparatus rotations have been completed!</strong></p>
          <p class="text-muted">The gymnastics competition has ended.</p>
          <div class="mt-3">
            <p class="text-info">What would you like to do next?</p>
          </div>
        </div>
      `,
      icon: 'success',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#007bff',
      confirmButtonText: 'View Final Results',
      cancelButtonText: 'Generate Reports',
      allowOutsideClick: false
    }).then((result) => {
      if (result.isConfirmed) {
        this.viewFinalResults();
      } else if (result.isDismissed) {
        this.generateCompetitionReports();
      }
    });
  }

  /**
   * View final competition results
   */
  private viewFinalResults(): void {
    // Implement final results view
    this.viewRankings();
  }

  /**
   * Generate competition reports
   */
  private generateCompetitionReports(): void {
    Swal.fire({
      icon: 'info',
      title: 'Generating Reports',
      text: 'Competition reports will be generated and made available for download.',
      confirmButtonColor: '#198754'
    });
  }

  /**
   * Live scoring integration with comprehensive API
   */
  submitLiveGymnasticsScore(playerId: number, teamId: number, scoreData: any): void {
    if (!this.competitionState.initialized) {
      Swal.fire({
        icon: 'warning',
        title: 'Competition Not Initialized',
        text: 'Please initialize the competition first.',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    const liveScoreData = {
      matchId: this.match.id,
      teamId: teamId,
      playerId: playerId,
      difficultyScore: parseFloat(scoreData.difficulty_score) || 0,
      executionScore: parseFloat(scoreData.execution_score) || 0,
      deductions: parseFloat(scoreData.deductions) || 0,
      apparatus: this.selectedApparatus || this.getCurrentApparatus(),
      routineDuration: parseInt(scoreData.routine_duration) || 90,
      fallCount: parseInt(scoreData.fall_count) || 0,
      landingQuality: scoreData.landing_quality || 'good'
    };

    this.gymnasticsIntegrationService.submitLiveScore(liveScoreData).subscribe({
      next: (response) => {
        console.log('✅ Live score submitted:', response);
        // Refresh match data to show updated scores
        this.loadMatchData(this.match.id, false);
      },
      error: (error) => {
        console.error('❌ Failed to submit live score:', error);
        Swal.fire({
          icon: 'error',
          title: 'Score Submission Failed',
          text: 'Could not submit the gymnastics score. Please try again.',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  /**
   * Real-time data monitoring
   */
  private setupGymnasticsAutoRefresh(): void {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }

    if (this.realTimeData && this.competitionState.initialized) {
      this.autoRefreshInterval = setInterval(() => {
        // Get live competition data
        this.realTimeData?.getLiveMatchStatus().subscribe({
          next: (matchStatus) => {
            // Update match status without full reload
            if (matchStatus) {
              this.match = { ...this.match, ...matchStatus };
            }
          },
          error: (error) => console.warn('Auto-refresh error:', error)
        });

        // Get live scoring data
        this.realTimeData?.getLiveScoring().subscribe({
          next: (liveScoring) => {
            if (liveScoring) {
              console.log('🔄 Live scoring update:', liveScoring);
              // Update UI with live scoring data
            }
          },
          error: (error) => console.warn('Live scoring refresh error:', error)
        });

        // Update clock status
        if (this.gymnasticsService) {
          this.gymnasticsService.getStatus().subscribe({
            next: (clockStatus) => {
              if (clockStatus) {
                this.updateClockFromStatus(clockStatus);
              }
            },
            error: (error) => console.warn('Clock status refresh error:', error)
          });
        }
      }, this.AUTO_REFRESH_INTERVAL);

      console.log('✅ Gymnastics auto-refresh started');
    }
  }

  /**
   * Helper methods for gymnastics management
   */
  getCurrentApparatus(): string {
    const currentRotation = this.competitionState.currentRotation;
    if (this.gymnasticsRotations.length > 0 && currentRotation > 0) {
      const rotation = this.gymnasticsRotations[currentRotation - 1];
      return rotation?.apparatus?.replace('_', ' ') || 'Unknown';
    }
    return this.selectedApparatus?.replace('_', ' ') || 'Multiple';
  }

  getNextApparatus(): string {
    const nextRotation = this.competitionState.currentRotation + 1;
    if (this.gymnasticsRotations.length > 0 && nextRotation <= this.gymnasticsRotations.length) {
      const rotation = this.gymnasticsRotations[nextRotation - 1];
      return rotation?.apparatus?.replace('_', ' ') || 'Unknown';
    }
    return 'Final';
  }

  private updateClockFromStatus(clockStatus: any): void {
    if (clockStatus) {
      this.competitionClock.isRunning = clockStatus.is_running || false;
      this.competitionClock.currentTime = clockStatus.current_time || 0;
      this.competitionClock.rotationTime = clockStatus.rotation_time || 0;
      this.competitionClock.warmupTime = clockStatus.warmup_time || 0;
      this.competitionClock.routineTime = clockStatus.routine_time || 0;
      this.competitionClock.breakTime = clockStatus.break_time || 0;
    }
  }

  private resetClockData(): void {
    this.competitionClock = {
      isRunning: false,
      currentTime: 0,
      rotationTime: 0,
      warmupTime: 0,
      touchWarmupTime: 0,
      routineTime: 0,
      breakTime: 0
    };
    this.stopClockInterval();
  }

  private clockIntervalId: any = null;

  private startClockInterval(): void {
    if (this.clockIntervalId) {
      clearInterval(this.clockIntervalId);
    }

    this.clockIntervalId = setInterval(() => {
      if (this.competitionClock.isRunning) {
        // Count down from the remaining time
        this.competitionClock.currentTime--;
        
        // Stop the clock if time reaches zero
        if (this.competitionClock.currentTime <= 0) {
          this.competitionClock.currentTime = 0;
          this.competitionClock.isRunning = false;
          this.stopClockInterval();
          
          // Handle period end and potential apparatus advancement
          this.handlePeriodEnd();
        }
      }
    }, 1000);
  }

  // Helper method to parse time string (MM:SS) to seconds
  private parseTimeToSeconds(timeString: string): number {
    if (!timeString) return 0;
    
    const parts = timeString.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return (minutes * 60) + seconds;
    }
    return 0;
  }

  // Sync clock with server status
  private syncClockWithServer(): void {
    if (!this.match?.id) return;
    
    this.apiService.getGymnasticsClockStatus(this.match.id).subscribe({
      next: (clockStatus) => {
        // Update local clock state with server data
        if (clockStatus.time_remaining_in_period) {
          this.competitionClock.currentTime = this.parseTimeToSeconds(clockStatus.time_remaining_in_period);
        }
        this.competitionClock.isRunning = clockStatus.is_running || false;
        
        // Update other properties
        this.competitionState.currentRotation = clockStatus.current_rotation || 1;
        this.competitionState.currentPeriod = clockStatus.current_period || 1;
        
        // Update routine state from clock status
        if (clockStatus.current_routine_player) {
          this.routineState.activePlayer = this.getPlayerById(clockStatus.current_routine_player);
          this.routineState.activeApparatus = clockStatus.current_apparatus || '';
          this.routineState.isRoutineActive = true;
          this.routineState.routineStartTime = clockStatus.routine_start_time ? new Date(clockStatus.routine_start_time) : null;
        } else {
          this.routineState.activePlayer = null;
          this.routineState.activeApparatus = '';
          this.routineState.isRoutineActive = false;
          this.routineState.routineStartTime = null;
        }
        
        console.log('Clock synced with server:', clockStatus);
      },
      error: (error) => {
        console.warn('Failed to sync clock with server:', error);
      }
    });
  }

  // ============================================================================
  // 🏃‍♀️ ROUTINE MANAGEMENT METHODS
  // ============================================================================

  /**
   * Start routine timer for a specific player
   */
  startRoutineTimer(playerId: number, apparatus: string, routineDuration: number = 90): void {
    if (!this.match?.id) {
      Swal.fire({
        icon: 'warning',
        title: 'No Match Selected',
        text: 'Cannot start routine timer without a valid match.',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    if (!playerId) {
      Swal.fire({
        icon: 'warning',
        title: 'No Player Selected',
        text: 'Please select a player to start their routine timer.',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    const player = this.getPlayerById(playerId);
    const playerName = player ? `${player.first_name} ${player.last_name}` : `Player #${playerId}`;

    Swal.fire({
      title: 'Start Routine Timer',
      html: `
        <div class="text-center">
          <i class="fas fa-stopwatch fa-2x text-primary mb-3"></i>
          <p><strong>Player:</strong> ${playerName}</p>
          <p><strong>Apparatus:</strong> ${apparatus.replace('_', ' ').toUpperCase()}</p>
          <p><strong>Duration:</strong> ${routineDuration} seconds</p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Start Routine',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        const routineData = {
          player_id: playerId,
          apparatus: apparatus,
          routine_duration: routineDuration
        };

        this.apiService.startRoutineTimer(this.match.id, routineData).subscribe({
          next: (response) => {
            console.log('✅ Routine timer started:', response);
            
            // Update routine state
            this.routineState.activePlayer = player;
            this.routineState.activeApparatus = apparatus;
            this.routineState.isRoutineActive = true;
            this.routineState.routineStartTime = response.routine_start_time ? new Date(response.routine_start_time) : new Date();
            this.routineState.routineDuration = routineDuration;

            // Update clock state from response
            this.updateClockFromResponse(response);

            Swal.fire({
              icon: 'success',
              title: 'Routine Timer Started!',
              html: `
                <div class="text-center">
                  <i class="fas fa-play-circle fa-2x text-success mb-3"></i>
                  <p><strong>${playerName}</strong> routine timer is now running</p>
                  <p class="text-muted">Apparatus: ${apparatus.replace('_', ' ').toUpperCase()}</p>
                  <p class="text-muted">Timer: ${response.routine_timer || '00:00'}</p>
                </div>
              `,
              confirmButtonColor: '#198754',
              timer: 3000,
              timerProgressBar: true
            });
          },
          error: (error) => {
            console.error('❌ Failed to start routine timer:', error);
            this.handleApiError(error, 'Failed to start routine timer');
          }
        });
      }
    });
  }

  /**
   * Stop routine timer for current active player
   */
  stopRoutineTimer(playerId?: number): void {
    if (!this.match?.id) {
      Swal.fire({
        icon: 'warning',
        title: 'No Match Selected',
        text: 'Cannot stop routine timer without a valid match.',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    const targetPlayerId = playerId || this.routineState.activePlayer?.id;
    if (!targetPlayerId) {
      Swal.fire({
        icon: 'warning',
        title: 'No Active Routine',
        text: 'No routine timer is currently running.',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    const player = this.getPlayerById(targetPlayerId);
    const playerName = player ? `${player.first_name} ${player.last_name}` : `Player #${targetPlayerId}`;

    Swal.fire({
      title: 'Stop Routine Timer',
      html: `
        <div class="text-center">
          <i class="fas fa-stop-circle fa-2x text-danger mb-3"></i>
          <p>Stop routine timer for <strong>${playerName}</strong>?</p>
          <p class="text-muted">Apparatus: ${this.routineState.activeApparatus.replace('_', ' ').toUpperCase()}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Stop Timer',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        const playerData = { player_id: targetPlayerId };

        this.apiService.stopRoutineTimer(this.match.id, playerData).subscribe({
          next: (response) => {
            console.log('✅ Routine timer stopped:', response);

            // Calculate routine duration
            const routineDuration = this.calculateRoutineDuration(response);

            // Reset routine state
            this.routineState.activePlayer = null;
            this.routineState.activeApparatus = '';
            this.routineState.isRoutineActive = false;
            this.routineState.routineStartTime = null;
            this.routineState.routineDuration = 0;

            // Update clock state from response
            this.updateClockFromResponse(response);

            Swal.fire({
              icon: 'success',
              title: 'Routine Timer Stopped!',
              html: `
                <div class="text-center">
                  <i class="fas fa-stop-circle fa-2x text-success mb-3"></i>
                  <p><strong>${playerName}</strong> routine completed</p>
                  <p class="text-muted">Duration: ${routineDuration}</p>
                  <p class="text-muted">Final Timer: ${response.routine_timer || '00:00'}</p>
                </div>
              `,
              confirmButtonColor: '#198754',
              timer: 3000,
              timerProgressBar: true
            });
          },
          error: (error) => {
            console.error('❌ Failed to stop routine timer:', error);
            this.handleApiError(error, 'Failed to stop routine timer');
          }
        });
      }
    });
  }

  /**
   * Get routine status display text
   */
  getRoutineStatusText(): string {
    if (this.routineState.isRoutineActive && this.routineState.activePlayer) {
      const playerName = `${this.routineState.activePlayer.first_name} ${this.routineState.activePlayer.last_name}`;
      const apparatus = this.routineState.activeApparatus.replace('_', ' ').toUpperCase();
      return `ACTIVE: ${playerName} on ${apparatus}`;
    } else {
      return 'No Active Routine';
    }
  }

  /**
   * Get current routine timer display
   */
  getCurrentRoutineTimer(): string {
    if (!this.routineState.isRoutineActive || !this.routineState.routineStartTime) {
      return '00:00';
    }

    const now = new Date();
    const elapsed = Math.floor((now.getTime() - this.routineState.routineStartTime.getTime()) / 1000);
    const remaining = Math.max(0, this.routineState.routineDuration - elapsed);
    
    return this.formatTime(remaining);
  }

  /**
   * Check if routine timer is active
   */
  isRoutineTimerActive(): boolean {
    return this.routineState.isRoutineActive;
  }

  /**
   * Get active routine player
   */
  getActiveRoutinePlayer(): any {
    return this.routineState.activePlayer;
  }

  /**
   * Get active routine apparatus
   */
  getActiveRoutineApparatus(): string {
    return this.routineState.activeApparatus;
  }

  // ============================================================================
  // 🔧 HELPER METHODS FOR ROUTINE MANAGEMENT
  // ============================================================================

  /**
   * Get player by ID from all teams
   */
  private getPlayerById(playerId: number): any {
    for (const teamId in this.playersData) {
      const players = this.playersData[teamId];
      const player = players.find(p => p.id === playerId);
      if (player) {
        return player;
      }
    }
    return null;
  }

  /**
   * Update clock state from API response
   */
  private updateClockFromResponse(response: any): void {
    if (response) {
      // Update main clock properties
      if (response.time_remaining_in_period) {
        this.competitionClock.currentTime = this.parseTimeToSeconds(response.time_remaining_in_period);
      }
      
      this.competitionClock.isRunning = response.is_running || false;
      this.competitionState.currentPeriod = response.current_period || 1;
      this.competitionState.currentRotation = response.current_rotation || 1;
      
      // Update routine state from response
      if (response.current_routine_player) {
        this.routineState.activePlayer = this.getPlayerById(response.current_routine_player);
        this.routineState.activeApparatus = response.current_apparatus || '';
        this.routineState.isRoutineActive = true;
        this.routineState.routineStartTime = response.routine_start_time ? new Date(response.routine_start_time) : null;
      } else {
        this.routineState.activePlayer = null;
        this.routineState.activeApparatus = '';
        this.routineState.isRoutineActive = false;
        this.routineState.routineStartTime = null;
      }

      console.log('Clock state updated from API response:', response);
    }
  }

  /**
   * Calculate routine duration from response
   */
  private calculateRoutineDuration(response: any): string {
    if (response.routine_timer) {
      return response.routine_timer;
    }
    
    if (this.routineState.routineStartTime) {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - this.routineState.routineStartTime.getTime()) / 1000);
      return this.formatTime(duration);
    }
    
    return '00:00';
  }

  /**
   * Get current routine player from clock status
   */
  getCurrentRoutinePlayerFromClock(): any {
    if (!this.match?.id) return null;
    
    this.apiService.getGymnasticsClockStatus(this.match.id).subscribe({
      next: (clockStatus) => {
        if (clockStatus.current_routine_player) {
          return this.getPlayerById(clockStatus.current_routine_player);
        }
        return null;
      },
      error: (error) => {
        console.error('Failed to get current routine player:', error);
        return null;
      }
    });
  }

  /**
   * Update routine state from clock status
   */
  private updateRoutineStateFromClock(): void {
    if (!this.match?.id) return;
    
    this.apiService.getGymnasticsClockStatus(this.match.id).subscribe({
      next: (clockStatus) => {
        if (clockStatus.current_routine_player) {
          this.routineState.activePlayer = this.getPlayerById(clockStatus.current_routine_player);
          this.routineState.activeApparatus = clockStatus.current_apparatus || '';
          this.routineState.isRoutineActive = true;
          this.routineState.routineStartTime = clockStatus.routine_start_time ? new Date(clockStatus.routine_start_time) : null;
        } else {
          this.routineState.activePlayer = null;
          this.routineState.activeApparatus = '';
          this.routineState.isRoutineActive = false;
          this.routineState.routineStartTime = null;
        }
        
        console.log('Routine state updated from clock:', this.routineState);
      },
      error: (error) => {
        console.warn('Failed to update routine state from clock:', error);
      }
    });
  }

  // ============================================================================
  // 🎯 UI HELPER METHODS FOR ROUTINE MANAGEMENT
  // ============================================================================

  /**
   * Start routine from UI form
   */
  startRoutineFromUI(): void {
    const playerSelect = document.getElementById('routinePlayerSelect') as HTMLSelectElement;
    const apparatusSelect = document.getElementById('routineApparatusSelect') as HTMLSelectElement;
    const durationInput = document.getElementById('routineDurationInput') as HTMLInputElement;

    const playerId = parseInt(playerSelect.value);
    const apparatus = apparatusSelect.value;
    const duration = parseInt(durationInput.value) || 90;

    if (!playerId) {
      Swal.fire({
        icon: 'warning',
        title: 'Player Required',
        text: 'Please select a player to start their routine.',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    if (!apparatus) {
      Swal.fire({
        icon: 'warning',
        title: 'Apparatus Required',
        text: 'Please select an apparatus for the routine.',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    this.startRoutineTimer(playerId, apparatus, duration);

    // Reset form after starting
    playerSelect.value = '';
    apparatusSelect.value = '';
    durationInput.value = '90';
  }

  /**
   * Quick start routine for a player with default settings
   */
  quickStartRoutine(playerId: number, teamName: string): void {
    // Use the current apparatus from competition state or default to floor exercise
    const defaultApparatus = this.competitionState.currentApparatus || 'floor_exercise';
    
    Swal.fire({
      title: 'Quick Start Routine',
      html: `
        <div class="text-center">
          <p>Start routine for player from <strong>${teamName}</strong>?</p>
          <div class="mt-3">
            <label class="form-label"><i class="fas fa-dumbbell me-1"></i>Apparatus</label>
            <select class="form-select" id="quickApparatusSelect">
              <option value="floor_exercise" ${defaultApparatus === 'floor_exercise' ? 'selected' : ''}>Floor Exercise</option>
              <option value="vault" ${defaultApparatus === 'vault' ? 'selected' : ''}>Vault</option>
              <option value="uneven_bars" ${defaultApparatus === 'uneven_bars' ? 'selected' : ''}>Uneven Bars</option>
              <option value="balance_beam" ${defaultApparatus === 'balance_beam' ? 'selected' : ''}>Balance Beam</option>
              <option value="pommel_horse" ${defaultApparatus === 'pommel_horse' ? 'selected' : ''}>Pommel Horse</option>
              <option value="still_rings" ${defaultApparatus === 'still_rings' ? 'selected' : ''}>Still Rings</option>
              <option value="parallel_bars" ${defaultApparatus === 'parallel_bars' ? 'selected' : ''}>Parallel Bars</option>
              <option value="horizontal_bar" ${defaultApparatus === 'horizontal_bar' ? 'selected' : ''}>Horizontal Bar</option>
            </select>
          </div>
          <div class="mt-3">
            <label class="form-label"><i class="fas fa-hourglass-half me-1"></i>Duration (seconds)</label>
            <input type="number" class="form-control" id="quickDurationInput" value="90" min="30" max="150">
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Start Routine',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const apparatusSelect = document.getElementById('quickApparatusSelect') as HTMLSelectElement;
        const durationInput = document.getElementById('quickDurationInput') as HTMLInputElement;
        
        return {
          apparatus: apparatusSelect.value,
          duration: parseInt(durationInput.value) || 90
        };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.startRoutineTimer(playerId, result.value.apparatus, result.value.duration);
      }
    });
  }

  private stopClockInterval(): void {
    if (this.clockIntervalId) {
      clearInterval(this.clockIntervalId);
      this.clockIntervalId = null;
    }
  }

  ngOnDestroy(): void {
    // Clean up clock interval
    this.stopClockInterval();
    // Clean up auto-refresh interval
    this.stopAutoRefresh();
  }

  // Utility method for formatting time display
  formatTime(seconds: number): string {
    if (!seconds || seconds < 0) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Get current clock display time
  getCurrentClockDisplay(): string {
    return this.formatTime(this.competitionClock.currentTime);
  }

  // Get clock status text
  getClockStatusText(): string {
    if (this.competitionClock.isRunning) {
      return 'RUNNING';
    } else if (this.competitionClock.currentTime > 0) {
      return 'PAUSED';
    } else {
      return 'STOPPED';
    }
  }

  // Method to get total number of players
  getTotalPlayers(): number {
    let total = 0;
    Object.values(this.playersData).forEach(teamPlayers => {
      total += teamPlayers.length;
    });
    return total;
  }

  // Session Management Methods
  createSession(): void {
    if (!this.match?.id) return;

    const sessionData = {
      match: this.match.id,
      session_name: this.sessionConfig.sessionName || `Session ${new Date().getTime()}`,
      start_time: this.sessionConfig.startTime || new Date(),
      subdivision: this.sessionConfig.subdivision || 'A',
      competition_level: this.sessionConfig.competitionLevel || 'Senior',
      gender: this.sessionConfig.gender || 'mixed',
      age_group: this.sessionConfig.ageGroup || 'senior'
    };

    this.apiService.createGymnasticsSession(sessionData).subscribe({
      next: (response) => {
        console.log('Session created:', response);
        this.sessionConfig.sessionId = response.id;
        
        Swal.fire({
          icon: 'success',
          title: 'Session Created!',
          text: `Gymnastics session "${sessionData.session_name}" has been created successfully.`,
          confirmButtonColor: '#198754'
        }).then(() => {
          // Refresh match data after session creation
          this.loadMatchData(this.match.id, true);
        });
      },
      error: (error) => {
        console.error('Failed to create session:', error);
        this.handleApiError(error, 'Failed to create gymnastics session');
      }
    });
  }

  // Judge Panel Management
  setupJudgePanels(): void {
    if (!this.match?.id) return;

    const panelData = {
      difficulty_panel_judges: this.judgePanels.difficulty_panel.judges.length || 2,
      execution_panel_judges: this.judgePanels.execution_panel.judges.length || 5,
      reference_panel_active: this.judgePanels.reference_panel.isActive,
      superior_jury_active: this.judgePanels.superior_jury.isActive
    };

    this.apiService.setupJudgePanels(this.match.id, panelData).subscribe({
      next: (response) => {
        console.log('Judge panels set up:', response);
        
        Swal.fire({
          icon: 'success',
          title: 'Judge Panels Configured!',
          text: 'All judge panels have been set up successfully.',
          confirmButtonColor: '#198754'
        }).then(() => {
          // Refresh match data after judge panel setup
          this.loadMatchData(this.match.id, true);
        });
      },
      error: (error) => {
        console.error('Failed to set up judge panels:', error);
        this.handleApiError(error, 'Failed to configure judge panels');
      }
    });
  }

  // Rankings and Results
  viewRankings(): void {
    if (!this.match?.id || !this.selectedCompetitionType) return;

    this.apiService.getGymnasticsRankings(this.match.id, this.selectedCompetitionType).subscribe({
      next: (rankings) => {
        console.log('Rankings loaded:', rankings);
        
        // Display rankings in a modal or separate view
        this.displayRankings(rankings);
      },
      error: (error) => {
        console.error('Failed to load rankings:', error);
        this.handleApiError(error, 'Failed to load competition rankings');
      }
    });
  }

  displayRankings(rankings: any): void {
    let rankingHtml = '<div class="ranking-display">';
    rankingHtml += '<h5>Current Rankings</h5>';
    
    if (rankings && rankings.length > 0) {
      rankingHtml += '<table class="table table-striped">';
      rankingHtml += '<thead><tr><th>Rank</th><th>Gymnast</th><th>Score</th></tr></thead><tbody>';
      
      rankings.forEach((rank: any, index: number) => {
        rankingHtml += `<tr>
          <td>${index + 1}</td>
          <td>${rank.gymnast_name || rank.gymnast}</td>
          <td>${rank.total_score || rank.score}</td>
        </tr>`;
      });
      
      rankingHtml += '</tbody></table>';
    } else {
      rankingHtml += '<p>No rankings available yet.</p>';
    }
    
    rankingHtml += '</div>';

    Swal.fire({
      title: 'Competition Rankings',
      html: rankingHtml,
      width: 600,
      confirmButtonColor: '#198754'
    });
  }

  // Competition Finalization
  finalizeResults(): void {
    if (!this.match?.id) return;

    Swal.fire({
      title: 'Finalize Competition Results?',
      text: 'This will lock all scores and generate final rankings. This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#dc3545',
      confirmButtonText: 'Finalize Results',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Finalizing Results...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.apiService.finalizeGymnasticsResults(this.match.id).subscribe({
          next: (response) => {
            console.log('Results finalized:', response);
            this.competitionState.allRotationsComplete = true;
            this.competitionState.awards_ceremony_ready = true;
            
            Swal.fire({
              icon: 'success',
              title: 'Results Finalized!',
              text: 'Competition results have been finalized and are ready for awards ceremony.',
              confirmButtonColor: '#198754'
            }).then(() => {
              // Refresh match data after finalizing results
              this.loadMatchData(this.match.id, true);
            });
          },
          error: (error) => {
            console.error('Failed to finalize results:', error);
            this.handleApiError(error, 'Failed to finalize competition results');
          }
        });
      }
    });
  }

  // Export Results
  exportResults(format: 'pdf' | 'excel' | 'csv'): void {
    if (!this.match?.id) return;

    Swal.fire({
      title: 'Exporting Results...',
      text: `Generating ${format.toUpperCase()} report...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.apiService.exportGymnasticsResults(this.match.id, format).subscribe({
      next: (blob) => {
        console.log('Results exported:', blob);
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `gymnastics_results_${this.match.id}.${format}`;
        link.click();
        
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
          icon: 'success',
          title: 'Export Complete!',
          text: `Results have been exported as ${format.toUpperCase()} file.`,
          confirmButtonColor: '#198754'
        });
      },
      error: (error) => {
        console.error('Failed to export results:', error);
        this.handleApiError(error, 'Failed to export competition results');
      }
    });
  }

  // ============================================
  // COMPREHENSIVE GYMNASTICS FLOW MANAGEMENT
  // ============================================

  // Initialize match with full gymnastics flow setup
  initializeGymnasticsMatchFlow(): void {
    if (!this.match?.id) return;

    const competitionData = {
      match_format: 'gymnastics',
      total_periods: 4,
      period_duration: 300,
      apparatus_rotation_time: this.gymnasticsFlow.rotationDuration,
      routine_time_limit: this.gymnasticsFlow.routineTimeLimit
    };

    this.apiService.initializeGymnasticsCompetitionClock(this.match.id, competitionData).subscribe({
      next: (response) => {
        console.log('Gymnastics match flow initialized:', response);
        this.competitionState.initialized = true;
        this.competitionState.currentPeriod = 1;
        this.competitionState.currentApparatus = this.gymnasticsFlow.periods[0].apparatus;
        
        Swal.fire({
          icon: 'success',
          title: 'Match Flow Initialized!',
          text: 'Gymnastics competition is ready to begin.',
          confirmButtonColor: '#198754'
        });
      },
      error: (error) => {
        console.error('Failed to initialize match flow:', error);
        this.handleApiError(error, 'Failed to initialize gymnastics match flow');
      }
    });
  }

  // Start routine timer for a specific player
  startPlayerRoutine(player: any, apparatus: string): void {
    if (!this.match?.id || this.routineState.isRoutineActive) return;

    const routineData = {
      player_id: player.id,
      apparatus: apparatus,
      routine_duration: this.gymnasticsFlow.routineTimeLimit
    };

    this.apiService.startRoutineTimer(this.match.id, routineData).subscribe({
      next: (response) => {
        console.log('Routine timer started:', response);
        this.routineState = {
          activePlayer: player,
          activeApparatus: apparatus,
          routineStartTime: new Date(),
          routineDuration: 0,
          isRoutineActive: true
        };

        Swal.fire({
          icon: 'info',
          title: 'Routine Started',
          text: `${player.first_name} ${player.last_name} routine on ${apparatus.replace('_', ' ')} has begun.`,
          timer: 3000,
          timerProgressBar: true
        });

        // Start routine duration tracking
        this.startRoutineDurationTracking();
      },
      error: (error) => {
        console.error('Failed to start routine timer:', error);
        this.handleApiError(error, 'Failed to start routine timer');
      }
    });
  }

  // Stop routine timer for active player
  stopPlayerRoutine(): void {
    if (!this.match?.id || !this.routineState.isRoutineActive) return;

    const playerData = {
      player_id: this.routineState.activePlayer?.id
    };

    this.apiService.stopRoutineTimer(this.match.id, playerData).subscribe({
      next: (response) => {
        console.log('Routine timer stopped:', response);
        
        const player = this.routineState.activePlayer;
        const apparatus = this.routineState.activeApparatus;
        const duration = this.routineState.routineDuration;
        
        // Reset routine state
        this.routineState = {
          activePlayer: null,
          activeApparatus: '',
          routineStartTime: null,
          routineDuration: 0,
          isRoutineActive: false
        };

        // Update match statistics
        this.updateMatchStats(duration);

        Swal.fire({
          icon: 'success',
          title: 'Routine Completed',
          text: `${player?.first_name} ${player?.last_name} routine completed in ${duration} seconds.`,
          confirmButtonColor: '#198754'
        });

        this.stopRoutineDurationTracking();
      },
      error: (error) => {
        console.error('Failed to stop routine timer:', error);
        this.handleApiError(error, 'Failed to stop routine timer');
      }
    });
  }

  // Call timeout for a team
  callTeamTimeout(teamId: number, reason: string): void {
    if (!this.match?.id || this.timeoutState.isActive) return;

    const timeoutData = {
      team_id: teamId,
      duration: '00:01:00', // 1 minute default
      reason: reason
    };

    this.apiService.callTimeout(this.match.id, timeoutData).subscribe({
      next: (response) => {
        console.log('Timeout called:', response);
        this.timeoutState = {
          isActive: true,
          teamId: teamId,
          duration: timeoutData.duration,
          reason: reason,
          startTime: new Date(),
          endTime: new Date(Date.now() + 60000) // 1 minute from now
        };

        const teamName = this.getTeamName(teamId);
        Swal.fire({
          icon: 'warning',
          title: 'Timeout Called',
          text: `${teamName} has called a timeout for ${reason.replace('_', ' ')}.`,
          confirmButtonColor: '#ffc107'
        });
      },
      error: (error) => {
        console.error('Failed to call timeout:', error);
        this.handleApiError(error, 'Failed to call timeout');
      }
    });
  }

  // End active timeout
  endActiveTimeout(): void {
    if (!this.match?.id || !this.timeoutState.isActive) return;

    this.apiService.endTimeout(this.match.id).subscribe({
      next: (response) => {
        console.log('Timeout ended:', response);
        const teamName = this.getTeamName(this.timeoutState.teamId!);
        
        // Reset timeout state
        this.timeoutState = {
          isActive: false,
          teamId: null,
          duration: '',
          reason: '',
          startTime: null,
          endTime: null
        };

        this.matchStats.totalTimeouts++;

        Swal.fire({
          icon: 'info',
          title: 'Timeout Ended',
          text: `${teamName} timeout has ended. Competition resumes.`,
          timer: 2000,
          timerProgressBar: true
        });
      },
      error: (error) => {
        console.error('Failed to end timeout:', error);
        this.handleApiError(error, 'Failed to end timeout');
      }
    });
  }

  // Advance to next apparatus/period
  advanceToNextApparatus(): void {
    if (!this.match?.id) return;

    const currentIndex = this.gymnasticsFlow.currentPeriodIndex;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= this.gymnasticsFlow.periods.length) {
      this.completeMatch();
      return;
    }

    const nextPeriod = this.gymnasticsFlow.periods[nextIndex];
    const periodData = {
      next_period: nextPeriod.number,
      apparatus: nextPeriod.apparatus
    };

    this.apiService.advancePeriod(this.match.id, periodData).subscribe({
      next: (response) => {
        console.log('Advanced to next apparatus:', response);
        
        // Mark current period as completed
        this.gymnasticsFlow.periods[currentIndex].completed = true;
        this.gymnasticsFlow.currentPeriodIndex = nextIndex;
        
        // Update competition state
        this.competitionState.currentPeriod = nextPeriod.number;
        this.competitionState.currentApparatus = nextPeriod.apparatus;

        Swal.fire({
          icon: 'success',
          title: 'Apparatus Changed',
          text: `Competition has advanced to ${nextPeriod.apparatus.replace('_', ' ').toUpperCase()}.`,
          confirmButtonColor: '#198754'
        });
      },
      error: (error) => {
        console.error('Failed to advance apparatus:', error);
        this.handleApiError(error, 'Failed to advance to next apparatus');
      }
    });
  }

  // Complete the match
  completeMatch(): void {
    if (!this.match?.id) return;

    Swal.fire({
      title: 'Complete Match?',
      text: 'This will finalize all results and end the competition.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#dc3545',
      confirmButtonText: 'Complete Match',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.apiService.stopMatch(this.match.id, 'match_completed').subscribe({
          next: (response) => {
            console.log('Match completed:', response);
            this.competitionState.match_completed = true;
            this.competitionState.allRotationsComplete = true;
            this.competitionState.awards_ceremony_ready = true;

            Swal.fire({
              icon: 'success',
              title: 'Match Completed!',
              text: 'Gymnastics competition has been successfully completed.',
              confirmButtonColor: '#198754'
            });
          },
          error: (error) => {
            console.error('Failed to complete match:', error);
            this.handleApiError(error, 'Failed to complete match');
          }
        });
      }
    });
  }

  // Get comprehensive rankings
  getComprehensiveRankings(): void {
    if (!this.match?.id) return;

    Promise.all([
      this.apiService.getGymnasticsRankings(this.match.id).toPromise(),
      this.apiService.getAllAroundRankings(this.match.id, { limit: 10 }).toPromise(),
      this.apiService.getFinalScores(this.match.id).toPromise()
    ]).then(([rankings, allAround, finalScores]) => {
      this.displayComprehensiveResults({
        rankings: rankings,
        allAround: allAround,
        finalScores: finalScores
      });
    }).catch((error) => {
      console.error('Failed to load comprehensive rankings:', error);
      this.handleApiError(error, 'Failed to load competition rankings');
    });
  }

  // Utility methods
  private startRoutineDurationTracking(): void {
    const startTime = this.routineState.routineStartTime;
    if (!startTime) return;

    const interval = setInterval(() => {
      if (!this.routineState.isRoutineActive) {
        clearInterval(interval);
        return;
      }
      
      this.routineState.routineDuration = Math.floor((Date.now() - startTime.getTime()) / 1000);
    }, 1000);
  }

  // Stop tracking routine duration and return the duration in minutes
  private stopRoutineDurationTracking(): number {
    if (this.routineState.routineStartTime) {
      const endTime = new Date();
      const duration = (endTime.getTime() - this.routineState.routineStartTime.getTime()) / (1000 * 60); // Convert to minutes
      this.routineState.routineStartTime = null;
      return duration;
    }
    return 0;
  }

  private updateMatchStats(routineDuration: number): void {
    this.matchStats.totalRoutines++;
    this.matchStats.completedRoutines++;
    this.matchStats.averageRoutineDuration = 
      ((this.matchStats.averageRoutineDuration * (this.matchStats.totalRoutines - 1)) + routineDuration) / 
      this.matchStats.totalRoutines;
  }

  // Get current apparatus display name
  getCurrentApparatusName(): string {
    return this.competitionState.currentApparatus.replace('_', ' ').toUpperCase();
  }

  // Get current period progress
  getPeriodProgress(): number {
    const total = this.gymnasticsFlow.periods.length;
    const completed = this.gymnasticsFlow.periods.filter(p => p.completed).length;
    return (completed / total) * 100;
  }

  // Utility method to check if current match is gymnastics
  isGymnastics(): boolean {
    console.log('Checking if match is gymnastics...');
    console.log(this.match);
    return this.match?.sport?.name?.toLowerCase().includes('gymnastics') || 
           this.match?.sport?.toLowerCase().includes('gymnastics') ||
           this.sportConfig?.isGymnastics ||
           this.match?.league_obj?.sport === 10 ||
           false;
  }

  // Check competition status and restore state
  checkCompetitionStatus(matchId: number): void {
    if (!matchId) return;

    // Check if competition is initialized
    this.apiService.getCompetitionStatus(matchId).subscribe({
      next: (status: any) => {
        console.log('Competition status loaded:', status);
        
        if (status) {
          // Update competition state
          this.competitionState = {
            ...this.competitionState,
            initialized: status.initialized || false,
            currentRotation: status.current_rotation || 1,
            allRotationsComplete: status.all_rotations_complete || false,
            awards_ceremony_ready: status.awards_ceremony_ready || false
          };

          // Load clock status if competition is initialized
          if (status.initialized) {
            
          }
          this.loadClockStatus(matchId);

          // Load gymnastics scores if available
          this.loadGymnasticsScores(matchId);

          // Load competition rotations
          // this.loadCompetitionRotations(matchId);

          console.log('Competition state restored:', this.competitionState);
        }
      },
      error: (error: any) => {
        console.log('No competition status found or error loading status:', error);
        // This is normal for matches that haven't been initialized yet
        this.competitionState.initialized = false;
      }
    });
  }

  // Load clock status
  loadClockStatus(matchId: number): void {
    this.apiService.getGymnasticsClockStatus(matchId).subscribe({
      next: (clockStatus) => {
        console.log('Clock status loaded:', clockStatus);
        
        if (clockStatus) {
          this.competitionClock = {
            isRunning: clockStatus.is_running || false,
            currentTime: clockStatus.current_time || 0,
            rotationTime: clockStatus.rotation_time || 0,
            warmupTime: clockStatus.warmup_time || 0,
            touchWarmupTime: clockStatus.touch_warmup_time || 0,
            routineTime: clockStatus.routine_time || 0,
            breakTime: clockStatus.break_time || 0
          };
          this.competitionState = {
            ...this.competitionState,
            initialized: true ,
            currentRotation: clockStatus.current_rotation || 1,
            allRotationsComplete: clockStatus.all_rotations_complete || false,
            awards_ceremony_ready: clockStatus.awards_ceremony_ready || false
          };
          if(clockStatus.clock_state==="running"){
            this.competitionClock.isRunning = true;
          }

          // Start clock update if clock is running
          if (this.competitionClock.isRunning) {
            this.startClockInterval();
          }
        }
      },
      error: (error) => {
        console.log('No clock status found or error loading clock:', error);
        // Reset clock to default state
        this.resetClockData();
      }
    });
  }

  // Load gymnastics scores
  loadGymnasticsScores(matchId: number): void {
    this.apiService.getGymnasticsScores(matchId).subscribe({
      next: (scores) => {
        console.log('Gymnastics scores loaded:', scores);
        
        if (scores && Array.isArray(scores)) {
          // Organize scores by apparatus
          this.gymnasticsScores = {};
          scores.forEach((score: any) => {
            if (score.apparatus) {
              this.gymnasticsScores[score.apparatus] = score;
            }
          });
        }
      },
      error: (error) => {
        console.log('No gymnastics scores found or error loading scores:', error);
        this.gymnasticsScores = {};
      }
    });
  }



  updateGymnasticsPlayerStats(statsData: any, dialogDiv: HTMLElement, saveBtn: HTMLButtonElement, player: any): void {
    // Add gymnastics-specific player stats
    const gymnasticsPlayerData = {
      ...statsData,
      apparatus_scores: [],
      total_difficulty_score: 0,
      total_execution_score: 0, 
      total_combined_score: 0,
      total_deductions: 0,
      routines_completed: 0,
      fall_count: 0,
      line_deductions: 0,
      time_deductions: 0
    };

    // Calculate apparatus scores if available
    this.gymnasticsApparatus.forEach(apparatus => {
      const difficultyKey = `${apparatus}_difficulty_score`;
      const executionKey = `${apparatus}_execution_score`;
      const combinedKey = `${apparatus}_combined_score`;

      if (statsData[difficultyKey] !== undefined || statsData[executionKey] !== undefined) {
        const difficultyScore = parseFloat(statsData[difficultyKey]) || 0;
        const executionScore = parseFloat(statsData[executionKey]) || 0;
        const combinedScore = parseFloat(statsData[combinedKey]) || (difficultyScore + executionScore);

        gymnasticsPlayerData.apparatus_scores.push({
          apparatus: apparatus,
          difficulty_score: difficultyScore,
          execution_score: executionScore,
          combined_score: combinedScore,
          neutral_deduction: 0,
          completed: combinedScore > 0
        });

        // Add to totals
        gymnasticsPlayerData.total_difficulty_score += difficultyScore;
        gymnasticsPlayerData.total_execution_score += executionScore;
        gymnasticsPlayerData.total_combined_score += combinedScore;
        if (combinedScore > 0) {
          gymnasticsPlayerData.routines_completed++;
        }
      }
    });

    console.log('Gymnastics player data:', gymnasticsPlayerData);
    this.sendPlayerUpdate(gymnasticsPlayerData, dialogDiv, saveBtn, player);
  }

  sendPlayerUpdate(updatedStats: any, dialogDiv: HTMLElement, saveBtn: HTMLButtonElement, player: any): void {
    // Validate required fields
    if (!updatedStats.match || !updatedStats.team || !updatedStats.player) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Missing required match, team, or player information',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    // Disable save button during request
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    // Try PUT first, if it fails, try POST
    this.apiService.updateplayer(updatedStats).subscribe({
      next: (response) => {
        console.log('Player update response:', response);
        document.body.removeChild(dialogDiv);
        
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: `Player stats updated successfully for ${player.first_name} ${player.last_name}!`,
          confirmButtonColor: '#198754'
        }).then(() => {
          // Refresh complete match data after player update
          this.loadMatchData(this.match.id, true);
        });
      },
      error: (error) => {
        console.error('PUT request failed, trying POST:', error);
        
        // Try POST method as fallback
        this.apiService.updateplayerPost(updatedStats).subscribe({
          next: (response) => {
            console.log('Player update response (POST):', response);
            document.body.removeChild(dialogDiv);
            
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: `Player stats updated successfully for ${player.first_name} ${player.last_name}!`,
              confirmButtonColor: '#198754'
            }).then(() => {
              // Refresh complete match data after player update
              this.loadMatchData(this.match.id, true);
            });
          },
          error: (postError) => {
            console.error('POST request also failed, trying PATCH:', postError);
            
            // Try PATCH method as last resort
            this.apiService.updateplayerPatch(updatedStats).subscribe({
              next: (response) => {
                console.log('Player update response (PATCH):', response);
                document.body.removeChild(dialogDiv);
                
                Swal.fire({
                  icon: 'success',
                  title: 'Success!',
                  text: `Player stats updated successfully for ${player.first_name} ${player.last_name}!`,
                  confirmButtonColor: '#198754'
                }).then(() => {
                  // Refresh complete match data after player update
                  this.loadMatchData(this.match.id, true);
                });
              },
              error: (patchError) => {
                console.error('All methods failed:', patchError);
                // Re-enable save button
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save';
                
                // Handle error with SweetAlert
                this.handlePlayerUpdateError(patchError, player);
              }
            });
          }
        });
      }
    });
  }

  // Display comprehensive results
  displayComprehensiveResults(data?: any): void {
    console.log('Displaying comprehensive results...', data);
    // Implementation would show detailed results view
    if (this.match?.id) {
      this.apiService.getGymnasticsClockStatus(this.match.id).subscribe({
        next: (results: any) => {
          console.log('Match status and results:', results);
          // Handle displaying results
        },
        error: (error: any) => {
          console.error('Error fetching match status:', error);
        }
      });
    }
  }
}