import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../service/api.service';
import { interval, Subscription } from 'rxjs';
import { MatchPlayer, MatchTeam, MatchClock, ClockInitializationRequest, TimeoutRequest, ClockOperation, Player } from '../models';

@Component({
  selector: 'app-update-match-data',
  standalone: true,
  imports: [CommonModule, UpperCasePipe, FormsModule],
  templateUrl: './update-match-data.component.html',
  styleUrl: './update-match-data.component.css'
})
export class UpdateMatchDataComponent implements OnInit, OnDestroy {
  
  sportConfig: any;
  matchId: number | null = null;
  liveClock: MatchClock | null = null;
  clockSubscription: Subscription | null = null;
  teams: any[] = [];
  matchData: any = null;
  
  // Comprehensive scoring panel data
  matchTeams: MatchTeam[] = [];
  matchPlayers: MatchPlayer[] = [];
  playerStats: any[] = [];
  matchStats: any = null;
  liveScoring: any = null;
  selectedTeam: any = null;
  selectedPlayer: any = null;
  currentSportType: string = '';
  
  // UI state
  loading: boolean = false;
  error: string | null = null;
  successMessage: string | null = null;
  showScoring: boolean = true;
  showPlayerManagement: boolean = true;

  // Water Polo Player Management
  waterPoloMatchNumbers: any[] = [];
  waterPoloNumberForm = {
    player: null,
    match_number: null,
    team: null
  };
  rotationForm = {
    current_player: null,
    new_player: null
  };
  showWaterPoloPlayerManagement: boolean = false;
  
