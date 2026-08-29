const { getConnection, ensureAccessToken, stravaFetch, db } = require('../_lib/strava');

module.exports = async (req, res) => {
  try {
    const date = String(req.query.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Invalid date.' });
    const connection = await getConnection();
    if (!connection) return res.status(401).json({ error: 'Strava is not connected.' });

    const rows = await db(`strava_activities?select=*&athlete_id=eq.${encodeURIComponent(connection.athlete_id)}&order=activity_date.desc&limit=200`);
    const start = new Date(`${date}T00:00:00+02:00`).getTime();
    const end = new Date(`${date}T23:59:59+02:00`).getTime();
    const sameDay = (rows || []).filter(r => {
      const t = new Date(r.activity_date).getTime();
      return t >= start && t <= end;
    });
    const runs = sameDay.filter(r => ['Run', 'VirtualRun', 'TrailRun'].includes(r.sport_type));
    const activity = runs[0] || sameDay[0] || null;
    if (!activity) return res.status(200).json({ activity: null });
    return res.status(200).json({ activity });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ error: error.message || 'Activity lookup failed.' });
  }
};