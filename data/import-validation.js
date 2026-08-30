/* Shared validation for Strava imports. Keeps malformed/partial records out of the analysis layer. */
(function(){
  const finite = v => v == null || (typeof v === 'number' && Number.isFinite(v));
  const nonNegative = v => v == null || (typeof v === 'number' && Number.isFinite(v) && v >= 0);
  window.validateStravaImport = function(payload){
    if(!payload || typeof payload !== 'object') return {ok:false,error:'Import response is not an object'};
    const a = payload.activity;
    if(!a || a.id == null) return {ok:false,error:'Missing activity id'};
    const numeric = ['distance_m','moving_time_s','elapsed_time_s','average_speed_mps','max_speed_mps','average_heartrate','max_heartrate','average_watts','weighted_average_watts','average_cadence','total_elevation_gain_m','temperature_c','calories'];
    for(const k of numeric){ if(!finite(a[k])) return {ok:false,error:`Invalid activity field: ${k}`}; }
    for(const k of ['distance_m','moving_time_s','elapsed_time_s','average_speed_mps','max_speed_mps','total_elevation_gain_m','calories']) if(!nonNegative(a[k])) return {ok:false,error:`Negative activity field: ${k}`};
    for(const key of ['splits_metric','laps']){
      if(a[key] != null && !Array.isArray(a[key])) return {ok:false,error:`Invalid ${key}`};
    }
    return {ok:true};
  };
})();
