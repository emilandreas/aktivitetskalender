import axios from 'axios';
import { redirect } from 'next/navigation'
import { GLOBAL} from "@/app/api/global"
import { Pool } from "pg";

// const pool = new Pool({
//   user: 'postgres',
//   password: 'mypass',
//   host: 'localhost',
//   port: 5432,
//   database: 'aktivitetskalender',
// });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Required for Neon
    },
  });

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code"); // Get a specific query param
    if (!code) {
        console.error("Missing exange code");

        return new Response(null, {
            status:400,
          });
    }

    try {
        const params = {
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            code: code,
            grant_type: "authorization_code",
        };
        const url = `https://www.strava.com/oauth/token?client_id=${process.env.STRAVA_CLIENT_ID}&client_secret=${process.env.STRAVA_CLIENT_SECRET}&code=${code}&grant_type=authorization_code`;
        console.log(url);
        const response = await axios.post(`https://www.strava.com/oauth/token?client_id=${process.env.STRAVA_CLIENT_ID}&client_secret=${process.env.STRAVA_CLIENT_SECRET}&code=${code}&grant_type=authorization_code`);

     const { access_token, refresh_token, expires_at, athlete } = response.data;

    // Store user data in PostgreSQL
    await pool.query(
        `INSERT INTO users (id, username, firstname, lastname, access_token, refresh_token, expires_at, profile_img_link) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         ON CONFLICT (id) DO UPDATE 
         SET access_token = $5, refresh_token = $6, expires_at = $7, profile_img_link = $8`,
        [athlete.id, athlete.username, athlete.firstname, athlete.lastname, access_token, refresh_token, expires_at, athlete.profile_medium]
      );
        // Store the tokens securely (e.g., session, database)
    } catch (error:any) {
        console.error("Error exchanging token:", error);
        return new Response(null, {
            status:500
          });
    }finally{
        GLOBAL.LAST_FETCH_TIME = 0; // Force refresh of data
        redirect("/");
    }
}

