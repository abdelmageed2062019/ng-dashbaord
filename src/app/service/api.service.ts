import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'https://admin.thebegames.com/apis/v1/sports-app';

  constructor(private http: HttpClient) { }

  getMatchList(params?: {
    league?: number,
    start_date?: string,
    status?: 'finished' | 'live' | 'postponed' | 'upcoming'
  }): Observable<any> {
    let httpParams = new HttpParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.append(key, value.toString());
        }
      });
    }

    return this.http.get(`${this.apiUrl}/matches`, { params: httpParams });
  }

  getLiveMatches(league?: number, start_date?: string): Observable<any> {
    return this.getMatchList({
      status: 'live',
      league,
      start_date
    });
  }

  updateMatchScore(matchId: number, score: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/matches/${matchId}`, { score });
  }
}