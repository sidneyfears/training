const { required, signState } = require('../_lib/strava');

module.exports = (req, res) => {
  const state = signState({ nonce: cryptoRandom() });
  const params = new URLSearchParams({
    client_id: required('STRAVA_CLIENT_ID'),
    redirect_uri: required('STRAVA_REDIRECT_URI'),
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
    state
  });
  res.redirect(302, `https://www.strava.com/oauth/authorize?${params}`);
};

function cryptoRandom() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
