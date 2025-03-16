import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'https://admin.thebegames.com/apis/v1/sports-app';
  // private apiUrl = 'http://localhost:8000/apis/v1/sports-app';
  private authToken = "68dc9ccc69df375db9083d58a169d73dbcb5bd07";

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

  getMatchDetails(matchId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/matches/${matchId}/`);
  }

  updateMatch(matchId: number, matchDaata: any): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      // 'Authorization': `Token ${this.authToken}`
    });

    return this.http.patch(url, matchDaata, { headers });
  }
  updateMatchTeam(matchId: number, matchDaata: any): Observable<any> {
    const url = `${this.apiUrl}/match-teams/${matchId}/`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      // 'Authorization': `Token ${this.authToken}`
    });

    return this.http.patch(url, matchDaata, { headers });
  }
  getplayerlist(matchId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/players/?team=${matchId}`);
  }
  updateplayer(data: any): Observable<any> {
    // const url = `${this.apiUrl}/player-stats/`;
    const url = `${this.apiUrl}/player-stats/custom_update/`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      // 'Authorization': `Token ${this.authToken}`
    });

    return this.http.put(url, data, { headers });
  }

  // New method to get player stats
  getPlayerStats(match_id: number, team_id: number, player_id: number): Observable<any> {
    const url = `${this.apiUrl}/player-stats/get_or_create/`;
    console.log('Fetching player stats with:', match_id, team_id, player_id); // Add this
    let params = new HttpParams()
      .set('match_id', match_id.toString())
      .set('team_id', team_id.toString())
      .set('player_id', player_id.toString());

    return this.http.get(url, { params: params });
  }
}
