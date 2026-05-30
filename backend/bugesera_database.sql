-- ═══════════════════════════════════════════════════════════════════════════
-- BUGESERA HARVEST PREDICTION SYSTEM — DATABASE SCHEMA
-- Database: SQLite (development) / PostgreSQL (production)
-- Version : 1.0
-- ═══════════════════════════════════════════════════════════════════════════

PRAGMA foreign_keys = ON;  -- Enable FK enforcement (SQLite)

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: sectors
-- Reference table for all 15 Bugesera sectors with soil data
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sectors (
    sector_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    sector_name      TEXT    NOT NULL UNIQUE,
    soil_type        TEXT    NOT NULL,   -- e.g. Loam, Clay Soil, Sandy Loam
    soil_health      TEXT    NOT NULL,   -- Good / Fair / Poor
    ph_level         REAL    NOT NULL,
    organic_matter   REAL,
    nitrogen_ppm     REAL,
    phosphorus_ppm   REAL,
    potassium_ppm    REAL,
    market_dist_km   REAL,
    created_at       TEXT    DEFAULT (datetime('now'))
);

-- Seed sectors from dataset
INSERT OR IGNORE INTO sectors (sector_name, soil_type, soil_health, ph_level, organic_matter, nitrogen_ppm, phosphorus_ppm, potassium_ppm, market_dist_km) VALUES
    ('Gashora',    'Loam',       'Good', 6.5, 2.1, 49, 24, 192, 18.7),
    ('Juru',       'Sandy Loam', 'Good', 6.9, 2.6, 48, 24, 176, 12.0),
    ('Kamabuye',   'Clay Soil',  'Fair', 7.1, 2.3, 41, 19, 207, 15.0),
    ('Mareba',     'Sandy Loam', 'Good', 7.1, 3.0, 62, 12, 236, 10.0),
    ('Mayange',    'Sandy Loam', 'Good', 6.0, 2.8, 65, 12, 205,  8.0),
    ('Musenyi',    'Loam',       'Good', 7.1, 2.4, 41, 14, 255, 14.0),
    ('Mwogo',      'Sandy Soil', 'Poor', 6.0, 2.0, 68, 21, 163, 16.0),
    ('Ngeruka',    'Loam',       'Good', 7.0, 2.7, 74, 20, 196, 11.0),
    ('Ntarama',    'Sandy Soil', 'Poor', 7.1, 2.9, 62, 11, 245,  9.0),
    ('Nyamata',    'Clay Soil',  'Fair', 7.1, 3.2, 77, 24, 253,  7.5),
    ('Nyarugenge', 'Clay Soil',  'Fair', 6.2, 2.2, 40, 22, 195, 20.0),
    ('Rilima',     'Sandy Soil', 'Poor', 6.1, 1.8, 43, 16, 213, 13.0),
    ('Ruhuha',     'Sandy Loam', 'Good', 7.0, 2.5, 62, 18, 186,  6.0),
    ('Rweru',      'Clay Soil',  'Fair', 7.0, 2.6, 65, 12, 188, 22.0),
    ('Shyara',     'Sandy Loam', 'Good', 6.1, 2.3, 56, 21, 268, 17.0);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: officers
-- Agricultural extension officers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS officers (
    officer_id       TEXT    PRIMARY KEY,   -- e.g. A001, A002
    full_name        TEXT    NOT NULL,
    phone            TEXT    UNIQUE,
    email            TEXT    UNIQUE,
    department       TEXT,                  -- e.g. Crop Production
    sector_id        INTEGER REFERENCES sectors(sector_id) ON DELETE SET NULL,
    password_hash    TEXT    NOT NULL,
    is_active        INTEGER DEFAULT 1,
    created_at       TEXT    DEFAULT (datetime('now')),
    last_login       TEXT
);

