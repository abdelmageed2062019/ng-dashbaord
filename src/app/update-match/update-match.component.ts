import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../service/api.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-update-match',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule],
  templateUrl: './update-match.component.html',
  styleUrls: ['./update-match.component.css']
})
export class UpdateMatchComponent implements OnInit {
  matchId!: number;
  matchForm!: FormGroup;
  teammatch1Form!: FormGroup;
  teammatch2Form!: FormGroup;
  notification: { message: string, type: 'success' | 'error' } | null = null;
  team1id!:number;
  team2id!:number;
  team1players!:any;
  team2players!:any;

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
    
    
  }
  getTeamPlayers(team1id:number, team2id:number): void {  
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

  private loadMatchData(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('matchId');
      if (id) {
        this.matchId = +id;
        this.apiService.getMatchDetails(this.matchId).subscribe({
          next: (data) => {
            this.patchFormValues(data);
            this.team1id = data.matchteams[0].id;
            this.team2id = data.matchteams[1].id;
            this.getTeamPlayers(data.matchteams[0].team.id,data.matchteams[1].team.id);
            // console.log('Match details:', data);
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
      yellow_cards: data.yellow_cards
    });
    this.teammatch1Form.patchValue({
      yellow_cards: data.matchteams[0].yellow_cards,
      red_cards: data.matchteams[0].red_cards
    });
    this.teammatch2Form.patchValue({
      yellow_cards: data.matchteams[1].yellow_cards,
      red_cards: data.matchteams[1].red_cards
    });
  }

  onSubmit(): void {
    if (this.matchForm.valid) {
      this.apiService.updateMatch(this.matchId, this.matchForm.value).subscribe({
        next: (data) => {
          this.apiService.updateMatchTeam(this.team1id, this.teammatch1Form.value).subscribe({});
          this.apiService.updateMatchTeam(this.team2id, this.teammatch2Form.value).subscribe({});
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
    setTimeout(() => this.notification = null, 5000); // Clear after 5 seconds
  }
  updateCards(playerId: number, redCards: number, yellowCards: number, teamId: number): void {
    
    // alert('playerId: ' + playerId + ' teamId: ' + teamId);
    // alert('yellowCards: ' + yellowCards + ' redCards: ' + redCards);
    // if (redCards === null || yellowCards === null) {
    //   alert('Please enter valid numbers for both red and yellow cards');
    //   return;
    // }

    const updatePayload = {
      
      red_cards: 0,
      yellow_cards: 0,
      match: this.matchId, // Provide actual match ID if necessary
      team: teamId, // Provide actual team ID if necessary
      player: playerId,
    };
    this.apiService.updateplayer(updatePayload).subscribe({
      next: (data) => {
        this.showNotification('Player cards updated successfully!', 'success');
      },
      error: (error) => {
        this.showNotification('Error updating player cards. Please try again.', 'error');
        console.error('Error updating player cards:', error);
      }
    });

    
  }

  get score_team1() { return this.matchForm.get('score_team1')!; }
  get score_team2() { return this.matchForm.get('score_team2')!; }
  get status() { return this.matchForm.get('status')!; }
  get yellow_cards() { return this.matchForm.get('yellow_cards')!; }
  get red_cards() { return this.matchForm.get('yellow_cards')!; }
}