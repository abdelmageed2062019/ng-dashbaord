import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../service/api.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-update-match',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './update-match.component.html',
  styleUrls: ['./update-match.component.css']
})
export class UpdateMatchComponent implements OnInit, OnDestroy {
  matchId!: number;
  matchDetails: any;
  matchForm!: FormGroup;
  teammatch1Form!: FormGroup;
  teammatch2Form!: FormGroup;
  notification: { message: string, type: 'success' | 'error' } | null = null;
  team1id!: number;
  team2id!: number;
  team1players: any[] = [];
  team2players: any[] = [];

  showModal: boolean = false;
  selectedPlayer: any = null;
  private ngUnsubscribe$ = new Subject<void>(); //Subject to unsubscribe on destroy
  private getMatchDetailsInterval: any;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadMatchData();
    this.startLiveUpdates(); // Start live updates
  }

  ngOnDestroy(): void {
    clearInterval(this.getMatchDetailsInterval);
    this.ngUnsubscribe$.next();
    this.ngUnsubscribe$.complete();
  }

  getTeamPlayers(team1id: number, team2id: number): void {
    this.apiService.getplayerlist(team1id).subscribe({
      next: (data) => {
        this.team1players = data;
        console.log('Team 1 players:', data);
        this.cdr.detectChanges();
      },
      error: (error) => console.error('Error fetching team players:', error)
    });
    this.apiService.getplayerlist(team2id).subscribe({
      next: (data) => {
        this.team2players = data;
        this.cdr.detectChanges();
      },
      error: (error) => console.error('Error fetching team players:', error)
    });
  }

  private initializeForm(): void {
    this.matchForm = this.fb.group({
      score_team1: [0, [Validators.required, Validators.min(0)]],
      score_team2: [0, [Validators.required, Validators.min(0)]],
      status: ['', Validators.required],
      yellow_cards: [0, [Validators.required, Validators.min(0)]],
      red_cards: [0, [Validators.required, Validators.min(0)]],
    });
    this.teammatch1Form = this.fb.group({
      yellow_cards: [0, [Validators.required, Validators.min(0)]],
      red_cards: [0, [Validators.required, Validators.min(0)]],
    });
    this.teammatch2Form = this.fb.group({
      yellow_cards: [0, [Validators.required, Validators.min(0)]],
      red_cards: [0, [Validators.required, Validators.min(0)]],
    });
  }
  updateStats() {
    this.apiService.getMatchDetails(this.matchId)
      .pipe(takeUntil(this.ngUnsubscribe$))
      .subscribe({
        next: (data) => {
          this.matchDetails = data;
          console.log('Match details updated:', data);
          this.cdr.detectChanges(); // Trigger change detection
        },
        error: (error) => console.error('Error fetching match details:', error)
      });
  }
  startLiveUpdates(): void {
    this.getMatchDetailsInterval = setInterval(this.updateStats.bind(this), 10000); // 10 seconds
  }
  private loadMatchData(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('matchId');
      if (id) {
        this.matchId = +id;
        this.apiService.getMatchDetails(this.matchId).subscribe({
          next: (data) => {
            this.matchDetails = data;
            this.patchFormValues(data);
            this.team1id = data.matchteams[0].id;
            this.team2id = data.matchteams[1].id;
            this.getTeamPlayers(data.matchteams[0].team.id, data.matchteams[1].team.id);
          },
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
      yellow_cards: data.yellow_cards,
      red_cards: data.red_cards
    });
    // Patch Match Teams
  }

  onSubmit(): void {
    this.matchDetails.score_team1 = parseInt(this.matchDetails.score_team1)
    this.matchDetails.score_team2 = parseInt(this.matchDetails.score_team2)
    this.matchDetails.red_cards = parseInt(this.matchDetails.red_cards)
    this.matchDetails.yellow_cards = parseInt(this.matchDetails.yellow_cards)
    if (this.matchForm.valid) {
      this.apiService.updateMatch(this.matchId, this.matchDetails).subscribe({
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
    setTimeout(() => this.notification = null, 5000);
  }

  getPositions(players: any[]): string[] {
    return [...new Set(players.map(player => player.position))];
  }

  getPlayersByPosition(players: any[], position: string): any[] {
    return players.filter(player => player.position === position);
  }

  openEditDialog(player: any): void {
    console.log('Opening edit dialog for player:', player);
    const teamId = player.team_obj.id; // Assuming team_obj.id holds the team ID
    const playerId = player.id;

    console.log('Opening edit dialog for player:', player);
    console.log('Match ID:', this.matchId, 'Team ID:', teamId, 'Player ID:', playerId);
    this.apiService.getPlayerStats(this.matchId, teamId, playerId).subscribe({
      next: (stats) => {
        // Ensure default values are set, populate with fetched stats
        this.selectedPlayer = {
          points: 0,
          assists: 0,
          rebounds: 0,
          goals: 0,
          red_cards: 0,
          yellow_cards: 0,
          fouls: 0,
          steals: 0,
          blocks: 0,
          tackles: 0,
          shots: 0,
          shots_on_target: 0,
          corners: 0,
          offsides: 0,
          ...player, // Player base data
          ...stats  // Override with fetched stats
        };
        this.showModal = true;
      },
      error: (error) => {
        console.error('Error fetching player stats:', error);
        // If getPlayerStats fails, still show the modal with default values and the player's base data
        this.selectedPlayer = {
          points: 0,
          assists: 0,
          rebounds: 0,
          goals: 0,
          red_cards: 0,
          yellow_cards: 0,
          fouls: 0,
          steals: 0,
          blocks: 0,
          tackles: 0,
          shots: 0,
          shots_on_target: 0,
          corners: 0,
          offsides: 0,
          ...player
        };
        this.showModal = true;
      }
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedPlayer = null;
  }

  saveChanges(): void {
    if (this.selectedPlayer) {
      const team = (this.selectedPlayer.team_obj.id === this.team1id) ? this.team1players : this.team2players;
      const index = team.findIndex(p => p.id === this.selectedPlayer.id);
      if (index > -1) {
        team[index] = { ...this.selectedPlayer };
      }
      this.updatePlayerStats(this.selectedPlayer);
    }
    this.closeModal();
  }

  updatePlayerStats(player: any): void {
    console.log(player);
    const updatePayload = {
      points: player.points,
      assists: player.assists,
      rebounds: player.rebounds,
      goals: player.goals,
      red_cards: player.red_cards,
      yellow_cards: player.yellow_cards,
      fouls: player.fouls,
      steals: player.steals,
      blocks: player.blocks,
      tackles: player.tackles,
      shots: player.shots,
      shots_on_target: player.shots_on_target,
      offsides: player.offsides,
      corners: player.corners,
      match: this.matchId,
      team: player.team_obj.id,
      player: player.player
    };

    this.apiService.updateplayer(updatePayload).subscribe({
      next: (data) => {
        console.log('Received stats', data);
        this.showNotification('Player stats updated successfully!', 'success');
      },
      error: (error) => {
        this.showNotification('Error updating player stats. Please try again.', 'error');
        console.error('Error updating player stats:', error);
      }
    });
  }
  incrementValue(field: string): void {
    if (this.selectedPlayer && typeof this.selectedPlayer[field] === 'number') {
      this.selectedPlayer[field]++;
    }
  }

  decrementValue(field: string): void {
    if (this.selectedPlayer && typeof this.selectedPlayer[field] === 'number') {
      this.selectedPlayer[field] = Math.max(0, this.selectedPlayer[field] - 1); // Prevent negative values
    }
  }

  confirmFinishMatch(): void {
    if (confirm("Are you sure you want to finish this match? This action cannot be undone.")) {
      this.finishMatch();
    }
  }

  finishMatch(): void {
    const updateData = { status: 'finished' }; // Prepare the update data

    this.apiService.updateMatch(this.matchId, updateData).subscribe({
      next: (data) => {
        this.showNotification('Match finished successfully!', 'success');
        // Optionally, navigate away or refresh the data
        this.router.navigate(['/']); // Navigate back to the match list
      },
      error: (error) => {
        this.showNotification('Error finishing match. Please try again.', 'error');
        console.error('Error finishing match:', error);
      }
    });
  }
  goBack(): void {
    this.router.navigate(['/']);
  }
}