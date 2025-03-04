import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../service/api.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-update-match',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './update-match.component.html',
  styleUrl: './update-match.component.css'
})
export class UpdateMatchComponent implements OnInit {
  matchId!: number;
  matchData: any = {};

  constructor(private apiService: ApiService, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('matchId');
      if (id) {
        this.matchId = +id;
        this.getMatchDetails(this.matchId);
      }
    });
  }

  getMatchDetails(matchId: number): void {
    this.apiService.getMatchDetails(matchId).subscribe({
      next: (data) => {
        this.matchData = data;
      },
      error: (error) => {
        console.error('Error fetching match details:', error);
      }
    });
  }
}
