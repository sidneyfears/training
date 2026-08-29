export default async function handler(req,res){
  const { STRAVA_CLIENT_ID, STRAVA_REDIRECT_URI } = process.env;
  if(!STRAVA_CLIENT_ID || !STRAVA_REDIRECT_URI) return res.status(500).json({error:'Strava backend is not configured'});
  const params=new URLSearchParams({client_id:STRAVA_CLIENT_ID,redirect_uri:STRAVA_REDIRECT_URI,response_type:'code',approval_prompt:'auto',scope:'read,activity:read_all'});
  if(req.method==='GET') return res.redirect(`https://www.strava.com/oauth/authorize?${params}`);
  return res.status(405).json({error:'Method not allowed'});
}