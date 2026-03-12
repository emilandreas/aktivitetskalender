import {User, AthleteDisplay, ResponseObject, CompetitionDetails} from "../../interfaces"
import { GLOBAL} from "@/app/api/global"

import axios from "axios";

import { Pool } from "pg";
import { findBestActivitiesForStreaks, Streak } from "./helpers";

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const AFTER_DATE = process.env.STRAVA_ACTIVITIES_AFTER ?? "2026-03-01T00:00:00Z"
const BEFORE_DATE = process.env.STRAVA_ACTIVITIES_BEFORE ?? "2026-05-11T00:00:00Z"
const INTERVAL: number = +(process.env.STRAVA_FETCH_INTERVAL ?? 1000);

let CACHED_ACTIVITY_DATA: ResponseObject;

// Time periods to compete for longest distance activities
const STREAKS: Streak[] = [
    {
    start: new Date("2026-03-01"),
    end: new Date("2026-03-03")
  },
  {
    start: new Date("2026-03-19"),
    end: new Date("2026-03-22")
  },
  {
    start: new Date("2026-04-02"),
    end: new Date("2026-04-05")
  }
]


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
});



async function refreshAccessToken(user: User): Promise<string> {
  const response = await axios.post('https://www.strava.com/oauth/token', {
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    refresh_token: user.refresh_token,
    grant_type: 'refresh_token',
  });

  const { access_token, refresh_token, expires_at } = response.data;
  
  await pool.query(
    'UPDATE users SET access_token = $1, refresh_token = $2, expires_at = $3 WHERE id = $4',
    [access_token, refresh_token, expires_at, user.id]
  );

  return access_token;
}


async function fetchStravaActivities(user:User) {
  try {
    let accessToken = user.access_token;
    if (user.expires_at * 1000 < Date.now()) {
      accessToken = await refreshAccessToken(user);
      if (!accessToken) return;
    }

    const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params:{
        after:Math.floor(new Date(AFTER_DATE).getTime()/1000),
        before: Math.floor(new Date(BEFORE_DATE).getTime()/1000),
        per_page:200
      }

    });
    return response.data;
  } catch (error:any) {
    console.error(`Failed to fetch activities for user ${user.firstname} ${user.lastname}:`, error.response?.data || error.message);
    return null;
  }
}
let maxDist = 0;
let maxDistName = "";

async function refreshActivityData(){
  const res = await pool.query('SELECT id, firstname, lastname, access_token, refresh_token, expires_at, profile_img_link FROM users');
  let all_total_km = 0;
  let all_total_score = 0;
  var allActivityData: any[] = []
  const athletePromises = res.rows.map(async (user) => {
    try{
      let activityData = await fetchStravaActivities(user);
      if(!activityData) return null;

      activityData = pruneIfMoreThanTwoActivitiesPrDay(activityData);
      allActivityData.push(activityData);
      let score = 0;
      let km_score = 0;
      let total_km = 0;
      let numActivities = activityData.length;

      activityData.forEach((a:any) => {
        let activityScore = convertToScore(a);
        score += activityScore;
        km_score += convertToScoreKM(a);
        total_km += a.distance / 1000;
        if(activityScore > maxDist){
          maxDist = convertToScore(a, false);
          maxDistName = user.firstname + " " + user.lastname + " (" + a.distance/1000 + ")";
        }
      });

      all_total_km += total_km;
      all_total_score += score;

      return {
        firstname: user.firstname,
        lastname: user.lastname,
        username: user.username,
        img: user.profile_img_link,
        number_of_activities: numActivities,
        score: score,
        km_score: km_score
      } as AthleteDisplay;
    }
    catch(e: any){
      console.error(e);
      return null;
    }

  });

  const athleteScores: Array<AthleteDisplay> = (await Promise.all(athletePromises)).filter(Boolean) as Array<AthleteDisplay>;



  // const bestStreaksActivities = findBestActivitiesForStreaks(allActivityData, STREAKS, convertToScoreKM);
  let bestStreaksActivities;
  console.log("max: " + maxDistName);
  console.log(maxDist)

  let responseObj: ResponseObject = {
    athleteDisplays: athleteScores,
    details: {
        total_km: all_total_km,
        total_score: all_total_score,
        best_streak_activities: bestStreaksActivities
    }
  }
  return responseObj;
}

function pruneIfMoreThanTwoActivitiesPrDay(activities: any[]): any[] {
  const activitiesByDay = new Map<string, any[]>();

  for (const activity of activities) {
    const dayKey = new Date(activity.start_date_local).toISOString().split("T")[0];
    const list = activitiesByDay.get(dayKey) ?? [];
    list.push(activity);
    activitiesByDay.set(dayKey, list);
  }

  const result: any[] = [];

  for (const dayActivities of activitiesByDay.values()) {
    if (dayActivities.length <= 2) {
      result.push(...dayActivities);
      continue;
    }

    let top1: any | null = null;
    let top2: any | null = null;

    for (const activity of dayActivities) {
      if (!top1 || convertToScore(activity) > convertToScore(top1)) {
        top2 = top1;
        top1 = activity;
      } else if (!top2 || convertToScore(activity) > convertToScore(top2)) {
        top2 = activity;
      }
    }

    if (top1) result.push(top1);
    if (top2) result.push(top2);
  }

  return result;
}

function pickLotteryWinner(participants: Array<AthleteDisplay>): string {
  const ticketPool: string[] = [];

  for (const participant of participants) {
    for (let i = 0; i < participant.score; i++) {
      ticketPool.push(participant.firstname + " " + participant.lastname);
    }
  }

  if (ticketPool.length === 0) {
    throw new Error("No tickets in the lottery.");
  }

  const randomIndex = Math.floor(Math.random() * ticketPool.length);
  return ticketPool[randomIndex];
}

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}

