import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { CookieService } from 'ngx-cookie-service'; // Import CookieService
import { MatchPlayer, MatchTeam } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // private baseApiUrl = 'https://admin.thebegames.com/apis/v1';
  // private apiUrl = 'https://admin.thebegames.com/apis/v1/sports-app';
   private baseApiUrl = 'https://admin.thebegames.com/apis/v1';
   private apiUrl = 'https://admin.thebegames.com/apis/v1/sports-app';
  private tokenEndpoint = `${this.baseApiUrl}/auth/login/`;
  private tokenSubject = new BehaviorSubject<string | null>(null);
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient, private cookieService: CookieService) {
    // Restore token from cookie on service construction, if available
    const storedToken = this.cookieService.get('authToken');
    if (storedToken) {
      this.tokenSubject.next(storedToken);
    }
    // Fetch initial token (or refresh it)
    // this.getToken('newgiza', 'aA111111').subscribe();
    //window.location.href = '/login'; // Redirect to login page if token is not available
  }

  public getToken(username: string, password: string): Observable<any> {
    const body = { username: username, password: password };
    return this.http.post<any>(this.tokenEndpoint, body).pipe(
      tap(response => {
        const token = response.token;
        this.tokenSubject.next(token);
        // Set refresh token in HttpOnly, Secure cookie (if applicable)
        this.cookieService.set('authToken', response.refresh_token, { secure: true });
        localStorage.setItem('authToken', response.token);
        console.log('Token fetched successfully:', token);
      })
    );
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    //const token = this.tokenSubject.value;
    const token = localStorage.getItem('authToken'); // Use localStorage to get the token
    if (token) {
      headers = headers.set('Authorization', `Token ${token}`);
    }
    return headers;
  }

  // (Rest of your API service methods)
  getMatchList(params?: {
    league?: number,
    start_date?: string,
    status?: 'finished' | 'live' | 'postponed' | 'upcoming',
    sport?: number | string
  }): Observable<any> {
    let httpParams = new HttpParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.append(key, value.toString());
        }
      });
    }

    return this.http.get(`${this.apiUrl}/matches`, { params: httpParams, headers: this.getHeaders() });
  }

  getLiveMatches(league?: number, start_date?: string): Observable<any> {
    return this.getMatchList({
      status: 'live',
      league,
      start_date
    });
  }
  get_halftime_live_matches(): Observable<any> {
    return this.http.get(`${this.apiUrl}/matches/?status=halftime&status=live&status=penalties`, { headers: this.getHeaders() });
  }
  get_upcoming_matches(): Observable<any> {
    return this.http.get(`${this.apiUrl}/matches/?sport=1&status=upcoming`, { headers: this.getHeaders() });
  }

  getMatchDetails(matchId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/matches/${matchId}/`, { headers: this.getHeaders() });
  }

  updateMatch(matchId: number, matchDaata: any): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/`;
    return this.http.patch(url, matchDaata, { headers: this.getHeaders() });
  }
  updateMatchTeam(matchId: number, matchDaata: any): Observable<any> {
    const url = `${this.apiUrl}/match-teams/${matchId}/`;
    return this.http.patch(url, matchDaata, { headers: this.getHeaders() });
  }

  getLiveClock(endpoint: string): Observable<any> {
    return this.http.get(`${this.apiUrl}${endpoint}`, { headers: this.getHeaders() });
  }

  postClock(endpoint: string, body: any): Observable<any> {
    return this.http.post(`${this.apiUrl}${endpoint}`, body, { headers: this.getHeaders() });
  }

  // Clock Management API Methods
  initializeClock(matchId: number, clockConfig: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/matches/${matchId}/clock/initialize/`, clockConfig, { headers: this.getHeaders() });
  }

  startClock(matchId: number, data?: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/matches/${matchId}/clock/start/`, data || {}, { headers: this.getHeaders() });
  }

  stopClock(matchId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/matches/${matchId}/clock/stop/`, {}, { headers: this.getHeaders() });
  }

  pauseClock(matchId: number, reason?: string): Observable<any> {
    const data = reason ? { reason } : {};
    return this.http.post(`${this.apiUrl}/matches/${matchId}/clock/pause/`, data, { headers: this.getHeaders() });
  }

  resumeClock(matchId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/matches/${matchId}/clock/resume/`, {}, { headers: this.getHeaders() });
  }

  callTimeout(matchId: number, timeoutData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/matches/${matchId}/clock/timeout/`, timeoutData, { headers: this.getHeaders() });
  }

  endTimeout(matchId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/matches/${matchId}/clock/end_timeout/`, {}, { headers: this.getHeaders() });
  }

  advancePeriod(matchId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/matches/${matchId}/clock/advance_period/`, {}, { headers: this.getHeaders() });
  }

  resetShotClock(matchId: number, teamId?: number): Observable<any> {
    const data = teamId ? { team_id: teamId } : {};
    return this.http.post(`${this.apiUrl}/matches/${matchId}/clock/reset_shot_clock/`, data, { headers: this.getHeaders() });
  }

  startRoutineTimer(matchId: number, playerId: number, apparatus: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/matches/${matchId}/clock/start_routine/`, { 
      player_id: playerId, 
      apparatus 
    }, { headers: this.getHeaders() });
  }

  stopRoutineTimer(matchId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/matches/${matchId}/clock/stop_routine/`, {}, { headers: this.getHeaders() });
  }

  startExclusionTimer(matchId: number, playerId: number, teamId: number, duration?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/matches/${matchId}/clock/start_exclusion/`, { 
      player_id: playerId, 
      team_id: teamId,
      duration: duration || "00:02:00"
    }, { headers: this.getHeaders() });
  }

  addInjuryTime(matchId: number, duration: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/matches/${matchId}/clock/add_injury_time/`, { 
      duration 
    }, { headers: this.getHeaders() });
  }

  // Missing methods to fix compilation errors
  GetSports(): Observable<any> {
    return this.http.get(`${this.apiUrl}/sports/`, { headers: this.getHeaders() });
  }

  getplayerlist(teamId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/teams/${teamId}/players/`, { headers: this.getHeaders() });
  }

  getPlayerStats(matchId: number, teamId: number, playerId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/matches/${matchId}/teams/${teamId}/players/${playerId}/stats/`, { headers: this.getHeaders() });
  }

  updateplayer(payload: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/players/update/`, payload, { headers: this.getHeaders() });
  }

  // Match Data Management API methods following the comprehensive report
  getTeams(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.append(key, value.toString());
        }
      });
    }
    return this.http.get(`${this.apiUrl}/teams/`, { params: httpParams, headers: this.getHeaders() });
  }

  getPlayers(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.append(key, value.toString());
        }
      });
    }
    return this.http.get(`${this.apiUrl}/players/`, { params: httpParams, headers: this.getHeaders() });
  }

  getMatchTeams(matchId: number): Observable<MatchTeam[]> {
    let httpParams = new HttpParams().append('match', matchId.toString());
    return this.http.get<MatchTeam[]>(`${this.apiUrl}/match-teams/`, { params: httpParams, headers: this.getHeaders() });
  }

  getMatchPlayers(matchId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/matches/${matchId}/players/`, { headers: this.getHeaders() });
  }

  // Custom player statistics update endpoint
  customUpdatePlayerStats(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/player-stats/custom_update/`, data, { headers: this.getHeaders() });
  }

  // Live scoring data
  getLiveScoring(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.append(key, value.toString());
        }
      });
    }
    return this.http.get(`${this.apiUrl}/player-stats/live_scoring/`, { params: httpParams, headers: this.getHeaders() });
  }

  // Player statistics CRUD
  getPlayerStatistics(matchId: number, playerId?: number): Observable<any> {
    let httpParams = new HttpParams().append('match', matchId.toString());
    if (playerId) {
      httpParams = httpParams.append('player', playerId.toString());
    }
    return this.http.get(`${this.apiUrl}/player-stats/`, { params: httpParams, headers: this.getHeaders() });
  }

  createPlayerStats(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/player-stats/`, data, { headers: this.getHeaders() });
  }

  updatePlayerStats(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/player-stats/${id}/`, data, { headers: this.getHeaders() });
  }

  // Team management
  getTeam(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/teams/${id}/`, { headers: this.getHeaders() });
  }

  getPlayer(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/players/${id}/`, { headers: this.getHeaders() });
  }

  // Get match player information
  getMatchPlayersInfo(matchId: number): Observable<MatchPlayer[]> {
    let httpParams = new HttpParams().append('match', matchId.toString());
    return this.http.get<MatchPlayer[]>(`${this.apiUrl}/match-players/`, { params: httpParams, headers: this.getHeaders() });
  }
}