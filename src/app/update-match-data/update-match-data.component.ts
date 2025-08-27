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
  dynamicFields: Array<{ 
    key: string, 
    label: string, 
    type: string, 
    options?: string[],
    enabled?: boolean|false,
    min?: number,
    max?: number,
    step?: number,
    readonly?: boolean,
    value?: any
  }> = [];
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

  // Live scoring data management
  liveScoreData: any = null;
  teamScores: { [teamId: number]: any } = {};
  lastLiveScoreUpdate: Date | null = null;
  liveScoreRefreshInterval: any = null;
  private readonly LIVE_SCORE_REFRESH_INTERVAL = 5000; // 5 seconds

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

  // ============================================================================
  // 🏀 COMPREHENSIVE BASKETBALL PROPERTIES
  // ============================================================================

  // Basketball clock management
  basketballClock = {
    isRunning: false,
    isPaused: false,
    timeRemainingInPeriod: '12:00',
    displayTime: '12:00',
    currentPeriod: 1,
    periodType: 'quarter',
    clockState: 'stopped',
    totalElapsedTime: '00:00:00',
    periodDuration: 720, // 12 minutes in seconds
    totalPeriods: 4,
    timeoutsRemaining: {} as { [teamId: number]: number }
  };

  // Basketball game state
  basketballGameState = {
    status: 'upcoming', // upcoming, live, halftime, quarter_break, finished
    score: {} as { [teamId: number]: number },
    leadingTeam: null as number | null,
    scoreMargin: 0,
    lastScoreUpdate: null as Date | null,
    playByPlay: [] as any[],
    currentPossession: null as number | null
  };

  // Basketball timeout management
  basketballTimeouts = {
    isActive: false,
    currentTeam: null as number | null,
    duration: 60, // seconds
    reason: '',
    startTime: null as Date | null,
    endTime: null as Date | null,
    timeoutsUsed: {} as { [teamId: number]: number }
  };

  // Basketball player positions
  basketballPositions = [
    { value: 'point_guard', label: 'Point Guard (PG)' },
    { value: 'shooting_guard', label: 'Shooting Guard (SG)' },
    { value: 'small_forward', label: 'Small Forward (SF)' },
    { value: 'power_forward', label: 'Power Forward (PF)' },
    { value: 'center', label: 'Center (C)' }
  ];

  // Basketball foul types
  basketballFoulTypes = [
    { value: 'personal', label: 'Personal Foul' },
    { value: 'technical', label: 'Technical Foul' },
    { value: 'flagrant', label: 'Flagrant Foul' },
    { value: 'team', label: 'Team Foul' },
    { value: 'offensive', label: 'Offensive Foul' },
    { value: 'defensive', label: 'Defensive Foul' }
  ];

  // Basketball shot types
  basketballShotTypes = [
    { value: 'two_point', label: '2-Point Shot', points: 2 },
    { value: 'three_point', label: '3-Point Shot', points: 3 },
    { value: 'free_throw', label: 'Free Throw', points: 1 }
  ];

  // Basketball substitution management
  basketballSubstitutions = {
    pendingSubstitutions: [] as any[],
    completedSubstitutions: [] as any[],
    substituionTimeout: false
  };

  // Basketball technical fouls
  basketballTechnicalFouls = {
    playerTechnicals: [] as any[],
    coachTechnicals: [] as any[],
    teamTechnicals: [] as any[]
  };

  // Basketball advanced statistics
  basketballAdvancedStats = {
    possessions: 0,
    pace: 0,
    offensiveRating: 0,
    defensiveRating: 0,
    reboundingPercentage: {
      offensive: 0,
      defensive: 0
    },
    turnoversPerGame: 0,
    assistToTurnoverRatio: 0,
    trueShootingPercentage: 0,
    effectiveFieldGoalPercentage: 0
  };

  // Basketball play-by-play
  basketballPlayByPlay = {
    plays: [] as any[],
    currentPlay: null as any,
    playTypes: [
      'made_shot',
      'missed_shot', 
      'rebound',
      'assist',
      'steal',
      'block',
      'foul',
      'free_throw',
      'timeout',
      'substitution',
      'technical_foul',
      'quarter_end'
    ]
  };

  // Basketball shot chart data
  basketballShotChart = {
    shots: [] as any[],
    zones: [
      { name: 'Paint', made: 0, attempted: 0 },
      { name: 'Mid Range', made: 0, attempted: 0 },
      { name: 'Three Point', made: 0, attempted: 0 },
      { name: 'Free Throw', made: 0, attempted: 0 }
    ]
  };

  // Basketball roster management
  basketballRoster = {
    activePlayers: [] as any[],
    benchPlayers: [] as any[],
    starters: [] as any[],
    inactivePlayers: [] as any[]
  };

  // Basketball quarter management
  basketballQuarters = [
    { number: 1, name: '1st Quarter', completed: false, score: { home: 0, away: 0 } },
    { number: 2, name: '2nd Quarter', completed: false, score: { home: 0, away: 0 } },
    { number: 3, name: '3rd Quarter', completed: false, score: { home: 0, away: 0 } },
    { number: 4, name: '4th Quarter', completed: false, score: { home: 0, away: 0 } }
  ];

  // Basketball overtime periods
  basketballOvertime = {
    periods: [] as any[],
    currentOvertimePeriod: 0,
    overtimeDuration: 300 // 5 minutes in seconds
  };

  // Basketball box score
  basketballBoxScore = {
    teamStats: {} as any,
    playerStats: {} as any,
    teamTotals: {} as any,
    benchStats: {} as any
  };

  // Gymnastics Integration Service access
  private gymnasticsService: ReturnType<GymnasticsIntegrationService['manageCompetitionClock']> | null = null;
  private realTimeData: ReturnType<GymnasticsIntegrationService['getRealTimeCompetitionData']> | null = null;
  private competitionResults: ReturnType<GymnasticsIntegrationService['getCompetitionResults']> | null = null;

  // ============================================================================
  // 🏊 COMPREHENSIVE WATER POLO PROPERTIES
  // ============================================================================

  // Water Polo clock management
  waterPoloClock = {
    isRunning: false,
    isPaused: false,
    timeRemainingInPeriod: '8:00',
    displayTime: '8:00',
    currentPeriod: 1,
    periodType: 'quarter',
    clockState: 'stopped',
    totalElapsedTime: '00:00:00',
    periodDuration: 480, // 8 minutes in seconds
    totalPeriods: 4,
    matchFormat: 'water_polo',
    shotClockDuration: 30,
    ejectionDuration: 20,
    timeoutDuration: 60,
    isInitialized: false, // Track if clock has been initialized
    initializationInProgress: false, // Prevent multiple initialization attempts
    timeoutsRemaining: {} as { [teamId: number]: number }
  };

  // Water Polo shot clock management
  waterPoloShotClock = {
    isRunning: false,
    timeRemaining: 30,
    displayTime: '30',
    teamInPossession: null as number | null,
    duration: 30,
    reason: '',
    violations: 0
  };

  // Water Polo game state
  waterPoloGameState = {
    status: 'upcoming', // upcoming, live, quarter_break, halftime, finished
    score: {} as { [teamId: number]: number },
    leadingTeam: null as number | null,
    scoreMargin: 0,
    lastScoreUpdate: null as Date | null,
    playByPlay: [] as any[],
    currentPossession: null as number | null,
    isInitialized: false
  };

  // Water Polo timeout management
  waterPoloTimeouts = {
    isActive: false,
    currentTeam: null as number | null,
    duration: '00:01:00',
    reason: '',
    startTime: null as Date | null,
    endTime: null as Date | null,
    timeoutsUsed: {} as { [teamId: number]: number },
    timeoutsRemaining: {} as { [teamId: number]: number }
  };

  // Water Polo timeout reasons
  waterPoloTimeoutReasons = [
    { value: 'strategy_meeting', label: 'Strategy Meeting' },
    { value: 'injury_assessment', label: 'Injury Assessment' },
    { value: 'technical_issue', label: 'Technical Issue' },
    { value: 'equipment_check', label: 'Equipment Check' },
    { value: 'referee_discussion', label: 'Referee Discussion' }
  ];

  // Water Polo player positions
  waterPoloPositions = [
    { value: 'goalkeeper', label: 'Goalkeeper (GK)' },
    { value: 'center_forward', label: 'Center Forward (CF)' },
    { value: 'center_back', label: 'Center Back (CB)' },
    { value: 'wing', label: 'Wing' },
    { value: 'utility', label: 'Utility' },
    { value: 'defender', label: 'Defender' },
    { value: 'driver', label: 'Driver' }
  ];

  // Water Polo shot outcomes
  waterPoloShotOutcomes = [
    { value: 'goal_scored', label: 'Goal Scored' },
    { value: 'shot_saved', label: 'Shot Saved' },
    { value: 'shot_missed', label: 'Shot Missed' },
    { value: 'shot_blocked', label: 'Shot Blocked' },
    { value: 'post_crossbar', label: 'Post/Crossbar' },
    { value: 'turnover', label: 'Turnover' }
  ];

  // Water Polo ejection management
  waterPoloEjections = {
    activeEjections: [] as any[],
    completedEjections: [] as any[],
    ejectionDuration: 20,
    exclusionTypes: [
      { value: 'ordinary_foul', label: 'Ordinary Foul' },
      { value: 'major_foul', label: 'Major Foul' },
      { value: 'misconduct', label: 'Misconduct' },
      { value: 'brutality', label: 'Brutality' }
    ]
  };

  // Water Polo periods
  waterPoloPeriods = [
    { number: 1, name: '1st Quarter', completed: false, score: { home: 0, away: 0 } },
    { number: 2, name: '2nd Quarter', completed: false, score: { home: 0, away: 0 } },
    { number: 3, name: '3rd Quarter', completed: false, score: { home: 0, away: 0 } },
    { number: 4, name: '4th Quarter', completed: false, score: { home: 0, away: 0 } }
  ];

  // Water Polo overtime management
  waterPoloOvertime = {
    periods: [] as any[],
    currentOvertimePeriod: 0,
    overtimeDuration: 180, // 3 minutes in seconds
    hasShootout: false,
    shootoutRounds: [] as any[]
  };

  // Water Polo substitution management
  waterPoloSubstitutions = {
    pendingSubstitutions: [] as any[],
    completedSubstitutions: [] as any[],
    reentryRestrictions: {} as any,
    maxPlayersInWater: 7 // including goalkeeper
  };

  // Water Polo play-by-play
  waterPoloPlayByPlay = {
    plays: [] as any[],
    currentPlay: null as any,
    playTypes: [
      'goal',
      'shot_attempt',
      'save',
      'block',
      'steal',
      'turnover',
      'ejection',
      'timeout',
      'substitution',
      'quarter_end',
      'shot_clock_violation',
      'penalty_shot'
    ]
  };

  // Water Polo advanced statistics
  waterPoloAdvancedStats = {
    possessions: 0,
    shotEfficiency: 0,
    goalConversionRate: 0,
    manAdvantageEfficiency: 0,
    penaltyKillEfficiency: 0,
    swimmingDistance: {} as { [playerId: number]: number },
    playerEfficiencyRating: {} as { [playerId: number]: number }
  };

  // Water Polo penalty shots
  waterPoloPenaltyShots = {
    awarded: [] as any[],
    taken: [] as any[],
    converted: [] as any[],
    missed: [] as any[]
  };

  // Water Polo match statistics
  waterPoloMatchStats = {
    totalShots: {} as { [teamId: number]: number },
    totalGoals: {} as { [teamId: number]: number },
    totalSaves: {} as { [teamId: number]: number },
    totalEjections: {} as { [teamId: number]: number },
    totalTimeouts: {} as { [teamId: number]: number },
    shotOnTargetPercentage: {} as { [teamId: number]: number },
    goalConversionPercentage: {} as { [teamId: number]: number }
  };

  // Water Polo field zones for shot tracking
  waterPoloFieldZones = [
    { name: 'Goal Area', made: 0, attempted: 0 },
    { name: '2m Line', made: 0, attempted: 0 },
    { name: '5m Line', made: 0, attempted: 0 },
    { name: 'Center Field', made: 0, attempted: 0 },
    { name: 'Wing Position', made: 0, attempted: 0 },
    { name: 'Penalty Shot', made: 0, attempted: 0 }
  ];
  footballClock: any;


  constructor(
    private fb: FormBuilder, 
    private route: ActivatedRoute, 
    private apiService: ApiService, 
    private router: Router,
    private gymnasticsIntegrationService: GymnasticsIntegrationService
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.sportConfig = JSON.parse(localStorage.getItem('sport')||'{}');
    console.log(this.sportConfig);
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
        console.log('Loading match data', match);
        this.match = match;
        this.teams = match.matchteams || [];
        this.buildDynamicForm();
        this.loadPlayersForAllTeams();
        
        // Check if this is a gymnastics match and load competition state
        if (this.isGymnastics()) {
          console.log('Loading gymnastics competition state...');
          this.checkCompetitionStatus(matchId);
          this.loadClockStatus(matchId);
        }
        
        // Check if this is a basketball match and initialize basketball features
        if (this.isBasketball()) {
          console.log('Loading basketball match features...');
          console.log('Initial basketball clock state:', this.basketballClock);
          this.loadBasketballClockStatus();
          this.initializeBasketballGameState();
        }

        // Check if this is a water polo match and initialize water polo features
        if (this.isWaterPolo()) {
          console.log('Loading water polo match features...');
          console.log('Initial water polo clock state:', this.waterPoloClock);
          this.getWaterPoloClockStatus();
          this.initializeWaterPoloGameState();
        }
        if (this.isFootballMatch()) {
          console.log('Loading football match features...');
          
          this.getMatchClockStatus(matchId);
          // this.initializeFootballGameState();
        }

        // Initialize live scoring for all sports
        this.initializeLiveScoring(matchId);

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
  isFootballInitialized: boolean = false;
  getMatchClockStatus(matchId: number) {
    this.apiService.getMatchClockStatus(matchId).subscribe({
      next: (clockStatus) => {
        console.log('Match clock status loaded:', clockStatus);
        this.footballClock = clockStatus;
        this.isFootballInitialized = true;
      },
      error: (err) => {

        console.error('Error loading match clock status:', err);
      }
    });
  }
  initializeFootballClock() {
    if (!this.isFootballInitialized) {
      this.apiService.initializeFootballClock(this.match.id).subscribe({
        next: (clockStatus) => {
          console.log('Football clock initialized:', clockStatus);
          this.footballClock = clockStatus;
          this.isFootballInitialized = true;

        },
        error: (err) => {
          console.error('Error initializing football clock:', err);
        }
      });
    }
  }
  startFootballClock() {
    if (this.isFootballInitialized) {
      this.apiService.startFootballClock(this.match.id).subscribe({
        next: (clockStatus) => {
          console.log('Football clock started:', clockStatus);
          this.footballClock = clockStatus;
        },
        error: (err) => {
          console.error('Error starting football clock:', err);
        }
      });
    }
  }
  pauseFootballClock() {
    if (this.isFootballInitialized) {
      this.apiService.pauseFootballClock(this.match.id).subscribe({
        next: (clockStatus) => {
          console.log('Football clock paused:', clockStatus);
          this.footballClock = clockStatus;
        },
        error: (err) => {
          console.error('Error pausing football clock:', err);
        }
      });
    }
  }
  resumeFootballClock() {
    if (this.isFootballInitialized) {
      this.apiService.resumeFootballClock(this.match.id).subscribe({
        next: (clockStatus) => {
          console.log('Football clock resumed:', clockStatus);
          this.footballClock = clockStatus;
        },
        error: (err) => {
          console.error('Error resuming football clock:', err);
        }
      });
    }
  }
  stopFootballClock() {
  if (this.isFootballInitialized) {
    this.apiService.stopFootballClock(this.match.id).subscribe({
      next: (clockStatus) => {
        console.log('Football clock stopped:', clockStatus);
        this.footballClock = clockStatus;
      },
      error: (err) => {
        console.error('Error stopping football clock:', err);
      }
    });
  }
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
      options: ['upcoming', 'live', 'finished', 'postponed', 'cancelled'],
      enabled: true
    });
    this.dynamicFields.push({ key: 'match_date', label: 'Match Date', type: 'datetime-local' });
    this.dynamicFields.push({ key: 'start_date', label: 'Start Date', type: 'datetime-local' });
    this.dynamicFields.push({ key: 'is_active', label: 'Is Active', type: 'checkbox' });
    this.dynamicFields.push({ key: 'replay', label: 'Replay', type: 'checkbox' });
    this.dynamicFields.push({ key: 'week', label: 'Week', type: 'number' });
    this.dynamicFields.push({ key: 'group_name', label: 'Group Name', type: 'text' });

    // Football specific fields
    if (this.sportConfig?.sport_code === 'FB') {
      this.dynamicFields.push({ key: 'red_cards', label: 'Red Cards', type: 'number' });
      this.dynamicFields.push({ key: 'yellow_cards', label: 'Yellow Cards', type: 'number' });
      this.dynamicFields.push({ key: 'fouls', label: 'Fouls', type: 'number' });
      this.dynamicFields.push({ key: 'corners', label: 'Corners', type: 'number' });
      this.dynamicFields.push({ key: 'offsides', label: 'Offsides', type: 'number' });
      this.dynamicFields.push({ key: 'shots_on_target', label: 'Shots on Target', type: 'number' });
      this.dynamicFields.push({ key: 'total_shots', label: 'Total Shots', type: 'number' });
      this.dynamicFields.push({ key: 'total_goals', label: 'Total Goals', type: 'number' });
      if (this.sportConfig?.sport_config?.penalty_kicks) {
        this.dynamicFields.push({ key: 'penalty_goals_scored', label: 'Penalty Goals', type: 'number' });
      }
    }

    // Basketball specific fields
    if (this.sportConfig?.sport_code === 'BB') {
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
      if (this.sportConfig?.sport_config?.quarters) {
        this.dynamicFields.push({ key: 'quarters_played', label: 'Quarters Played', type: 'number' });
      }
    }

    // Water Polo specific fields
    if (this.sportConfig?.sport_code === 'WP') {
      // Basic scoring fields
      this.dynamicFields.push({ key: 'goals_scored', label: 'Goals Scored', type: 'number' });
      this.dynamicFields.push({ key: 'assists', label: 'Assists', type: 'number' });
      this.dynamicFields.push({ key: 'shots_attempted', label: 'Shots Attempted', type: 'number' });
      this.dynamicFields.push({ key: 'shots_on_target', label: 'Shots on Target', type: 'number' });
      
      // Defensive statistics
      this.dynamicFields.push({ key: 'saves', label: 'Saves (Goalkeeper)', type: 'number' });
      this.dynamicFields.push({ key: 'blocks', label: 'Blocks', type: 'number' });
      this.dynamicFields.push({ key: 'steals', label: 'Steals', type: 'number' });
      
      // Disciplinary actions
      this.dynamicFields.push({ key: 'ejections', label: 'Ejections', type: 'number' });
      this.dynamicFields.push({ key: 'ejection_time', label: 'Ejection Time (seconds)', type: 'number' });
      this.dynamicFields.push({ key: 'major_fouls', label: 'Major Fouls', type: 'number' });
      this.dynamicFields.push({ key: 'minor_fouls', label: 'Minor Fouls', type: 'number' });
      
      // Additional statistics
      this.dynamicFields.push({ key: 'turnovers', label: 'Turnovers', type: 'number' });
      this.dynamicFields.push({ key: 'swimming_distance', label: 'Swimming Distance (meters)', type: 'number' });
      this.dynamicFields.push({ key: 'playing_time', label: 'Playing Time (seconds)', type: 'number' });
      this.dynamicFields.push({ key: 'field_position', label: 'Field Position', type: 'select', options: this.waterPoloPositions.map(p => p.value) });
      this.dynamicFields.push({ key: 'efficiency_rating', label: 'Efficiency Rating (0-10)', type: 'number' });
      this.dynamicFields.push({ key: 'defensive_plays', label: 'Defensive Plays', type: 'number' });
      this.dynamicFields.push({ key: 'offensive_plays', label: 'Offensive Plays', type: 'number' });
      this.dynamicFields.push({ key: 'quarters_played', label: 'Quarters Played', type: 'number' });
    }

    // Gymnastics specific fields
    if (this.sportConfig?.sport_code === 'GY') {
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
    if (this.sportConfig?.sport_config.match_duration) {
      this.dynamicFields.push({ key: 'match_duration', label: 'Match Duration (minutes)', type: 'number' });
    }
    if (this.sportConfig?.sport_config.extra_time_duration) {
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
      state: { sport: this.sportConfig } 
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
    
    if (this.isFootballMatch()) {
      // For football, sum up all goals from players
      totalScore = players.reduce((sum, player) => sum + (player.goals || 0), 0);
    } else if (this.isBasketball()) {
      // For basketball, sum up all points from players
      totalScore = players.reduce((sum, player) => sum + (player.points || 0), 0);
    } else if (this.isGymnastics()) {
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
    return this.sportConfig?.sport_code === 'FB';
  }

  /**
   * Check if this is a gymnastics match
   * @returns true if sport is gymnastics
   */
  isGymnasticsMatch(): boolean {
    return this.sportConfig?.sport_code === 'GY';
  }

  /**
   * Get team's total gymnastics score
   * @param teamId - Team ID
   * @returns formatted total score string
   */
  getTeamGymnasticsScore(teamId: number): string {
    if (!teamId) {
      return '0.000';
    }

    // First priority: Use live scoring data if available
    const liveScore = this.getTeamLiveScore(teamId);
    if (liveScore && liveScore.totalScore > 0) {
      return liveScore.totalScore.toFixed(3);
    }

    // Second priority: Check if there's an official team score
    const teamData = this.teams.find(t => t.team?.id === teamId);
    if (teamData?.total_score) {
      return Number(teamData.total_score).toFixed(3);
    }

    // Fallback: Calculate from player scores
    if (this.playersData[teamId]) {
      const players = this.playersData[teamId] || [];
      const totalScore = players.reduce((sum, player) => {
        return sum + (Number(player.total_score) || 0);
      }, 0);
      return totalScore.toFixed(3);
    }

    return '0.000';
  }

  /**
   * Get team's highest individual score
   * @param teamId - Team ID
   * @returns highest individual score
   */
  getTeamHighestScore(teamId: number): string {
    if (!teamId) {
      return '0.000';
    }

    // First priority: Calculate from live scoring data
    const liveScore = this.getTeamLiveScore(teamId);
    if (liveScore && liveScore.apparatusScores) {
      const scores = Object.values(liveScore.apparatusScores)
        .filter((app: any) => app.completed)
        .map((app: any) => app.totalScore);
      const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
      return highestScore.toFixed(3);
    }

    // Fallback: Calculate from player scores
    if (this.playersData[teamId]) {
      const players = this.playersData[teamId] || [];
      const highestScore = Math.max(...players.map(p => Number(p.total_score) || 0));
      return highestScore.toFixed(3);
    }

    return '0.000';
  }

  /**
   * Get team's average score
   * @param teamId - Team ID
   * @returns average team score
   */
  getTeamAverageScore(teamId: number): string {
    if (!teamId) {
      return '0.000';
    }

    // First priority: Calculate from live scoring data
    const liveScore = this.getTeamLiveScore(teamId);
    if (liveScore && liveScore.apparatusScores) {
      const scores = Object.values(liveScore.apparatusScores)
        .filter((app: any) => app.completed)
        .map((app: any) => app.totalScore);
      if (scores.length > 0) {
        const average = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
        return average.toFixed(3);
      }
    }

    // Fallback: Calculate from player scores
    if (this.playersData[teamId]) {
      const players = this.playersData[teamId] || [];
      if (players.length === 0) return '0.000';

      const totalScore = players.reduce((sum, player) => {
        return sum + (Number(player.total_score) || 0);
      }, 0);

      return (totalScore / players.length).toFixed(3);
    }

    return '0.000';
  }

  /**
   * Get team's difficulty score
   * @param teamId - Team ID
   * @returns team difficulty score
   */
  getTeamDifficultyScore(teamId: number): string {
    if (!teamId) {
      return '0.000';
    }

    // First priority: Calculate from live scoring data
    const liveScore = this.getTeamLiveScore(teamId);
    if (liveScore && liveScore.apparatusScores) {
      let totalDifficulty = 0;
      Object.values(liveScore.apparatusScores).forEach((apparatusData: any) => {
        if (apparatusData.completed) {
          // For live data, we need to calculate based on combined scores
          // This is an approximation since live data doesn't separate difficulty
          totalDifficulty += apparatusData.totalScore * 0.6; // Assume 60% is difficulty
        }
      });
      return totalDifficulty.toFixed(3);
    }

    // Fallback: Calculate from player scores
    if (this.playersData[teamId]) {
      const players = this.playersData[teamId] || [];
      const totalDifficulty = players.reduce((sum, player) => {
        return sum + (Number(player.difficulty_score) || 0);
      }, 0);
      return totalDifficulty.toFixed(3);
    }

    return '0.000';
  }

  /**
   * Get team's execution score
   * @param teamId - Team ID
   * @returns team execution score
   */
  getTeamExecutionScore(teamId: number): string {
    if (!teamId) {
      return '0.000';
    }

    // First priority: Calculate from live scoring data
    const liveScore = this.getTeamLiveScore(teamId);
    if (liveScore && liveScore.apparatusScores) {
      let totalExecution = 0;
      Object.values(liveScore.apparatusScores).forEach((apparatusData: any) => {
        if (apparatusData.completed) {
          // For live data, we need to calculate based on combined scores
          // This is an approximation since live data doesn't separate execution
          totalExecution += apparatusData.totalScore * 0.4; // Assume 40% is execution
        }
      });
      return totalExecution.toFixed(3);
    }

    // Fallback: Calculate from player scores
    if (this.playersData[teamId]) {
      const players = this.playersData[teamId] || [];
      const totalExecution = players.reduce((sum, player) => {
        return sum + (Number(player.execution_score) || 0);
      }, 0);
      return totalExecution.toFixed(3);
    }

    return '0.000';
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

  getPlayerFields(): Array<{ 
    key: string, 
    label: string, 
    type: string, 
    options?: string[],
    min?: number,
    max?: number,
    step?: number,
    readonly?: boolean,
    value?: any
  }> {
    const fields: Array<{ 
      key: string, 
      label: string, 
      type: string, 
      options?: string[],
      min?: number,
      max?: number,
      step?: number,
      readonly?: boolean,
      value?: any
    }> = [];
    
    // Common fields for all sports
    fields.push({ key: 'minutes_played', label: 'Minutes Played', type: 'number' });
    
    // Football specific fields
    if (this.isFootballMatch()) {
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
      if (this.sportConfig?.sport_config.penalty_kicks) {
        fields.push({ key: 'penalties_shots', label: 'Penalty Shots', type: 'number' });
        fields.push({ key: 'penalties_score', label: 'Penalty Goals', type: 'number' });
      }
    }

    // Basketball specific fields
    if (this.isBasketball()) {
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
    if (this.isWaterPolo()) {
      fields.push({ key: 'goals_scored', label: 'Goals Scored', type: 'number' });
      fields.push({ key: 'assists', label: 'Assists', type: 'number' });
      fields.push({ key: 'shots_attempted', label: 'Shots Attempted', type: 'number' });
      fields.push({ key: 'shots_on_target', label: 'Shots on Target', type: 'number' });
      fields.push({ key: 'saves', label: 'Saves', type: 'number' });
      fields.push({ key: 'blocks', label: 'Blocks', type: 'number' });
      fields.push({ key: 'steals', label: 'Steals', type: 'number' });
      fields.push({ key: 'ejections', label: 'Ejections', type: 'number' });
      fields.push({ key: 'ejection_time', label: 'Ejection Time', type: 'number' });
      fields.push({ key: 'turnovers', label: 'Turnovers', type: 'number' });
      fields.push({ key: 'swimming_distance', label: 'Swimming Distance', type: 'number' });
      fields.push({ key: 'playing_time', label: 'Playing Time', type: 'number' });
      fields.push({ key: 'efficiency_rating', label: 'Efficiency Rating', type: 'number' });
      fields.push({ key: 'defensive_plays', label: 'Defensive Plays', type: 'number' });
      fields.push({ key: 'offensive_plays', label: 'Offensive Plays', type: 'number' });
      fields.push({ key: 'major_fouls', label: 'Major Fouls', type: 'number' });
      fields.push({ key: 'minor_fouls', label: 'Minor Fouls', type: 'number' });
    }

    // Gymnastics specific fields - Only API required fields
    if (this.isGymnastics()) {
      // Get current apparatus for display
      const currentApparatus = this.routineState.activeApparatus || 
                              this.competitionState.currentApparatus || 
                              'floor_exercise';
      
      // Core gymnastics scoring fields from API specification
      fields.push({ 
        key: 'apparatus_performed', 
        label: 'Current Apparatus', 
        type: 'select',
        options: this.gymnasticsApparatus,
        value: currentApparatus
      });
      
      fields.push({ 
        key: 'difficulty_score', 
        label: 'Difficulty Score (D-Score)', 
        type: 'number',
        min: 0,
        max: 10,
        step: 0.1
      });
      
      fields.push({ 
        key: 'execution_score', 
        label: 'Execution Score (E-Score)', 
        type: 'number',
        min: 0,
        max: 10,
        step: 0.1
      });
      
      fields.push({ 
        key: 'total_score', 
        label: 'Total Score (Calculated)', 
        type: 'number',
        readonly: true
      });
      
      fields.push({ 
        key: 'deductions', 
        label: 'Deductions', 
        type: 'number',
        min: 0,
        max: 5,
        step: 0.1
      });
      
      fields.push({ 
        key: 'fall_count', 
        label: 'Fall Count', 
        type: 'number',
        min: 0,
        max: 10
      });
      
      fields.push({ 
        key: 'routine_completion', 
        label: 'Routine Completed', 
        type: 'checkbox'
      });
      
      fields.push({ 
        key: 'landing_quality', 
        label: 'Landing Quality', 
        type: 'select',
        options: ['excellent', 'good', 'average', 'poor']
      });
      
      fields.push({ 
        key: 'routine_duration', 
        label: 'Routine Duration (seconds)', 
        type: 'number',
        min: 30,
        max: 150
      });
      
      fields.push({ 
        key: 'artistic_score', 
        label: 'Artistic Score', 
        type: 'number',
        min: 0,
        max: 10,
        step: 0.1
      });
      
      fields.push({ 
        key: 'technical_score', 
        label: 'Technical Score', 
        type: 'number',
        min: 0,
        max: 10,
        step: 0.1
      });
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
        <h6><i class="fas fa-dumbbell me-2"></i>${player.first_name} ${player.last_name} - #${player.uniform || player.displayid}</h6>
        ${this.sportConfig?.sport_code === 'GY' ? `
          <div class="alert alert-info" style="font-size: 0.9em; padding: 8px; margin: 10px 0;">
            <i class="fas fa-info-circle me-1"></i>
            <strong>Current Apparatus:</strong> ${(this.competitionState.currentApparatus || 'floor_exercise').replace('_', ' ').toUpperCase()}
          </div>
        ` : ''}
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
    `;

    playerFields.forEach(field => {
      const currentValue = currentStats[field.key] || field.value || 0;
      
      if (field.type === 'checkbox') {
        formHtml += `
          <div>
            <label><strong>${field.label}:</strong></label><br>
            <input type="checkbox" class="form-check-input" id="${field.key}" ${currentValue ? 'checked' : ''}>
          </div>
        `;
      } else if (field.type === 'select') {
        formHtml += `
          <div>
            <label><strong>${field.label}:</strong></label><br>
            <select class="form-control" id="${field.key}" style="width: 100%; padding: 5px;">
        `;
        if (field.options) {
          field.options.forEach(option => {
            const optionValue = typeof option === 'string' ? option : option;
            const displayText = typeof option === 'string' ? option.replace('_', ' ').toUpperCase() : option;
            const selected = currentValue === optionValue ? 'selected' : '';
            formHtml += `<option value="${optionValue}" ${selected}>${displayText}</option>`;
          });
        }
        formHtml += `</select></div>`;
      } else {
        // Handle number and text inputs
        const minAttr = field.min !== undefined ? `min="${field.min}"` : 'min="0"';
        const maxAttr = field.max !== undefined ? `max="${field.max}"` : '';
        const stepAttr = field.step !== undefined ? `step="${field.step}"` : '';
        const readonlyAttr = field.readonly ? 'readonly' : '';
        const inputType = field.type === 'number' ? 'number' : 'text';
        
        formHtml += `
          <div>
            <label><strong>${field.label}:</strong></label><br>
            <input type="${inputType}" 
                   class="form-control" 
                   id="${field.key}" 
                   value="${currentValue}" 
                   ${minAttr} 
                   ${maxAttr} 
                   ${stepAttr} 
                   ${readonlyAttr}
                   style="width: 100%; padding: 5px;">
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
        const input = dialogDiv.querySelector(`#${field.key}`) as HTMLInputElement | HTMLSelectElement;
        
        if (field.type === 'checkbox') {
          updatedStats[field.key] = (input as HTMLInputElement).checked;
        } else if (field.type === 'select') {
          updatedStats[field.key] = (input as HTMLSelectElement).value;
        } else if (field.type === 'number') {
          const numValue = parseFloat(input.value) || 0;
          // Ensure values within specified range
          let finalValue = numValue;
          if (field.min !== undefined) finalValue = Math.max(field.min, finalValue);
          if (field.max !== undefined) finalValue = Math.min(field.max, finalValue);
          updatedStats[field.key] = finalValue;
        } else {
          // Text fields
          updatedStats[field.key] = input.value;
        }
      });

      console.log('Sending player update with data:', updatedStats);

      // Special handling for gymnastics player updates
      if (this.isGymnastics()) {
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

  // Helper method to parse time string (MM:SS or HH:MM:SS) to seconds
  private parseTimeToSeconds(timeString: string): number {
    if (!timeString) return 0;
    
    const parts = timeString.split(':');
    if (parts.length === 2) {
      // MM:SS format
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return (minutes * 60) + seconds;
    } else if (parts.length === 3) {
      // HH:MM:SS format
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return (hours * 3600) + (minutes * 60) + seconds;
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
    // Clean up basketball clock polling
    if (this.basketballClockPollingInterval) {
      clearInterval(this.basketballClockPollingInterval);
    }
    // Clean up water polo clock polling
    this.stopWaterPoloClockPolling();
    // Clean up water polo timer
    this.stopWaterPoloTimer();
    // Clean up countdown timer
    this.stopCountdownTimer();
    // Clean up live scoring refresh
    this.stopLiveScoreRefresh();
  }

  // Utility method for formatting time display
  formatTime(seconds: number): string {
    if (!seconds || seconds < 0) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Parse time string "MM:SS" to seconds
  private parseTimeString(timeString: string | number): number {
    console.log('Parsing time string:', timeString, 'Type:', typeof timeString);
    
    // Handle if it's already a number
    if (typeof timeString === 'number') {
      console.log('Time is already a number:', timeString);
      return timeString;
    }
    
    if (!timeString || typeof timeString !== 'string') {
      console.log('Invalid time string, returning 0');
      return 0;
    }
    
    const parts = timeString.split(':');
    
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return (minutes * 60) + seconds;
    } else if (parts.length === 3) {
      // Handle "HH:MM:SS" format
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return (hours * 3600) + (minutes * 60) + seconds;
    }
    
    // Try to parse as a direct number string
    const directNumber = parseInt(timeString);
    if (!isNaN(directNumber)) {
      return directNumber;
    }
    
    return 0;
  }

  // ============================================================================
  // 🏊‍♂️ REBUILT WATER POLO TIMER SYSTEM
  // ============================================================================

  // Water Polo Timer Properties
  private waterPoloTimer: any = null;
  private waterPoloCurrentSeconds: number = 480; // 8 minutes default
  private waterPoloTimerRunning: boolean = false;
  private waterPoloShotClockTimer: any = null;
  private waterPoloShotClockSeconds: number = 30;

  // Initialize Water Polo Timer
  initializeWaterPoloTimer(): void {
    console.log('🏊‍♂️ Initializing Water Polo Timer');
    this.stopWaterPoloTimer();
    
    // Set initial time (8 minutes = 480 seconds)
    this.waterPoloCurrentSeconds = 480;
    this.waterPoloTimerRunning = false;
    
    // Update display
    this.updateWaterPoloTimerDisplay();
    
    console.log('Water Polo Timer initialized with', this.waterPoloCurrentSeconds, 'seconds');
  }

  // Start Water Polo Timer
  startWaterPoloTimer(): void {
    console.log('🏊‍♂️ Starting Water Polo Timer');
    
    if (this.waterPoloTimerRunning) {
      console.log('Timer already running');
      return;
    }

    this.waterPoloTimerRunning = true;
    this.waterPoloClock.isRunning = true;
    this.waterPoloClock.clockState = 'running';
    this.waterPoloClock.isPaused = false;

    this.waterPoloTimer = setInterval(() => {
      if (this.waterPoloCurrentSeconds > 0) {
        this.waterPoloCurrentSeconds--;
        this.updateWaterPoloTimerDisplay();
        
        // Update shot clock if running
        if (this.waterPoloShotClock.isRunning && this.waterPoloShotClockSeconds > 0) {
          this.waterPoloShotClockSeconds--;
          this.waterPoloShotClock.timeRemaining = this.waterPoloShotClockSeconds;
          this.waterPoloShotClock.displayTime = this.waterPoloShotClockSeconds.toString();
          
          if (this.waterPoloShotClockSeconds <= 0) {
            this.stopWaterPoloShotClock();
            this.showShotClockViolation();
          }
        }
        
        console.log('⏰ Timer tick:', this.formatTime(this.waterPoloCurrentSeconds));
      } else {
        this.stopWaterPoloTimer();
        this.showPeriodEnd();
      }
    }, 1000);

    console.log('Water Polo Timer started successfully');
  }

  // Stop Water Polo Timer
  stopWaterPoloTimer(): void {
    console.log('🏊‍♂️ Stopping Water Polo Timer');
    
    if (this.waterPoloTimer) {
      clearInterval(this.waterPoloTimer);
      this.waterPoloTimer = null;
    }
    
    this.waterPoloTimerRunning = false;
    this.waterPoloClock.isRunning = false;
    this.waterPoloClock.clockState = 'stopped';
    
    console.log('Water Polo Timer stopped');
  }

  // Pause Water Polo Timer
  pauseWaterPoloTimer(): void {
    console.log('🏊‍♂️ Pausing Water Polo Timer');
    
    if (this.waterPoloTimer) {
      clearInterval(this.waterPoloTimer);
      this.waterPoloTimer = null;
    }
    
    this.waterPoloTimerRunning = false;
    this.waterPoloClock.isRunning = false;
    this.waterPoloClock.isPaused = true;
    this.waterPoloClock.clockState = 'paused';
    
    console.log('Water Polo Timer paused');
  }

  // Resume Water Polo Timer
  resumeWaterPoloTimer(): void {
    console.log('🏊‍♂️ Resuming Water Polo Timer');
    
    this.waterPoloClock.isPaused = false;
    this.startWaterPoloTimer();
  }

  // Update Timer Display
  private updateWaterPoloTimerDisplay(): void {
    const timeString = this.formatTime(this.waterPoloCurrentSeconds);
    this.waterPoloClock.displayTime = timeString;
    this.waterPoloClock.timeRemainingInPeriod = timeString;
    
    // Force change detection
    setTimeout(() => {
      // Trigger change detection if needed
    }, 0);
  }

  // Start Shot Clock
  startWaterPoloShotClock(teamId?: number): void {
    console.log('🎯 Starting Water Polo Shot Clock for team:', teamId);
    
    this.waterPoloShotClockSeconds = this.waterPoloClock.shotClockDuration || 30;
    this.waterPoloShotClock.isRunning = true;
    this.waterPoloShotClock.timeRemaining = this.waterPoloShotClockSeconds;
    this.waterPoloShotClock.displayTime = this.waterPoloShotClockSeconds.toString();
    this.waterPoloShotClock.teamInPossession = teamId || null;
  }

  // Stop Shot Clock
  stopWaterPoloShotClock(team?: number, action?: string): void {
    this.waterPoloShotClock.isRunning = false;
    this.waterPoloShotClock.timeRemaining = 0;
    this.waterPoloShotClock.teamInPossession = null;
    
    // If action is provided, we could log it or handle specific actions
    if (action && team) {
      console.log(`Shot clock stopped: Team ${team} - ${action}`);
      // You could add specific logic here based on the action
      // For example, updating stats for goals, saves, etc.
    }
  }

  // Reset Shot Clock
  resetWaterPoloShotClock(): void {
    this.waterPoloShotClockSeconds = this.waterPoloClock.shotClockDuration || 30;
    this.waterPoloShotClock.timeRemaining = this.waterPoloShotClockSeconds;
    this.waterPoloShotClock.displayTime = this.waterPoloShotClockSeconds.toString();
  }

  // Show Shot Clock Violation
  private showShotClockViolation(): void {
    Swal.fire({
      icon: 'warning',
      title: 'Shot Clock Violation!',
      text: 'Shot clock has expired',
      timer: 3000,
      timerProgressBar: true,
      confirmButtonColor: '#ffc107'
    });
  }

  // Show Period End
  private showPeriodEnd(): void {
    if (this.waterPoloClock.currentPeriod >= this.waterPoloClock.totalPeriods) {
      // Match is finished
      Swal.fire({
        icon: 'success',
        title: 'Match Finished!',
        text: 'The water polo match has been completed',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    // Ask user if they want to advance to next quarter
    Swal.fire({
      icon: 'question',
      title: 'End of Quarter!',
      text: `Quarter ${this.waterPoloClock.currentPeriod} has ended. Do you want to advance to the next quarter?`,
      showCancelButton: true,
      confirmButtonText: 'Next Quarter',
      cancelButtonText: 'Stay in Break',
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#6b7280'
    }).then((result) => {
      if (result.isConfirmed) {
        this.advanceToNextWaterPoloQuarter();
      } else {
        // Stay in quarter break mode
        this.waterPoloGameState.status = 'quarter_break';
        Swal.fire({
          icon: 'info',
          title: 'Quarter Break',
          text: 'You can start the next quarter when ready',
          timer: 2000,
          timerProgressBar: true
        });
      }
    });
  }

  // Advance to Next Water Polo Quarter
  advanceToNextWaterPoloQuarter(): void {
    if (!this.match?.id) return;

    const nextQuarter = this.waterPoloClock.currentPeriod + 1;
    
    if (nextQuarter > this.waterPoloClock.totalPeriods) {
      // Match is finished
      Swal.fire({
        icon: 'success',
        title: 'Match Completed!',
        text: 'The water polo match has been completed',
        confirmButtonColor: '#10b981'
      });
      this.waterPoloGameState.status = 'finished';
      return;
    }

    // Advance to next quarter
    this.waterPoloClock.currentPeriod = nextQuarter;
    this.waterPoloCurrentSeconds = this.waterPoloClock.periodDuration; // Reset to 8 minutes
    this.updateWaterPoloTimerDisplay();
    
    // Mark previous quarter as completed
    if (this.waterPoloPeriods[nextQuarter - 2]) {
      this.waterPoloPeriods[nextQuarter - 2].completed = true;
    }
    
    // Update game state
    this.waterPoloGameState.status = 'live';
    
    Swal.fire({
      icon: 'success',
      title: `Quarter ${nextQuarter}`,
      text: `Successfully advanced to Quarter ${nextQuarter}`,
      timer: 2000,
      timerProgressBar: true,
      confirmButtonColor: '#0ea5e9'
    });

    console.log(`🏊‍♂️ Advanced to Water Polo Quarter ${nextQuarter}`);
  }

  // Set Timer (for manual adjustment)
  setWaterPoloTimer(minutes: number, seconds: number): void {
    this.waterPoloCurrentSeconds = (minutes * 60) + seconds;
    this.updateWaterPoloTimerDisplay();
    console.log('Timer set to:', this.formatTime(this.waterPoloCurrentSeconds));
  }

  // Get Current Timer Status
  getWaterPoloTimerStatus(): any {
    return {
      isRunning: this.waterPoloTimerRunning,
      currentSeconds: this.waterPoloCurrentSeconds,
      displayTime: this.formatTime(this.waterPoloCurrentSeconds),
      isPaused: this.waterPoloClock.isPaused,
      period: this.waterPoloClock.currentPeriod
    };
  }

  // Manual trigger for water polo countdown (for testing/debugging)
  triggerWaterPoloCountdown(): void {
    console.log('🚀 Manually triggering water polo countdown');
    if (!this.waterPoloTimerRunning) {
      this.initializeWaterPoloTimer();
      this.startWaterPoloTimer();
    } else {
      console.log('Timer already running');
    }
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
    return this.sportConfig?.sport_code === 'GY'
  }

  // Utility method to check if current match is basketball
  isBasketball(): boolean {
    //console.log('Checking if match is basketball...');
    //console.log(this.match);
    return this.sportConfig?.sport_code === 'BB' ||
           this.match?.league_obj?.sport === 2 || // Assuming basketball sport ID is 2
           false;
  }

  // Utility method to check if current match is water polo
  isWaterPolo(): boolean {
    // console.log('Checking if match is water polo...');
    // console.log(this.match);
    return this.sportConfig?.sport_code === 'WP' ||
           this.match?.league_obj?.sport === 3 || // Assuming water polo sport ID is 3
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

  /**
   * Manually refresh clock status from server for debugging and sync
   */
  refreshClockStatus(): void {
    if (!this.match?.id) {
      Swal.fire({
        icon: 'warning',
        title: 'No Match Selected',
        text: 'Cannot refresh clock status without a valid match.',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    Swal.fire({
      title: 'Refreshing Clock Status...',
      html: '<div class="text-center"><i class="fas fa-sync fa-spin fa-2x text-info mb-3"></i><br>Syncing with server...</div>',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.loadClockStatus(this.match.id);
    
    // Close the loading dialog after a short delay to show the updated status
    setTimeout(() => {
      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Clock Status Refreshed!',
        html: `
          <div class="text-start">
            <p><strong>Current Status:</strong></p>
            <ul>
              <li>Clock State: <strong>${this.competitionClock.isRunning ? 'Running' : 'Stopped'}</strong></li>
              <li>Display Time: <strong>${this.formatTime(this.competitionClock.currentTime)}</strong></li>
              <li>Current Rotation: <strong>${this.competitionState.currentRotation}</strong></li>
              <li>Current Apparatus: <strong>${this.competitionState.currentApparatus}</strong></li>
              <li>Routine Time: <strong>${this.formatTime(this.competitionClock.routineTime)}</strong></li>
            </ul>
          </div>
        `,
        timer: 4000,
        showConfirmButton: true,
        confirmButtonText: 'OK'
      });
    }, 1500);
  }

  // Load clock status
  loadClockStatus(matchId: number): void {
    console.log('🔄 Loading clock status for match:', matchId);
    this.apiService.getGymnasticsClockStatus(matchId).subscribe({
      next: (clockStatus) => {
        console.log('📡 Raw clock status from server:', clockStatus);
        
        if (clockStatus) {
          // Parse display time to seconds for internal use
          const displayTimeSeconds = this.parseTimeToSeconds(clockStatus.display_time || clockStatus.time_remaining_in_period || '05:00');
          const routineTimeSeconds = this.parseTimeToSeconds(clockStatus.routine_timer || '00:01:10');
          
          console.log('⏰ Parsed times:', {
            originalDisplayTime: clockStatus.display_time,
            displayTimeSeconds,
            originalRoutineTimer: clockStatus.routine_timer,
            routineTimeSeconds
          });
          
          this.competitionClock = {
            isRunning: clockStatus.is_running || clockStatus.clock_state === 'running',
            currentTime: displayTimeSeconds,
            rotationTime: displayTimeSeconds, // Use display time for rotation
            warmupTime: clockStatus.warmup_time || 0,
            touchWarmupTime: clockStatus.touch_warmup_time || 0,
            routineTime: routineTimeSeconds,
            breakTime: clockStatus.break_time || 0
          };
          
          this.competitionState = {
            ...this.competitionState,
            initialized: true,
            currentRotation: clockStatus.current_rotation || 1,
            currentPeriod: clockStatus.current_period || 1,
            currentApparatus: clockStatus.current_apparatus || 'floor_exercise',
            allRotationsComplete: clockStatus.periods_completed >= clockStatus.total_periods,
            awards_ceremony_ready: clockStatus.awards_ceremony_ready || false
          };

          // Update routine state if there's an active routine
          if (clockStatus.current_routine_player) {
            this.routineState = {
              ...this.routineState,
              activePlayer: { id: clockStatus.current_routine_player },
              activeApparatus: clockStatus.current_apparatus || '',
              isRoutineActive: clockStatus.routine_timer && clockStatus.routine_timer !== '00:01:10',
              routineStartTime: clockStatus.routine_start_time ? new Date(clockStatus.routine_start_time) : null,
              routineDuration: routineTimeSeconds
            };
          }

          // Start clock update if clock is running
          if (this.competitionClock.isRunning) {
            console.log('⏯️ Starting clock interval - clock is running');
            this.startClockInterval();
          } else {
            console.log('⏸️ Clock is stopped - not starting interval');
          }
          
          console.log('✅ Competition clock updated:', this.competitionClock);
          console.log('✅ Competition state updated:', this.competitionState);
          console.log('🔥 Routine state updated:', this.routineState);
        } else {
          console.log('⚠️ No clock status data received from server');
        }
      },
      error: (error) => {
        console.log('❌ Error loading clock status:', error);
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
    console.log('🤸‍♀️ Updating gymnastics player stats:', statsData);
    
    // Get current apparatus from routine state or competition state
    const currentApparatus = this.routineState.activeApparatus || 
                            this.competitionState.currentApparatus || 
                            'floor_exercise';
    
    console.log('📍 Current apparatus for routine:', currentApparatus);

    // Build comprehensive gymnastics player data according to API spec
    const gymnasticsPlayerData: any = {
      // Required base fields
      match: this.match.id,
      team: player.team_id || player.team?.id,
      player: player.id,
      
      // Current apparatus being performed
      apparatus_performed: currentApparatus,
      
      // Core gymnastics scoring fields
      difficulty_score: parseFloat(statsData.difficulty_score) || 0.0,
      execution_score: parseFloat(statsData.execution_score) || 0.0,
      total_score: 0.0, // Will be calculated
      deductions: parseFloat(statsData.deductions) || 0.0,
      fall_count: parseInt(statsData.fall_count) || 0,
      routine_completion: statsData.routine_completion !== false, // Default true
      landing_quality: statsData.landing_quality || 'good',
      routine_duration: parseInt(statsData.routine_duration) || this.routineState.routineDuration || 68,
      
      // Advanced scoring fields
      artistic_score: parseFloat(statsData.artistic_score) || 0.0,
      technical_score: parseFloat(statsData.technical_score) || 0.0,
      
      // Additional gymnastics-specific fields
      neutral_deduction: parseFloat(statsData.neutral_deduction) || 0.0,
      line_deductions: parseFloat(statsData.line_deductions) || 0.0,
      time_deductions: parseFloat(statsData.time_deductions) || 0.0,
      composition_deductions: parseFloat(statsData.composition_deductions) || 0.0,
      
      // Performance quality indicators
      start_value: parseFloat(statsData.start_value) || 0.0,
      bonus_points: parseFloat(statsData.bonus_points) || 0.0,
      connection_value: parseFloat(statsData.connection_value) || 0.0,
      
      // Routine characteristics
      element_count: parseInt(statsData.element_count) || 0,
      dismount_value: parseFloat(statsData.dismount_value) || 0.0,
      special_requirements_met: parseInt(statsData.special_requirements_met) || 0,
      
      // Competition context
      rotation_number: this.competitionState.currentRotation || 1,
      subdivision: statsData.subdivision || 'A',
      session_id: this.sessionConfig.sessionId,
      
      // Apparatus-specific legacy fields for backward compatibility
      [`${currentApparatus}_difficulty_score`]: parseFloat(statsData.difficulty_score) || 0.0,
      [`${currentApparatus}_execution_score`]: parseFloat(statsData.execution_score) || 0.0,
      [`${currentApparatus}_combined_score`]: 0.0, // Will be calculated
      [`${currentApparatus}_deductions`]: parseFloat(statsData.deductions) || 0.0,
      [`${currentApparatus}_completed`]: statsData.routine_completion !== false
    };

    // Set start_value to difficulty_score if not provided
    if (gymnasticsPlayerData.start_value === 0.0) {
      gymnasticsPlayerData.start_value = gymnasticsPlayerData.difficulty_score;
    }

    // Calculate total score (difficulty + execution - deductions)
    gymnasticsPlayerData.total_score = 
      gymnasticsPlayerData.difficulty_score + 
      gymnasticsPlayerData.execution_score - 
      gymnasticsPlayerData.deductions;

    // Update legacy combined score
    gymnasticsPlayerData[`${currentApparatus}_combined_score`] = gymnasticsPlayerData.total_score;

    // Add timestamp for this apparatus performance
    gymnasticsPlayerData.last_updated = new Date().toISOString();
    gymnasticsPlayerData.apparatus_completion_time = new Date().toISOString();

    // Add routine timing if available
    if (this.routineState.routineStartTime) {
      const routineStart = this.routineState.routineStartTime.getTime();
      const now = new Date().getTime();
      gymnasticsPlayerData.actual_routine_duration = Math.floor((now - routineStart) / 1000);
    }

    // Validate required score fields
    if (gymnasticsPlayerData.difficulty_score === 0 && gymnasticsPlayerData.execution_score === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Scores',
        text: 'Please enter at least a difficulty score or execution score.',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    // Validate score ranges
    if (gymnasticsPlayerData.difficulty_score < 0 || gymnasticsPlayerData.difficulty_score > 10) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Difficulty Score',
        text: 'Difficulty score must be between 0.0 and 10.0.',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    if (gymnasticsPlayerData.execution_score < 0 || gymnasticsPlayerData.execution_score > 10) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Execution Score',
        text: 'Execution score must be between 0.0 and 10.0.',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    console.log('🏆 Final gymnastics player data for API:', gymnasticsPlayerData);
    console.log('📊 Score breakdown:', {
      apparatus: currentApparatus,
      difficulty: gymnasticsPlayerData.difficulty_score,
      execution: gymnasticsPlayerData.execution_score,
      deductions: gymnasticsPlayerData.deductions,
      total: gymnasticsPlayerData.total_score,
      routine_completion: gymnasticsPlayerData.routine_completion
    });
console.log('🏆 Sending player update:', gymnasticsPlayerData);
    this.sendPlayerUpdate(gymnasticsPlayerData, dialogDiv, saveBtn, player);
  }

  sendPlayerUpdate(updatedStats: any, dialogDiv: HTMLElement, saveBtn: HTMLButtonElement, player: any): void {
    // Validate required fields
    console.log('🏆 Sending player update:', updatedStats);
    // if (!updatedStats.match || !updatedStats.team || !updatedStats.player) {
    //   Swal.fire({
    //     icon: 'error',
    //     title: 'Validation Error',
    //     text: 'Missing required match, team, or player information',
    //     confirmButtonColor: '#dc3545'
    //   });
    //   return;
    // }

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

  // ============================================================================
  // 🏀 BASKETBALL MANAGEMENT METHODS
  // ============================================================================

  // Initialize Basketball Clock
  initializeBasketballClock(): void {
    if (!this.match?.id) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No match ID found',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    Swal.fire({
      title: 'Initialize Basketball Clock',
      html: `
        <div class="text-center">
          <p>Initialize the basketball clock for this match?</p>
          <div class="row mt-3">
            <div class="col-6">
              <label class="form-label">Quarter Duration (minutes)</label>
              <input type="number" class="form-control" id="quarterDuration" value="12" min="1" max="20">
            </div>
            <div class="col-6">
              <label class="form-label">Overtime Duration (minutes)</label>
              <input type="number" class="form-control" id="overtimeDuration" value="5" min="1" max="10">
            </div>
          </div>
          <div class="row mt-2">
            <div class="col-6">
              <label class="form-label">Shot Clock (seconds)</label>
              <input type="number" class="form-control" id="shotClock" value="24" min="14" max="35">
            </div>
            <div class="col-6">
              <label class="form-label">Total Quarters</label>
              <input type="number" class="form-control" id="totalQuarters" value="4" min="2" max="6">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Initialize Clock',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#198754',
      preConfirm: () => {
        const quarterDuration = parseInt((document.getElementById('quarterDuration') as HTMLInputElement).value);
        const overtimeDuration = parseInt((document.getElementById('overtimeDuration') as HTMLInputElement).value);
        const shotClock = parseInt((document.getElementById('shotClock') as HTMLInputElement).value);
        const totalQuarters = parseInt((document.getElementById('totalQuarters') as HTMLInputElement).value);

        return {
          total_periods: totalQuarters,
          period_duration: quarterDuration * 60, // Convert to seconds
          overtime_duration: overtimeDuration * 60, // Convert to seconds
          shot_clock_duration: shotClock
        };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.apiService.initializeBasketballClock(this.match.id, result.value).subscribe({
          next: (response) => {
            console.log('Basketball clock initialized:', response);
            this.basketballClock = { ...this.basketballClock, ...response };
            this.basketballGameState.status = 'initialized';
            
            Swal.fire({
              icon: 'success',
              title: 'Clock Initialized!',
              text: 'Basketball clock has been successfully initialized.',
              confirmButtonColor: '#198754'
            });

            // Start polling for clock updates
            this.startBasketballClockPolling();
          },
          error: (error) => {
            console.error('Error initializing basketball clock:', error);
            Swal.fire({
              icon: 'error',
              title: 'Initialization Failed',
              text: error.error?.error || 'Failed to initialize basketball clock',
              confirmButtonColor: '#dc3545'
            });
          }
        });
      }
    });
  }

  // Start Basketball Clock
  startBasketballClock(): void {
    if (!this.match?.id) return;

    this.apiService.startBasketballClock(this.match.id, this.basketballClock.currentPeriod).subscribe({
      next: (response) => {
        console.log('Basketball clock started:', response);
        // Map response properly
        this.updateBasketballClockFromResponse(response);
        this.basketballGameState.status = 'live';
        this.startBasketballClockPolling();
        // Start countdown timer for smooth display
        this.startCountdownTimer();
        
        Swal.fire({
          icon: 'success',
          title: 'Clock Started!',
          text: `Quarter ${this.basketballClock.currentPeriod} has started.`,
          timer: 2000,
          timerProgressBar: true,
          confirmButtonColor: '#198754'
        });
      },
      error: (error) => {
        console.error('Error starting basketball clock:', error);
        Swal.fire({
          icon: 'error',
          title: 'Start Failed',
          text: error.error?.error || 'Failed to start basketball clock',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  // Stop Basketball Clock
  stopBasketballClock(): void {
    if (!this.match?.id) return;

    this.apiService.stopBasketballClock(this.match.id).subscribe({
      next: (response) => {
        console.log('Basketball clock stopped:', response);
        this.updateBasketballClockFromResponse(response);
        
        // Stop polling when clock is stopped
        if (this.basketballClockPollingInterval) {
          clearInterval(this.basketballClockPollingInterval);
        }
        // Stop countdown timer
        this.stopCountdownTimer();
        
        Swal.fire({
          icon: 'info',
          title: 'Clock Stopped',
          text: 'Basketball clock has been stopped.',
          timer: 2000,
          timerProgressBar: true,
          confirmButtonColor: '#0d6efd'
        });
      },
      error: (error) => {
        console.error('Error stopping basketball clock:', error);
        Swal.fire({
          icon: 'error',
          title: 'Stop Failed',
          text: error.error?.error || 'Failed to stop basketball clock',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  // Pause Basketball Clock
  pauseBasketballClock(reason: string = 'timeout'): void {
    if (!this.match?.id) return;

    this.apiService.pauseBasketballClock(this.match.id, reason).subscribe({
      next: (response) => {
        console.log('Basketball clock paused:', response);
        this.updateBasketballClockFromResponse(response);
        // Stop countdown timer when paused
        this.stopCountdownTimer();
        
        Swal.fire({
          icon: 'warning',
          title: 'Clock Paused',
          text: `Basketball clock paused: ${reason}`,
          timer: 2000,
          timerProgressBar: true,
          confirmButtonColor: '#ffc107'
        });
      },
      error: (error) => {
        console.error('Error pausing basketball clock:', error);
        Swal.fire({
          icon: 'error',
          title: 'Pause Failed',
          text: error.error?.error || 'Failed to pause basketball clock',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  // Resume Basketball Clock
  resumeBasketballClock(): void {
    if (!this.match?.id) return;

    this.apiService.resumeBasketballClock(this.match.id).subscribe({
      next: (response) => {
        console.log('Basketball clock resumed:', response);
        this.updateBasketballClockFromResponse(response);
        this.startBasketballClockPolling();
        // Resume countdown timer with current time
        this.startCountdownTimer();
        
        Swal.fire({
          icon: 'success',
          title: 'Clock Resumed',
          text: 'Basketball clock has been resumed.',
          timer: 2000,
          timerProgressBar: true,
          confirmButtonColor: '#198754'
        });
      },
      error: (error) => {
        console.error('Error resuming basketball clock:', error);
        Swal.fire({
          icon: 'error',
          title: 'Resume Failed',
          text: error.error?.error || 'Failed to resume basketball clock',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  // Advance to Next Quarter
  advanceToNextQuarter(): void {
    if (!this.match?.id) return;

    const nextQuarter = this.basketballClock.currentPeriod + 1;
    
    Swal.fire({
      title: 'Advance Quarter',
      text: `Advance to Quarter ${nextQuarter}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Advance',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#198754'
    }).then((result) => {
      if (result.isConfirmed) {
        this.apiService.advanceQuarter(this.match.id, nextQuarter).subscribe({
          next: (response) => {
            console.log('Advanced to next quarter:', response);
            this.basketballClock = { ...this.basketballClock, ...response };
            
            // Update quarter status
            if (this.basketballQuarters[this.basketballClock.currentPeriod - 2]) {
              this.basketballQuarters[this.basketballClock.currentPeriod - 2].completed = true;
            }
            
            Swal.fire({
              icon: 'success',
              title: `Quarter ${nextQuarter}`,
              text: `Successfully advanced to Quarter ${nextQuarter}`,
              confirmButtonColor: '#198754'
            });
          },
          error: (error) => {
            console.error('Error advancing quarter:', error);
            Swal.fire({
              icon: 'error',
              title: 'Advance Failed',
              text: error.error?.error || 'Failed to advance quarter',
              confirmButtonColor: '#dc3545'
            });
          }
        });
      }
    });
  }

  // Reset Shot Clock
  resetShotClock(duration: number = 24): void {
    if (!this.match?.id) return;

    this.apiService.resetShotClock(this.match.id, duration).subscribe({
      next: (response) => {
        console.log('Shot clock reset:', response);
        this.updateBasketballClockFromResponse(response);
        
        Swal.fire({
          icon: 'success',
          title: 'Shot Clock Reset',
          text: `Shot clock reset to ${duration} seconds`,
          timer: 1500,
          timerProgressBar: true,
          confirmButtonColor: '#198754'
        });
      },
      error: (error) => {
        console.error('Error resetting shot clock:', error);
        Swal.fire({
          icon: 'error',
          title: 'Reset Failed',
          text: error.error?.error || 'Failed to reset shot clock',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  // Call Basketball Team Timeout
  callBasketballTeamTimeout(teamId: number): void {
    if (!this.match?.id) return;

    // Check if team has timeouts remaining
    const timeoutsRemaining = this.basketballClock.timeoutsRemaining[teamId] || 0;
    if (timeoutsRemaining <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Timeouts Remaining',
        text: 'This team has no timeouts remaining.',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    const teamName = this.getTeamName(teamId);
    
    Swal.fire({
      title: 'Call Timeout',
      html: `
        <div class="text-center">
          <p>Call timeout for <strong>${teamName}</strong>?</p>
          <div class="mt-3">
            <label class="form-label">Timeout Duration (seconds)</label>
            <select class="form-select" id="timeoutDuration">
              <option value="60">1 Minute (Full Timeout)</option>
              <option value="30">30 Seconds (20-Second Timeout)</option>
            </select>
          </div>
          <div class="mt-2">
            <label class="form-label">Reason</label>
            <select class="form-select" id="timeoutReason">
              <option value="coach_strategy">Coach Strategy</option>
              <option value="injury">Injury</option>
              <option value="substitution">Substitution</option>
              <option value="official_timeout">Official Timeout</option>
            </select>
          </div>
          <p class="mt-2 text-muted">Timeouts remaining: ${timeoutsRemaining}</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Call Timeout',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ffc107',
      preConfirm: () => {
        const duration = (document.getElementById('timeoutDuration') as HTMLSelectElement).value;
        const reason = (document.getElementById('timeoutReason') as HTMLSelectElement).value;
        
        return {
          duration: `00:0${duration === '60' ? '1' : '0'}:${duration === '60' ? '00' : '30'}`,
          reason
        };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const timeoutData = {
          team_id: teamId,
          duration: result.value.duration,
          reason: result.value.reason
        };

        this.apiService.callBasketballTimeout(this.match.id, timeoutData).subscribe({
          next: (response) => {
            console.log('Timeout called:', response);
            this.basketballClock = { ...this.basketballClock, ...response };
            this.basketballTimeouts.isActive = true;
            this.basketballTimeouts.currentTeam = teamId;
            
            Swal.fire({
              icon: 'info',
              title: 'Timeout Called',
              text: `Timeout called for ${teamName}`,
              confirmButtonColor: '#0d6efd'
            });
          },
          error: (error) => {
            console.error('Error calling timeout:', error);
            Swal.fire({
              icon: 'error',
              title: 'Timeout Failed',
              text: error.error?.error || 'Failed to call timeout',
              confirmButtonColor: '#dc3545'
            });
          }
        });
      }
    });
  }

  // End Team Timeout
  endTimeout(): void {
    if (!this.match?.id) return;

    this.apiService.endBasketballTimeout(this.match.id).subscribe({
      next: (response) => {
        console.log('Timeout ended:', response);
        this.basketballClock = { ...this.basketballClock, ...response };
        this.basketballTimeouts.isActive = false;
        this.basketballTimeouts.currentTeam = null;
        
        Swal.fire({
          icon: 'success',
          title: 'Timeout Ended',
          text: 'Timeout has been ended',
          timer: 2000,
          timerProgressBar: true,
          confirmButtonColor: '#198754'
        });
      },
      error: (error) => {
        console.error('Error ending timeout:', error);
        Swal.fire({
          icon: 'error',
          title: 'End Timeout Failed',
          text: error.error?.error || 'Failed to end timeout',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  // Load Basketball Clock Status
  loadBasketballClockStatus(): void {
    if (!this.match?.id) return;

    this.apiService.getBasketballClockStatus(this.match.id).subscribe({
      next: (response) => {
        console.log('Basketball clock status loaded:', response);
        
        // Map API response to component properties using helper method
        this.updateBasketballClockFromResponse(response);
        
        // Update game state based on clock status
        if (response.clock_state === 'running' || response.is_running) {
          this.basketballGameState.status = 'live';
          this.basketballClock.isRunning = true;
          // Start polling for real-time updates when clock is running
          this.startBasketballClockPolling();
          // Start local countdown timer for smooth display
          this.startCountdownTimer();
        } else if (response.clock_state === 'stopped' && response.current_period >= 4) {
          this.basketballGameState.status = 'finished';
          this.basketballClock.isRunning = false;
          this.stopCountdownTimer();
        } else {
          this.basketballClock.isRunning = false;
          this.stopCountdownTimer();
        }
        
        console.log('Mapped basketball clock:', this.basketballClock);
      },
      error: (error) => {
        console.error('Error loading basketball clock status:', error);
      }
    });
  }

  // Helper method to update basketball clock from API response
  private updateBasketballClockFromResponse(response: any): void {
    // Map API response to component properties with proper naming convention
    this.basketballClock = {
      ...this.basketballClock,
      isRunning: response.is_running || response.clock_state === 'running',
      isPaused: response.clock_state === 'paused',
      timeRemainingInPeriod: response.time_remaining_in_period || response.display_time || this.basketballClock.timeRemainingInPeriod || '12:00',
      displayTime: response.display_time || response.time_remaining_in_period || this.basketballClock.displayTime || '12:00',
      currentPeriod: response.current_period || this.basketballClock.currentPeriod || 1,
      periodType: response.period_type || this.basketballClock.periodType || 'quarter',
      clockState: response.clock_state || this.basketballClock.clockState || 'stopped',
      totalElapsedTime: response.total_elapsed_time || this.basketballClock.totalElapsedTime || '00:00:00',
      periodDuration: response.period_duration ? this.parseTimeToSeconds(response.period_duration) : (this.basketballClock.periodDuration || 720),
      totalPeriods: response.total_periods || this.basketballClock.totalPeriods || 4,
      timeoutsRemaining: response.timeouts_remaining || this.basketballClock.timeoutsRemaining || {}
    };
    
    // Sync local countdown timer with server data
    if (response.time_remaining_in_period || response.display_time) {
      const serverTimeRemaining = this.parseTimeToSeconds(response.time_remaining_in_period || response.display_time);
      
      // Only sync with server if:
      // 1. Clock is not currently running (to avoid disrupting active countdown)
      // 2. OR there's a very significant difference (more than 15 seconds)
      // 3. OR this is the first initialization and countdown is not yet set up
      const isClockStopped = !this.basketballClock.isRunning;
      const hasSignificantDrift = Math.abs(this.localTimeRemaining - serverTimeRemaining) > 15;
      const needsInitialization = !this.isCountdownInitialized;
      
      if (isClockStopped || hasSignificantDrift || needsInitialization) {
        console.log(`Syncing local timer: ${this.localTimeRemaining}s -> ${serverTimeRemaining}s (Clock running: ${this.basketballClock.isRunning}, Drift: ${Math.abs(this.localTimeRemaining - serverTimeRemaining)}s, Needs Init: ${needsInitialization})`);
        this.localTimeRemaining = serverTimeRemaining;
        this.lastServerSync = new Date();
        this.isCountdownInitialized = true;
        
        // Update display immediately when syncing
        this.basketballClock.displayTime = this.formatSecondsToTime(this.localTimeRemaining);
        this.basketballClock.timeRemainingInPeriod = this.basketballClock.displayTime;
      } else {
        console.log(`Skipping sync - Clock is running with acceptable drift: ${Math.abs(this.localTimeRemaining - serverTimeRemaining)}s`);
      }
    }
    
    console.log('Updated basketball clock:', this.basketballClock);
  }

  // Start local countdown timer for real-time display
  private startCountdownTimer(): void {
    // Clear any existing countdown interval
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    // Initialize local time remaining from the current display time if not already initialized
    if (!this.isCountdownInitialized || this.localTimeRemaining === 0) {
      this.localTimeRemaining = this.parseTimeToSeconds(this.basketballClock.timeRemainingInPeriod || '12:00');
      this.isCountdownInitialized = true;
    }
    this.lastServerSync = new Date();

    console.log(`Starting countdown timer with ${this.localTimeRemaining} seconds remaining (initialized: ${this.isCountdownInitialized})`);

    this.countdownInterval = setInterval(() => {
      if (this.basketballClock.isRunning && this.localTimeRemaining > 0) {
        this.localTimeRemaining--;
        
        // Update the display time
        this.basketballClock.displayTime = this.formatSecondsToTime(this.localTimeRemaining);
        this.basketballClock.timeRemainingInPeriod = this.basketballClock.displayTime;
        
        // Log countdown every 10 seconds for debugging
        if (this.localTimeRemaining % 10 === 0) {
          console.log(`Countdown: ${this.localTimeRemaining} seconds remaining`);
        }
        
        // Check if period ended
        if (this.localTimeRemaining <= 0) {
          this.onPeriodEnd();
        }
      }
    }, 1000); // Update every second
  }

  // Stop countdown timer
  private stopCountdownTimer(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      console.log('Countdown timer stopped');
    }
    // Reset initialization flag when stopping
    this.isCountdownInitialized = false;
  }

  // Format seconds to MM:SS format
  private formatSecondsToTime(seconds: number): string {
    if (seconds < 0) seconds = 0;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Handle period end
  private onPeriodEnd(): void {
    console.log('Period ended!');
    this.stopCountdownTimer();
    this.basketballClock.isRunning = false;
    this.basketballClock.clockState = 'stopped';
    
    // Show period end notification
    Swal.fire({
      icon: 'info',
      title: 'Period Ended!',
      text: `Quarter ${this.basketballClock.currentPeriod} has ended.`,
      confirmButtonText: 'OK',
      confirmButtonColor: '#0d6efd'
    });
  }

  // Start Basketball Clock Polling for Real-time Updates
  startBasketballClockPolling(): void {
    // Clear any existing interval
    if (this.basketballClockPollingInterval) {
      clearInterval(this.basketballClockPollingInterval);
    }

    this.basketballClockPollingInterval = setInterval(() => {
      if (this.isBasketball() && this.basketballClock.isRunning) {
        this.loadBasketballClockStatus();
      }
    }, 30000); // Update every 30 seconds to reduce interference with local countdown
  }

  // Initialize Basketball Game State
  initializeBasketballGameState(): void {
    // Initialize team scores
    this.teams.forEach(team => {
      const teamId = team.team?.id;
      if (teamId) {
        this.basketballGameState.score[teamId] = this.getTeamScore(teamId);
        this.basketballClock.timeoutsRemaining[teamId] = 3; // Each team starts with 3 timeouts
      }
    });

    // Update leading team
    this.updateBasketballTeamScores();
  }

  // Initialize Water Polo Game State
  initializeWaterPoloGameState(): void {
    // Initialize team scores and stats
    this.teams.forEach(team => {
      const teamId = team.team?.id;
      if (teamId) {
        this.waterPoloGameState.score[teamId] = this.getTeamWaterPoloGoals(teamId);
        this.waterPoloTimeouts.timeoutsRemaining[teamId] = 3; // Each team starts with 3 timeouts
        this.waterPoloTimeouts.timeoutsUsed[teamId] = 0;
        
        // Initialize team stats
        this.waterPoloMatchStats.totalGoals[teamId] = 0;
        this.waterPoloMatchStats.totalShots[teamId] = 0;
        this.waterPoloMatchStats.totalSaves[teamId] = 0;
        this.waterPoloMatchStats.totalEjections[teamId] = 0;
        this.waterPoloMatchStats.totalTimeouts[teamId] = 0;
      }
    });

    // Update leading team
    this.updateWaterPoloGameLeader();
  }

  // Update Basketball Player Score
  updateBasketballPlayerScore(playerId: number, teamId: number, scoreData: any): void {
    // First get the current player stats
    this.apiService.getPlayerStats(this.match.id, teamId, playerId).subscribe({
      next: (currentStats) => {
        console.log('Current player stats:', currentStats);
        
        // Merge current stats with new score data, adding values together
        const updatedStats = {
          match: this.match.id,
          team: teamId,
          player: playerId,
          // Add existing stats to new stats values
          points: (currentStats.points || 0) + (scoreData.points || 0),
          field_goals_made: (currentStats.field_goals_made || 0) + (scoreData.field_goals_made || 0),
          field_goals_attempted: (currentStats.field_goals_attempted || 0) + (scoreData.field_goals_attempted || 0),
          three_pointers_made: (currentStats.three_pointers_made || 0) + (scoreData.three_pointers_made || 0),
          three_pointers_attempted: (currentStats.three_pointers_attempted || 0) + (scoreData.three_pointers_attempted || 0),
          two_pointers_made: (currentStats.two_pointers_made || 0) + (scoreData.two_pointers_made || 0),
          two_pointers_attempted: (currentStats.two_pointers_attempted || 0) + (scoreData.two_pointers_attempted || 0),
          free_throws_made: (currentStats.free_throws_made || 0) + (scoreData.free_throws_made || 0),
          free_throws_attempted: (currentStats.free_throws_attempted || 0) + (scoreData.free_throws_attempted || 0),
          assists: (currentStats.assists || 0) + (scoreData.assists || 0),
          rebounds: (currentStats.rebounds || 0) + (scoreData.rebounds || 0),
          offensive_rebounds: (currentStats.offensive_rebounds || 0) + (scoreData.offensive_rebounds || 0),
          defensive_rebounds: (currentStats.defensive_rebounds || 0) + (scoreData.defensive_rebounds || 0),
          steals: (currentStats.steals || 0) + (scoreData.steals || 0),
          blocks: (currentStats.blocks || 0) + (scoreData.blocks || 0),
          turnovers: (currentStats.turnovers || 0) + (scoreData.turnovers || 0),
          fouls: (currentStats.fouls || 0) + (scoreData.fouls || 0),
          personal_fouls: (currentStats.personal_fouls || 0) + (scoreData.personal_fouls || 0),
          technical_fouls: (currentStats.technical_fouls || 0) + (scoreData.technical_fouls || 0),
          minutes_played: (currentStats.minutes_played || 0) + (scoreData.minutes_played || 0),
          plus_minus: (currentStats.plus_minus || 0) + (scoreData.plus_minus || 0),
          // Preserve any other existing stats that aren't being updated
          ...Object.keys(currentStats)
            .filter(key => !scoreData.hasOwnProperty(key) && !['match', 'team', 'player'].includes(key))
            .reduce((obj: any, key: string) => {
              obj[key] = (currentStats as any)[key];
              return obj;
            }, {})
        };

        console.log('Updated player stats to send:', updatedStats);

        // Send the updated stats to the API
        this.apiService.updateBasketballPlayerStats(updatedStats).subscribe({
          next: (response) => {
            console.log('Basketball player stats updated:', response);
            
            // Update local player data with the updated stats
            this.updateLocalPlayerData(playerId, teamId, updatedStats);
            this.loadMatchData(this.match.id);
            // Update team scores
            this.updateBasketballTeamScores();
            Swal.fire({
              icon: 'success',
              title: 'Score Updated!',
              text: `Player stats updated successfully`,
              timer: 1500,
              timerProgressBar: true,
              confirmButtonColor: '#198754'
            });
          },
          error: (error) => {
            console.error('Error updating basketball player stats:', error);
            Swal.fire({
              icon: 'error',
              title: 'Update Failed',
              text: error.error?.error || 'Failed to update player stats',
              confirmButtonColor: '#dc3545'
            });
          }
        });
      },
      error: (error) => {
        console.error('Error fetching current player stats:', error);
        
        // If we can't get current stats, try to update with just the new data
        console.log('Falling back to direct update without current stats');
        const playerStatsData = {
          match: this.match.id,
          team: teamId,
          player: playerId,
          ...scoreData
        };

        this.apiService.updateBasketballPlayerStats(playerStatsData).subscribe({
          next: (response) => {
            console.log('Basketball player stats updated (fallback):', response);
            this.updateLocalPlayerData(playerId, teamId, scoreData);
            this.updateBasketballTeamScores();
            
            Swal.fire({
              icon: 'success',
              title: 'Score Updated!',
              text: `Player stats updated successfully`,
              timer: 1500,
              timerProgressBar: true,
              confirmButtonColor: '#198754'
            });
          },
          error: (updateError) => {
            console.error('Error updating basketball player stats (fallback):', updateError);
            Swal.fire({
              icon: 'error',
              title: 'Update Failed',
              text: updateError.error?.error || 'Failed to update player stats',
              confirmButtonColor: '#dc3545'
            });
          }
        });
      }
    });
  }

  // Quick Score Buttons
  addBasketballScore(playerId: number, teamId: number, scoreType: 'two_point' | 'three_point' | 'free_throw'): void {
    const scoreMap = {
      'two_point': { points: 2, field_goals_made: 1, field_goals_attempted: 1, two_pointers_made: 1, two_pointers_attempted: 1 },
      'three_point': { points: 3, field_goals_made: 1, field_goals_attempted: 1, three_pointers_made: 1, three_pointers_attempted: 1 },
      'free_throw': { points: 1, free_throws_made: 1, free_throws_attempted: 1 }
    };

    const scoreData = {
      ...scoreMap[scoreType],
      minutes_played: 1, // Increment by 1 minute
      plus_minus: scoreMap[scoreType].points
    };

    this.updateBasketballPlayerScore(playerId, teamId, scoreData);
  }

  // Add Basketball Assist
  addBasketballAssist(playerId: number, teamId: number): void {
    const scoreData = {
      assists: 1,
      minutes_played: 1,
      plus_minus: 0
    };

    this.updateBasketballPlayerScore(playerId, teamId, scoreData);
  }

  // Add Basketball Rebound
  addBasketballRebound(playerId: number, teamId: number, reboundType: 'offensive' | 'defensive'): void {
    const scoreData = {
      rebounds: 1,
      [reboundType + '_rebounds']: 1,
      minutes_played: 1,
      plus_minus: 0
    };

    this.updateBasketballPlayerScore(playerId, teamId, scoreData);
  }

  // Add Basketball Foul
  addBasketballFoul(playerId: number, teamId: number, foulType: 'personal' | 'technical'): void {
    const scoreData = {
      fouls: 1,
      [foulType + '_fouls']: 1,
      minutes_played: 1,
      plus_minus: foulType === 'technical' ? -1 : -0.5
    };

    this.updateBasketballPlayerScore(playerId, teamId, scoreData);
  }

  // Add Basketball General Stat
  addBasketballStat(playerId: number, teamId: number, statType: string, value: number): void {
    const scoreData = {
      [statType]: value,
      minutes_played: 1,
      plus_minus: statType === 'turnovers' ? -0.5 : (statType === 'steals' || statType === 'blocks' ? 1 : 0)
    };

    this.updateBasketballPlayerScore(playerId, teamId, scoreData);
  }

  // Update local player data
  private updateLocalPlayerData(playerId: number, teamId: number, updatedStats: any): void {
    if (this.playersData[teamId]) {
      const playerIndex = this.playersData[teamId].findIndex(p => p.id === playerId);
      if (playerIndex !== -1) {
        // Replace the entire stats object with the updated stats from the server
        Object.keys(updatedStats).forEach(key => {
          if (key !== 'match' && key !== 'team' && key !== 'player') {
            this.playersData[teamId][playerIndex][key] = updatedStats[key];
          }
        });
        console.log('Local player data updated for player:', playerId, this.playersData[teamId][playerIndex]);
      }
    }
  }

  // Update basketball team scores
  private updateBasketballTeamScores(): void {
    this.teams.forEach(team => {
      const teamId = team.team?.id;
      if (teamId && this.playersData[teamId]) {
        const teamScore = this.playersData[teamId].reduce((sum, player) => sum + (player.points || 0), 0);
        this.basketballGameState.score[teamId] = teamScore;
      }
    });
    
    // Update leading team
    const scores = Object.entries(this.basketballGameState.score);
    if (scores.length >= 2) {
      const [team1Score, team2Score] = scores.map(([_, score]) => score);
      if (team1Score > team2Score) {
        this.basketballGameState.leadingTeam = parseInt(scores[0][0]);
        this.basketballGameState.scoreMargin = team1Score - team2Score;
      } else if (team2Score > team1Score) {
        this.basketballGameState.leadingTeam = parseInt(scores[1][0]);
        this.basketballGameState.scoreMargin = team2Score - team1Score;
      } else {
        this.basketballGameState.leadingTeam = null;
        this.basketballGameState.scoreMargin = 0;
      }
    }
  }

  // ============================================================================
  // 🏊 WATER POLO CLOCK STATUS METHODS
  // ============================================================================

  // Check if Water Polo clock is initialized
  checkWaterPoloClockInitialized(): boolean {
    return this.waterPoloClock.isInitialized;
  }

  // Check if Water Polo clock initialization is in progress
  isWaterPoloInitializationInProgress(): boolean {
    return this.waterPoloClock.initializationInProgress;
  }

  // Get Basketball Clock Status (for checking if initialized)
  checkBasketballClockInitialized(): boolean {
    // Clock is considered initialized if we have valid clock data from the API
    return this.basketballClock.clockState !== 'stopped' || 
           this.basketballClock.currentPeriod > 0 || 
           this.basketballGameState.status !== 'upcoming' ||
           this.basketballClock.timeRemainingInPeriod !== '12:00';
  }

  // Basketball Team Statistics Methods
  getTeamFieldGoals(teamId: number): string {
    if (!this.playersData[teamId]) return '0/0';
    const players = this.playersData[teamId];
    const made = players.reduce((sum, player) => sum + (player.field_goals_made || 0), 0);
    const attempted = players.reduce((sum, player) => sum + (player.field_goals_attempted || 0), 0);
    return `${made}/${attempted}`;
  }

  getTeamThreePointers(teamId: number): string {
    if (!this.playersData[teamId]) return '0/0';
    const players = this.playersData[teamId];
    const made = players.reduce((sum, player) => sum + (player.three_pointers_made || 0), 0);
    const attempted = players.reduce((sum, player) => sum + (player.three_pointers_attempted || 0), 0);
    return `${made}/${attempted}`;
  }

  getTeamAssists(teamId: number): number {
    if (!this.playersData[teamId]) return 0;
    const players = this.playersData[teamId];
    return players.reduce((sum, player) => sum + (player.assists || 0), 0);
  }

  getTeamRebounds(teamId: number): number {
    if (!this.playersData[teamId]) return 0;
    const players = this.playersData[teamId];
    return players.reduce((sum, player) => sum + (player.rebounds || 0), 0);
  }

  getTeamFouls(teamId: number): number {
    if (!this.playersData[teamId]) return 0;
    const players = this.playersData[teamId];
    return players.reduce((sum, player) => sum + (player.fouls || 0), 0);
  }

  // Basketball Clock Polling Interval
  private basketballClockPollingInterval: any;
  private countdownInterval: any;
  private lastServerSync: Date = new Date();
  private localTimeRemaining: number = 0; // Time remaining in seconds for countdown
  private isCountdownInitialized: boolean = false; // Track if countdown has been properly set up

  // ============================================================================
  // 🏊 WATER POLO MANAGEMENT METHODS
  // ============================================================================

  // Initialize Water Polo Match Clock
  initializeWaterPoloClock(): void {
    if (!this.match?.id) {
      console.error('Match ID is required to initialize water polo clock');
      Swal.fire({
        icon: 'error',
        title: 'Initialization Failed',
        text: 'Match ID is required to initialize water polo clock',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    // Prevent multiple initialization attempts
    if (this.waterPoloClock.isInitialized) {
      Swal.fire({
        icon: 'warning',
        title: 'Already Initialized',
        text: 'Water polo clock has already been initialized for this match',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    if (this.waterPoloClock.initializationInProgress) {
      Swal.fire({
        icon: 'info',
        title: 'Initialization in Progress',
        text: 'Clock initialization is already in progress. Please wait...',
        confirmButtonColor: '#0ea5e9'
      });
      return;
    }

    // Set initialization in progress
    this.waterPoloClock.initializationInProgress = true;

    const clockData = {
      match_format: 'water_polo',
      total_periods: 4,
      period_duration: 480, // 8 minutes in seconds
      shot_clock_duration: 30,
      ejection_duration: 20,
      timeout_duration: 60
    };

    this.apiService.initializeWaterPoloClock(this.match.id, clockData).subscribe({
      next: (response) => {
        console.log('Water Polo clock initialized:', response);
        this.waterPoloClock.isInitialized = true;
        this.waterPoloClock.initializationInProgress = false;
        this.waterPoloGameState.isInitialized = true;
        
        Swal.fire({
          icon: 'success',
          title: 'Clock Initialized!',
          text: 'Water polo match clock has been successfully initialized',
          timer: 2000,
          timerProgressBar: true,
          confirmButtonColor: '#0ea5e9'
        });
        
        // Get initial clock status after initialization
        this.getWaterPoloClockStatus();
      },
      error: (error) => {
        console.error('Error initializing water polo clock:', error);
        this.waterPoloClock.initializationInProgress = false;
        
        Swal.fire({
          icon: 'error',
          title: 'Initialization Failed',
          text: error.error?.error || 'Failed to initialize water polo clock',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  // Start Water Polo Match
  startWaterPoloMatch(): void {
    if (!this.match?.id) {
      console.error('Match ID is required to start water polo match');
      Swal.fire({
        icon: 'error',
        title: 'Start Failed',
        text: 'Match ID is required to start water polo match',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    // Check if clock is initialized before starting
    if (!this.waterPoloClock.isInitialized) {
      Swal.fire({
        icon: 'warning',
        title: 'Clock Not Initialized',
        text: 'Please initialize the water polo clock before starting the match',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    const startData = {
      period: this.waterPoloClock.currentPeriod
    };

    this.apiService.startWaterPoloMatch(this.match.id, startData).subscribe({
      next: (response) => {
        console.log('Water Polo match started:', response);
        this.waterPoloGameState.status = 'live';
        
        // Initialize and start the new timer system
        this.initializeWaterPoloTimer();
        this.startWaterPoloTimer();
        
        Swal.fire({
          icon: 'success',
          title: 'Match Started!',
          text: 'Water polo match has been started successfully',
          timer: 2000,
          timerProgressBar: true,
          confirmButtonColor: '#0ea5e9'
        });
      },
      error: (error) => {
        console.error('Error starting water polo match:', error);
        Swal.fire({
          icon: 'error',
          title: 'Start Failed',
          text: error.error?.error || 'Failed to start water polo match',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  // Stop Water Polo Match
  stopWaterPoloMatch(reason: string = 'match_completed'): void {
    if (!this.match?.id) {
      console.error('Match ID is required to stop water polo match');
      Swal.fire({
        icon: 'error',
        title: 'Stop Failed',
        text: 'Match ID is required to stop water polo match',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    // Check if clock is initialized before stopping
    if (!this.waterPoloClock.isInitialized) {
      Swal.fire({
        icon: 'warning',
        title: 'Clock Not Initialized',
        text: 'Cannot stop a match that hasn\'t been initialized',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    const stopData = { reason };

    this.apiService.stopWaterPoloMatch(this.match.id, stopData).subscribe({
      next: (response) => {
        console.log('Water Polo match stopped:', response);
        this.waterPoloClock.isRunning = false;
        this.waterPoloClock.clockState = 'stopped';
        this.waterPoloGameState.status = 'finished';
        this.stopWaterPoloClockPolling();
        
        Swal.fire({
          icon: 'success',
          title: 'Match Stopped',
          text: 'Water polo match has been stopped successfully',
          confirmButtonColor: '#0ea5e9'
        });
      },
      error: (error) => {
        console.error('Error stopping water polo match:', error);
        Swal.fire({
          icon: 'error',
          title: 'Stop Failed',
          text: error.error?.error || 'Failed to stop water polo match',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  // Pause Water Polo Match
  pauseWaterPoloMatch(reason: string = 'period_break'): void {
    if (!this.match?.id) return;

    const pauseData = { reason };

    this.apiService.pauseWaterPoloMatch(this.match.id, pauseData).subscribe({
      next: (response) => {
        console.log('Water Polo match paused:', response);
        
        // Update local state
        this.waterPoloClock.isPaused = true;
        this.waterPoloClock.isRunning = false;
        this.waterPoloClock.clockState = 'paused';
        
        // IMPORTANT: Stop the local countdown timer
        this.pauseWaterPoloTimer();
        
        this.showSuccessMessage('Water Polo match paused successfully');
        //this.loadMatchData(this.match.id); // Reload match data to reflect pause state
      },
      error: (error) => {
        console.error('Error pausing water polo match:', error);
        this.showErrorMessage('Failed to pause water polo match');
      }
    });
  }

  // Resume Water Polo Match
  resumeWaterPoloMatch(): void {
    if (!this.match?.id) return;

    this.apiService.resumeWaterPoloMatch(this.match.id).subscribe({
      next: (response) => {
        console.log('Water Polo match resumed:', response);
        
        // Update local state
        this.waterPoloClock.isPaused = false;
        this.waterPoloClock.isRunning = true;
        this.waterPoloClock.clockState = 'running';
        
        // IMPORTANT: Restart the local countdown timer
        this.resumeWaterPoloTimer();
        
        this.showSuccessMessage('Water Polo match resumed successfully');
      },
      error: (error) => {
        console.error('Error resuming water polo match:', error);
        this.showErrorMessage('Failed to resume water polo match');
      }
    });
  }

  // Advance Water Polo Period
  advanceWaterPoloPeriod(): void {
    if (!this.match?.id || this.waterPoloClock.currentPeriod >= 4) return;

    const nextPeriod = this.waterPoloClock.currentPeriod + 1;
    const advanceData = { next_period: nextPeriod };

    this.apiService.advanceWaterPoloPeriod(this.match.id, advanceData).subscribe({
      next: (response) => {
        console.log('Water Polo period advanced:', response);
        this.waterPoloClock.currentPeriod = nextPeriod;
        this.waterPoloClock.timeRemainingInPeriod = '8:00';
        this.waterPoloClock.displayTime = '8:00';
        
        // Mark previous period as completed
        if (this.waterPoloPeriods[nextPeriod - 2]) {
          this.waterPoloPeriods[nextPeriod - 2].completed = true;
        }
        
        this.showSuccessMessage(`Advanced to ${this.getWaterPoloPeriodName(nextPeriod)}`);
      },
      error: (error) => {
        console.error('Error advancing water polo period:', error);
        this.showErrorMessage('Failed to advance period');
      }
    });
  }

  // Call Timeout
  callWaterPoloTimeout(teamId: number, duration: string = '00:01:00', reason: string = 'strategy_meeting'): void {
    if (!this.match?.id) return;

    const timeoutData = {
      team_id: teamId,
      duration: duration,
      reason: reason
    };

    this.apiService.callWaterPoloTimeout(this.match.id, timeoutData).subscribe({
      next: (response) => {
        console.log('Water Polo timeout called:', response);
        this.waterPoloTimeouts.isActive = true;
        this.waterPoloTimeouts.currentTeam = teamId;
        this.waterPoloTimeouts.duration = duration;
        this.waterPoloTimeouts.reason = reason;
        this.waterPoloTimeouts.startTime = new Date();
        
        // Increment timeouts used
        if (!this.waterPoloTimeouts.timeoutsUsed[teamId]) {
          this.waterPoloTimeouts.timeoutsUsed[teamId] = 0;
        }
        this.waterPoloTimeouts.timeoutsUsed[teamId]++;
        
        this.showSuccessMessage(`Timeout called for Team ${teamId}: ${reason.replace('_', ' ')}`);
      },
      error: (error) => {
        console.error('Error calling water polo timeout:', error);
        this.showErrorMessage('Failed to call timeout');
      }
    });
  }

  // End Timeout
  endWaterPoloTimeout(): void {
    if (!this.match?.id) return;

    this.apiService.endWaterPoloTimeout(this.match.id).subscribe({
      next: (response) => {
        console.log('Water Polo timeout ended:', response);
        this.waterPoloTimeouts.isActive = false;
        this.waterPoloTimeouts.endTime = new Date();
        this.showSuccessMessage('Timeout ended successfully');
      },
      error: (error) => {
        console.error('Error ending water polo timeout:', error);
        this.showErrorMessage('Failed to end timeout');
      }
    });
  }

  // Update Water Polo Player Stats
  // Update Water Polo Player Stats
  updateWaterPoloPlayerStats(playerId: number, teamId: number, statsData: any): void {
    if (!this.match?.id) return;

    // First get the current player stats
    this.apiService.getPlayerStats(this.match.id, teamId, playerId).subscribe({
      next: (currentStats) => {
        console.log('Current water polo player stats:', currentStats);
        
        // Merge current stats with new score data, adding values together
        const updatedStats = {
          match: this.match.id,
          team: teamId,
          player: playerId,
          // Add existing stats to new stats values for water polo specific stats
          goals: (currentStats.goals || 0) + (statsData.goals || 0),
          assists: (currentStats.assists || 0) + (statsData.assists || 0),
          shots: (currentStats.shots || 0) + (statsData.shots || 0),
          shots_on_goal: (currentStats.shots_on_goal || 0) + (statsData.shots_on_goal || 0),
          saves: (currentStats.saves || 0) + (statsData.saves || 0),
          steals: (currentStats.steals || 0) + (statsData.steals || 0),
          turnovers: (currentStats.turnovers || 0) + (statsData.turnovers || 0),
          ejections: (currentStats.ejections || 0) + (statsData.ejections || 0),
          blocks: (currentStats.blocks || 0) + (statsData.blocks || 0),
          fouls: (currentStats.fouls || 0) + (statsData.fouls || 0),
          penalty_shots: (currentStats.penalty_shots || 0) + (statsData.penalty_shots || 0),
          penalty_goals: (currentStats.penalty_goals || 0) + (statsData.penalty_goals || 0),
          exclusions: (currentStats.exclusions || 0) + (statsData.exclusions || 0),
          field_blocks: (currentStats.field_blocks || 0) + (statsData.field_blocks || 0),
          counter_attacks: (currentStats.counter_attacks || 0) + (statsData.counter_attacks || 0),
          power_play_goals: (currentStats.power_play_goals || 0) + (statsData.power_play_goals || 0),
          power_play_shots: (currentStats.power_play_shots || 0) + (statsData.power_play_shots || 0),
          minutes_played: (currentStats.minutes_played || 0) + (statsData.minutes_played || 0),
          // Preserve any other existing stats that aren't being updated
          ...Object.keys(currentStats)
            .filter(key => !statsData.hasOwnProperty(key) && !['match', 'team', 'player'].includes(key))
            .reduce((obj: any, key: string) => {
              obj[key] = (currentStats as any)[key];
              return obj;
            }, {})
        };

        console.log('Updated water polo player stats to send:', updatedStats);

        // Send the updated stats to the API
        this.apiService.updateWaterPoloPlayerStats(updatedStats).subscribe({
          next: (response) => {
            console.log('Water Polo player stats updated:', response);
            
            // Update local player data with the updated stats
            this.updateLocalWaterPoloPlayerStats(playerId, teamId, updatedStats);
            this.loadMatchData(this.match.id);
            // Update team stats
            this.updateWaterPoloTeamStats(teamId);
            
            Swal.fire({
              icon: 'success',
              title: 'Stats Updated!',
              text: `Player stats updated successfully`,
              timer: 1500,
              timerProgressBar: true,
              confirmButtonColor: '#0ea5e9'
            });
          },
          error: (error) => {
            console.error('Error updating water polo player stats:', error);
            Swal.fire({
              icon: 'error',
              title: 'Update Failed',
              text: error.error?.error || 'Failed to update player stats',
              confirmButtonColor: '#dc3545'
            });
          }
        });
      },
      error: (error) => {
        console.error('Error fetching current water polo player stats:', error);
        
        // If we can't get current stats, try to update with just the new data
        console.log('Falling back to direct update without current stats');
        const playerStatsData = {
          match: this.match.id,
          team: teamId,
          player: playerId,
          ...statsData
        };

        this.apiService.updateWaterPoloPlayerStats(playerStatsData).subscribe({
          next: (response) => {
            console.log('Water Polo player stats updated (fallback):', response);
            this.updateLocalWaterPoloPlayerStats(playerId, teamId, statsData);
            this.updateWaterPoloTeamStats(teamId);
            
            Swal.fire({
              icon: 'success',
              title: 'Stats Updated!',
              text: `Player stats updated successfully`,
              timer: 1500,
              timerProgressBar: true,
              confirmButtonColor: '#0ea5e9'
            });
          },
          error: (updateError) => {
            console.error('Error updating water polo player stats (fallback):', updateError);
            Swal.fire({
              icon: 'error',
              title: 'Update Failed',
              text: updateError.error?.error || 'Failed to update player stats',
              confirmButtonColor: '#dc3545'
            });
          }
        });
      }
    });
  }

  // Get Water Polo Clock Status
  getWaterPoloClockStatus(): void {
    if (!this.match?.id) return;

    this.apiService.getWaterPoloClockStatus(this.match.id).subscribe({
      next: (response) => {
        console.log('Water Polo clock status:', response);
        this.waterPoloClock.isInitialized = true; // Clock exists, so it's initialized
        this.updateWaterPoloClockDisplay(response);
      },
      error: (error) => {
        console.error('Error getting water polo clock status:', error);
        
        // Handle 404 "Clock not initialized" error specifically
        if (error.status === 404 && error.error?.error === 'Clock not initialized') {
          console.log('Water polo clock not yet initialized for this match');
          this.waterPoloClock.isInitialized = false;
          this.waterPoloGameState.isInitialized = false;
          
          // Reset clock to default state
          this.waterPoloClock.isRunning = false;
          this.waterPoloClock.isPaused = false;
          this.waterPoloClock.timeRemainingInPeriod = '8:00';
          this.waterPoloClock.displayTime = '8:00';
          this.waterPoloClock.currentPeriod = 1;
          this.waterPoloClock.clockState = 'stopped';
          
          // Show info message only if user is actively trying to access clock features
          if (this.isWaterPolo()) {
            console.info('Clock initialization required for water polo match');
          }
        } else {
          // Handle other types of errors
          Swal.fire({
            icon: 'error',
            title: 'Clock Status Error',
            text: error.error?.error || 'Failed to get water polo clock status',
            confirmButtonColor: '#dc3545'
          });
        }
      }
    });
  }

  // Get Water Polo Rankings
  getWaterPoloRankings(): void {
    if (!this.match?.id) return;

    this.apiService.getWaterPoloRankings(this.match.id).subscribe({
      next: (response) => {
        console.log('Water Polo rankings:', response);
        // Handle rankings data
      },
      error: (error) => {
        console.error('Error getting water polo rankings:', error);
      }
    });
  }

  // Get Water Polo Final Scores
  getWaterPoloFinalScores(): void {
    if (!this.match?.id) return;

    this.apiService.getWaterPoloFinalScores(this.match.id).subscribe({
      next: (response) => {
        console.log('Water Polo final scores:', response);
        // Handle final scores data
      },
      error: (error) => {
        console.error('Error getting water polo final scores:', error);
      }
    });
  }

  // Get Water Polo Player Statistics
  getWaterPoloPlayerStats(): void {
    if (!this.match?.id) return;

    this.apiService.getWaterPoloPlayerStats(this.match.id).subscribe({
      next: (response) => {
        console.log('Water Polo player stats:', response);
        // Handle player stats data
      },
      error: (error) => {
        console.error('Error getting water polo player stats:', error);
      }
    });
  }

  // Update local Water Polo player stats
  private updateLocalWaterPoloPlayerStats(playerId: number, teamId: number, updatedStats: any): void {
    if (this.playersData[teamId]) {
      const playerIndex = this.playersData[teamId].findIndex(p => p.id === playerId);
      if (playerIndex !== -1) {
        // Replace the entire stats object with the updated stats from the server
        Object.keys(updatedStats).forEach(key => {
          if (key !== 'match' && key !== 'team' && key !== 'player') {
            this.playersData[teamId][playerIndex][key] = updatedStats[key];
          }
        });
        console.log('Local water polo player data updated for player:', playerId, this.playersData[teamId][playerIndex]);
        this.updateWaterPoloTeamStats(teamId);
      }
    }
  }

  // Update Water Polo team statistics
  private updateWaterPoloTeamStats(teamId: number): void {
    if (!this.playersData[teamId]) return;

    const players = this.playersData[teamId];
    
    // Calculate team totals
    this.waterPoloMatchStats.totalGoals[teamId] = players.reduce((sum, player) => sum + (player.goals_scored || 0), 0);
    this.waterPoloMatchStats.totalShots[teamId] = players.reduce((sum, player) => sum + (player.shots_attempted || 0), 0);
    this.waterPoloMatchStats.totalSaves[teamId] = players.reduce((sum, player) => sum + (player.saves || 0), 0);
    this.waterPoloMatchStats.totalEjections[teamId] = players.reduce((sum, player) => sum + (player.ejections || 0), 0);

    // Calculate percentages
    const shots = this.waterPoloMatchStats.totalShots[teamId];
    const goals = this.waterPoloMatchStats.totalGoals[teamId];
    
    if (shots > 0) {
      this.waterPoloMatchStats.goalConversionPercentage[teamId] = (goals / shots) * 100;
    }

    // Update game state
    this.waterPoloGameState.score[teamId] = goals;
    this.updateWaterPoloGameLeader();
  }

  // Update Water Polo game leader
  private updateWaterPoloGameLeader(): void {
    const teams = Object.keys(this.waterPoloGameState.score);
    if (teams.length < 2) return;

    const team1Id = parseInt(teams[0]);
    const team2Id = parseInt(teams[1]);
    const score1 = this.waterPoloGameState.score[team1Id] || 0;
    const score2 = this.waterPoloGameState.score[team2Id] || 0;

    if (score1 > score2) {
      this.waterPoloGameState.leadingTeam = team1Id;
      this.waterPoloGameState.scoreMargin = score1 - score2;
    } else if (score2 > score1) {
      this.waterPoloGameState.leadingTeam = team2Id;
      this.waterPoloGameState.scoreMargin = score2 - score1;
    } else {
      this.waterPoloGameState.leadingTeam = null;
      this.waterPoloGameState.scoreMargin = 0;
    }
  }

  // Update Water Polo clock display
  private updateWaterPoloClockDisplay(clockData: any): void {
    if (clockData) {
      console.log('🏊‍♂️ Updating Water Polo clock display from server:', clockData);
      
      // Update basic clock state
      this.waterPoloClock.currentPeriod = clockData.current_period || 1;
      this.waterPoloClock.clockState = clockData.clock_state || 'stopped';
      
      // Handle time_remaining_in_period
      if (clockData.time_remaining_in_period !== undefined && clockData.time_remaining_in_period !== null) {
        let serverTime: string;
        
        if (typeof clockData.time_remaining_in_period === 'string') {
          serverTime = clockData.time_remaining_in_period;
        } else if (typeof clockData.time_remaining_in_period === 'number') {
          serverTime = this.formatTime(clockData.time_remaining_in_period);
        } else {
          serverTime = '8:00';
        }
        
        // Always sync server time with local timer for accurate time
        const serverSeconds = this.parseTimeString(serverTime);
        this.waterPoloCurrentSeconds = serverSeconds;
        this.updateWaterPoloTimerDisplay();
        console.log('Synced server time:', serverTime, 'to local timer');
      }

      // Update clock running state from server
      if (clockData.clock_state) {
        const isRunning = clockData.clock_state === 'running';
        const isPaused = clockData.clock_state === 'paused';
        const isStopped = clockData.clock_state === 'stopped';
        
        this.waterPoloClock.isRunning = isRunning;
        this.waterPoloClock.isPaused = isPaused;
        this.waterPoloClock.clockState = clockData.clock_state;
        
        // Sync local timer state with server state, but respect local user actions
        if (isRunning && !this.waterPoloTimerRunning) {
          console.log('Server shows clock running, starting local timer');
          this.startWaterPoloTimer();
        } else if (isPaused && this.waterPoloTimerRunning) {
          console.log('Server shows clock paused, pausing local timer');
          this.pauseWaterPoloTimer();
        } else if (isStopped && this.waterPoloTimerRunning) {
          console.log('Server shows clock stopped, stopping local timer');
          this.stopWaterPoloTimer();
        }
      }

      // Update shot clock data
      if (clockData.shot_clock_remaining !== undefined && clockData.shot_clock_remaining !== null) {
        this.waterPoloShotClock.timeRemaining = clockData.shot_clock_remaining;
        this.waterPoloShotClock.isRunning = clockData.shot_clock_remaining > 0;
        this.waterPoloShotClockSeconds = clockData.shot_clock_remaining;
      }

      // Handle shot clock duration
      if (clockData.shot_clock_duration) {
        if (typeof clockData.shot_clock_duration === 'string') {
          const timeParts = clockData.shot_clock_duration.split(':');
          const totalSeconds = parseInt(timeParts[2]) + (parseInt(timeParts[1]) * 60) + (parseInt(timeParts[0]) * 3600);
          this.waterPoloClock.shotClockDuration = totalSeconds;
        } else {
          this.waterPoloClock.shotClockDuration = clockData.shot_clock_duration;
        }
      }

      // Update timeouts remaining
      if (clockData.timeouts_remaining) {
        this.waterPoloTimeouts.timeoutsRemaining = { ...clockData.timeouts_remaining };
      }

      // Update timeout state
      if (clockData.current_timeout_team) {
        this.waterPoloTimeouts.isActive = true;
        this.waterPoloTimeouts.currentTeam = clockData.current_timeout_team;
      } else {
        this.waterPoloTimeouts.isActive = false;
        this.waterPoloTimeouts.currentTeam = null;
      }

      // Handle period information
      if (clockData.total_periods) {
        this.waterPoloClock.totalPeriods = clockData.total_periods;
      }

      // Update period duration
      if (clockData.period_duration) {
        if (typeof clockData.period_duration === 'string') {
          const timeParts = clockData.period_duration.split(':');
          const totalSeconds = parseInt(timeParts[2]) + (parseInt(timeParts[1]) * 60) + (parseInt(timeParts[0]) * 3600);
          this.waterPoloClock.periodDuration = totalSeconds;
        } else {
          this.waterPoloClock.periodDuration = clockData.period_duration;
        }
      }

      console.log('Water Polo Clock Updated:', {
        isRunning: this.waterPoloTimerRunning,
        currentPeriod: this.waterPoloClock.currentPeriod,
        displayTime: this.waterPoloClock.displayTime,
        clockState: this.waterPoloClock.clockState,
        shotClockRemaining: this.waterPoloShotClock.timeRemaining,
        timeoutsRemaining: this.waterPoloTimeouts.timeoutsRemaining
      });
    }
  }

  // Start Water Polo clock polling
  private startWaterPoloClockPolling(): void {
    this.stopWaterPoloClockPolling(); // Clear any existing interval
    
    // Poll server every 10 seconds for water polo (less frequent since we have local countdown)
    this.waterPoloClockPollingInterval = setInterval(() => {
      this.getWaterPoloClockStatus();
    }, 10000); // 10 seconds instead of 1 second
  }

  // Stop Water Polo clock polling
  private stopWaterPoloClockPolling(): void {
    if (this.waterPoloClockPollingInterval) {
      clearInterval(this.waterPoloClockPollingInterval);
      this.waterPoloClockPollingInterval = null;
    }
  }

  // Get Water Polo period name
  getWaterPoloPeriodName(period: number): string {
    const periodNames = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];
    return periodNames[period - 1] || `Period ${period}`;
  }

  // Format Water Polo time display
  private formatWaterPoloTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Get team Water Polo stats
  getTeamWaterPoloGoals(teamId: number): number {
    return this.waterPoloMatchStats.totalGoals[teamId] || 0;
  }

  getTeamWaterPoloShots(teamId: number): number {
    return this.waterPoloMatchStats.totalShots[teamId] || 0;
  }

  getTeamWaterPoloSaves(teamId: number): number {
    return this.waterPoloMatchStats.totalSaves[teamId] || 0;
  }

  getTeamWaterPoloEjections(teamId: number): number {
    return this.waterPoloMatchStats.totalEjections[teamId] || 0;
  }

  getTeamWaterPoloTimeouts(teamId: number): number {
    return this.waterPoloTimeouts.timeoutsUsed[teamId] || 0;
  }

  // Water Polo Clock Polling Interval
  private waterPoloClockPollingInterval: any;
  
  // Water Polo Countdown Interval
  private waterPoloCountdownInterval: any;

  // ============================================================================
  // 🏊‍♂️ WATER POLO PLAYER STATE UPDATES (Basketball-style)
  // ============================================================================

  // Quick Goal Button
  addWaterPoloGoal(playerId: number, teamId: number): void {
    const statsData = {
      goals: 1,
      shots_attempted: 1,
      // points: 1,
      // plus_minus: 1
    };
    this.updateWaterPoloPlayerStats(playerId, teamId, statsData);
  }

  // Quick Shot Button (without goal)
  addWaterPoloShot(playerId: number, teamId: number): void {
    const statsData = {
      shots_attempted: 1,
      plus_minus: 0
    };
    this.updateWaterPoloPlayerStats(playerId, teamId, statsData);
  }

  // Quick Assist Button
  addWaterPoloAssist(playerId: number, teamId: number): void {
    const statsData = {
      assists: 1,
      plus_minus: 0.5
    };
    this.updateWaterPoloPlayerStats(playerId, teamId, statsData);
  }

  // Quick Save Button (for goalkeepers)
  addWaterPoloSave(playerId: number, teamId: number): void {
    const statsData = {
      saves: 1,
      plus_minus: 1
    };
    this.updateWaterPoloPlayerStats(playerId, teamId, statsData);
  }

  // Quick Steal Button
  addWaterPoloSteal(playerId: number, teamId: number): void {
    const statsData = {
      steals: 1,
      plus_minus: 0.5
    };
    this.updateWaterPoloPlayerStats(playerId, teamId, statsData);
  }

  // Quick Turnover Button
  addWaterPoloTurnover(playerId: number, teamId: number): void {
    const statsData = {
      turnovers: 1,
      plus_minus: -0.5
    };
    this.updateWaterPoloPlayerStats(playerId, teamId, statsData);
  }

  // Quick Ejection Button
  addWaterPoloEjection(playerId: number, teamId: number, ejectionType: 'ordinary' | 'major' | 'misconduct' = 'ordinary'): void {
    const ejectionPenalty = ejectionType === 'major' ? -2 : ejectionType === 'misconduct' ? -3 : -1;
    const statsData = {
      ejections: 1,
      [ejectionType + '_ejections']: 1,
      plus_minus: ejectionPenalty
    };
    this.updateWaterPoloPlayerStats(playerId, teamId, statsData);
  }

  // Quick Block Button
  addWaterPoloBlock(playerId: number, teamId: number): void {
    const statsData = {
      blocks: 1,
      plus_minus: 0.5
    };
    this.updateWaterPoloPlayerStats(playerId, teamId, statsData);
  }

  // Quick Sprint Win Button
  addWaterPoloSprintWin(playerId: number, teamId: number): void {
    const statsData = {
      sprints_won: 1,
      plus_minus: 0.5
    };
    this.updateWaterPoloPlayerStats(playerId, teamId, statsData);
  }

  // Quick Penalty Shot Button
  addWaterPoloPenaltyShot(playerId: number, teamId: number, scored: boolean): void {
    const statsData = {
      penalty_shots_attempted: 1,
      penalty_shots_scored: scored ? 1 : 0,
      goals_scored: scored ? 1 : 0,
      points: scored ? 1 : 0,
      plus_minus: scored ? 2 : -1
    };
    this.updateWaterPoloPlayerStats(playerId, teamId, statsData);
  }

  // Quick Man-Up Goal Button
  addWaterPoloManUpGoal(playerId: number, teamId: number): void {
    const statsData = {
      goals_scored: 1,
      man_up_goals: 1,
      shots_attempted: 1,
      points: 1,
      plus_minus: 1.5
    };
    this.updateWaterPoloPlayerStats(playerId, teamId, statsData);
  }

  // Quick Man-Down Goal Button
  addWaterPoloManDownGoal(playerId: number, teamId: number): void {
    const statsData = {
      goals_scored: 1,
      man_down_goals: 1,
      shots_attempted: 1,
      points: 1,
      plus_minus: 2
    };
    this.updateWaterPoloPlayerStats(playerId, teamId, statsData);
  }

  // Add Water Polo General Stat
  addWaterPoloStat(playerId: number, teamId: number, statType: string, value: number): void {
    const plusMinusMap: { [key: string]: number } = {
      'goals_scored': 1,
      'assists': 0.5,
      'saves': 1,
      'steals': 0.5,
      'blocks': 0.5,
      'turnovers': -0.5,
      'ejections': -1,
      'sprints_won': 0.5,
      'shots_attempted': 0
    };

    const statsData = {
      [statType]: value,
      plus_minus: (plusMinusMap[statType] || 0) * value
    };
    this.updateWaterPoloPlayerStats(playerId, teamId, statsData);
  }

  // ============================================================================
  // 🎯 LIVE SCORING MANAGEMENT METHODS
  // ============================================================================

  /**
   * Initialize live scoring data refresh
   */
  initializeLiveScoring(matchId: number): void {
    console.log('🎯 Initializing live scoring for match:', matchId);
    
    // Load initial live score data
    this.loadLiveScoreData(matchId);
    
    // Start live score refresh interval
    this.startLiveScoreRefresh(matchId);
  }

  /**
   * Load live scoring data from API
   */
  loadLiveScoreData(matchId: number): void {
    this.apiService.getLiveScoring(matchId).subscribe({
      next: (data) => {
        console.log('🏆 Live scoring data received:', data);
        this.liveScoreData = data;
        this.lastLiveScoreUpdate = new Date();
        
        // Process team scores from player stats
        this.processTeamScores(data);
        
        // Force UI update
        setTimeout(() => {}, 0);
      },
      error: (error) => {
        console.error('❌ Error loading live scoring data:', error);
        // Don't show error to user as this might be polling
      }
    });
  }

  /**
   * Process team scores from live scoring data
   */
  processTeamScores(liveData: any): void {
    if (!liveData || !liveData.player_stats) {
      return;
    }

    console.log('📊 Processing team scores from live data');
    
    // Reset team scores
    this.teamScores = {};

    // Group players by team and calculate scores
    liveData.player_stats.forEach((playerStat: any) => {
      const teamId = playerStat.team;
      
      if (!this.teamScores[teamId]) {
        this.teamScores[teamId] = {
          teamId: teamId,
          teamName: this.getTeamName(teamId),
          totalScore: 0,
          apparatusScores: {},
          completedApparatus: 0,
          totalApparatus: 8, // Standard gymnastics apparatus count
          lastUpdated: new Date()
        };
      }

      // Process apparatus scores if available
      if (playerStat.apparatus_scores && Array.isArray(playerStat.apparatus_scores)) {
        playerStat.apparatus_scores.forEach((apparatusScore: any) => {
          const apparatus = apparatusScore.apparatus;
          
          if (!this.teamScores[teamId].apparatusScores[apparatus]) {
            this.teamScores[teamId].apparatusScores[apparatus] = {
              totalScore: 0,
              playerCount: 0,
              completed: false
            };
          }
          
          // Add player's score for this apparatus
          if (apparatusScore.completed && apparatusScore.combined_score > 0) {
            this.teamScores[teamId].apparatusScores[apparatus].totalScore += apparatusScore.combined_score;
            this.teamScores[teamId].apparatusScores[apparatus].playerCount += 1;
            this.teamScores[teamId].apparatusScores[apparatus].completed = true;
          }
        });
      }
    });

    // Calculate total team scores
    Object.keys(this.teamScores).forEach(teamIdStr => {
      const teamId = parseInt(teamIdStr);
      const team = this.teamScores[teamId];
      team.totalScore = 0;
      team.completedApparatus = 0;

      Object.keys(team.apparatusScores).forEach(apparatus => {
        const apparatusData = team.apparatusScores[apparatus];
        if (apparatusData.completed) {
          team.totalScore += apparatusData.totalScore;
          team.completedApparatus += 1;
        }
      });
    });

    console.log('🏆 Team scores calculated:', this.teamScores);
  }

  /**
   * Start live score refresh interval
   */
  startLiveScoreRefresh(matchId: number): void {
    // Clear existing interval if any
    this.stopLiveScoreRefresh();
    
    console.log('🔄 Starting live score refresh every', this.LIVE_SCORE_REFRESH_INTERVAL, 'ms');
    
    this.liveScoreRefreshInterval = setInterval(() => {
      this.loadLiveScoreData(matchId);
    }, this.LIVE_SCORE_REFRESH_INTERVAL);
  }

  /**
   * Stop live score refresh interval
   */
  stopLiveScoreRefresh(): void {
    if (this.liveScoreRefreshInterval) {
      console.log('⏹️ Stopping live score refresh');
      clearInterval(this.liveScoreRefreshInterval);
      this.liveScoreRefreshInterval = null;
    }
  }

  /**
   * Get team score for display
   */
  getTeamLiveScore(teamId: number): any {
    return this.teamScores[teamId] || {
      teamId: teamId,
      teamName: this.getTeamName(teamId),
      totalScore: 0,
      apparatusScores: {},
      completedApparatus: 0,
      totalApparatus: 8,
      lastUpdated: null
    };
  }

  /**
   * Get apparatus score for a team
   */
  getApparatusScore(teamId: number, apparatus: string): number {
    const teamScore = this.teamScores[teamId];
    if (teamScore && teamScore.apparatusScores[apparatus]) {
      return teamScore.apparatusScores[apparatus].totalScore;
    }
    return 0;
  }

  /**
   * Check if apparatus is completed for a team
   */
  isApparatusCompleted(teamId: number, apparatus: string): boolean {
    const teamScore = this.teamScores[teamId];
    if (teamScore && teamScore.apparatusScores[apparatus]) {
      return teamScore.apparatusScores[apparatus].completed;
    }
    return false;
  }

  /**
   * Get live match status
   */
  getLiveMatchStatus(): any {
    if (!this.liveScoreData) {
      return null;
    }

    return {
      match: this.liveScoreData.match,
      clock: this.liveScoreData.clock,
      lastUpdated: this.lastLiveScoreUpdate
    };
  }

  /**
   * Force refresh live scoring data
   */
  refreshLiveScoring(): void {
    if (!this.match?.id) {
      return;
    }

    console.log('🔄 Manually refreshing live scoring data');
    this.loadLiveScoreData(this.match.id);
  }

  /**
   * Get formatted last update time
   */
  getLastUpdateTime(): string {
    if (!this.lastLiveScoreUpdate) {
      return 'Never';
    }
    
    const now = new Date();
    const diff = Math.floor((now.getTime() - this.lastLiveScoreUpdate.getTime()) / 1000);
    
    if (diff < 60) {
      return `${diff} seconds ago`;
    } else if (diff < 3600) {
      return `${Math.floor(diff / 60)} minutes ago`;
    } else {
      return this.lastLiveScoreUpdate.toLocaleTimeString();
    }
  }

  // ============================================================================
  // 🔧 UTILITY METHODS
  // ============================================================================

  // Show success message
  private showSuccessMessage(message: string): void {
    Swal.fire({
      title: 'Success!',
      text: message,
      icon: 'success',
      timer: 3000,
      showConfirmButton: false
    });
  }

  // Show error message
  private showErrorMessage(message: string): void {
    Swal.fire({
      title: 'Error!',
      text: message,
      icon: 'error',
      timer: 5000,
      showConfirmButton: true
    });
  }
}