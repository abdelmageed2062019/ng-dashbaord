import { Routes } from '@angular/router';
import { MatchListComponent } from './match-list/match-list.component';
import { UpdateMatchComponent } from './update-match/update-match.component';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './auth.guard'; // Import the AuthGuard
export const routes: Routes = [
     { path: '', component: MatchListComponent, canActivate: [AuthGuard] },
     { path: 'update/:matchId', component: UpdateMatchComponent , canActivate: [AuthGuard]},
     {path: 'login', component: LoginComponent},
     { path: '**', redirectTo: 'login' } // Redirect unknown routes

];
