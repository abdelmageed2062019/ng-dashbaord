import { Routes } from '@angular/router';
import { MatchListComponent } from './match-list/match-list.component';
import { UpdateMatchComponent } from './update-match/update-match.component';
export const routes: Routes = [
     { path: '', component: MatchListComponent },
     { path: 'update/:matchId', component: UpdateMatchComponent }
];
