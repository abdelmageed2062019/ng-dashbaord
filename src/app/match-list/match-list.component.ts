import { Component, OnInit } from '@angular/core';
import { ApiService } from '../service/api.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-match-list',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './match-list.component.html',
  styleUrls: ['./match-list.component.css']
})
export class MatchListComponent implements OnInit {
  matches: any[] = [];
  loading: boolean = true;

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.apiService.getMatchList().subscribe(
      data => {
        this.matches = data;
        this.loading = false;
      },
      error => {
        console.error('Error fetching match list:', error);
        this.loading = false;
      }
    );
  }
}
