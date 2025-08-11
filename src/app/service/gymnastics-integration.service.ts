import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import Swal from 'sweetalert2';

/**
 * 🤸‍♀️ GYMNASTICS INTEGRATION SERVICE
 * 
 * This service implements all the test scenarios from the Python test suite
 * and provides high-level methods for gymnastics competition management.
 * Based on the comprehensive Gymnastics API Test Suite requirements.
 */
@Injectable({
  providedIn: 'root'
})
export class GymnasticsIntegrationService {

  constructor(private apiService: ApiService) {}

  /**
   * 🏆 Scenario 1: Championship Setup
   * Creates sport, venue, and league for gymnastics competition
   */
  setupChampionship(championshipData: {
    sportName: string;
    venueName: string;
    venueCapacity: number;
    leagueName: string;
    abbreviation: string;
    championshipType: string;
  }): Observable<any> {
    console.log('🏆 Setting up Gymnastics Championship...');

    // 1. Create Sport
    const sportData = {
      name: championshipData.sportName,
      is_team_sport: true,
      sport_config: {
        apparatus_list: [
          "floor_exercise", "pommel_horse", "still_rings", 
          "vault", "parallel_bars", "horizontal_bar"
        ],
        scoring_system: "new_code",
        routine_time_limit: 70
      }
    };

    return this.apiService.createSport(sportData).pipe(
      switchMap(sport => {
        console.log('✅ Sport created:', sport);
        
        // 2. Create Venue
        const venueData = {
          name: championshipData.venueName,
          sport: sport.id,
          capacity: championshipData.venueCapacity
        };

        return this.apiService.createVenue(venueData).pipe(
          switchMap(venue => {
            console.log('✅ Venue created:', venue);
            
            // 3. Create League
            const leagueData = {
              name: championshipData.leagueName,
              abbreviation: championshipData.abbreviation,
              sport: sport.id,
              championship_type: championshipData.championshipType,
              championship_config: {
                format: "team_competition",
                apparatus_rotation: true,
                team_size: 6,
                qualification_rounds: 2
              }
            };

            return this.apiService.createLeague(leagueData).pipe(
              map(league => {
                console.log('✅ League created:', league);
                return {
                  sport,
                  venue,
                  league,
                  message: 'Championship setup completed successfully!'
                };
              })
            );
          })
        );
      })
    );
  }

  /**
   * 👥 Scenario 2: Team Competition Management
   * Creates teams and gymnasts for competition
   */
  setupTeamCompetition(teamData: {
    sportId: number;
    teams: Array<{
      name: string;
      displayname: string;
      description: string;
      players: Array<{
        first_name: string;
        last_name: string;
        position: string;
        apparatus_specialty: string;
        competition_level: string;
      }>;
    }>;
  }): Observable<any> {
    console.log('👥 Setting up Team Competition...');

    const teamCreationObservables = teamData.teams.map(team => {
      // Create team
      const teamPayload = {
        name: team.name,
        displayname: team.displayname,
        sport: teamData.sportId,
        description: team.description
      };

      return this.apiService.createTeam(teamPayload).pipe(
        switchMap(createdTeam => {
          console.log('✅ Team created:', createdTeam);
          
          // Create players for this team
          const playerCreationObservables = team.players.map(player => {
            const playerPayload = {
              first_name: player.first_name,
              last_name: player.last_name,
              sport: teamData.sportId,
              team: createdTeam.id,
              position: player.position,
              apparatus_specialty: player.apparatus_specialty,
              competition_level: player.competition_level
            };

            return this.apiService.createPlayer(playerPayload).pipe(
              tap(createdPlayer => console.log('✅ Player created:', createdPlayer))
            );
          });

          return forkJoin(playerCreationObservables).pipe(
            map(players => ({
              team: createdTeam,
              players: players
            }))
          );
        })
      );
    });

    return forkJoin(teamCreationObservables).pipe(
      map(results => {
        console.log('✅ Team competition setup completed');
        return {
          teams: results,
          message: 'Team competition setup completed successfully!'
        };
      })
    );
  }

  /**
   * 🏟️ Scenario 3: Match Creation and Setup
   * Creates gymnastics match with proper configuration
   */
  createGymnasticsMatch(matchData: {
    leagueId: number;
    venueId: number;
    matchDate: string;
    competitionFormat: string;
    teamIds: number[];
  }): Observable<any> {
    console.log('🏟️ Creating Gymnastics Match...');

    // Create Match
    const matchPayload = {
      league: matchData.leagueId,
      match_date: matchData.matchDate,
      venue: matchData.venueId,
      competition_format: matchData.competitionFormat,
      scoring_system: "a",
      apparatus_events: [
        "floor_exercise", "pommel_horse", "still_rings", 
        "vault", "parallel_bars", "horizontal_bar"
      ]
    };

    return this.apiService.createMatch(matchPayload).pipe(
      switchMap(match => {
        console.log('✅ Match created:', match);
        
        // Create Match Teams
        const matchTeamObservables = matchData.teamIds.map(teamId => {
          const matchTeamPayload = {
            match: match.id,
            team: teamId,
            score: 0
          };
          return this.apiService.createMatchTeam(matchTeamPayload);
        });

        return forkJoin(matchTeamObservables).pipe(
          map(matchTeams => {
            console.log('✅ Match teams created:', matchTeams);
            return {
              match,
              matchTeams,
              message: 'Gymnastics match created successfully!'
            };
          })
        );
      })
    );
  }

