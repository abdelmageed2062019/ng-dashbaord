import { Routes } from '@angular/router';
import { MatchListComponent } from './match-list/match-list.component';
import { UpdateMatchComponent } from './update-match/update-match.component';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './auth.guard'; // Import the AuthGuard
import { SportsComponent } from './sports/sports.component';
export const routes: Routes = [
     { path: '', component: SportsComponent, canActivate: [AuthGuard] },
     { path: 'sport/:sportId', loadComponent: () => import('./sport-matches/sport-matches.component').then(m => m.SportMatchesComponent), canActivate: [AuthGuard] },
     { path: 'update/:matchId', component: UpdateMatchComponent , canActivate: [AuthGuard]},
     { path: 'update-match-data/:matchId', loadComponent: () => import('./update-match-data/update-match-data.component').then(m => m.UpdateMatchDataComponent), canActivate: [AuthGuard] },
     { path: 'MatchList', component: MatchListComponent, canActivate: [AuthGuard] },
     { path: 'login', component: LoginComponent},
     { path: 'sports', component: SportsComponent, canActivate: [AuthGuard] },
     { path: '**', redirectTo: 'login' } // Redirect unknown routes
];
