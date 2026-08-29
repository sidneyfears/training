const { getConnection, ensureAccessToken, stravaFetch, db } = require('../_lib/strava');

module.exports = async (req, res) => {
  try {
    const connection = await getConnection();
    if (!connection) return res.status(401).json({ error: 'Strava is not connected.' });
    const token = await ensureAccessToken(connection);
    const after = req.query.after ? Number(req.query.after) : Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
    const before = req.query.before ? Number(req.query.before) : Math.floor(Date.now() / 1000) + 60;
    let page = 1;
    let imported = 0;
    let detailed = 0;
    while (page <= 10) {
      const activities = await stravaFetch(`/athlete/activities?after=${after}&before=${before}&page=${page}&per_page=100`, token);
      if (!activities.length) break;
      for (const a of activities) {
        // The list endpoint contains summary data. Fetch the activity detail as well so
        // we retain laps, km splits, best efforts and segment efforts for analysis.
        let d = {};
        try {
          d = await stravaFetch(`/activities/${a.id}`, token);
          detailed++;
        } catch (detailError) {
          console.error(`Could not fetch Strava activity ${a.id} details`, detailError);
        }

        await db('strava_activities?on_conflict=strava_id', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({
            strava_id: a.id,
            athlete_id: connection.athlete_id,
            name: a.name,
            sport_type: a.sport_type || a.type,
            activity_date: a.start_date || a.start_date_local || null,
            distance_m: a.distance ?? null,
            moving_time_s: a.moving_time ?? null,
            elapsed_time_s: a.elapsed_time ?? null,
            average_speed_mps: a.average_speed ?? null,
            max_speed_mps: a.max_speed ?? null,
            average_heartrate: a.average_heartrate ?? null,
            max_heartrate: a.max_heartrate ?? null,
            average_watts: a.average_watts ?? null,
            weighted_average_watts: a.weighted_average_watts ?? null,
            kilojoules: a.kilojoules ?? null,
            total_elevation_gain_m: a.total_elevation_gain ?? null,
            calories: a.calories ?? null,
            average_cadence: d.average_cadence ?? a.average_cadence ?? null,
            average_temp_c: d.average_temp ?? a.average_temp ?? null,
            suffer_score: d.suffer_score ?? a.suffer_score ?? null,
            perceived_exertion: d.perceived_exertion ?? a.perceived_exertion ?? null,
            splits_metric: d.splits_metric ?? a.splits_metric ?? [],
            splits_standard: d.splits_standard ?? a.splits_standard ?? [],
            laps: d.laps ?? [],
            best_efforts: d.best_efforts ?? [],
            segment_efforts: d.segment_efforts ?? [],
            detailed_raw: d,
            raw: a
          })
        });
        imported++;
      }
      if (activities.length < 100) break;
      page++;
    }
    res.status(200).json({ ok: true, imported, detailed });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Strava sync failed.' });
  }
};