import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { CookieService } from 'ngx-cookie-service'; // Import CookieService

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // private baseApiUrl = 'https://admin.thebegames.com/apis/v1';
  // private apiUrl = 'https://admin.thebegames.com/apis/v1/sports-app';
   private baseApiUrl = 'http://127.0.0.1:8000/apis/v1';
   private apiUrl = 'http://127.0.0.1:8000/apis/v1/sports-app';
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

  // ============================================================================
  // 🤸‍♀️ COMPREHENSIVE GYMNASTICS API METHODS 
  // Based on Gymnastics API Test Suite Requirements
  // ============================================================================

  // 1. CHAMPIONSHIP SETUP METHODS
  createSport(sportData: any): Observable<any> {
    const url = `${this.apiUrl}/sports/`;
    console.log('Creating sport:', sportData);
    return this.http.post(url, sportData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Sport created successfully:', response))
    );
  }

  getSports(): Observable<any> {
    return this.http.get(`${this.apiUrl}/sports/`, { headers: this.getHeaders() });
  }

  createVenue(venueData: any): Observable<any> {
    const url = `${this.apiUrl}/venues/`;
    console.log('Creating venue:', venueData);
    return this.http.post(url, venueData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Venue created successfully:', response))
    );
  }

  getVenues(): Observable<any> {
    return this.http.get(`${this.apiUrl}/venues/`, { headers: this.getHeaders() });
  }

  createLeague(leagueData: any): Observable<any> {
    const url = `${this.apiUrl}/leagues/`;
    console.log('Creating league:', leagueData);
    return this.http.post(url, leagueData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('League created successfully:', response))
    );
  }

  getLeagues(): Observable<any> {
    return this.http.get(`${this.apiUrl}/leagues/`, { headers: this.getHeaders() });
  }

  // 2. TEAM AND PLAYER MANAGEMENT METHODS
  createTeam(teamData: any): Observable<any> {
    const url = `${this.apiUrl}/teams/`;
    console.log('Creating team:', teamData);
    return this.http.post(url, teamData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Team created successfully:', response))
    );
  }

  getTeams(sportId?: number): Observable<any> {
    let url = `${this.apiUrl}/teams/`;
    if (sportId) {
      url += `?sport=${sportId}`;
    }
    return this.http.get(url, { headers: this.getHeaders() });
  }

  createPlayer(playerData: any): Observable<any> {
    const url = `${this.apiUrl}/players/`;
    console.log('Creating player:', playerData);
    return this.http.post(url, playerData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Player created successfully:', response))
    );
  }

  getPlayers(teamId?: number): Observable<any> {
    let url = `${this.apiUrl}/players/`;
    if (teamId) {
      url += `?team=${teamId}`;
    }
    return this.http.get(url, { headers: this.getHeaders() });
  }

  // 3. MATCH MANAGEMENT METHODS
  createMatch(matchData: any): Observable<any> {
    const url = `${this.apiUrl}/matches/`;
    console.log('Creating match:', matchData);
    return this.http.post(url, matchData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Match created successfully:', response))
    );
  }

  createMatchTeam(matchTeamData: any): Observable<any> {
    const url = `${this.apiUrl}/match-teams/`;
    console.log('Creating match team:', matchTeamData);
    return this.http.post(url, matchTeamData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Match team created successfully:', response))
    );
  }

  getMatchTeams(matchId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/match-teams/?match=${matchId}`, { headers: this.getHeaders() });
  }

  // 4. COMPREHENSIVE CLOCK MANAGEMENT METHODS
  initializeGymnasticsCompetitionClock(matchId: number, competitionData?: any): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/initialize/`;
    console.log('Initializing gymnastics competition clock:', matchId);
    return this.http.post(url, competitionData || {}, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Gymnastics competition clock initialized:', response))
    );
  }

  startGymnasticsClock(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/start/`;
    console.log('Starting gymnastics clock:', matchId);
    return this.http.post(url, {}, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Gymnastics clock started:', response))
    );
  }

  pauseGymnasticsClock(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/pause/`;
    console.log('Pausing gymnastics clock:', matchId);
    return this.http.post(url, {}, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Gymnastics clock paused:', response))
    );
  }

  resumeGymnasticsClock(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/resume/`;
    console.log('Resuming gymnastics clock:', matchId);
    return this.http.post(url, {}, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Gymnastics clock resumed:', response))
    );
  }

  resetGymnasticsClock(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/reset/`;
    console.log('Resetting gymnastics clock:', matchId);
    return this.http.post(url, {}, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Gymnastics clock reset:', response))
    );
  }

  getGymnasticsClockStatus(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/`;
    return this.http.get(url, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Clock status retrieved:', response))
    );
  }

  // 5. ROUTINE AND TIMING METHODS
  startRoutineTimer(matchId: number, routineData: { player_id: number, apparatus: string }): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/start_routine/`;
    console.log('Starting routine timer:', routineData);
    return this.http.post(url, routineData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Routine timer started:', response))
    );
  }

  stopRoutineTimer(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/stop_routine/`;
    console.log('Stopping routine timer for match:', matchId);
    return this.http.post(url, {}, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Routine timer stopped:', response))
    );
  }

  callTimeout(matchId: number, timeoutData: { team_id: number, duration: string }): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/timeout/`;
    console.log('Calling timeout:', timeoutData);
    return this.http.post(url, timeoutData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Timeout called:', response))
    );
  }

  endTimeout(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/end_timeout/`;
    console.log('Ending timeout for match:', matchId);
    return this.http.post(url, {}, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Timeout ended:', response))
    );
  }

  advancePeriod(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/advance_period/`;
    console.log('Advancing period for match:', matchId);
    return this.http.post(url, {}, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Period advanced:', response))
    );
  }

  advanceApparatusRotation(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/advance_rotation/`;
    console.log('Advancing apparatus rotation for match:', matchId);
    return this.http.post(url, {}, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Apparatus rotation advanced:', response))
    );
  }

  // 6. ENHANCED PLAYER STATS AND SCORING METHODS
  createPlayerStats(statsData: any): Observable<any> {
    const url = `${this.apiUrl}/player-stats/`;
    console.log('Creating player stats:', statsData);
    return this.http.post(url, statsData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Player stats created:', response))
    );
  }

  updatePlayerStats(statsData: any): Observable<any> {
    const url = `${this.apiUrl}/player-stats/custom_update/`;
    console.log('Updating player stats:', statsData);
    return this.http.put(url, statsData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Player stats updated:', response))
    );
  }

  getPlayerStatsByMatch(matchId: number, teamId?: number): Observable<any> {
    let url = `${this.apiUrl}/player-stats/?match_id=${matchId}`;
    if (teamId) {
      url += `&team_id=${teamId}`;
    }
    return this.http.get(url, { headers: this.getHeaders() });
  }

  getLiveScoringData(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/player-stats/live_scoring/?match_id=${matchId}`;
    return this.http.get(url, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Live scoring data retrieved:', response))
    );
  }

  // 7. APPARATUS FINALS AND SPECIALIZED COMPETITION METHODS
  createApparatusFinal(finalData: any): Observable<any> {
    const url = `${this.apiUrl}/matches/`;
    const apparatusFinalData = {
      ...finalData,
      competition_format: 'apparatus_final',
      scoring_system: 'new_code'
    };
    console.log('Creating apparatus final:', apparatusFinalData);
    return this.http.post(url, apparatusFinalData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Apparatus final created:', response))
    );
  }

  submitApparatusFinalScore(scoreData: any): Observable<any> {
    const url = `${this.apiUrl}/player-stats/`;
    console.log('Submitting apparatus final score:', scoreData);
    return this.http.post(url, scoreData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Apparatus final score submitted:', response))
    );
  }

  // 8. RANKINGS AND RESULTS METHODS
  getGymnasticsRankings(matchId: number, competitionType?: string): Observable<any> {
    let url = `${this.apiUrl}/gymnastics/rankings/?match=${matchId}`;
    if (competitionType) {
      url += `&type=${competitionType}`;
    }
    return this.http.get(url, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Gymnastics rankings retrieved:', response))
    );
  }

  getApparatusRankings(matchId: number, apparatus: string): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/apparatus-rankings/?match=${matchId}&apparatus=${apparatus}`;
    return this.http.get(url, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Apparatus rankings retrieved:', response))
    );
  }

  calculateAllAroundScores(matchId: number, gymnastId?: number): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/calculate-all-around/`;
    const data = gymnastId ? { match: matchId, gymnast: gymnastId } : { match: matchId };
    return this.http.post(url, data, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('All-around scores calculated:', response))
    );
  }

  finalizeGymnasticsResults(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/finalize-results/`;
    console.log('Finalizing gymnastics results for match:', matchId);
    return this.http.post(url, { match: matchId }, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Gymnastics results finalized:', response))
    );
  }

  // 9. SESSION AND SUBDIVISION MANAGEMENT
  createGymnasticsSession(sessionData: any): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/sessions/`;
    console.log('Creating gymnastics session:', sessionData);
    return this.http.post(url, sessionData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Gymnastics session created:', response))
    );
  }

  getGymnasticsSessions(matchId?: number): Observable<any> {
    let url = `${this.apiUrl}/gymnastics/sessions/`;
    if (matchId) {
      url += `?match=${matchId}`;
    }
    return this.http.get(url, { headers: this.getHeaders() });
  }

  updateGymnasticsSession(sessionId: number, sessionData: any): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/sessions/${sessionId}/`;
    return this.http.patch(url, sessionData, { headers: this.getHeaders() });
  }

  // 10. ROTATION MANAGEMENT METHODS
  createGymnasticsRotation(rotationData: any): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/rotations/`;
    console.log('Creating gymnastics rotation:', rotationData);
    return this.http.post(url, rotationData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Gymnastics rotation created:', response))
    );
  }

  getGymnasticsRotations(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/rotations/?match=${matchId}`;
    return this.http.get(url, { headers: this.getHeaders() });
  }

  updateGymnasticsRotation(rotationId: number, rotationData: any): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/rotations/${rotationId}/`;
    return this.http.patch(url, rotationData, { headers: this.getHeaders() });
  }

  deleteGymnasticsRotation(rotationId: number): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/rotations/${rotationId}/`;
    return this.http.delete(url, { headers: this.getHeaders() });
  }

  // 11. JUDGE PANEL MANAGEMENT METHODS
  setupJudgePanels(matchId: number, panelData: any): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/judge-panels/`;
    const data = { match: matchId, ...panelData };
    console.log('Setting up judge panels:', data);
    return this.http.post(url, data, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Judge panels set up:', response))
    );
  }

  getJudgePanels(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/judge-panels/?match=${matchId}`;
    return this.http.get(url, { headers: this.getHeaders() });
  }

  assignJudgeToPanel(judgeData: any): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/judge-assignments/`;
    console.log('Assigning judge to panel:', judgeData);
    return this.http.post(url, judgeData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Judge assigned to panel:', response))
    );
  }

  removeJudgeFromPanel(assignmentId: number): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/judge-assignments/${assignmentId}/`;
    return this.http.delete(url, { headers: this.getHeaders() });
  }

  // 12. EXPORT AND REPORTING METHODS
  exportGymnasticsResults(matchId: number, format: 'pdf' | 'excel' | 'csv'): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/export-results/${matchId}/?format=${format}`;
    console.log('Exporting gymnastics results:', { matchId, format });
    return this.http.get(url, { 
      headers: this.getHeaders(),
      responseType: 'blob'
    }).pipe(
      tap(response => console.log('Gymnastics results exported:', response))
    );
  }

  generateCompetitionReport(matchId: number, reportType: string): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/reports/`;
    const data = { match: matchId, report_type: reportType };
    return this.http.post(url, data, { headers: this.getHeaders() });
  }

  // 13. REAL-TIME MONITORING METHODS
  getCompetitionStatus(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/`;
    return this.http.get(url, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Competition status retrieved:', response))
    );
  }

  getOverallCompetitionData(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/competition-data/${matchId}/`;
    return this.http.get(url, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Overall competition data retrieved:', response))
    );
  }

  // 14. ERROR HANDLING AND VALIDATION METHODS
  validateCompetitionSetup(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/validate-setup/${matchId}/`;
    return this.http.get(url, { headers: this.getHeaders() });
  }

  checkDataIntegrity(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/check-integrity/${matchId}/`;
    return this.http.get(url, { headers: this.getHeaders() });
  }

  // ============================================================================
  // LEGACY METHODS (keeping for backward compatibility)
  // ============================================================================

  // Keep existing gymnastics methods for backward compatibility
  initializeGymnasticsCompetition(competitionData: any): Observable<any> {
    const matchId = competitionData.match || competitionData.matchId;
    return this.initializeGymnasticsCompetitionClock(matchId, competitionData);
  }

  stopGymnasticsClock(matchId: number): Observable<any> {
    return this.pauseGymnasticsClock(matchId);
  }

  submitGymnasticsScore(scoreData: any): Observable<any> {
    return this.createPlayerStats(scoreData);
  }

  updateGymnasticsScore(scoreId: number, scoreData: any): Observable<any> {
    const url = `${this.apiUrl}/player-stats/${scoreId}/`;
    return this.http.patch(url, scoreData, { headers: this.getHeaders() });
  }

  getGymnasticsScores(matchId: number, apparatus?: string): Observable<any> {
    let url = `${this.apiUrl}/player-stats/?match_id=${matchId}`;
    if (apparatus) {
      url += `&apparatus=${apparatus}`;
    }
    return this.http.get(url, { headers: this.getHeaders() });
  }

  // Legacy methods for existing functionality
  GetSports(): Observable<any> {
    return this.getSports();
  }

  getplayerlist(teamId: number): Observable<any> {
    return this.getPlayers(teamId);
  }

  updateplayer(data: any): Observable<any> {
    return this.updatePlayerStats(data);
  }

  updateplayerPost(data: any): Observable<any> {
    const url = `${this.apiUrl}/player-stats/custom_update/`;
    return this.http.post(url, data, { headers: this.getHeaders() });
  }

  updateplayerPatch(data: any): Observable<any> {
    const url = `${this.apiUrl}/player-stats/custom_update/`;
    return this.http.patch(url, data, { headers: this.getHeaders() });
  }
}