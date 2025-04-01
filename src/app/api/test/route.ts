// File: app/page.tsx
import { Pool } from "pg";

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false, // Required for Neon
//   },
// });
// export async function GET(request: Request) {
//     // Connect to the Neon database
//     // Insert the comment from the form into the Postgres database
//     await pool.query(`INSERT INTO users (id, username, firstname, lastname, access_token, refresh_token, expires_at, profile_img_link) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE  SET access_token = $5, refresh_token = $6, expires_at = $7, profile_img_link = $8`,
//         [1, "bosses", "Bjorn", "Losse", 124, 41, 999, "linktopic"]
//       );
// }