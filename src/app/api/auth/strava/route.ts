import { redirect } from 'next/navigation'

export async function GET(request: Request) {
    const client_id = process.env.STRAVA_CLIENT_ID;
    const redirect_uri = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;
    const scope = "read,activity:read_all";
    const auth_url = `https://www.strava.com/oauth/authorize?client_id=${client_id}&response_type=code&redirect_uri=${redirect_uri}&approval_prompt=force&scope=${scope}`;

    redirect(auth_url);
}