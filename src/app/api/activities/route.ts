import {User, AthleteDisplay, ResponseObject, CompetitionDetails} from "../../interfaces"
import { GLOBAL} from "@/app/api/global"

import axios from "axios";

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const AFTER_DATE = process.env.STRAVA_ACTIVITIES_AFTER ?? "2025-04-01T00:00:00Z"
const INTERVAL: number = +(process.env.STRAVA_FETCH_INTERVAL ?? 1000);

let CACHED_ACTIVITY_DATA: ResponseObject;

import { Pool } from "pg";

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
        per_page:200
      }

    });
    return response.data;
  } catch (error:any) {
    console.error(`Failed to fetch activities for user ${user.id}:`, error.response?.data || error.message);
  }
}

async function refreshActivityData(){
  const res = await pool.query('SELECT id, firstname, lastname, access_token, refresh_token, expires_at, profile_img_link FROM users');
  console.log("user: ", res.rows)
  let all_total_km = 0;
  let all_total_score = 0;
  const athletePromises = res.rows.map(async (user) => {
    const activityData = await fetchStravaActivities(user);

    let score = 0;
    let total_km = 0;
    let numActivities = activityData.length;

    activityData.forEach((a) => {
      score += convertToScore(a);
      total_km += a.distance / 1000;
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
    } as AthleteDisplay;
  });

  const athleteScores: Array<AthleteDisplay> = (await Promise.all(athletePromises)).filter(Boolean);
  let responseObj: ResponseObject = {
    athleteDisplays: athleteScores,
    details: {
        total_km: all_total_km,
        total_score: all_total_score
    }
  }
  return responseObj;
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
}

function isDoubleDate(stravaDate: string):boolean{
  const activityDate = new Date(stravaDate).toISOString().split("T")[0];

  const doubleDates = [
    "2025-04-01",
    "2025-04-02",
    "2025-04-08",
    "2025-04-26",
    "2025-05-10",
  ]
  const normalizedDates = doubleDates.map(date => new Date(date).toISOString().split("T")[0]);
  return normalizedDates.includes(activityDate);
}

function convertToScore(activity: any):number{
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
      score =  CONVERT.virtual_ride;
      break;
    case "Ride":
    case "Mountain Bike Ride":
    case "Gravel Ride":
      score = CONVERT.ride*dist + (height*2)*CONVERT.ride;
      break;
    case "EBikeRide":
      score =  CONVERT.e_ride*dist;
      break;
    case "NordicSki":
      score =  CONVERT.ski*dist;
      break;
    case "Rowing":
      score = CONVERT.row*dist;
      break;
    case "Swim":
      score = CONVERT.swim*dist;
      break;
    case "Snowshoe":
    case "IceSkate":
    case "AlpineSki":
    case "BackcountrySki":

    case "Snowboard":
    case "Canoe":
    case "Kayak":
    case "Kitesurf":
   
    case "StandUpPaddling":
    case "Surf":
    case "Windsurf":
    default:
      score =  5;
      break;
  }    
  return score*scale;

}