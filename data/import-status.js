window.IMPORT_STATUS = {
  version: 1,
  contract: {
    activity: ['id','start_date','distance_m','moving_time_s','elapsed_time_s','average_speed_mps','max_speed_mps','average_heartrate','max_heartrate','average_watts','weighted_average_watts','average_cadence','total_elevation_gain_m','temperature_c','calories'],
    split: ['split','distance_m','elapsed_time_s','moving_time_s','average_speed_mps','average_heartrate','average_watts','average_cadence','elevation_difference_m','average_grade_pct'],
    lap: ['lap','name','distance_m','elapsed_time_s','moving_time_s','average_speed_mps','average_heartrate','average_watts','average_cadence','total_elevation_gain_m']
  },
  rules: {
    upsertBy: 'strava_activity_id',
    preserveRaw: true,
    replaceSplitsOnSuccessfulImport: true,
    replaceLapsOnSuccessfulImport: true,
    noPartialActivity: true,
    dateMatching: 'activity.start_date_local',
    units: { distance: 'm', time: 's', speed: 'm/s', elevation: 'm', temperature: 'C' }
  }
};
