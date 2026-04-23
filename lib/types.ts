export interface Athlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;
}

export interface Activity {
  id: number;
  name: string;
  distance: number;        // metres
  moving_time: number;     // seconds
  elapsed_time: number;    // seconds
  total_elevation_gain: number;
  type: string;
  start_date: string;      // ISO
  start_date_local: string;
  average_speed: number;   // m/s
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  map_polyline?: string;   // encoded polyline
  splits_metric?: Split[];
  location_names?: string;
}

export interface Split {
  distance: number;
  elapsed_time: number;
  moving_time: number;
  average_speed: number;
  elevation_difference: number;
  split: number;
}

export interface PlannedActivity {
  id: number;
  date: string;           // YYYY-MM-DD
  type: 'run' | 'strength';
  title: string;
  notes?: string;
  distance_km?: number;
  duration_minutes?: number;
  created_at: number;
}

export interface TokenRow {
  athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete_json: string;
}
