import {User, AthleteDisplay, ResponseObject, CompetitionDetails} from "../../interfaces"
import pg from 'pg';

import axios from "axios";

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const AFTER_DATE = process.env.STRAVA_ACTIVITIES_AFTER ?? "2025-04-01T00:00:00Z"
const INTERVAL: number = +(process.env.STRAVA_FETCH_INTERVAL ?? 1000);

let CACHED_ACTIVITY_DATA: ResponseObject;
export const GLOBAL = {
  LAST_FETCH_TIME : 0
}


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
  let athleteScores: Array<AthleteDisplay>= [];
  let all_total_km = 0;
  let all_total_score = 0;
  for (const user of res.rows) {
    let activityData: Array<any> = await fetchStravaActivities(user);
    if(!activityData) continue;

    let score = 0;
    let numActivities = 0
    let total_km = 0;
    activityData.forEach((a)=>{
      score += convertToScore(a);
      total_km += a.distance/1000;
      numActivities+=1;
    })
    let ad:AthleteDisplay = {
      firstname: user.firstname,
      lastname: user.lastname,
      username: user.username,
      img: user.profile_img_link,
      number_of_activities: numActivities,
      score: score
    }
    athleteScores.push(ad)
    all_total_km += total_km;
    all_total_score += score;
  }
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
  e_ride: 1/8,
  ski: 1/3,
  row: 1/1.25,
  swim: 4,
}

function convertToScore(activity: any):number{
  const dist = activity.distance / 1000;
  const height = activity.total_elevation_gain/1000;
  const type = activity.type;
  switch(type){
    case "Run":
    case "VirtualRun":
    case "Elliptical":
      return CONVERT.running * dist;
    case "Walk":
    case "Hike":
      return CONVERT.walking * dist + height*2;
    case "VirtualRide":
    case "Ride":
    case "Mountain Bike Ride":
    case "Gravel Ride":
      return CONVERT.ride*dist;
    case "EBikeRide":
      return CONVERT.e_ride*dist;

    case "NordicSki":
      return CONVERT.ski*dist;
    case "Rowing":
      return CONVERT.row*dist;
    case "Swim":
      return CONVERT.swim*dist;
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
      return 5;
  }
}