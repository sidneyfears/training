const { required, getConnection, ensureAccessToken, stravaFetch, db } = require('../_lib/strava');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    if (mode === 'subscribe' && token === required('STRAVA_VERIFY_TOKEN')) return res.status(200).json({ 'hub.challenge': challenge });
    return res.status(403).json({ error: 'Webhook verification failed.' });
  }
  if (req.method !== 'POST') return res.status(405).end();
  // Strava requires a fast 200 response. Store the event first; a later sync can fetch the full activity.
  try {
    const event = req.body || {};
    await db('strava_webhook_events', { method: 'POST', body: JSON.stringify({ event_id: `${event.subscription_id}:${event.object_id}:${event.event_time}`, payload: event }) });
    res.status(200).send('EVENT_RECEIVED');
    // Best-effort background import for a newly created activity.
    if (event.object_type === 'activity' && event.aspect_type === 'create') {
      const connection = await getConnection();
      if (connection) {
        const token = await ensureAccessToken(connection);
        const activity = await stravaFetch(`/activities/${event.object_id}`, token);
        await db('strava_activities?on_conflict=strava_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ strava_id: activity.id, athlete_id: connection.athlete_id, name: activity.name, sport_type: activity.sport_type || activity.type, start_date: activity.start_date, start_date_local: activity.start_date_local, distance_m: activity.distance, moving_time_s: activity.moving_time, elapsed_time_s: activity.elapsed_time, total_elevation_gain_m: activity.total_elevation_gain, average_speed_mps: activity.average_speed, max_speed_mps: activity.max_speed, average_heartrate: activity.average_heartrate ?? null, max_heartrate: activity.max_heartrate ?? null, average_cadence: activity.average_cadence ?? null, average_watts: activity.average_watts ?? null, kilojoules: activity.kilojoules ?? null, suffer_score: activity.suffer_score ?? null, raw_summary: activity }) });
      }
    }
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.status(500).json({ error: 'Webhook processing failed.' });
  }
};
