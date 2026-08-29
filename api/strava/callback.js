const { required, verifyState, stravaTokenRequest, saveConnection } = require('../_lib/strava');

module.exports = async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) return res.redirect(302, `${required('FRONTEND_URL')}?strava=denied`);
    if (!verifyState(state)) return res.status(400).send('Invalid or expired OAuth state.');
    if (!code) return res.status(400).send('Missing authorization code.');

    const token = await stravaTokenRequest({ grant_type: 'authorization_code', code });
    await saveConnection({
      athlete_id: token.athlete?.id,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
      scope: Array.isArray(token.scope) ? token.scope.join(',') : token.scope || ''
    });

    res.redirect(302, `${required('FRONTEND_URL')}?strava=connected`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Strava connection failed. Check server configuration.');
  }
};
