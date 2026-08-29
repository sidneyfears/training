const { getConnection } = require('../_lib/strava');

module.exports = async (req, res) => {
  try {
    const connection = await getConnection();
    if (!connection) return res.status(200).json({ connected: false });
    res.status(200).json({ connected: true, athleteId: connection.athlete_id, scope: connection.scope, updatedAt: connection.updated_at });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to read Strava status.' });
  }
};