  // Sport-specific configurations
  sportConfigs = {
    'BB': { // Basketball
      name: 'Basketball',
      maxTimeouts: 3,
      periods: 4,
      periodType: 'Quarter',
      hasShotClock: true,
      hasRoutineTimer: false,
      hasExclusionTimers: false,
      stats: ['points', 'field_goals_made', 'field_goals_attempted', 'three_pointers_made', 
              'three_pointers_attempted', 'free_throws_made', 'free_throws_attempted',
              'rebounds', 'assists', 'steals', 'blocks', 'turnovers', 'personal_fouls']
    },
    'FB': { // Football
      name: 'Football',
      maxTimeouts: 0,
      periods: 2,
      periodType: 'Half',
      hasShotClock: false,
      hasRoutineTimer: false,
      hasExclusionTimers: false,
      stats: ['goals', 'assists', 'shots_on_target', 'passes', 'tackles', 'yellow_cards', 'red_cards', 'fouls']
    },
    'GY': { // Gymnastics
      name: 'Gymnastics',
      maxTimeouts: 3,
      periods: 1,
      periodType: 'Event',
      hasShotClock: false,
      hasRoutineTimer: true,
      hasExclusionTimers: false,
      stats: ['difficulty_score', 'execution_score', 'total_score', 'deductions', 'fall_count', 
              'routine_completion', 'apparatus_performed', 'landing_quality', 'artistic_score', 'technical_score']
    },
    'WP': { // Water Polo (fixed the code from WB to WP)
      name: 'Water Polo',
      maxTimeouts: 2,
      periods: 4,
      periodType: 'Quarter',
      hasShotClock: false,
      hasRoutineTimer: false,
      hasExclusionTimers: true,
      stats: ['goals', 'assists', 'exclusions', 'penalty_goals', 'power_play_goals', 'shots_attempted', 'saves']
    }
  };

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService
  ) { }

  ngOnInit(): void {
    this.loadSportFromStorage();
    this.getMatchIdFromRoute();
    // Try to get clock data when component loads
    //get match id from route
    this.matchId = this.route.snapshot.paramMap.get('matchId') ? Number(this.route.snapshot.paramMap.get('matchId')) : null;
    console.log('Match ID:', this.matchId);
    if (this.matchId) {
      this.getLiveClock();
      this.getMatchDetails();
      this.startAutoClockUpdate();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoClockUpdate();
  }

  /**
   * Start automatic clock updates every second
   */
  private startAutoClockUpdate(): void {
    if (this.clockSubscription) {
      this.clockSubscription.unsubscribe();
    }
    
    this.clockSubscription = interval(1000).subscribe(() => {
      if (this.matchId) {
        this.getLiveClock();
        this.loadLiveScoring();
      }
    });
  }

  /**
   * Stop automatic clock updates
   */
  private stopAutoClockUpdate(): void {
    if (this.clockSubscription) {
      this.clockSubscription.unsubscribe();
      this.clockSubscription = null;
    }
  }

  /**
   * Get match ID from route parameters
   */
  private getMatchIdFromRoute(): void {
    this.route.params.subscribe(params => {
      this.matchId = params['id'] ? Number(params['id']) : null;
    });
  }

  /**
   * Get match details including teams
   */
  getMatchDetails(): void {
    if (!this.matchId) return;

    this.loading = true;
    this.error = null;

    this.apiService.getMatchDetails(this.matchId).subscribe({
      next: (matchData: any) => {
        this.matchData = matchData;
        this.teams = matchData.teams || [];
        console.log('Match data loaded:', matchData);
        console.log('Teams loaded:', this.teams);
        
        // Load additional match data
        this.loadMatchTeams();
        this.loadMatchPlayers();
        this.loadLiveScoring();
      },
      error: (error: any) => {
        console.error('Error fetching match details:', error);
        this.error = 'Failed to load match details';
        this.loading = false;
      }
    });
  }

  /**
   * Load match teams with full team details
   */
  loadMatchTeams(): void {
    if (!this.matchId) return;

    this.apiService.getMatchTeams(this.matchId).subscribe({
      next: (teams: MatchTeam[]) => {
        this.matchTeams = teams;
        this.setCurrentSportType();
        console.log('Match teams loaded:', teams);
      },
      error: (error: any) => {
        console.error('Error loading match teams:', error);
      }
    });
  }

  /**
   * Load match players with team assignments
   */
  loadMatchPlayers(): void {
    if (!this.matchId) return;

    this.apiService.getMatchPlayersInfo(this.matchId).subscribe({
      next: (players: MatchPlayer[]) => {
        this.matchPlayers = players;
        console.log('Match players loaded:', players);
        this.loadPlayerStatistics();
      },
      error: (error: any) => {
        console.error('Error loading match players:', error);
      }
    });
  }

  /**
   * Load player statistics for the match
   */
  loadPlayerStatistics(): void {
    if (!this.matchId) return;

    this.apiService.getPlayerStatistics(this.matchId).subscribe({
      next: (stats: any[]) => {
        this.playerStats = stats;
        console.log('Player statistics loaded:', stats);
      },
      error: (error: any) => {
        console.error('Error loading player statistics:', error);
      }
    });
  }

  /**
   * Load live scoring data
   */
  loadLiveScoring(): void {
    if (!this.matchId) return;

    this.apiService.getLiveScoring({ match_id: this.matchId }).subscribe({
      next: (liveData: any) => {
        this.liveScoring = liveData;
        this.matchStats = liveData.match_stats;
        // console.log('Live scoring data loaded:', liveData);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading live scoring:', error);
        this.loading = false;
      }
    });
  }

  // ===== PLAYER STATISTICS MANAGEMENT =====

  /**
   * Update player statistics with optimistic UI updates
   */
  updatePlayerStat(player: any, statType: string, value: number): void {
    if (!this.matchId || !player) {
      this.showError('Invalid player or match data');
      return;
    }

    const team = this.getPlayerTeam(player);
    if (!team) {
      this.showError('Cannot find team for player');
      return;
    }

    // Optimistic UI update
    const currentStats = this.getPlayerCurrentStats(player.id);
    if (currentStats) {
      currentStats[statType] = value;
    }

    // API update
    const updateData = {
      match: this.matchId,
      team: team.id,
      player: player.id,
      [statType]: value
    };

    this.apiService.customUpdatePlayerStats(updateData).subscribe({
      next: (response: any) => {
        console.log('Player stats updated:', response);
        this.showSuccess(`Updated ${statType} for ${player.first_name} ${player.last_name}`);
        
        // Refresh live scoring data
        this.loadLiveScoring();
        this.loadMatchTeams();
      },
      error: (error: any) => {
        console.error('Error updating player stats:', error);
        this.showError('Failed to update player statistics');
        
        // Revert optimistic update
        this.loadPlayerStatistics();
      }
    });
  }

  /**
   * Quick action to increment a statistic
   */
  incrementPlayerStat(player: any, statType: string, increment: number = 1): void {
    // Get player ID from either player object or direct ID
    const playerId = typeof player === 'object' ? player.id : player;
    const currentValue = this.getPlayerStatValue(playerId, statType);
    if(statType === 'exclusions') {
      //increment current fouls +1 
      this.updatePlayerStat(player, "fouls", currentValue + 1);
    }
    this.updatePlayerStat(player, statType, currentValue + increment);
  }

  /**
   * Quick action to decrement a statistic
   */
  decrementPlayerStat(player: any, statType: string, decrement: number = 1): void {
    // Get player ID from either player object or direct ID
    const playerId = typeof player === 'object' ? player.id : player;
    const currentValue = this.getPlayerStatValue(playerId, statType);
    const newValue = Math.max(0, currentValue - decrement); // Prevent negative values
    this.updatePlayerStat(player, statType, newValue);
  }

  /**
   * Batch update multiple statistics for a player
   */
  batchUpdatePlayerStats(player: any, statsUpdate: any): void {
    if (!this.matchId || !player) {
      this.showError('Invalid player or match data');
      return;
    }

    const team = this.getPlayerTeam(player);
    if (!team) {
      this.showError('Cannot find team for player');
      return;
    }

    const updateData = {
      match: this.matchId,
      team: team.id,
      player: player.id,
      ...statsUpdate
    };

    this.apiService.customUpdatePlayerStats(updateData).subscribe({
      next: (response: any) => {
        console.log('Player stats batch updated:', response);
        this.showSuccess(`Updated multiple stats for ${player.first_name} ${player.last_name}`);
        this.loadLiveScoring();
        this.loadMatchTeams();
      },
      error: (error: any) => {
        console.error('Error batch updating player stats:', error);
        this.showError('Failed to update player statistics');
      }
    });
  }

  // ===== SPORT-SPECIFIC QUICK ACTIONS =====

  /**
   * Basketball quick actions
   */
  basketballQuickAction(player: any, action: string): void {
    const playerId = typeof player === 'object' ? player.id : player;
    switch (action) {
      case 'make_2pt':
        this.batchUpdatePlayerStats(player, {
          points: this.getPlayerStatValue(playerId, 'points') + 2,
          field_goals_made: this.getPlayerStatValue(playerId, 'field_goals_made') + 1,
          field_goals_attempted: this.getPlayerStatValue(playerId, 'field_goals_attempted') + 1
        });
        break;
      case 'miss_2pt':
        this.incrementPlayerStat(player, 'field_goals_attempted');
        break;
      case 'make_3pt':
        this.batchUpdatePlayerStats(player, {
          points: this.getPlayerStatValue(playerId, 'points') + 3,
          field_goals_made: this.getPlayerStatValue(playerId, 'field_goals_made') + 1,
          field_goals_attempted: this.getPlayerStatValue(playerId, 'field_goals_attempted') + 1,
          three_pointers_made: this.getPlayerStatValue(playerId, 'three_pointers_made') + 1,
          three_pointers_attempted: this.getPlayerStatValue(playerId, 'three_pointers_attempted') + 1
        });
        break;
      case 'miss_3pt':
        this.batchUpdatePlayerStats(player, {
          field_goals_attempted: this.getPlayerStatValue(playerId, 'field_goals_attempted') + 1,
          three_pointers_attempted: this.getPlayerStatValue(playerId, 'three_pointers_attempted') + 1
        });
        break;
      case 'make_ft':
        this.batchUpdatePlayerStats(player, {
          points: this.getPlayerStatValue(playerId, 'points') + 1,
          free_throws_made: this.getPlayerStatValue(playerId, 'free_throws_made') + 1,
          free_throws_attempted: this.getPlayerStatValue(playerId, 'free_throws_attempted') + 1
        });
        break;
      case 'miss_ft':
        this.incrementPlayerStat(player, 'free_throws_attempted');
        break;
      case 'rebound':
        this.incrementPlayerStat(player, 'rebounds');
        break;
      case 'assist':
        this.incrementPlayerStat(player, 'assists');
        break;
      case 'steal':
        this.incrementPlayerStat(player, 'steals');
        break;
      case 'block':
        this.incrementPlayerStat(player, 'blocks');
        break;
      case 'turnover':
        this.incrementPlayerStat(player, 'turnovers');
        break;
      case 'foul':
        this.incrementPlayerStat(player, 'personal_fouls');
        break;
    }
  }

  /**
   * Football quick actions
   */
  footballQuickAction(player: any, action: string): void {
    switch (action) {
      case 'goal':
        this.incrementPlayerStat(player, 'goals');
        break;
      case 'assist':
        this.incrementPlayerStat(player, 'assists');
        break;
      case 'yellow_card':
        this.incrementPlayerStat(player, 'yellow_cards');
        break;
      case 'red_card':
        this.incrementPlayerStat(player, 'red_cards');
        break;
      case 'shot_on_target':
        this.incrementPlayerStat(player, 'shots_on_target');
        break;
      case 'tackle':
        this.incrementPlayerStat(player, 'tackles');
        break;
      case 'foul':
        this.incrementPlayerStat(player, 'fouls');
        break;
      case 'save':
        this.incrementPlayerStat(player, 'saves');
        break;
    }
  }

  /**
   * Gymnastics scoring update
   */
  gymnasticsScoreUpdate(player: any, scores: any): void {
    const totalScore = (scores.difficulty_score || 0) + (scores.execution_score || 0) - (scores.deductions || 0) - ((scores.fall_count || 0) * 0.8);
    
    // Use the specific gymnastics scoring API endpoint
    const scoreData = {
      match: this.matchId,
      team: player.team || (this.matchTeams.length > 0 ? this.matchTeams[0].id : null),
      player: player.id,
      apparatus_performed: scores.apparatus_performed || this.getCurrentApparatus(),
      difficulty_score: scores.difficulty_score || 0,
      execution_score: scores.execution_score || 0,
      total_score: Math.max(0, totalScore),
      deductions: scores.deductions || 0,
      fall_count: scores.fall_count || 0,
      routine_completion: (scores.fall_count || 0) === 0,
      landing_quality: scores.landing_quality || 'good',
      routine_duration: scores.routine_duration || 60,
      artistic_score: scores.artistic_score || scores.execution_score || 0,
      technical_score: scores.technical_score || scores.difficulty_score || 0
    };

    this.apiService.updatePlayerScore(scoreData).subscribe({
      next: (response) => {
        this.successMessage = 'Gymnastics score updated successfully';
        this.clearMessages();
        // Refresh the match data
        this.ngOnInit();
      },
      error: (error) => {
        console.error('Error updating gymnastics score:', error);
        this.error = 'Failed to update gymnastics score';
        this.clearMessages();
      }
    });
  }

  /**
   * Water Polo quick actions
   */
  waterPoloQuickAction(player: any, action: string): void {
    switch (action) {
      case 'goal':
        this.incrementPlayerStat(player, 'goals');
        break;
      case 'assist':
        this.incrementPlayerStat(player, 'assists');
        break;
      case 'exclusion':
        this.incrementPlayerStat(player, 'exclusions');
        break;
      case 'penalty_goal':
        const playerId1 = typeof player === 'object' ? player.id : player;
        this.batchUpdatePlayerStats(player, {
          goals: this.getPlayerStatValue(playerId1, 'goals') + 1,
          penalty_goals: this.getPlayerStatValue(playerId1, 'penalty_goals') + 1
        });
        break;
      case 'power_play_goal':
        const playerId2 = typeof player === 'object' ? player.id : player;
        this.batchUpdatePlayerStats(player, {
          goals: this.getPlayerStatValue(playerId2, 'goals') + 1,
          power_play_goals: this.getPlayerStatValue(playerId2, 'power_play_goals') + 1
        });
        break;
      case 'shot_attempted':
        this.incrementPlayerStat(player, 'shots_attempted');
        break;
      case 'save':
        this.incrementPlayerStat(player, 'saves');
        break;
    }
  }

  // ===== WATER POLO PLAYER MANAGEMENT =====

  /**
   * Load water polo match numbers
   */
  loadWaterPoloMatchNumbers(): void {
    if (!this.matchId) return;

    this.apiService.getWaterPoloMatchNumbers(this.matchId).subscribe({
      next: (data: any[]) => {
        this.waterPoloMatchNumbers = data;
        console.log('Water polo match numbers loaded:', data);
      },
      error: (error: any) => {
        console.error('Error loading water polo match numbers:', error);
        this.error = 'Failed to load water polo match numbers';
      }
    });
  }

  /**
   * Add new water polo player number
   */
  addWaterPoloPlayerNumber(): void {
    if (!this.matchId || !this.waterPoloNumberForm.player || !this.waterPoloNumberForm.match_number || !this.waterPoloNumberForm.team) {
      this.error = 'Please fill all required fields';
      return;
    }

    const payload = {
      match_id: this.matchId,
      player_id: this.waterPoloNumberForm.player,
      match_number: this.waterPoloNumberForm.match_number,
      team_id: this.waterPoloNumberForm.team
    };
    console.log('Adding water polo player number with payload:', payload);

    this.apiService.addWaterPoloPlayerNumber(payload).subscribe({
      next: (response: any) => {
        this.successMessage = 'Player number added successfully';
        this.clearMessages();
        this.loadWaterPoloMatchNumbers(); // Reload the numbers
        this.resetWaterPoloForm();
      },
      error: (error: any) => {
        console.error('Error adding water polo player number:', error);
        this.error = error.error?.detail || 'Failed to add player number';
        this.clearMessages();
      }
    });
  }

  /**
   * Rotate water polo player
   */
  rotateWaterPoloPlayer(): void {
    if (!this.matchId || !this.rotationForm.current_player || !this.rotationForm.new_player) {
      this.error = 'Please select both current and new players';
      return;
    }

    const payload = {
      match_id: this.matchId,
      current_player_id: this.rotationForm.current_player,
      new_player_id: this.rotationForm.new_player
    };

    this.apiService.rotateWaterPoloPlayer(payload).subscribe({
      next: (response: any) => {
        this.successMessage = 'Player rotation completed successfully';
        this.clearMessages();
        this.loadWaterPoloMatchNumbers(); // Reload the numbers
        this.resetRotationForm();
      },
      error: (error: any) => {
        console.error('Error rotating water polo player:', error);
        this.error = error.error?.detail || 'Failed to rotate player';
        this.clearMessages();
      }
    });
  }

  /**
   * Reset water polo number form
   */
  resetWaterPoloForm(): void {
    this.waterPoloNumberForm = {
      player: null,
      match_number: null,
      team: null
    };
  }

  /**
   * Reset rotation form
   */
  resetRotationForm(): void {
    this.rotationForm = {
      current_player: null,
      new_player: null
    };
  }

  /**
   * Get available players for selected team
   */
  getAvailablePlayersForTeam(teamId: number | null): any[] {
    if (!teamId) return [];  
    console.log('Getting available players for team ID:', teamId);
    console.log('All match players:', this.matchPlayers);
    console.log('Filtered players:', this.matchPlayers.filter(mp => {
      const playerTeamId = typeof mp.player === 'object' ? mp.player.team : mp.team;
      return playerTeamId === teamId;
    }));
    return this.matchPlayers.filter(mp => {
      const playerTeamId = typeof mp.player === 'object' ? mp.player.team : mp.team;
      return playerTeamId === teamId;
    });
  }

  /**
   * Get players currently in the match for water polo
   */
  getCurrentWaterPoloPlayers(): any[] {
    return this.waterPoloMatchNumbers.map(wpn => wpn.player);
  }

  /**
   * Check if player is currently in the match
   */
  isPlayerInMatch(playerId: number): boolean {
    return this.waterPoloMatchNumbers.some(wpn => wpn.player.id === playerId);
  }

  /**
   * Get player's current match number
   */
  getPlayerMatchNumber(playerId: number): number | null {
    const matchNumber = this.waterPoloMatchNumbers.find(wpn => wpn.player.id === playerId);
    return matchNumber ? matchNumber.match_number : null;
  }

  /**
   * Toggle water polo player management panel
   */
  toggleWaterPoloPlayerManagement(): void {
    this.showWaterPoloPlayerManagement = !this.showWaterPoloPlayerManagement;
    if (this.showWaterPoloPlayerManagement && this.currentSportType === 'WP') {
      this.loadWaterPoloMatchNumbers();
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Get current statistics for a player
   */
  getPlayerCurrentStats(playerId: number): any {
    return this.playerStats.find(stat => stat.player === playerId || stat.player?.id === playerId);
  }

  /**
   * Get specific statistic value for a player
   */
  getPlayerStatValue(playerId: number, statType: string): number {
    const stats = this.getPlayerCurrentStats(playerId);
    return stats ? (stats[statType] || 0) : 0;
  }

  /**
   * Get team for a player
   */
  getPlayerTeam(player: any): any {
    // Find team from matchPlayers
    const matchPlayer = this.matchPlayers.find(mp => {
      const playerObj = typeof mp.player === 'object' ? mp.player : null;
      const playerId = typeof mp.player === 'object' ? mp.player.id : mp.player;
      return playerId === player.id;
    });
    
    if (matchPlayer) {
      // Find the corresponding match team
      const playerTeamId = typeof matchPlayer.player === 'object' ? matchPlayer.player.team : matchPlayer.team;
      const matchTeam = this.matchTeams.find(mt => mt.team.id === playerTeamId);
      return matchTeam?.team || (typeof matchPlayer.player === 'object' ? matchPlayer.player.team_obj : null);
    }
    
    // Fallback to player's team property
    return player.team_obj || player.team;
  }

  /**
   * Get player object from match player (handles both ID and object cases)
   */
  getPlayerObject(matchPlayer: MatchPlayer): Player | null {
    if (typeof matchPlayer.player === 'object') {
      return matchPlayer.player;
    }
    // If player is just an ID, try to find the full player object from matchPlayers
    // or return null and handle in template
    return null;
  }

  /**
   * Check if player object is available
   */
  hasPlayerObject(matchPlayer: MatchPlayer): boolean {
    return typeof matchPlayer.player === 'object';
  }
  getTeamPlayers(teamId: number): MatchPlayer[] {
    const teamPlayers = this.matchPlayers.filter(mp => {
      // Handle both cases: player as object or as ID
      const playerTeamId = typeof mp.player === 'object' ? mp.player.team : mp.team;
      return playerTeamId === teamId;
    });
    return teamPlayers.map(matchPlayer => this.getPlayerWithCurrentStats(matchPlayer));
  }

  /**
   * Get player with current statistics merged
   */
  getPlayerWithCurrentStats(matchPlayer: MatchPlayer): MatchPlayer {
    // Get player ID whether player is an object or just an ID
    const playerId = typeof matchPlayer.player === 'object' ? matchPlayer.player.id : matchPlayer.player;
    const currentStats = this.getPlayerCurrentStats(playerId);
    
    if (currentStats) {
      // Merge current statistics with match player data
      return {
        ...matchPlayer,
        // Core stats
        points: currentStats.points || 0,
        assists: currentStats.assists || 0,
        rebounds: currentStats.rebounds || 0,
        goals: currentStats.goals || 0,
        penalties_shots: currentStats.penalties_shots || 0,
        penalties_score: currentStats.penalties_score || 0,
        red_cards: currentStats.red_cards || 0,
        yellow_cards: currentStats.yellow_cards || 0,
        fouls: currentStats.fouls || 0,
        steals: currentStats.steals || 0,
        blocks: currentStats.blocks || 0,
        tackles: currentStats.tackles || 0,
        shots: currentStats.shots || 0,
        shots_on_target: currentStats.shots_on_target || 0,
        offsides: currentStats.offsides || 0,
        corners: currentStats.corners || 0,
        saves: currentStats.saves || 0,
        passes: currentStats.passes || 0,
        // Basketball specific
        two_pointers_made: currentStats.two_pointers_made || 0,
        two_pointers_attempted: currentStats.two_pointers_attempted || 0,
        three_pointers_made: currentStats.three_pointers_made || 0,
        three_pointers_attempted: currentStats.three_pointers_attempted || 0,
        one_pointers_made: currentStats.one_pointers_made || 0,
        one_pointers_attempted: currentStats.one_pointers_attempted || 0,
        offensive_rebounds: currentStats.offensive_rebounds || 0,
        defensive_rebounds: currentStats.defensive_rebounds || 0,
        turnovers: currentStats.turnovers || 0,
        personal_fouls: currentStats.personal_fouls || 0,
        minutes_played: currentStats.minutes_played || 0,
        // Water polo specific
        exclusions: currentStats.exclusions || 0,
        penalty_goals: currentStats.penalty_goals || 0,
        power_play_goals: currentStats.power_play_goals || 0,
        shots_attempted: currentStats.shots_attempted || 0,
        shot_accuracy: currentStats.shot_accuracy || 0,
        exclusion_time: currentStats.exclusion_time || 0,
        major_fouls: currentStats.major_fouls || 0,
        minor_fouls: currentStats.minor_fouls || 0,
        swimming_distance: currentStats.swimming_distance || 0,
        // Gymnastics specific
        difficulty_score: currentStats.difficulty_score || 0,
        execution_score: currentStats.execution_score || 0,
        total_score: currentStats.total_score || 0,
        deductions: currentStats.deductions || 0,
        fall_count: currentStats.fall_count || 0,
        routine_completion: currentStats.routine_completion || false,
        artistic_score: currentStats.artistic_score || 0,
        technical_score: currentStats.technical_score || 0,
        landing_quality: currentStats.landing_quality || '',
        apparatus_performed: currentStats.apparatus_performed || '',
        routine_duration: currentStats.routine_duration || 0,
        apparatus_scores: currentStats.apparatus_scores || {},
        // Percentages
        two_point_percentage: currentStats.two_point_percentage,
        three_point_percentage: currentStats.three_point_percentage,
        one_point_percentage: currentStats.one_point_percentage,
      };
    }
    return matchPlayer;
  }

  /**
   * Show success message
   */
  showSuccess(message: string): void {
    this.successMessage = message;
    this.error = null;
    setTimeout(() => {
      this.successMessage = null;
    }, 3000);
  }

  /**
   * Show error message
   */
  showError(message: string): void {
    this.error = message;
    this.successMessage = null;
    setTimeout(() => {
      this.error = null;
    }, 5000);
  }

  /**
   * Get current sport configuration
   */
  getCurrentSportConfig(): any {
    const sportCode = this.sportConfig?.sport_code || this.getSportFromClock();
    return this.sportConfigs[sportCode as keyof typeof this.sportConfigs] || this.sportConfigs['FB'];
  }

  /**
   * Get sport code from clock data
   */
  getSportFromClock(): string {
    if (this.liveClock?.shot_clock_remaining !== undefined) return 'BB';
    if (this.liveClock?.routine_timer !== undefined) return 'GY';
    if (this.liveClock?.exclusion_timers) return 'WB';
    return 'FB';
  }

  // ===== TEAM STATISTICS HELPERS =====

  /**
   * Get total points for a team
   */
  getTeamTotalPoints(teamId: number): number {
    if (!this.liveScoring?.team_stats) return 0;
    return this.liveScoring.team_stats[teamId.toString()]?.total_points || 0;
  }

  /**
   * Get total goals for a team
   */
  getTeamTotalGoals(teamId: number): number {
    if (!this.liveScoring?.team_stats) return 0;
    return this.liveScoring.team_stats[teamId.toString()]?.total_goals || 0;
  }

  /**
   * Get total assists for a team
   */
  getTeamTotalAssists(teamId: number): number {
    if (!this.liveScoring?.team_stats) return 0;
    return this.liveScoring.team_stats[teamId.toString()]?.total_assists || 0;
  }

  /**
   * Get player count for a team
   */
  getTeamPlayerCount(teamId: number): number {
    if (!this.liveScoring?.team_stats) return 0;
    return this.liveScoring.team_stats[teamId.toString()]?.player_count || 0;
  }

  /**
   * Get live clock data for the match
   */
  getLiveClock(): void {
    if (!this.matchId) return;
    
    this.apiService.getLiveClock(`/matches/${this.matchId}/clock/`).subscribe({
      next: (clockData: MatchClock) => {
        this.liveClock = clockData;
        // console.log('Live clock data:', clockData);
        // console.log('Timeout status in live clock:', clockData.timeout_status);
        // console.log('Has timeout in live clock:', clockData.timeout_status?.has_timeout);
      },
      error: (error: any) => {
        if (error.status === 404) {
          // Clock not initialized - this is expected
          this.liveClock = null;
          console.log('Clock not initialized for this match');
        } else {
          console.error('Error fetching live clock:', error);
          this.error = 'Failed to fetch clock data';
        }
      }
    });
  }

  /**
   * Initialize clock for the match based on sport type
   */
  initializeClock(): void {
    if (!this.matchId || !this.currentSportType) return;

    const sportConfig = this.sportConfigs[this.currentSportType as keyof typeof this.sportConfigs];
    if (!sportConfig) {
      this.error = 'Unknown sport type';
      return;
    }

    const clockConfig: ClockInitializationRequest = {
      match_format: this.getSportFormat(),
      total_periods: sportConfig.periods,
      period_duration: this.getPeriodDurationInSeconds(sportConfig),
    };

    // Add sport-specific configurations
    if (sportConfig.hasShotClock) {
      clockConfig.shot_clock_duration = 24; // Basketball shot clock
    }

    if (sportConfig.hasRoutineTimer) {
      clockConfig.routine_time_limit = 70; // Gymnastics routine limit
      clockConfig.apparatus_rotation_time = 120;
    }

    if (this.currentSportType === 'FB') {
      clockConfig.injury_time_tracking = true;
    }

    if (sportConfig.hasExclusionTimers) {
      clockConfig.exclusion_duration = 120; // Water polo exclusion
    }

    this.loading = true;
    this.apiService.initializeClock(this.matchId, clockConfig).subscribe({
      next: (response: MatchClock) => {
        this.liveClock = response;
        this.loading = false;
        this.successMessage = 'Clock initialized successfully';
        this.clearMessages();
      },
      error: (error: any) => {
        console.error('Error initializing clock:', error);
        this.loading = false;
        this.error = 'Failed to initialize clock';
        this.clearMessages();
      }
    });
  }

  /**
   * Start the match clock
   */
  startClock(): void {
    if (!this.matchId) return;

    const startData: ClockOperation = {};
    
    // Add sport-specific start parameters
    if (this.currentSportType === 'GY' && this.selectedPlayer) {
      startData.apparatus = this.getCurrentApparatus();
    }

    this.loading = true;
    this.apiService.startClock(this.matchId, startData).subscribe({
      next: (response: MatchClock) => {
        this.liveClock = response;
        this.loading = false;
        this.successMessage = 'Clock started successfully';
        this.clearMessages();
      },
      error: (error: any) => {
        console.error('Error starting clock:', error);
        this.loading = false;
        this.error = 'Failed to start clock';
        this.clearMessages();
      }
    });
  }

  /**
   * Stop the match clock
   */
  stopClock(): void {
    if (!this.matchId) return;

    this.loading = true;
    this.apiService.stopClock(this.matchId).subscribe({
      next: (response: MatchClock) => {
        this.liveClock = response;
        this.loading = false;
        this.successMessage = 'Clock stopped successfully';
        this.clearMessages();
      },
      error: (error: any) => {
        console.error('Error stopping clock:', error);
        this.loading = false;
        this.error = 'Failed to stop clock';
        this.clearMessages();
      }
    });
  }

  /**
   * Pause the match clock
   */
  pauseClock(reason?: string): void {
    if (!this.matchId) return;

    this.loading = true;
    this.apiService.pauseClock(this.matchId, reason).subscribe({
      next: (response: MatchClock) => {
        this.liveClock = response;
        this.loading = false;
        this.successMessage = 'Clock paused successfully';
        this.clearMessages();
      },
      error: (error: any) => {
        console.error('Error pausing clock:', error);
        this.loading = false;
        this.error = 'Failed to pause clock';
        this.clearMessages();
      }
    });
  }

  /**
   * Resume the match clock
   */
  resumeClock(): void {
    if (!this.matchId) return;

    this.loading = true;
    this.apiService.resumeClock(this.matchId).subscribe({
      next: (response: MatchClock) => {
        this.liveClock = response;
        this.loading = false;
        this.successMessage = 'Clock resumed successfully';
        this.clearMessages();
      },
      error: (error: any) => {
        console.error('Error resuming clock:', error);
        this.loading = false;
        this.error = 'Failed to resume clock';
        this.clearMessages();
      }
    });
  }

  /**
   * Advance to next period/quarter
   */
  advancePeriod(): void {
    if (!this.matchId) return;

    this.loading = true;
    this.apiService.advancePeriod(this.matchId).subscribe({
      next: (response: MatchClock) => {
        this.liveClock = response;
        this.loading = false;
        this.successMessage = 'Advanced to next period';
        this.clearMessages();
      },
      error: (error: any) => {
        console.error('Error advancing period:', error);
        this.loading = false;
        this.error = 'Failed to advance period';
        this.clearMessages();
      }
    });
  }

  /**
   * Call timeout for a team
   */
  callTimeout(teamId: number, duration: string = "00:01:00", reason: string = "coach_consultation"): void {
    if (!this.matchId) return;

    // Check if team has timeouts remaining
    if (!this.canTeamCallTimeout(teamId)) {
      this.error = `Team ${this.getTeamName(teamId)} has no timeouts remaining!`;
      this.clearMessages();
      return;
    }

    const timeoutData: TimeoutRequest = {
      team_id: teamId,
      duration: duration,
      reason: reason
    };

    this.loading = true;
    this.apiService.callTimeout(this.matchId, timeoutData).subscribe({
      next: (response: MatchClock) => {
        this.liveClock = response;
        console.log('Timeout called - Full response:', response);
        console.log('Timeout status:', response.timeout_status);
        console.log('Has timeout:', response.timeout_status?.has_timeout);
        this.debugTimeoutStatus();
        this.loading = false;
        this.successMessage = `Timeout called for ${this.getTeamName(teamId)}`;
        this.clearMessages();
        console.log(`Timeout called for team ${teamId}`);
      },
      error: (error: any) => {
        console.error('Error calling timeout:', error);
        this.loading = false;
        this.error = error.error?.message || 'Failed to call timeout';
        this.clearMessages();
      }
    });
  }

  /**
   * End current timeout
   */
  endTimeout(): void {
    if (!this.matchId) return;

    this.loading = true;
    this.apiService.endTimeout(this.matchId).subscribe({
      next: (response: MatchClock) => {
        this.liveClock = response;
        this.loading = false;
        this.successMessage = 'Timeout ended';
        this.clearMessages();
      },
      error: (error: any) => {
        console.error('Error ending timeout:', error);
        this.loading = false;
        this.error = 'Failed to end timeout';
        this.clearMessages();
      }
    });
  }

  /**
   * Reset shot clock (Basketball only)
   */
  resetShotClock(teamId?: number): void {
    if (!this.matchId || this.currentSportType !== 'BB') return;

    this.apiService.resetShotClock(this.matchId, teamId).subscribe({
      next: (response: MatchClock) => {
        this.liveClock = response;
        this.successMessage = 'Shot clock reset';
        this.clearMessages();
      },
      error: (error: any) => {
        console.error('Error resetting shot clock:', error);
        this.error = 'Failed to reset shot clock';
        this.clearMessages();
      }
    });
  }

  /**
   * Start routine timer (Gymnastics only)
   */
  startRoutineTimer(playerId: number, apparatus: string): void {
    if (!this.matchId || this.currentSportType !== 'GY') return;

    this.apiService.startRoutineTimer(this.matchId, playerId, apparatus).subscribe({
      next: (response: MatchClock) => {
        this.liveClock = response;
        this.successMessage = `Routine timer started for ${apparatus}`;
        this.clearMessages();
      },
      error: (error: any) => {
        console.error('Error starting routine timer:', error);
        this.error = 'Failed to start routine timer';
        this.clearMessages();
      }
    });
  }

  /**
   * Stop routine timer (Gymnastics only)
   */
  stopRoutineTimer(): void {
    if (!this.matchId || this.currentSportType !== 'GY') return;

    this.apiService.stopRoutineTimer(this.matchId).subscribe({
      next: (response: MatchClock) => {
        this.liveClock = response;
        this.successMessage = 'Routine timer stopped';
        this.clearMessages();
      },
      error: (error: any) => {
        console.error('Error stopping routine timer:', error);
        this.error = 'Failed to stop routine timer';
        this.clearMessages();
      }
    });
  }

  
  /**
   * Get team name by ID
   */
  getTeamName(teamId: number): string {
    const team = this.teams.find(t => t.team?.id === teamId || t.id === teamId);
    return team?.team?.name || team?.name || `Team ${teamId}`;
  }

  /**
   * Get timeout count for team
   */
  getTeamTimeouts(teamId: number): number {
    if (!this.liveClock?.timeouts_remaining) return 0;
    return this.liveClock.timeouts_remaining[teamId.toString()] || 0;
  }

  /**
   * Get active exclusion timers as array for display
   */
  getExclusionArray(): any[] {
    if (!this.liveClock?.exclusion_timers) return [];
    
    return Object.values(this.liveClock.exclusion_timers);
  }

  /**
   * Load sport configuration from localStorage
   */
  private loadSportFromStorage(): void {
    try {
      const sportData = localStorage.getItem('sport');
      if (sportData) {
        this.sportConfig = JSON.parse(sportData);
        console.log('Sport config loaded:', this.sportConfig);
      } else {
        console.warn('No sport data found in localStorage');
      }
    } catch (error) {
      console.error('Error parsing sport data from localStorage:', error);
    }
  }

  /**
   * Check if the current match is a Football match
   * @returns boolean - true if sport_code is 'FB'
   */
  isFootball(): boolean {
    return this.sportConfig?.sport_code === 'FB';
  }

  /**
   * Check if the current match is a Gymnastics match
   * @returns boolean - true if sport_code is 'GY'
   */
  isGymnastics(): boolean {
    return this.sportConfig?.sport_code === 'GY';
  }

  /**
   * Check if the current match is a Basketball match
   * @returns boolean - true if sport_code is 'BB'
   */
  isBasketball(): boolean {
    return this.sportConfig?.sport_code === 'BB';
  }

  /**
   * Check if the current match is a Water Polo match
   * @returns boolean - true if sport_code is 'WB'
   */
  isWaterPolo(): boolean {
    return this.sportConfig?.sport_code === 'WB';
  }

  /**
   * Select a team for player management
   */
  selectTeam(team: MatchTeam): void {
    this.selectedTeam = team;
    console.log('Selected team:', team);
  }

  /**
   * Format time for display
   */
  formatTime(timeInSeconds: number): string {
    if (!timeInSeconds && timeInSeconds !== 0) return '00:00';
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get period name based on sport
   */
  getPeriodName(): string {
    if (!this.sportConfig) return 'Period';
    
    const sportType = this.sportConfig.sport_code;
    switch (sportType) {
      case 'BB': return 'Quarter';
      case 'FB': return 'Half';
      case 'WP': return 'Quarter';
      case 'GY': return 'Event';
      default: return 'Period';
    }
  }

  /**
   * Open score dialog for gymnastics
   */
  openScoreDialog(player: any): void {
    // This would open a modal dialog for detailed score entry
    console.log('Opening score dialog for:', player);
    // Implementation would involve creating a modal component
  }

  /**
   * Gymnastics quick actions
   */
  gymnasticsQuickAction(player: any, action: string): void {
    switch (action) {
      case 'fall':
        this.incrementPlayerStat(player, 'fall_count');
        break;
      case 'start_routine':
        // Start routine timer with current apparatus
        const apparatus = this.getCurrentApparatus();
        this.startRoutineTimer(player.id, apparatus);
        break;
      case 'complete_routine':
        this.updatePlayerStat(player, 'routine_completion', 1);
        // Stop routine timer when complete
        this.stopRoutineTimer();
        break;
      case 'advance_rotation':
        this.advanceApparatusRotation();
        break;
    }
  }

  /**
   * Advance apparatus rotation
   */
  advanceApparatusRotation(): void {
    if (!this.matchId) return;

    const nextApparatus = this.getNextApparatus();
    this.loading = true;
    
    this.apiService.advanceApparatusRotation(this.matchId, {
      next_apparatus: nextApparatus,
      rotation_duration: 90
    }).subscribe({
      next: (response) => {
        this.liveClock = response;
        this.successMessage = `Advanced to ${this.getApparatusDisplayName(nextApparatus)}`;
        this.clearMessages();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error advancing rotation:', error);
        this.error = 'Failed to advance apparatus rotation';
        this.clearMessages();
        this.loading = false;
      }
    });
  }

  /**
   * Get next apparatus in rotation
   */
  getNextApparatus(): string {
    const apparatusOrder = ['floor_exercise', 'pommel_horse', 'still_rings', 'vault', 'parallel_bars', 'horizontal_bar'];
    const currentRotation = this.liveClock?.current_rotation || 1;
    const nextIndex = currentRotation % apparatusOrder.length;
    return apparatusOrder[nextIndex];
  }

  /**
   * Get apparatus display name
   */
  getApparatusDisplayName(apparatus: string): string {
    const names: { [key: string]: string } = {
      'floor_exercise': 'Floor Exercise',
      'pommel_horse': 'Pommel Horse',
      'still_rings': 'Still Rings',
      'vault': 'Vault',
      'parallel_bars': 'Parallel Bars',
      'horizontal_bar': 'Horizontal Bar',
      'balance_beam': 'Balance Beam',
      'uneven_bars': 'Uneven Bars'
    };
    return names[apparatus] || apparatus;
  }

  /**
   * Set current sport type based on match data
   */
  setCurrentSportType(): void {
    if (this.matchTeams.length > 0) {
      this.currentSportType = this.matchTeams[0].team.sport_obj.sport_code;
      console.log('Current sport type:', this.currentSportType);
      
      // Load water polo specific data if it's a water polo match
      if (this.currentSportType === 'WP') {
        this.loadWaterPoloMatchNumbers();
      }
    }
  }

  // ===== CLOCK MANAGEMENT HELPER METHODS =====

  /**
   * Get sport format string for API
   */
  getSportFormat(): string {
    const formatMap = {
      'BB': 'basketball',
      'FB': 'football',
      'GY': 'gymnastics',
      'WP': 'waterpolo'
    };
    return formatMap[this.currentSportType as keyof typeof formatMap] || 'basketball';
  }

  /**
   * Get period duration in seconds based on sport config
   */
  getPeriodDurationInSeconds(sportConfig: any): number {
    const durationMap = {
      'BB': 12 * 60, // 12 minutes
      'FB': 45 * 60, // 45 minutes
      'GY': 5 * 60,  // 5 minutes per rotation
      'WP': 8 * 60   // 8 minutes
    };
    return durationMap[this.currentSportType as keyof typeof durationMap] || 12 * 60;
  }

  /**
   * Get current apparatus for gymnastics
   */
  getCurrentApparatus(): string {
    // This should be determined based on current rotation and team
    const apparatusOrder = ['floor_exercise', 'pommel_horse', 'still_rings', 'vault', 'parallel_bars', 'horizontal_bar'];
    const currentRotation = this.liveClock?.current_rotation || 1;
    return apparatusOrder[(currentRotation - 1) % apparatusOrder.length];
  }

  /**
   * Clear success and error messages after timeout
   */
  clearMessages(): void {
    setTimeout(() => {
      this.successMessage = null;
      this.error = null;
    }, 3000);
  }

  /**
   * Check if clock is initialized
   */
  isClockInitialized(): boolean {
    return this.liveClock !== null;
  }

  /**
   * Check if clock is running
   */
  isClockRunning(): boolean {
    return this.liveClock?.is_running || false;
  }

  /**
   * Check if clock is paused
   */
  isClockPaused(): boolean {
    return this.liveClock?.clock_state === 'paused';
  }

  /**
   * Check if clock is stopped
   */
  isClockStopped(): boolean {
    return this.liveClock?.clock_state === 'stopped';
  }

  /**
   * Check if timeout is active
   */
  isTimeoutActive(): boolean {
    return this.liveClock?.timeout_status?.has_timeout === true;
  }

  /**
   * Check if overtime is active
   */
  isOvertimeActive(): boolean {
    return this.liveClock?.clock_state === 'overtime';
  }

  /**
   * Check if match is finished
   */
  isMatchFinished(): boolean {
    return this.liveClock?.clock_state === 'finished';
  }

  /**
   * Get formatted time display
   */
  getFormattedTime(): string {
    return this.liveClock?.display_time || '00:00';
  }

  /**
   * Get current period display name
   */
  getCurrentPeriodDisplay(): string {
    if (!this.liveClock) return '';
    
    const periodTypeMap = {
      'quarter': `Quarter ${this.liveClock.current_period}`,
      'half': `${this.liveClock.current_period === 1 ? '1st' : '2nd'} Half`,
      'rotation': `Rotation ${this.liveClock.current_rotation}`,
      'period': `Period ${this.liveClock.current_period}`
    };
    
    return periodTypeMap[this.liveClock.period_type as keyof typeof periodTypeMap] || 
           `Period ${this.liveClock.current_period}`;
  }

  /**
   * Get shot clock display (Basketball only)
   */
  getShotClockDisplay(): string {
    if (this.currentSportType !== 'BB' || !this.liveClock?.shot_clock_remaining) {
      return '';
    }
    return this.liveClock.shot_clock_remaining;
  }

  /**
   * Get routine timer display (Gymnastics only)
   */
  getRoutineTimerDisplay(): string {
    if (this.currentSportType !== 'GY' || !this.liveClock?.routine_timer) {
      return '';
    }
    return this.liveClock.routine_timer;
  }

  /**
   * Get timeout team name
   */
  getTimeoutTeamName(): string {
    if (this.liveClock?.timeout_status?.current_timeout_team?.name) {
      return this.liveClock.timeout_status.current_timeout_team.name;
    }
    // Fallback to old structure
    if (!this.liveClock?.current_timeout_team) return '';
    return this.getTeamName(this.liveClock.current_timeout_team);
  }

  /**
   * Debug method to check timeout status
   */
  debugTimeoutStatus(): void {
    console.log('=== TIMEOUT DEBUG ===');
    console.log('liveClock:', this.liveClock);
    console.log('liveClock.timeout_status:', this.liveClock?.timeout_status);
    console.log('liveClock.timeout_status.has_timeout:', this.liveClock?.timeout_status?.has_timeout);
    console.log('isTimeoutActive():', this.isTimeoutActive());
    console.log('getTimeoutTeamName():', this.getTimeoutTeamName());
    console.log('====================');
  }

  /**
   * Check if team can call timeout - null check version
   */
  canTeamCallTimeout(teamId: number): boolean {
    if (!this.liveClock?.timeouts_remaining) return false;
    const remaining = this.liveClock.timeouts_remaining[teamId.toString()];
    return remaining !== undefined && remaining > 0;
  }

  /**
   * Get team timeouts remaining - null check version
   */
  getTeamTimeoutsRemaining(teamId: number): number {
    if (!this.liveClock?.timeouts_remaining) return 0;
    return this.liveClock.timeouts_remaining[teamId.toString()] || 0;
  }

  /**
   * Get exclusion timers (Water Polo only)
   */
  getExclusionTimers(): any[] {
    if (this.currentSportType !== 'WP' || !this.liveClock?.exclusion_timers) {
      return [];
    }
    return Object.entries(this.liveClock.exclusion_timers).map(([id, timer]) => ({
      id,
      ...timer
    }));
  }

  /**
   * Quick actions for clock management based on current state
   */
  getClockQuickActions(): string[] {
    if (!this.liveClock) return ['initialize'];
    
    const actions = [];
    
    if (this.isClockStopped()) {
      actions.push('start');
    }
    
    if (this.isClockRunning()) {
      actions.push('pause', 'stop');
    }
    
    if (this.isClockPaused()) {
      actions.push('resume', 'stop');
    }
    
    if (this.isTimeoutActive()) {
      actions.push('end_timeout');
    }
    
    if (!this.isMatchFinished()) {
      actions.push('advance_period');
    }
    
    // Sport-specific actions
    if (this.currentSportType === 'BB' && this.isClockRunning()) {
      actions.push('reset_shot_clock');
    }
    
    if (this.currentSportType === 'GY') {
      actions.push('start_routine', 'stop_routine');
    }
    
    if (this.currentSportType === 'FB' && this.isClockRunning()) {
      actions.push('add_injury_time');
    }
    
    return actions;
  }
  playerNameFilter: string = '';
  filteredPlayers: MatchPlayer[] = [];
  clearPlayerFilter(): void {
    this.playerNameFilter = '';
  }
  onPlayerFilterChange(): void {
    // Optional: Add debouncing for performance if needed
    // For now, filtering happens immediately
  }
  getFilteredTeamPlayers(teamId: number): MatchPlayer[] {
    const teamPlayers = this.getTeamPlayers(teamId);
    
    if (!this.playerNameFilter || this.playerNameFilter.trim() === '') {
      return teamPlayers;
    }
    
    const filterText = this.playerNameFilter.toLowerCase().trim();
    
    return teamPlayers.filter(matchPlayer => {
      const player = this.getPlayerObject(matchPlayer);
      if (!player) return false;
      
      const fullName = `${player.first_name || ''} ${player.last_name || ''}`.toLowerCase();
      const firstName = (player.first_name || '').toLowerCase();
      const lastName = (player.last_name || '').toLowerCase();
      const uniform = (player.uniform || '').toString();
      
      return fullName.includes(filterText) || 
             firstName.includes(filterText) || 
             lastName.includes(filterText) ||
             uniform.includes(filterText);
    });
  }
}