-- Seed demo officer
INSERT OR IGNORE INTO officers (officer_id, full_name, phone, department, password_hash) VALUES
    ('A001', 'Dr. Pascal Nkurunziza', '+250788100100', 'Crop Production', 'harvest2024');


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 3: farmers
-- Registered farmers — core user table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS farmers (
    farmer_id        TEXT    PRIMARY KEY,   -- e.g. F001, F002
    full_name        TEXT    NOT NULL,
    phone            TEXT    UNIQUE NOT NULL,
    email            TEXT    UNIQUE,
    national_id      TEXT    UNIQUE,
    sector_id        INTEGER NOT NULL REFERENCES sectors(sector_id) ON DELETE RESTRICT,
    farm_size_are    REAL    NOT NULL CHECK (farm_size_are > 0),
    farmer_category  TEXT    NOT NULL CHECK (farmer_category IN ('Small','Medium','Large')),
    password_hash    TEXT    NOT NULL,
    is_active        INTEGER DEFAULT 1,
    registered_by    TEXT    REFERENCES officers(officer_id) ON DELETE SET NULL,
    created_at       TEXT    DEFAULT (datetime('now')),
    last_login       TEXT,
    CONSTRAINT chk_category CHECK (
        (farmer_category = 'Small'  AND farm_size_are <  50) OR
        (farmer_category = 'Medium' AND farm_size_are BETWEEN 50 AND 150) OR
        (farmer_category = 'Large'  AND farm_size_are >  150)
    )
);

-- Seed demo farmers
INSERT OR IGNORE INTO farmers (farmer_id, full_name, phone, sector_id, farm_size_are, farmer_category, password_hash) VALUES
    ('F001', 'Cesalie Uwimpuhwe',  '+250782001001', (SELECT sector_id FROM sectors WHERE sector_name='Nyamata'),  25,  'Small',  'harvest2024'),
    ('F002', 'Jean Pierre Habimana','+250782002002', (SELECT sector_id FROM sectors WHERE sector_name='Gashora'), 180, 'Large',  'harvest2024'),
    ('F003', 'Vestine Mukamana',   '+250782003003', (SELECT sector_id FROM sectors WHERE sector_name='Juru'),    320, 'Large',  'harvest2024');


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 4: farmer_crops
-- Many-to-many: which crops each farmer grows
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS farmer_crops (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id        TEXT    NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    crop_name        TEXT    NOT NULL CHECK (crop_name IN ('Maize','Beans','Rice')),
    is_primary       INTEGER DEFAULT 0,
    created_at       TEXT    DEFAULT (datetime('now')),
    UNIQUE (farmer_id, crop_name)
);

INSERT OR IGNORE INTO farmer_crops (farmer_id, crop_name, is_primary) VALUES
    ('F001', 'Maize', 1), ('F001', 'Beans', 0),
    ('F002', 'Rice',  1),
    ('F003', 'Maize', 1), ('F003', 'Rice', 0);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 5: predictions
