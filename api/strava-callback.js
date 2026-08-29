export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  const { code, error }=req.query||{};
  if(error) return res.status(400).json({error});
  if(!code) return res.status(400).json({error:'Missing authorization code'});

  const {STRAVA_CLIENT_ID,STRAVA_CLIENT_SECRET,SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY}=process.env;
  const missing=[];
  if(!STRAVA_CLIENT_ID) missing.push('STRAVA_CLIENT_ID');
  if(!STRAVA_CLIENT_SECRET) missing.push('STRAVA_CLIENT_SECRET');
  if(!SUPABASE_URL) missing.push('SUPABASE_URL');
  if(!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if(missing.length){
    console.error('Missing production environment variables:',missing.join(','));
    return res.status(500).json({error:'Backend is not fully configured'});
  }

  const r=await fetch('https://www.strava.com/api/v3/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:STRAVA_CLIENT_ID,client_secret:STRAVA_CLIENT_SECRET,code,grant_type:'authorization_code'})});
  if(!r.ok){const detail=await r.text();console.error('Strava token exchange failed',r.status,detail);return res.status(502).json({error:'Strava token exchange failed'});}
  const token=await r.json();
  if(!token.athlete?.id||!token.access_token||!token.refresh_token) return res.status(502).json({error:'Strava returned incomplete token data'});

  const db=await fetch(`${SUPABASE_URL}/rest/v1/strava_accounts?on_conflict=athlete_id`,{
    method:'POST',
    headers:{apikey:SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},
    body:JSON.stringify({athlete_id:token.athlete.id,athlete_firstname:token.athlete.firstname??null,athlete_lastname:token.athlete.lastname??null,access_token:token.access_token,refresh_token:token.refresh_token,expires_at:token.expires_at})
  });
  if(!db.ok){const detail=await db.text();console.error('Supabase account save failed',db.status,detail);return res.status(502).json({error:'Strava connected but account could not be saved'});}

  return res.status(200).json({connected:true,saved:true,athlete:{id:token.athlete.id,firstname:token.athlete.firstname,lastname:token.athlete.lastname}});
}