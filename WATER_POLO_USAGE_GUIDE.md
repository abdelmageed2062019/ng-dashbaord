# Water Polo Match Management - Usage Examples

## Quick Start Guide

### 1. Navigate to Water Polo Match
```url
http://localhost:4200/update-match-data/38
```
*Where 38 is your water polo match ID*

### 2. Initialize Match Clock
Click the **"Initialize"** button in the water polo scoreboard. This sets up:
- 4 quarters of 8 minutes each
- 30-second shot clock
- 20-second ejection duration
- 60-second timeout duration

### 3. Start the Match
Click **"Start"** to begin the first quarter. The clock will start counting down from 8:00.

## Common Usage Scenarios

### Scenario 1: Goal Scored
1. **Start Shot Clock**: Click "Shot Clock" button for attacking team
2. **Record Goal**: When goal is scored, click "Goal" in shot clock controls
3. **Update Player Stats**: In player form, update:
   - `goals_scored`: +1
   - `shots_attempted`: +1
   - `shots_on_target`: +1
   - `playing_time`: Current seconds played
   - `efficiency_rating`: 8.5-10.0 for goal scorer

### Scenario 2: Shot Saved by Goalkeeper
1. **Start Shot Clock**: For attacking team (30 seconds)
2. **Record Save**: Click "Save" in shot clock controls
3. **Update Shooter Stats**:
   - `shots_attempted`: +1
   - `shots_on_target`: +1 (shot was on target but saved)
4. **Update Goalkeeper Stats**:
   - `saves`: +1
   - `defensive_plays`: +1

### Scenario 3: Call Team Timeout
1. **During Live Play**: Click "Timeout" button for the team
2. **Select Reason**: Choose from dropdown:
   - Strategy Meeting
   - Injury Assessment
   - Technical Issue
   - Equipment Check
3. **Resume Play**: Click "End Timeout" when ready

### Scenario 4: Player Ejection
1. **Record Ejection**: In player stats form:
   - `ejections`: +1
   - `ejection_time`: 20 (default ejection duration)
   - `major_fouls`: +1 (if major foul caused ejection)
2. **Team plays with one less player** for ejection duration

### Scenario 5: Advance to Next Quarter
1. **End of Quarter**: Clock reaches 0:00
2. **Click "Next Quarter"**: Advances to next period
3. **Reset Clock**: New quarter starts with 8:00
4. **Update Period Stats**: Track goals per quarter

## Player Position Guidelines

### Field Positions
- **goalkeeper**: Primary defender, can use hands
- **center_forward**: Main scoring threat in front of goal
- **center_back**: Defensive anchor
- **wing**: Side attackers, fast swimmers
- **utility**: Versatile players, multiple positions
- **defender**: Primarily defensive role
- **driver**: Fast break specialists

## Statistical Tracking Best Practices

### Essential Stats to Track
1. **Goals & Assists**: Every scoring play
2. **Shots**: All attempts, on/off target
3. **Saves**: Goalkeeper performance
4. **Ejections**: Disciplinary tracking
5. **Swimming Distance**: Fitness metric
6. **Playing Time**: Rotation management

### Advanced Metrics
1. **Efficiency Rating**: Overall performance (0-10 scale)
2. **Defensive/Offensive Plays**: Tactical contributions
3. **Steals**: Defensive skills
4. **Turnovers**: Ball handling errors

## Match Flow Example

### First Quarter (8:00 - 0:00)
```
8:00 - Start Quarter 1
7:30 - Team A starts attack (shot clock: 30s)
7:15 - Goal by Player #758 (Team A)
       Update: goals_scored=1, shots_attempted=1, shots_on_target=1
7:15 - Reset shot clock
7:00 - Team B starts attack (shot clock: 30s)
6:45 - Shot saved by Team A goalkeeper
       Update Goalkeeper: saves=1
       Update Shooter: shots_attempted=1, shots_on_target=1
6:30 - Team A timeout (strategy_meeting)
5:30 - Timeout ends, play resumes
...
0:00 - End of Quarter 1, advance to Quarter 2
```

### Complete Match Statistics
At match end, review:
- **Final Score**: Team totals from player goals
- **Individual Stats**: Top scorers, saves, efficiency
- **Team Performance**: Shot percentage, defensive plays
- **Match Events**: Timeline of major plays

## API Usage Examples

### Initialize Clock
```json
POST /matches/38/clock/initialize/
{
    "match_format": "water_polo",
    "total_periods": 4,
    "period_duration": 480,
    "shot_clock_duration": 30,
    "ejection_duration": 20,
    "timeout_duration": 60
}
```

### Update Player Stats
```json
PUT /player-stats/custom_update/
{
    "match": 38,
    "team": 91,
    "player": 758,
    "goals_scored": 1,
    "assists": 0,
    "shots_attempted": 2,
    "shots_on_target": 1,
    "ejections": 0,
    "ejection_time": 0,
    "steals": 1,
    "turnovers": 0,
    "swimming_distance": 150,
    "playing_time": 120,
    "field_position": "center_forward",
    "efficiency_rating": 9.0,
    "defensive_plays": 2,
    "offensive_plays": 3
}
```

### Call Timeout
```json
POST /matches/38/clock/timeout/
{
    "team_id": 91,
    "duration": "00:01:00",
    "reason": "strategy_meeting"
}
```

## Troubleshooting

### Common Issues

#### Clock Not Starting
- **Check**: Is clock initialized?
- **Solution**: Click "Initialize" first

#### Shot Clock Not Working
- **Check**: Is main clock running?
- **Solution**: Start main clock before shot clock

#### Player Stats Not Saving
- **Check**: All required fields filled?
- **Solution**: Ensure match, team, and player IDs are set

#### Timeout Not Ending
- **Check**: Network connectivity
- **Solution**: Refresh page and try again

### Performance Tips
1. **Regular Saves**: Update stats frequently during match
2. **Network Check**: Ensure stable internet connection
3. **Browser Refresh**: Reload page if UI becomes unresponsive
4. **Backup Data**: Export statistics periodically

## Live Match Checklist

### Pre-Match Setup
- [ ] Verify match details (teams, players)
- [ ] Test network connectivity
- [ ] Initialize water polo clock
- [ ] Confirm all players are listed

### During Match
- [ ] Start clock for each quarter
- [ ] Track all shots and goals
- [ ] Manage shot clock for possessions
- [ ] Record ejections and fouls
- [ ] Call timeouts as needed
- [ ] Update player statistics real-time

### Post-Match
- [ ] Stop match clock
- [ ] Verify final statistics
- [ ] Export match report
- [ ] Save final results
- [ ] Review match analytics

This comprehensive water polo management system provides all the tools needed for professional water polo match administration, following international water polo rules and regulations.