-- Core table — every harvest prediction made by a farmer
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
    prediction_id      TEXT    PRIMARY KEY,  -- e.g. PRED-123456
    farmer_id          TEXT    NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    sector_id          INTEGER NOT NULL REFERENCES sectors(sector_id) ON DELETE RESTRICT,

    -- Crop & season inputs
    crop_type          TEXT    NOT NULL CHECK (crop_type IN ('Maize','Beans','Rice')),
    season             TEXT    NOT NULL CHECK (season IN ('Season A','Season B')),
    planting_date      TEXT    NOT NULL,     -- ISO date YYYY-MM-DD
    planting_month     TEXT    NOT NULL,
    year               INTEGER NOT NULL,

    -- Farm inputs
    area_planted_are   REAL    NOT NULL CHECK (area_planted_are > 0),
    soil_type          TEXT    NOT NULL,
    fertilizer_used    TEXT    NOT NULL CHECK (fertilizer_used IN ('Yes','Partial','No')),
    irrigation_used    TEXT    NOT NULL CHECK (irrigation_used IN ('Yes','Partial','No')),
    previous_crop      TEXT,
    pest_pressure      TEXT    CHECK (pest_pressure IN ('Low','Medium','High')),
    labor_availability TEXT    CHECK (labor_availability IN ('Adequate','Sufficient','Limited')),
    extension_access   TEXT    CHECK (extension_access IN ('Yes','No')),
    credit_access      TEXT    CHECK (credit_access IN ('Yes','Partial','No')),

    -- Climate inputs (auto-loaded)
    avg_temperature    REAL,
    total_rainfall_mm  REAL,
    humidity_pct       REAL,
    sunshine_hrs       REAL,

    -- Model outputs
    yield_per_are_kg   REAL    NOT NULL,
    yield_per_ha_kg    REAL    NOT NULL,
    total_yield_kg     REAL    NOT NULL,
    yield_range_low    REAL,
    yield_range_high   REAL,
    district_avg_kg_are REAL,
    pct_vs_average     REAL,
    yield_grade        TEXT    CHECK (yield_grade IN ('Excellent','Good','Average','Below Average')),
    confidence_pct     REAL    DEFAULT 84.8,
    model_used         TEXT    DEFAULT 'Gradient Boosting',

    -- Metadata
    is_offline         INTEGER DEFAULT 0,
    created_at         TEXT    DEFAULT (datetime('now'))
);