  /**
   * ⏰ Scenario 4: Clock Management During Competition
   * Comprehensive clock and timing management
   */
  manageCompetitionClock(matchId: number): {
    initialize: () => Observable<any>;
    start: () => Observable<any>;
    pause: () => Observable<any>;
    resume: () => Observable<any>;
    reset: () => Observable<any>;
    getStatus: () => Observable<any>;
    startRoutine: (playerId: number, apparatus: string) => Observable<any>;
    stopRoutine: () => Observable<any>;
    callTimeout: (teamId: number, duration: string) => Observable<any>;
    endTimeout: () => Observable<any>;
    advanceRotation: () => Observable<any>;
  } {
    console.log('⏰ Setting up Clock Management for match:', matchId);

    return {
      initialize: () => {
        console.log('🔧 Initializing competition clock...');
        return this.apiService.initializeGymnasticsCompetitionClock(matchId).pipe(
          tap(result => console.log('✅ Clock initialized:', result))
        );
      },

      start: () => {
        console.log('▶️ Starting competition clock...');
        return this.apiService.startGymnasticsClock(matchId).pipe(
          tap(result => console.log('✅ Clock started:', result))
        );
      },

      pause: () => {
        console.log('⏸️ Pausing competition clock...');
        return this.apiService.pauseGymnasticsClock(matchId).pipe(
          tap(result => console.log('✅ Clock paused:', result))
        );
      },

      resume: () => {
        console.log('▶️ Resuming competition clock...');
        return this.apiService.resumeGymnasticsClock(matchId).pipe(
          tap(result => console.log('✅ Clock resumed:', result))
        );
      },

      reset: () => {
        console.log('🔄 Resetting competition clock...');
        return this.apiService.resetGymnasticsClock(matchId).pipe(
          tap(result => console.log('✅ Clock reset:', result))
        );
      },

      getStatus: () => {
        return this.apiService.getGymnasticsClockStatus(matchId).pipe(
          tap(status => console.log('📊 Clock status:', status))
        );
      },

      startRoutine: (playerId: number, apparatus: string) => {
        console.log('🤸‍♀️ Starting routine timer...');
        return this.apiService.startRoutineTimer(matchId, { player_id: playerId, apparatus }).pipe(
          tap(result => console.log('✅ Routine timer started:', result))
        );
      },

      stopRoutine: () => {
        console.log('🛑 Stopping routine timer...');
        return this.apiService.stopRoutineTimer(matchId).pipe(
          tap(result => console.log('✅ Routine timer stopped:', result))
        );
      },

      callTimeout: (teamId: number, duration: string) => {
        console.log('⏰ Calling timeout...');
        return this.apiService.callTimeout(matchId, { team_id: teamId, duration }).pipe(
          tap(result => console.log('✅ Timeout called:', result))
        );
      },

      endTimeout: () => {
        console.log('⏰ Ending timeout...');
        return this.apiService.endTimeout(matchId).pipe(
          tap(result => console.log('✅ Timeout ended:', result))
        );
      },

      advanceRotation: () => {
        console.log('🔄 Advancing apparatus rotation...');
        return this.apiService.advanceApparatusRotation(matchId).pipe(
          tap(result => console.log('✅ Rotation advanced:', result))
        );
      }
    };
  }

