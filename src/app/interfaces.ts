export interface AthleteDisplay{
    firstname: string;
    lastname: string;
    username: string;
    img: string;
    score: number;
    km_score: number;
    number_of_activities:number;
  }
export interface CompetitionDetails{
    total_km: number;
    total_score: number;
    best_streak_activities: any;
}
export interface ResponseObject{
    athleteDisplays: Array<AthleteDisplay>,
    details: CompetitionDetails
}
export interface User {
    id: number;
    firstname:string;
    lastname:string;
    access_token: string;
    refresh_token: string;
    expires_at: number;
  }