-- Index for fast farmer lookups
CREATE INDEX IF NOT EXISTS idx_pred_farmer  ON predictions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_pred_crop    ON predictions(crop_type);
CREATE INDEX IF NOT EXISTS idx_pred_season  ON predictions(season);
CREATE INDEX IF NOT EXISTS idx_pred_sector  ON predictions(sector_id);
CREATE INDEX IF NOT EXISTS idx_pred_date    ON predictions(planting_date);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 6: recommendations
-- Recommendations generated for each prediction
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendations (
    rec_id           INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id    TEXT    NOT NULL REFERENCES predictions(prediction_id) ON DELETE CASCADE,
    rec_type         TEXT    NOT NULL CHECK (rec_type IN ('success','info','warning')),
    category         TEXT    NOT NULL,
    message          TEXT    NOT NULL,
    display_order    INTEGER DEFAULT 0,
    created_at       TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rec_pred ON recommendations(prediction_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 7: officer_advice
-- Messages sent from officers to farmers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS officer_advice (
    advice_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    officer_id       TEXT    NOT NULL REFERENCES officers(officer_id) ON DELETE CASCADE,
    recipient_officer_id TEXT REFERENCES officers(officer_id) ON DELETE SET NULL,
    farmer_id        TEXT    REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    prediction_id    TEXT    REFERENCES predictions(prediction_id) ON DELETE SET NULL,
    sector_id        INTEGER REFERENCES sectors(sector_id) ON DELETE SET NULL,
    subject          TEXT    NOT NULL,
    message          TEXT    NOT NULL,
    advice_type      TEXT    CHECK (advice_type IN ('general','alert','recommendation','followup')),
    is_deleted       INTEGER DEFAULT 0,
    is_read          INTEGER DEFAULT 0,
    created_at       TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_advice_farmer  ON officer_advice(farmer_id);
CREATE INDEX IF NOT EXISTS idx_advice_officer ON officer_advice(officer_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 8: climate_records
-- Monthly climate data per sector per year
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS climate_records (
    climate_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    sector_id        INTEGER NOT NULL REFERENCES sectors(sector_id) ON DELETE CASCADE,
    year             INTEGER NOT NULL,
    month            TEXT    NOT NULL,
    season           TEXT    NOT NULL CHECK (season IN ('Season A','Season B')),
    avg_temp_celsius REAL,
    total_rainfall_mm REAL,
    humidity_pct     REAL,
    sunshine_hrs     REAL,
    wind_speed_kmh   REAL,
    evapotranspiration_mm REAL,
    created_at       TEXT    DEFAULT (datetime('now')),
    UNIQUE (sector_id, year, month)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 9: password_resets
-- Tracks password reset requests
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
    reset_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          TEXT    NOT NULL,
    user_role        TEXT    NOT NULL CHECK (user_role IN ('farmer','officer')),
    reset_token      TEXT    UNIQUE,
    requested_at     TEXT    DEFAULT (datetime('now')),
    completed_at     TEXT,
    is_used          INTEGER DEFAULT 0
);


-- ─────────────────────────────────────────────────────────────────────────────
-- VIEWS — useful queries pre-built
-- ─────────────────────────────────────────────────────────────────────────────

-- View: Full prediction with farmer name and sector
CREATE VIEW IF NOT EXISTS v_predictions_full AS
SELECT
    p.prediction_id,
    f.farmer_id,
    f.full_name         AS farmer_name,
    f.phone             AS farmer_phone,
    s.sector_name,
    s.soil_type,
    p.crop_type,
    p.season,
    p.planting_date,
    p.year,
    p.area_planted_are,
    p.fertilizer_used,
    p.irrigation_used,
    p.previous_crop,
    p.pest_pressure,
    p.yield_per_are_kg,
    p.total_yield_kg,
    p.yield_grade,
    p.pct_vs_average,
    p.district_avg_kg_are,
    p.created_at
FROM predictions p
JOIN farmers  f ON p.farmer_id = f.farmer_id
JOIN sectors  s ON p.sector_id = s.sector_id;


-- View: District statistics per crop per season
CREATE VIEW IF NOT EXISTS v_district_stats AS
SELECT
    crop_type,
    season,
    COUNT(*)                        AS total_predictions,
    ROUND(AVG(yield_per_are_kg),2)  AS avg_yield_kg_are,
    ROUND(MIN(yield_per_are_kg),2)  AS min_yield,
    ROUND(MAX(yield_per_are_kg),2)  AS max_yield,
    ROUND(SUM(total_yield_kg),1)    AS total_yield_kg,
    COUNT(DISTINCT farmer_id)       AS unique_farmers
FROM predictions
GROUP BY crop_type, season;


-- View: Farmer performance summary
CREATE VIEW IF NOT EXISTS v_farmer_summary AS
SELECT
    f.farmer_id,
    f.full_name,
    s.sector_name,
    f.farmer_category,
    COUNT(p.prediction_id)          AS total_predictions,
    ROUND(AVG(p.yield_per_are_kg),2) AS avg_yield_kg_are,
    ROUND(MAX(p.yield_per_are_kg),2) AS best_yield,
    ROUND(SUM(p.total_yield_kg),1)  AS total_yield_ever_kg,
    MAX(p.created_at)               AS last_prediction
FROM farmers f
JOIN sectors s ON f.sector_id = s.sector_id
LEFT JOIN predictions p ON f.farmer_id = p.farmer_id
GROUP BY f.farmer_id;


-- View: Sector yield ranking
CREATE VIEW IF NOT EXISTS v_sector_ranking AS
SELECT
    s.sector_name,
    s.soil_type,
    s.soil_health,
    COUNT(p.prediction_id)          AS total_predictions,
    ROUND(AVG(p.yield_per_are_kg),2) AS avg_yield_kg_are,
    ROUND(AVG(CASE WHEN p.crop_type='Maize' THEN p.yield_per_are_kg END),2) AS maize_avg,
    ROUND(AVG(CASE WHEN p.crop_type='Beans' THEN p.yield_per_are_kg END),2) AS beans_avg,
    ROUND(AVG(CASE WHEN p.crop_type='Rice'  THEN p.yield_per_are_kg END),2) AS rice_avg
FROM sectors s
LEFT JOIN predictions p ON s.sector_id = p.sector_id
GROUP BY s.sector_id
ORDER BY avg_yield_kg_are DESC;
