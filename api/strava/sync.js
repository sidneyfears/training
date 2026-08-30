const { getConnection, ensureAccessToken, stravaFetch, db } = require('../_lib/strava');

async function importDetails(activityIds, token) {
  let detailed = 0, splits = 0, laps = 0, bestEfforts = 0, segmentEfforts = 0;
  const errors = [];
  for (const id of activityIds) {
    try {
      const a = await stravaFetch(`/activities/${encodeURIComponent(id)}?include_all_efforts=true`, token);
      const payload = {
        detailed_raw: a,
        splits_metric: a.splits_metric || [],
        splits_standard: a.splits_standard || [],
        laps: a.laps || [],
        best_efforts: a.best_efforts || [],
        segment_efforts: a.segment_efforts || [],
        average_cadence: a.average_cadence ?? null
      };
      await db(`strava_activities?strava_id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
      detailed++;
      splits += payload.splits_metric.length + payload.splits_standard.length;
      laps += payload.laps.length;
      bestEfforts += payload.best_efforts.length;
      segmentEfforts += payload.segment_efforts.length;
    } catch (e) {
      errors.push({ id, error: e.message || String(e) });
    }
  }
  return { detailed, splits, laps, best_efforts: bestEfforts, segment_efforts: segmentEfforts, errors };
}

module.exports = async (req, res) => {
  try {
    const connection = await getConnection();
    if (!connection) return res.status(401).json({ error: 'Strava is not connected.' });
    const token = await ensureAccessToken(connection);
    const after = req.query.after ? Number(req.query.after) : Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
    const before = req.query.before ? Number(req.query.before) : Math.floor(Date.now() / 1000) + 60;
    const page = Math.max(1, Number(req.query.page || 1));
    const perPage = Math.min(25, Math.max(1, Number(req.query.per_page || 25)));
    const activities = await stravaFetch(`/athlete/activities?after=${after}&before=${before}&page=${page}&per_page=${perPage}`, token);
    let imported = 0;
    const activity_ids = [];
    for (const a of activities) {
      await db('strava_activities?on_conflict=strava_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          strava_id: a.id, athlete_id: connection.athlete_id, name: a.name,
          sport_type: a.sport_type || a.type, activity_date: a.start_date || a.start_date_local || null,
          distance_m: a.distance ?? null, moving_time_s: a.moving_time ?? null, elapsed_time_s: a.elapsed_time ?? null,
          average_speed_mps: a.average_speed ?? null, max_speed_mps: a.max_speed ?? null,
          average_heartrate: a.average_heartrate ?? null, max_heartrate: a.max_heartrate ?? null,
          average_watts: a.average_watts ?? null, weighted_average_watts: a.weighted_average_watts ?? null,
          kilojoules: a.kilojoules ?? null, total_elevation_gain_m: a.total_elevation_gain ?? null,
          calories: a.calories ?? null, average_cadence: a.average_cadence ?? null,
          average_temp_c: a.average_temp ?? null, suffer_score: a.suffer_score ?? null,
          perceived_exertion: a.perceived_exertion ?? null, raw: a
        })
      });
      imported++;
      activity_ids.push(a.id);
    }
    const details = await importDetails(activity_ids.slice(0, 10), token);
    res.status(200).json({ ok: true, imported, activity_ids, page, per_page: perPage, has_more: activities.length === perPage, next_page: activities.length === perPage ? page + 1 : null, ...details });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Strava sync failed.' });
  }
};