  /**
   * 📊 Scenario 5: Live Scoring During Competition
   * Handles real-time scoring and statistics
   */
  submitLiveScore(scoreData: {
    matchId: number;
    teamId: number;
    playerId: number;
    difficultyScore: number;
    executionScore: number;
    deductions: number;
    apparatus: string;
    routineDuration: number;
    fallCount?: number;
    landingQuality?: string;
  }): Observable<any> {
    console.log('📊 Submitting live gymnastics score...');

    const totalScore = scoreData.difficultyScore + scoreData.executionScore - scoreData.deductions;

    const statsData = {
      match: scoreData.matchId,
      team: scoreData.teamId,
      player: scoreData.playerId,
      difficulty_score: scoreData.difficultyScore,
      execution_score: scoreData.executionScore,
      total_score: totalScore,
      deductions: scoreData.deductions,
      fall_count: scoreData.fallCount || 0,
      routine_completion: true,
      apparatus_performed: scoreData.apparatus,
      routine_duration: scoreData.routineDuration,
      landing_quality: scoreData.landingQuality || 'good',
      apparatus_scores: {
        [scoreData.apparatus]: {
          difficulty: scoreData.difficultyScore,
          execution: scoreData.executionScore,
          total: totalScore,
          deductions: scoreData.deductions,
          landing: scoreData.landingQuality || 'good'
        }
      }
    };

    return this.apiService.createPlayerStats(statsData).pipe(
      tap(result => {
        console.log('✅ Live score submitted:', result);
        // Show success notification
        Swal.fire({
          icon: 'success',
          title: 'Score Submitted!',
          text: `Total Score: ${totalScore.toFixed(3)}`,
          timer: 2000,
          showConfirmButton: false
        });
      })
    );
  }

  /**
   * 🔄 Scenario 6: Real-Time UI Updates During Competition
   * Provides live data for UI updates
   */
  getRealTimeCompetitionData(matchId: number): {
    getLiveMatchStatus: () => Observable<any>;
    getAllPlayerStats: () => Observable<any>;
    getTeamStats: (teamId: number) => Observable<any>;
    getLiveScoring: () => Observable<any>;
    getClockStatus: () => Observable<any>;
    getCompetitionOverview: () => Observable<any>;
  } {
    return {
      getLiveMatchStatus: () => {
        console.log('📡 Getting live match status...');
        return this.apiService.getMatchDetails(matchId).pipe(
          tap(status => console.log('📊 Match status:', status))
        );
      },

      getAllPlayerStats: () => {
        console.log('📈 Getting all player stats...');
        return this.apiService.getPlayerStatsByMatch(matchId).pipe(
          tap(stats => console.log('📊 All player stats:', stats))
        );
      },

      getTeamStats: (teamId: number) => {
        console.log('👥 Getting team stats...');
        return this.apiService.getPlayerStatsByMatch(matchId, teamId).pipe(
          tap(stats => console.log('📊 Team stats:', stats))
        );
      },

      getLiveScoring: () => {
        console.log('⚡ Getting live scoring data...');
        return this.apiService.getLiveScoringData(matchId).pipe(
          tap(scoring => console.log('📊 Live scoring:', scoring))
        );
      },

      getClockStatus: () => {
        return this.apiService.getGymnasticsClockStatus(matchId).pipe(
          tap(clock => console.log('⏰ Clock status:', clock))
        );
      },

      getCompetitionOverview: () => {
        console.log('🏆 Getting competition overview...');
        return this.apiService.getOverallCompetitionData(matchId).pipe(
          tap(overview => console.log('📊 Competition overview:', overview))
        );
      }
    };
  }

  /**
   * 🥇 Scenario 7: Apparatus Finals Management
   * Handles apparatus-specific competitions
   */
  createApparatusFinals(finalsData: {
    leagueId: number;
    venueId: number;
    matchDate: string;
    apparatus: string[];
    qualifiedGymnasts: Array<{
      playerId: number;
      teamId?: number;
      qualificationScore: number;
    }>;
  }): Observable<any> {
    console.log('🥇 Creating Apparatus Finals...');

    const finalMatchData = {
      league: finalsData.leagueId,
      match_date: finalsData.matchDate,
      venue: finalsData.venueId,
      competition_format: 'apparatus_final',
      apparatus_events: finalsData.apparatus
    };

    return this.apiService.createApparatusFinal(finalMatchData).pipe(
      switchMap(finalMatch => {
        console.log('✅ Apparatus final match created:', finalMatch);
        
        // Create qualification records for each gymnast
        const qualificationObservables = finalsData.qualifiedGymnasts.map(gymnast => {
          const qualData = {
            match: finalMatch.id,
            player: gymnast.playerId,
            team: gymnast.teamId,
            total_score: gymnast.qualificationScore,
            apparatus_performed: finalsData.apparatus[0], // First apparatus
            qualification_score: gymnast.qualificationScore
          };
          
          return this.apiService.createPlayerStats(qualData);
        });

        return forkJoin(qualificationObservables).pipe(
          map(qualifications => ({
            finalMatch,
            qualifications,
            message: 'Apparatus finals created successfully!'
          }))
        );
      })
    );
  }

