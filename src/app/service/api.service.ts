import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { CookieService } from 'ngx-cookie-service'; // Import CookieService

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseApiUrl = 'https://admin.thebegames.com/apis/v1';
  private apiUrl = 'https://admin.thebegames.com/apis/v1/sports-app';
  // private baseApiUrl = 'http://localhost:8000/apis/v1';
  // private apiUrl = 'http://localhost:8000/apis/v1/sports-app';
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
    const token = this.tokenSubject.value;
    if (token) {
      headers = headers.set('Authorization', `Token ${token}`);
    }
    return headers;
  }

  // (Rest of your API service methods)
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
    return this.http.get(`${this.apiUrl}/matches/?status=upcoming`, { headers: this.getHeaders() });
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
  getplayerlist(matchId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/players/?team=${matchId}`, { headers: this.getHeaders() });
  }
  updateplayer(data: any): Observable<any> {
    // const url = `${this.apiUrl}/player-stats/`;
    const url = `${this.apiUrl}/player-stats/custom_update/`;
    return this.http.put(url, data, { headers: this.getHeaders() });
  }

  // New method to get player stats
  getPlayerStats(match_id: number, team_id: number, player_id: number): Observable<any> {
    const url = `${this.apiUrl}/player-stats/get_or_create/`;
    console.log('Fetching player stats with:', match_id, team_id, player_id); // Add this
    let params = new HttpParams()
      .set('match_id', match_id.toString())
      .set('team_id', team_id.toString())
      .set('player_id', player_id.toString());

    return this.http.get(url, { params: params, headers: this.getHeaders() });
  }
}