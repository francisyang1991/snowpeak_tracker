-- SnowPeak Tracker - Supabase Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- RESORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS resorts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'US',
  region TEXT NOT NULL DEFAULT 'Other',
  latitude DOUBLE PRECISION DEFAULT 0,
  longitude DOUBLE PRECISION DEFAULT 0,
  website_url TEXT,
  total_lifts INTEGER DEFAULT 0,
  total_trails INTEGER DEFAULT 0,
  vertical_drop INTEGER,
  base_elevation INTEGER,
  summit_elevation INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resorts_state ON resorts(state);
CREATE INDEX IF NOT EXISTS idx_resorts_region ON resorts(region);

-- ============================================
-- SNOW REPORTS TABLE
-- Daily snow conditions for each resort
-- ============================================
CREATE TABLE IF NOT EXISTS snow_reports (
  id SERIAL PRIMARY KEY,
  resort_id TEXT NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  base_depth INTEGER DEFAULT 0,
  last_24_hours INTEGER DEFAULT 0,
  last_48_hours INTEGER DEFAULT 0,
  last_7_days INTEGER DEFAULT 0,
  lifts_open INTEGER DEFAULT 0,
  trails_open INTEGER DEFAULT 0,
  conditions TEXT,
  snow_quality TEXT,
  grooming_status TEXT,
  data_source TEXT DEFAULT 'gemini',
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(resort_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_snow_reports_resort ON snow_reports(resort_id);
CREATE INDEX IF NOT EXISTS idx_snow_reports_date ON snow_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_snow_reports_created ON snow_reports(created_at);

-- ============================================
-- FORECASTS TABLE
-- Daily forecasts for each resort
-- ============================================
CREATE TABLE IF NOT EXISTS forecasts (
  id SERIAL PRIMARY KEY,
  resort_id TEXT NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  predicted_snow INTEGER DEFAULT 0,
  temp_high INTEGER,
  temp_low INTEGER,
  condition TEXT,
  snow_probability INTEGER,
  wind_speed INTEGER,
  wind_direction TEXT,
  humidity INTEGER,
  powder_score INTEGER,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(resort_id, forecast_date)
);

CREATE INDEX IF NOT EXISTS idx_forecasts_resort ON forecasts(resort_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_date ON forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_forecasts_fetched ON forecasts(fetched_at);
CREATE INDEX IF NOT EXISTS idx_forecasts_snow ON forecasts(predicted_snow DESC);

-- ============================================
-- ALERT SUBSCRIPTIONS TABLE
-- User alert subscriptions for resorts
-- ============================================
CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id SERIAL PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  email TEXT,
  resort_id TEXT NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  resort_name TEXT NOT NULL,
  threshold TEXT NOT NULL CHECK (threshold IN ('light', 'good', 'great')),
  timeframe INTEGER NOT NULL DEFAULT 5 CHECK (timeframe IN (5, 10)),
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMPTZ,
  last_checked TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(visitor_id, resort_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_subs_visitor ON alert_subscriptions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_alert_subs_active ON alert_subscriptions(is_active) WHERE is_active = TRUE;

-- ============================================
-- ALERT NOTIFICATIONS TABLE
-- Notifications sent to users
-- ============================================
CREATE TABLE IF NOT EXISTS alert_notifications (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES alert_subscriptions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  predicted_snow INTEGER NOT NULL,
  forecast_date DATE NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_notifs_sub ON alert_notifications(subscription_id);
CREATE INDEX IF NOT EXISTS idx_alert_notifs_read ON alert_notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_alert_notifs_created ON alert_notifications(created_at);

-- ============================================
-- USERS TABLE (for future auth)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  name TEXT,
  visitor_id TEXT UNIQUE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FAVORITES TABLE
-- User's favorite resorts
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  visitor_id TEXT,
  resort_id TEXT NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(visitor_id, resort_id),
  UNIQUE(user_id, resort_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_visitor ON favorites(visitor_id);

-- ============================================
-- CHAT MESSAGES TABLE
-- AI chat history
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_messages(created_at);

-- ============================================
-- SEARCH LOGS TABLE
-- For analytics
-- ============================================
CREATE TABLE IF NOT EXISTS search_logs (
  id SERIAL PRIMARY KEY,
  visitor_id TEXT,
  query TEXT NOT NULL,
  region TEXT,
  results_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_created ON search_logs(created_at);

-- ============================================
-- ROW LEVEL SECURITY (Optional)
-- Enable RLS for added security
-- ============================================

-- Resorts: Anyone can read, only service role can write
ALTER TABLE resorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Resorts are viewable by everyone" ON resorts FOR SELECT USING (true);
CREATE POLICY "Resorts are editable by service role" ON resorts FOR ALL USING (auth.role() = 'service_role');

-- Forecasts: Same as resorts
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Forecasts are viewable by everyone" ON forecasts FOR SELECT USING (true);
CREATE POLICY "Forecasts are editable by service role" ON forecasts FOR ALL USING (auth.role() = 'service_role');

-- Snow reports: Same as resorts
ALTER TABLE snow_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Snow reports are viewable by everyone" ON snow_reports FOR SELECT USING (true);
CREATE POLICY "Snow reports are editable by service role" ON snow_reports FOR ALL USING (auth.role() = 'service_role');

-- Alert subscriptions: Users can manage their own
ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions" ON alert_subscriptions FOR SELECT USING (true);
CREATE POLICY "Users can create subscriptions" ON alert_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own subscriptions" ON alert_subscriptions FOR UPDATE USING (true);
CREATE POLICY "Users can delete own subscriptions" ON alert_subscriptions FOR DELETE USING (true);

-- Alert notifications: Users can view their own
ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view notifications" ON alert_notifications FOR SELECT USING (true);
CREATE POLICY "Service role can manage notifications" ON alert_notifications FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER resorts_updated_at
  BEFORE UPDATE ON resorts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER alert_subscriptions_updated_at
  BEFORE UPDATE ON alert_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA (Optional popular resorts)
-- ============================================

INSERT INTO resorts (id, name, location, state, region, latitude, longitude) VALUES
  ('vail', 'Vail', 'Vail, Colorado', 'CO', 'Rockies', 39.6403, -106.3742),
  ('aspen-snowmass', 'Aspen Snowmass', 'Aspen, Colorado', 'CO', 'Rockies', 39.1911, -106.8175),
  ('breckenridge', 'Breckenridge', 'Breckenridge, Colorado', 'CO', 'Rockies', 39.4817, -106.0384),
  ('park-city', 'Park City', 'Park City, Utah', 'UT', 'Rockies', 40.6514, -111.5080),
  ('snowbird', 'Snowbird', 'Snowbird, Utah', 'UT', 'Rockies', 40.5830, -111.6556),
  ('alta', 'Alta', 'Alta, Utah', 'UT', 'Rockies', 40.5884, -111.6387),
  ('mammoth-mountain', 'Mammoth Mountain', 'Mammoth Lakes, California', 'CA', 'Pacific', 37.6308, -119.0326),
  ('heavenly', 'Heavenly', 'South Lake Tahoe, California', 'CA', 'Pacific', 38.9353, -119.9401),
  ('jackson-hole', 'Jackson Hole', 'Teton Village, Wyoming', 'WY', 'Rockies', 43.5875, -110.8279),
  ('big-sky', 'Big Sky', 'Big Sky, Montana', 'MT', 'Rockies', 45.2618, -111.4015),
  ('stowe', 'Stowe', 'Stowe, Vermont', 'VT', 'Northeast', 44.5303, -72.7814),
  ('killington', 'Killington', 'Killington, Vermont', 'VT', 'Northeast', 43.6045, -72.8201)
ON CONFLICT (id) DO NOTHING;
