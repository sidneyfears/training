const { getConnection, ensureAccessToken, stravaFetch, db } = require('../_lib/strava');

module.exports = async (req, res) => {
  try {
    const connection = await getConnection();
    if (!connection) return res.status(401).json({ error: 'Strava is not connected.' });
    const token = await ensureAccessToken(connection);
    const limit = Math.min(5, Math.max(1, Number(req.query.limit || 5)));
    const rows = await db(`strava_activities?select=strava_id&athlete_id=eq.${encodeURIComponent(connection.athlete_id)}&or=(splits_metric.is.null,laps.is.null)&order=activity_date.desc&limit=${limit}`);
    let detailed = 0;
    for (const row of rows || []) {
      try {
        const d = await stravaFetch(`/activities/${row.strava_id}`, token);
        await db(`strava_activities?strava_id=eq.${encodeURIComponent(row.strava_id)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            average_cadence: d.average_cadence ?? null,
            average_temp_c: d.average_temp ?? null,
            suffer_score: d.suffer_score ?? null,
            perceived_exertion: d.perceived_exertion ?? null,
            splits_metric: d.splits_metric ?? [],
            splits_standard: d.splits_standard ?? [],
            laps: d.laps ?? [],
            best_efforts: d.best_efforts ?? [],
            segment_efforts: d.segment_efforts ?? [],
            detailed_raw: d
          })
        });
        detailed++;
      } catch (e) {
        console.error(`Detail import failed for ${row.strava_id}`, e);
      }
    }
    res.status(200).json({ ok: true, phase: 'details', requested: rows?.length || 0, detailed, remaining: Math.max(0, (rows?.length || 0) - detailed) });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Strava detail sync failed.' });
  }
};
