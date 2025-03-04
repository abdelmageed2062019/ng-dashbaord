import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'https://admin.thebegames.com/apis/v1/sports-app';
  constructor(private http: HttpClient) { }
  getMatchList(): Observable<any> {
    return this.http.get(`${this.apiUrl}/matches`);
  }

  updateMatchScore(matchId: number, score: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/matches/${matchId}`, { score });
  }
}
