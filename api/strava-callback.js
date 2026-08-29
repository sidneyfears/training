export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  const { code, error }=req.query||{};
  if(error) return res.status(400).json({error});
  if(!code) return res.status(400).json({error:'Missing authorization code'});
  const {STRAVA_CLIENT_ID,STRAVA_CLIENT_SECRET}=process.env;
  if(!STRAVA_CLIENT_ID||!STRAVA_CLIENT_SECRET) return res.status(500).json({error:'Strava backend is not configured'});
  const r=await fetch('https://www.strava.com/api/v3/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:STRAVA_CLIENT_ID,client_secret:STRAVA_CLIENT_SECRET,code,grant_type:'authorization_code'})});
  if(!r.ok) return res.status(502).json({error:'Strava token exchange failed'});
  const token=await r.json();
  return res.status(200).json({connected:true,athlete:token.athlete?{id:token.athlete.id,firstname:token.athlete.firstname,lastname:token.athlete.lastname}:null,refresh_token_received:Boolean(token.refresh_token)});
}