  /**
   * 🏅 Competition Results and Rankings
   * Handles final results, rankings, and exports
   */
  getCompetitionResults(matchId: number): {
    getRankings: (competitionType?: string) => Observable<any>;
    getApparatusRankings: (apparatus: string) => Observable<any>;
    calculateAllAround: (gymnastId?: number) => Observable<any>;
    finalizeResults: () => Observable<any>;
    exportResults: (format: 'pdf' | 'excel' | 'csv') => Observable<any>;
  } {
    return {
      getRankings: (competitionType?: string) => {
        console.log('🏆 Getting gymnastics rankings...');
        return this.apiService.getGymnasticsRankings(matchId, competitionType).pipe(
          tap(rankings => console.log('📊 Rankings:', rankings))
        );
      },

      getApparatusRankings: (apparatus: string) => {
        console.log(`🤸‍♀️ Getting ${apparatus} rankings...`);
        return this.apiService.getApparatusRankings(matchId, apparatus).pipe(
          tap(rankings => console.log('📊 Apparatus rankings:', rankings))
        );
      },

      calculateAllAround: (gymnastId?: number) => {
        console.log('🔄 Calculating all-around scores...');
        return this.apiService.calculateAllAroundScores(matchId, gymnastId).pipe(
          tap(scores => console.log('📊 All-around scores:', scores))
        );
      },

      finalizeResults: () => {
        console.log('🏁 Finalizing competition results...');
        return this.apiService.finalizeGymnasticsResults(matchId).pipe(
          tap(result => {
            console.log('✅ Results finalized:', result);
            Swal.fire({
              icon: 'success',
              title: 'Results Finalized!',
              text: 'Competition results have been officially finalized.',
              confirmButtonColor: '#198754'
            });
          })
        );
      },

      exportResults: (format: 'pdf' | 'excel' | 'csv') => {
        console.log(`📄 Exporting results as ${format}...`);
        return this.apiService.exportGymnasticsResults(matchId, format).pipe(
          tap(blob => {
            console.log('✅ Results exported:', blob);
            // Handle file download
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `gymnastics-results-${matchId}.${format}`;
            link.click();
            window.URL.revokeObjectURL(url);
          })
        );
      }
    };
  }

  /**
   * 🧪 Test Suite Integration
   * Runs all test scenarios from the Python test suite
   */
  runGymnasticsTestSuite(): Observable<any> {
    console.log('🧪 Running Gymnastics API Test Suite...');

    const testData = {
      sportName: 'Artistic Gymnastics Test',
      venueName: 'Olympic Gymnastics Arena Test',
      venueCapacity: 12000,
      leagueName: 'National Gymnastics Championship 2025 Test',
      abbreviation: 'NGC2025-TEST',
      championshipType: 'championship'
    };

    return this.setupChampionship(testData).pipe(
      switchMap(championshipResult => {
        console.log('✅ Championship setup test passed');
        
        const teamData = {
          sportId: championshipResult.sport.id,
          teams: [
            {
              name: 'Team Alpha Test',
              displayname: 'Alpha Gymnasts Test',
              description: 'Elite gymnastics team for testing',
              players: [
                {
                  first_name: 'Alex',
                  last_name: 'Johnson',
                  position: 'all_around',
                  apparatus_specialty: 'floor_exercise',
                  competition_level: 'elite'
                },
                {
                  first_name: 'Maria',
                  last_name: 'Garcia',
                  position: 'all_around',
                  apparatus_specialty: 'balance_beam',
                  competition_level: 'elite'
                }
              ]
            },
            {
              name: 'Team Beta Test',
              displayname: 'Beta Champions Test',
              description: 'Championship contenders for testing',
              players: [
                {
                  first_name: 'David',
                  last_name: 'Smith',
                  position: 'all_around',
                  apparatus_specialty: 'parallel_bars',
                  competition_level: 'elite'
                },
                {
                  first_name: 'Sarah',
                  last_name: 'Wilson',
                  position: 'all_around',
                  apparatus_specialty: 'uneven_bars',
                  competition_level: 'elite'
                }
              ]
            }
          ]
        };

        return this.setupTeamCompetition(teamData).pipe(
          map(teamResult => ({
            championship: championshipResult,
            teams: teamResult,
            message: 'Gymnastics test suite completed successfully!'
          }))
        );
      }),
      tap(finalResult => {
        console.log('🎉 Gymnastics Test Suite Completed:', finalResult);
        Swal.fire({
          icon: 'success',
          title: 'Test Suite Completed!',
          text: 'All gymnastics API tests have passed successfully.',
          confirmButtonColor: '#198754'
        });
      })
    );
  }

  /**
   * 🚨 Error Handling and Validation
   */
  validateCompetitionSetup(matchId: number): Observable<any> {
    console.log('🔍 Validating competition setup...');
    return this.apiService.validateCompetitionSetup(matchId).pipe(
      tap(validation => console.log('✅ Validation result:', validation))
    );
  }

  checkDataIntegrity(matchId: number): Observable<any> {
    console.log('🔍 Checking data integrity...');
    return this.apiService.checkDataIntegrity(matchId).pipe(
      tap(integrity => console.log('✅ Integrity check:', integrity))
    );
  }
}
