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
  startRoutineTimer(matchId: number, routineData: { player_id: number, apparatus: string, routine_duration?: number }): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/start_routine/`;
    console.log('Starting routine timer:', routineData);
    return this.http.post(url, routineData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Routine timer started:', response))
    );
  }

  stopRoutineTimer(matchId: number, playerData?: { player_id: number }): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/stop_routine/`;
    console.log('Stopping routine timer for match:', matchId);
    return this.http.post(url, playerData || {}, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Routine timer stopped:', response))
    );
  }

  // 6. TIMEOUT MANAGEMENT METHODS
  callTimeout(matchId: number, timeoutData: { team_id: number, duration: string, reason: string }): Observable<any> {
    const url = `${this.apiUrl}matches/${matchId}/clock/timeout/`;
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

  // 7. PERIOD AND APPARATUS ADVANCEMENT METHODS
  advancePeriod(matchId: number, periodData: { next_period: number, apparatus: string }): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/advance_period/`;
    console.log('Advancing period for match:', matchId, periodData);
    return this.http.post(url, periodData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Period advanced:', response))
    );
  }

  // Enhanced gymnastics methods with reason parameter
  pauseGymnasticsClockWithReason(matchId: number, pauseData: { reason: string }): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/pause/`;
    console.log('Pausing gymnastics clock with reason:', matchId, pauseData);
    return this.http.post(url, pauseData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Gymnastics clock paused:', response))
    );
  }

  // Gymnastics Routine Management
  startGymnasticsRoutine(matchId: number, routineData: { player_id: number, apparatus: string, routine_duration?: number }): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/start_routine/`;
    console.log('Starting gymnastics routine:', routineData);
    return this.http.post(url, routineData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Gymnastics routine started:', response))
    );
  }

  stopGymnasticsRoutine(matchId: number, routineData: { player_id: number }): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/stop_routine/`;
    console.log('Stopping gymnastics routine:', routineData);
    return this.http.post(url, routineData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Gymnastics routine stopped:', response))
    );
  }

  // Gymnastics Rotation Management using advance_period
  advanceGymnasticsRotation(matchId: number, rotationData: { next_apparatus: string, rotation_duration?: number }): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/advance_period/`;
    const periodData = {
      next_period: rotationData.rotation_duration ? Math.ceil(rotationData.rotation_duration / 60) : 1,
      apparatus: rotationData.next_apparatus
    };
    console.log('Advancing gymnastics rotation:', matchId, periodData);
    return this.http.post(url, periodData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Gymnastics rotation advanced:', response))
    );
  }

  // Gymnastics Timeout Management
  callGymnasticsTimeout(matchId: number, timeoutData: { team_id: number, duration: string, reason: string }): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/timeout/`;
    console.log('Calling gymnastics timeout:', timeoutData);
    return this.http.post(url, timeoutData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Gymnastics timeout called:', response))
    );
  }

  // ============================================================================
  // 🏀 BASKETBALL MANAGEMENT METHODS
  // ============================================================================

  // Basketball Clock Management
  initializeBasketballClock(matchId: number, clockData?: any): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/initialize/`;
    const basketballClockConfig = {
      match_format: 'basketball',
      total_periods: 4,
      period_duration: 720, // 12 minutes in seconds
      overtime_duration: 300, // 5 minutes in seconds
      shot_clock_duration: 24,
      ...clockData
    };
    console.log('Initializing basketball clock:', matchId, basketballClockConfig);
    return this.http.post(url, basketballClockConfig, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Basketball clock initialized:', response))
    );
  }

  startBasketballClock(matchId: number, period?: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/start/`;
    const data = period ? { period } : {};
    console.log('Starting basketball clock:', matchId);
    return this.http.post(url, data, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Basketball clock started:', response))
    );
  }

  stopBasketballClock(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/stop/`;
    console.log('Stopping basketball clock:', matchId);
    return this.http.post(url, {}, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Basketball clock stopped:', response))
    );
  }

  pauseBasketballClock(matchId: number, reason?: string): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/pause/`;
    const data = { reason: reason || 'quarter_break' };
    console.log('Pausing basketball clock:', matchId);
    return this.http.post(url, data, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Basketball clock paused:', response))
    );
  }

  resumeBasketballClock(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/resume/`;
    console.log('Resuming basketball clock:', matchId);
    return this.http.post(url, {}, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Basketball clock resumed:', response))
    );
  }

  getBasketballClockStatus(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/`;
    return this.http.get(url, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Basketball clock status retrieved:', response))
    );
  }

  // Basketball Quarter Management
  advanceQuarter(matchId: number, nextQuarter: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/advance_period/`;
    const data = { next_period: nextQuarter };
    console.log('Advancing to quarter:', nextQuarter);
    return this.http.post(url, data, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Quarter advanced:', response))
    );
  }

  // Basketball Shot Clock Management
  resetShotClock(matchId: number, shotClockDuration: number = 24): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/reset_shot_clock/`;
    const data = { shot_clock_duration: shotClockDuration };
    console.log('Resetting shot clock:', shotClockDuration);
    return this.http.post(url, data, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Shot clock reset:', response))
    );
  }

  getShotClockStatus(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/shot_clock/`;
    return this.http.get(url, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Shot clock status retrieved:', response))
    );
  }

  // Basketball Timeout Management
  callBasketballTimeout(matchId: number, timeoutData: { team_id: number, duration?: string, reason?: string }): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/timeout/`;
    const data = {
      team_id: timeoutData.team_id,
      duration: timeoutData.duration || '00:01:00',
      reason: timeoutData.reason || 'coach_strategy'
    };
    console.log('Calling basketball timeout:', data);
    return this.http.post(url, data, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Basketball timeout called:', response))
    );
  }

  endBasketballTimeout(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/end_timeout/`;
    console.log('Ending basketball timeout for match:', matchId);
    return this.http.post(url, {}, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Basketball timeout ended:', response))
    );
  }

  // Basketball Player Statistics
  updateBasketballPlayerStats(playerStatsData: any): Observable<any> {
    const url = `${this.apiUrl}/player-stats/custom_update/`;
    console.log('Updating basketball player stats:', playerStatsData);
    return this.http.put(url, playerStatsData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Basketball player stats updated:', response))
    );
  }

  getBasketballLiveScoring(matchId: number, teamId?: number, playerId?: number): Observable<any> {
    const url = `${this.apiUrl}/player-stats/live_scoring/`;
    let params = new HttpParams().set('match_id', matchId.toString());
    
    if (teamId) {
      params = params.set('team_id', teamId.toString());
    }
    if (playerId) {
      params = params.set('player_id', playerId.toString());
    }

    return this.http.get(url, { params, headers: this.getHeaders() }).pipe(
      tap(response => console.log('Basketball live scoring retrieved:', response))
    );
  }

  advanceApparatusRotation(matchId: number, rotationData: { next_apparatus: string, rotation_duration?: number }): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/advance_period/`;
    const periodData = {
      next_period: rotationData.rotation_duration ? Math.ceil(rotationData.rotation_duration / 60) : 1, // Convert seconds to period number
      apparatus: rotationData.next_apparatus
    };
    console.log('Advancing apparatus rotation for match:', matchId, periodData);
    return this.http.post(url, periodData, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Apparatus rotation advanced:', response))
    );
  }

  // 8. MATCH CONTROL METHODS
  stopMatch(matchId: number, reason?: string): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/stop/`;
    console.log('Stopping match:', matchId);
    return this.http.post(url, { reason: reason || 'match_completed' }, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Match stopped:', response))
    );
  }

  // 9. SCORING AND STATISTICS METHODS  
  getFinalScores(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/gymnastics/final-scores/?match_id=${matchId}`;
    return this.http.get(url, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Final scores retrieved:', response))
    );
  }

  getAllAroundRankings(matchId: number, options?: { limit?: number }): Observable<any> {
    let url = `${this.apiUrl}/gymnastics/all-around-rankings/?match_id=${matchId}`;
    if (options?.limit) {
      url += `&limit=${options.limit}`;
    }
    return this.http.get(url, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('All-around rankings retrieved:', response))
    );
  }

  getApparatusStats(matchId: number, apparatus?: string): Observable<any> {
    let url = `${this.apiUrl}/gymnastics/apparatus-stats/?match_id=${matchId}`;
    if (apparatus) {
      url += `&apparatus=${apparatus}`;
    }
    return this.http.get(url, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Apparatus statistics retrieved:', response))
    );
  }

  getLiveScoring(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/player-stats/live_scoring/?match_id=${matchId}`;
    return this.http.get(url, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Live scoring data retrieved:', response))
    );
  }

  // 10. ENHANCED PLAYER STATS AND SCORING METHODS
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

  // ============================================================================
  // 🏊 WATER POLO API METHODS
  // ============================================================================

  // Initialize Water Polo Clock
  initializeWaterPoloClock(matchId: number, clockData: any): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/initialize/`;
    return this.http.post(url, clockData, { headers: this.getHeaders() });
  }

  // Start Water Polo Match
  startWaterPoloMatch(matchId: number, startData: any): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/start/`;
    return this.http.post(url, startData, { headers: this.getHeaders() });
  }

  // Stop Water Polo Match
  stopWaterPoloMatch(matchId: number, stopData: any): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/stop/`;
    return this.http.post(url, stopData, { headers: this.getHeaders() });
  }

  // Pause Water Polo Match
  pauseWaterPoloMatch(matchId: number, pauseData: any): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/pause/`;
    return this.http.post(url, pauseData, { headers: this.getHeaders() });
  }

  // Resume Water Polo Match
  resumeWaterPoloMatch(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/resume/`;
    return this.http.post(url, {}, { headers: this.getHeaders() });
  }

  // Advance Water Polo Period
  advanceWaterPoloPeriod(matchId: number, periodData: any): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/advance_period/`;
    return this.http.post(url, periodData, { headers: this.getHeaders() });
  }

  // Start Water Polo Shot Clock
  startWaterPoloShotClock(matchId: number, shotClockData: any): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/start_shot_clock/`;
    return this.http.post(url, shotClockData, { headers: this.getHeaders() });
  }

  // Stop Water Polo Shot Clock
  stopWaterPoloShotClock(matchId: number, shotClockData: any): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/stop_shot_clock/`;
    return this.http.post(url, shotClockData, { headers: this.getHeaders() });
  }

  // Call Water Polo Timeout
  callWaterPoloTimeout(matchId: number, timeoutData: any): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/timeout/`;
    return this.http.post(url, timeoutData, { headers: this.getHeaders() });
  }

  // End Water Polo Timeout
  endWaterPoloTimeout(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/end_timeout/`;
    return this.http.post(url, {}, { headers: this.getHeaders() });
  }

  // Get Water Polo Clock Status
  getWaterPoloClockStatus(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/`;
    return this.http.get(url, { headers: this.getHeaders() });
  }

  // Update Water Polo Player Stats
  updateWaterPoloPlayerStats(statsData: any): Observable<any> {
    const url = `${this.apiUrl}/player-stats/custom_update/`;
    return this.http.put(url, statsData, { headers: this.getHeaders() });
  }

  // Get Water Polo Rankings
  getWaterPoloRankings(matchId: number, limit: number = 10): Observable<any> {
    const url = `${this.apiUrl}/water-polo/rankings/`;
    const params = new HttpParams()
      .set('match_id', matchId.toString())
      .set('limit', limit.toString());
    return this.http.get(url, { headers: this.getHeaders(), params });
  }

  // Get Water Polo Final Scores
  getWaterPoloFinalScores(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/water-polo/final-scores/`;
    const params = new HttpParams().set('match_id', matchId.toString());
    return this.http.get(url, { headers: this.getHeaders(), params });
  }

  // Get Water Polo Team Rankings
  getWaterPoloTeamRankings(matchId: number, limit: number = 5): Observable<any> {
    const url = `${this.apiUrl}/water-polo/team-rankings/`;
    const params = new HttpParams()
      .set('match_id', matchId.toString())
      .set('limit', limit.toString());
    return this.http.get(url, { headers: this.getHeaders(), params });
  }

  // Get Water Polo Player Stats
  getWaterPoloPlayerStats(matchId: number, category?: string): Observable<any> {
    const url = `${this.apiUrl}/water-polo/player-stats/`;
    let params = new HttpParams().set('match_id', matchId.toString());
    if (category) {
      params = params.set('category', category);
    }
    return this.http.get(url, { headers: this.getHeaders(), params });
  }

  // Get Water Polo Live Scoring Data
  getWaterPoloLiveScoring(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/player-stats/live_scoring/`;
    const params = new HttpParams().set('match_id', matchId.toString());
    return this.http.get(url, { headers: this.getHeaders(), params });
  }

  // Get Water Polo Match Players
  getWaterPoloMatchPlayers(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/players/`;
    const params = new HttpParams().set('match_id', matchId.toString());
    return this.http.get(url, { headers: this.getHeaders(), params });
  }


  // Get Clock Status
  getMatchClockStatus(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/`;
    return this.http.get(url, { headers: this.getHeaders() });
  }
  //initialize Football Clock
  initializeFootballClock(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/initialize/`;
    const footballClockConfig = {
      "match_format": "football",
      "total_periods": 2,
      "period_duration": 2700,
      "extra_time_duration": 900
    };
    console.log('Initializing football clock:', matchId, footballClockConfig);
    return this.http.post(url, footballClockConfig, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Football clock initialized:', response))
    );
  }
  startFootballClock(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/start/`;
    console.log('Starting football clock:', matchId);
    return this.http.post(url, {}, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Football clock started:', response))
    );
  }
  pauseFootballClock(matchId: number, reason?: string): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/pause/`;
    const data = { reason: reason || 'half_time' };
    console.log('Pausing football clock:', matchId);
    return this.http.post(url, data, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Football clock paused:', response))
    );
  }
  resumeFootballClock(matchId: number): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/resume/`;
    console.log('Resuming football clock:', matchId);
    return this.http.post(url, {}, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Football clock resumed:', response))
    );
  }
  stopFootballClock(matchId: number, reason?: string): Observable<any> {
    const url = `${this.apiUrl}/matches/${matchId}/clock/stop/`;
    const data = { reason: reason || 'match_completed' };
    console.log('Stopping football clock:', matchId);
    return this.http.post(url, data, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Football clock stopped:', response))
    );
  }
}