export async function GET(request: Request) {
  try {
    const now = Date.now();
    console.log("now: ", now, " lastFetch: ", GLOBAL.LAST_FETCH_TIME, " Interval: ", INTERVAL)
    if(CACHED_ACTIVITY_DATA && (now - GLOBAL.LAST_FETCH_TIME < INTERVAL)){
      console.log("Returning cached data");
      return new Response(JSON.stringify(CACHED_ACTIVITY_DATA), {
        status:200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    else{
      const newData = await refreshActivityData();
      if(!newData) throw "Error refreshing activity data";
      else{
        console.log("Returning new data")
        CACHED_ACTIVITY_DATA  = newData;
        GLOBAL.LAST_FETCH_TIME = now;
        if(false){
          const winner = pickLotteryWinner(newData.athleteDisplays);
          console.log("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n")
          console.log("The winner of Aktivitetskalenderen 2025 is: \n");
          for(let i =0; i < 20; i++){
              await delay(700);
            console.log(".");
          }          
          console.log("--- " + winner + " ---");
          console.log("Gratulerer!!");

        }
        return new Response(JSON.stringify(CACHED_ACTIVITY_DATA), {
          status:200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

  } catch (error: any) {
    console.error("Error:", error?.message);
    return new Response(null, {
      status:500
    });
  }
}


const CONVERT = {
  running: 1,
  walking: 1,
  ride: 1/3,
  virtual_ride: 1/3,
  e_ride: 1/8,
  ski: 1/3,
  row: 1/1.25,
  swim: 4,
  kayak: 1,
}

function isDoubleDate(stravaDate: string):boolean{
  const activityDate = new Date(stravaDate).toISOString().split("T")[0];

  const doubleDates = [
    "2026-03-01",
    "2026-03-08",
    "2026-04-09",
    "2026-04-25",
    "2026-05-8",
    "2026-05-9",
  ]
  const normalizedDates = doubleDates.map(date => new Date(date).toISOString().split("T")[0]);
  return normalizedDates.includes(activityDate);
}

function convertToScore(activity: any, enableDoubleDate=true):number{
  const dist = activity.distance / 1000;
  const height = activity.total_elevation_gain/1000;
  const type = activity.type;
  const scale = enableDoubleDate && isDoubleDate(activity.start_date_local) ? 2: 1;
  let score = 0;
  switch(type){
    case "Run":
    case "VirtualRun":
    case "Elliptical":
      score = CONVERT.running * dist + height*2;
      break;
    case "Walk":
    case "Hike":
      score =  CONVERT.walking * dist + height*2;
      break;
    case "VirtualRide":
      score =  CONVERT.virtual_ride*dist;
      break;
    case "Ride":
    case "Mountain Bike Ride":
    case "Gravel Ride":
      score = CONVERT.ride*(dist + (height*2) );
      break;
    case "EBikeRide":
      score =  CONVERT.e_ride*dist;
      break;
    case "NordicSki":
    case "RollerSki":

      score =  CONVERT.ski*dist;
      break;
    case "Rowing":
      score = CONVERT.row*dist;
      break;
    case "Swim":
      score = CONVERT.swim*dist;
      break;
    case "Canoe":
    case "Kayaking":
      score = CONVERT.kayak*dist;
      break;
    case "Snowshoe":
      score = CONVERT.walking*dist;
      break;
    case "IceSkate":
    case "AlpineSki":
    case "BackcountrySki":

    case "Snowboard":
    case "Kitesurf":
   
    case "StandUpPaddling":
    case "Surf":
    case "Windsurf":
    case "RockClimbing":
    case "WeightTraining":
    case "Workout":
    case "Soccer":
      score = 5;
      break;
  }    
  return score*scale;

}
function convertToScoreKM(activity: any):number{
  const dist = activity.distance / 1000;
  const height = activity.total_elevation_gain/1000;
  const type = activity.type;
  const scale = isDoubleDate(activity.start_date_local) ? 2: 1;
  let score = 0;
  switch(type){
    case "Run":
    case "VirtualRun":
    case "Elliptical":
      score = CONVERT.running * dist + height*2;
      break;
    case "Walk":
    case "Hike":
      score =  CONVERT.walking * dist + height*2;
      break;
    case "VirtualRide":
      score =  CONVERT.virtual_ride*dist;
      break;
    case "Ride":
    case "Mountain Bike Ride":
    case "Gravel Ride":
      score = CONVERT.ride*(dist + (height*2) );
      break;
    case "EBikeRide":
      score =  CONVERT.e_ride*dist;
      break;
    case "NordicSki":
    case "RollerSki":

      score =  CONVERT.ski*dist;
      break;
    case "Rowing":
      score = CONVERT.row*dist;
      break;
    case "Swim":
      score = CONVERT.swim*dist;
      break;
    case "Canoe":
    case "Kayaking":
      score = CONVERT.kayak*dist;
      break;
    case "Snowshoe":
      score = CONVERT.walking*dist;
      break;
    case "IceSkate":
    case "AlpineSki":
    case "BackcountrySki":

    case "Snowboard":
    case "Kitesurf":
   
    case "StandUpPaddling":
    case "Surf":
    case "Windsurf":
    case "RockClimbing":
    case "WeightTraining":
    case "Workout":
      score = 0;
      break;
  }    
  return score*scale;

}