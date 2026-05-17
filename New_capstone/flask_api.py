"""
╔══════════════════════════════════════════════════════════════════╗
║   BUGESERA HARVEST PREDICTION SYSTEM — Flask REST API v4.0      ║
║   Author  : Cesalie UWIMPUHWE | Rwanda Polytechnic               ║
║   Units   : ARE (1 ha = 100 are) | Yield: kg/are                ║
║   Models  : Gradient Boosting (best), Random Forest, Linear Reg ║
╚══════════════════════════════════════════════════════════════════╝
"""

from flask import Flask, request, jsonify
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
try:
    from database import (
        get_db, init_db, get_farmer, get_farmer_by_id_or_phone,
        register_farmer, update_last_login, reset_password as db_reset_password,
        save_prediction, get_predictions, get_district_stats,
        get_officer_dashboard, get_farmer_stats, get_all_sectors,
        get_sector, save_advice, get_farmer_advice
    )
    DB_ENABLED = True
except ImportError:
    DB_ENABLED = False
    print("⚠️  database.py not found — using in-memory store")
from flask_cors import CORS
import numpy as np
import pandas as pd
import joblib
import json
import os
import uuid
from datetime import datetime

# ── App setup ──────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

BASE = os.path.dirname(os.path.abspath(__file__))

# ── Load ML artifacts ──────────────────────────────────────────────────────────
print("🔄 Loading ML artifacts...")
try:
    model   = joblib.load(os.path.join(BASE, 'best_model.pkl'))
    scaler  = joblib.load(os.path.join(BASE, 'scaler.pkl'))
    le_dict = joblib.load(os.path.join(BASE, 'label_encoders.pkl'))
    print("  ✅ best_model.pkl")
    print("  ✅ scaler.pkl")
    print("  ✅ label_encoders.pkl")
except FileNotFoundError as e:
    raise SystemExit(f"❌ Missing artifact: {e}\n   Run Harvest_Prediction_ML.ipynb first.")

# ── Load metadata ──────────────────────────────────────────────────────────────
META_PATH = os.path.join(BASE, 'model_metadata.json')
if not os.path.exists(META_PATH):
    raise SystemExit("❌ model_metadata.json not found. Run the notebook first.")
with open(META_PATH) as f:
    META = json.load(f)
print("  ✅ model_metadata.json")

FEATURES = META['features']
CROPS    = META['crops']
SECTORS  = META['sectors']

# Normalise performance metrics
if '_perf' not in META:
    META['_perf'] = {META['best_model']: {'r2': META.get('r2_score', 0.85)}}

# ── Constants ──────────────────────────────────────────────────────────────────
HA_TO_ARE = 100.0   # 1 ha = 100 are
ARE_TO_HA = 0.01    # 1 are = 0.01 ha

CROP_BENCHMARKS = META.get('crop_benchmarks_kg_are', {
    'Beans': 11.91, 'Maize': 23.22, 'Rice': 36.36,
})

# Soil type → Soil_Health mapping
SOIL_HEALTH_MAP = {
    'Clay'      : 'Fair',
    'Sandy-Clay': 'Fair',
    'Loam'      : 'Good',
    'Sandy'     : 'Poor',
    'Clay-Loam' : 'Good',
    'Sandy Loam': 'Good',
    'Sandy Soil': 'Poor',
    'Clay Soil' : 'Fair',
}

# ── Bugesera monthly climate averages by sector ────────────────────────────────
# Source: Rwanda Meteorological Agency — Bugesera District
BUGESERA_CLIMATE = {
    'January'  : {'temperature': 22.4, 'rainfall': 66,  'humidity': 72, 'sunshine': 7.8, 'wind_speed': 11.2, 'evapotranspiration': 108},
    'February' : {'temperature': 22.8, 'rainfall': 72,  'humidity': 73, 'sunshine': 7.6, 'wind_speed': 11.0, 'evapotranspiration': 110},
    'March'    : {'temperature': 23.1, 'rainfall': 95,  'humidity': 76, 'sunshine': 7.2, 'wind_speed': 10.8, 'evapotranspiration': 112},
    'April'    : {'temperature': 23.5, 'rainfall': 108, 'humidity': 79, 'sunshine': 6.8, 'wind_speed': 10.4, 'evapotranspiration': 106},
    'May'      : {'temperature': 23.2, 'rainfall': 78,  'humidity': 77, 'sunshine': 7.0, 'wind_speed': 10.6, 'evapotranspiration': 104},
    'June'     : {'temperature': 22.9, 'rainfall': 35,  'humidity': 68, 'sunshine': 8.2, 'wind_speed': 12.1, 'evapotranspiration': 116},
    'July'     : {'temperature': 22.5, 'rainfall': 28,  'humidity': 64, 'sunshine': 8.6, 'wind_speed': 12.8, 'evapotranspiration': 120},
    'August'   : {'temperature': 23.0, 'rainfall': 42,  'humidity': 66, 'sunshine': 8.4, 'wind_speed': 12.4, 'evapotranspiration': 118},
    'September': {'temperature': 23.6, 'rainfall': 78,  'humidity': 74, 'sunshine': 7.4, 'wind_speed': 11.6, 'evapotranspiration': 114},
    'October'  : {'temperature': 23.8, 'rainfall': 110, 'humidity': 80, 'sunshine': 6.6, 'wind_speed': 10.2, 'evapotranspiration': 102},
    'November' : {'temperature': 23.4, 'rainfall': 102, 'humidity': 78, 'sunshine': 7.0, 'wind_speed': 10.6, 'evapotranspiration': 105},
    'December' : {'temperature': 22.6, 'rainfall': 85,  'humidity': 74, 'sunshine': 7.5, 'wind_speed': 11.4, 'evapotranspiration': 109},
}

SEASON_MODIFIER = {
    'Season A': {'rainfall_boost': 1.05, 'temp_adj':  0.2},
    'Season B': {'rainfall_boost': 0.95, 'temp_adj': -0.1},
}

# Sector-specific soil data from dataset
SECTOR_SOIL = {
    'Gashora'   : {'pH_Level':6.5,'Organic_Matter_Percent':2.1,'Nitrogen_ppm':49,'Phosphorus_ppm':24,'Potassium_ppm':192},
    'Juru'      : {'pH_Level':6.9,'Organic_Matter_Percent':2.6,'Nitrogen_ppm':48,'Phosphorus_ppm':24,'Potassium_ppm':176},
    'Kamabuye'  : {'pH_Level':7.1,'Organic_Matter_Percent':2.3,'Nitrogen_ppm':41,'Phosphorus_ppm':19,'Potassium_ppm':207},
    'Mareba'    : {'pH_Level':7.1,'Organic_Matter_Percent':3.0,'Nitrogen_ppm':62,'Phosphorus_ppm':12,'Potassium_ppm':236},
    'Mayange'   : {'pH_Level':6.0,'Organic_Matter_Percent':2.8,'Nitrogen_ppm':65,'Phosphorus_ppm':12,'Potassium_ppm':205},
    'Musenyi'   : {'pH_Level':7.1,'Organic_Matter_Percent':2.4,'Nitrogen_ppm':41,'Phosphorus_ppm':14,'Potassium_ppm':255},
    'Mwogo'     : {'pH_Level':6.0,'Organic_Matter_Percent':2.0,'Nitrogen_ppm':68,'Phosphorus_ppm':21,'Potassium_ppm':163},
    'Ngeruka'   : {'pH_Level':7.0,'Organic_Matter_Percent':2.7,'Nitrogen_ppm':74,'Phosphorus_ppm':20,'Potassium_ppm':196},
    'Ntarama'   : {'pH_Level':7.1,'Organic_Matter_Percent':2.9,'Nitrogen_ppm':62,'Phosphorus_ppm':11,'Potassium_ppm':245},
    'Nyamata'   : {'pH_Level':7.1,'Organic_Matter_Percent':3.2,'Nitrogen_ppm':77,'Phosphorus_ppm':24,'Potassium_ppm':253},
    'Nyarugenge': {'pH_Level':6.2,'Organic_Matter_Percent':2.2,'Nitrogen_ppm':40,'Phosphorus_ppm':22,'Potassium_ppm':195},
    'Rilima'    : {'pH_Level':6.1,'Organic_Matter_Percent':2.1,'Nitrogen_ppm':43,'Phosphorus_ppm':16,'Potassium_ppm':213},
    'Ruhuha'    : {'pH_Level':7.0,'Organic_Matter_Percent':2.5,'Nitrogen_ppm':62,'Phosphorus_ppm':18,'Potassium_ppm':186},
    'Rweru'     : {'pH_Level':7.0,'Organic_Matter_Percent':2.6,'Nitrogen_ppm':65,'Phosphorus_ppm':12,'Potassium_ppm':188},
    'Shyara'    : {'pH_Level':6.1,'Organic_Matter_Percent':2.3,'Nitrogen_ppm':56,'Phosphorus_ppm':21,'Potassium_ppm':268},
}

# ── Helper functions ───────────────────────────────────────────────────────────
def get_climate(month: str, season: str) -> dict:
    base = BUGESERA_CLIMATE.get(month, BUGESERA_CLIMATE['October'])
    mod  = SEASON_MODIFIER.get(season, {'rainfall_boost': 1.0, 'temp_adj': 0.0})
    return {
        'temperature'       : round(base['temperature'] + mod['temp_adj'], 1),
        'rainfall'          : round(base['rainfall'] * mod['rainfall_boost'] * 6, 1),  # seasonal
        'humidity'          : base['humidity'],
        'sunshine'          : base['sunshine'],
        'wind_speed'        : base['wind_speed'],
        'evapotranspiration': base['evapotranspiration'] * 6,  # seasonal
    }

def _enc(key: str, value: str, fallback: int = 0) -> int:
    """Safely encode a categorical value."""
    if key not in le_dict:
        return fallback
    le = le_dict[key]
    if value in le.classes_:
        return int(le.transform([value])[0])
    # Try case-insensitive match
    for cls in le.classes_:
        if cls.lower() == str(value).lower():
            return int(le.transform([cls])[0])
    print(f"⚠️  '{value}' not in {key} classes: {le.classes_.tolist()} — using fallback {fallback}")
    return fallback

def build_features(d: dict) -> pd.DataFrame:
    """
    Build model feature vector from request data.
    All sizes in ARE, yield target is kg/are.
    """
    crop       = d['crop']
    sector     = d['sector']
    season     = d['season']
    month      = d.get('month', 'October')
    farm_are   = float(d['farm_size'])          # frontend sends ARE
    area_are   = float(d.get('area_planted', farm_are * 0.9))
    farmer_cat = d.get('farmer_category', 'Medium')
    fertilizer = d.get('fertilizer_used', False)
    irrigation = d.get('irrigation_used', False)
    soil_type  = d.get('soil_type', 'Clay')

    # Map boolean/string fertilizer values
    if isinstance(fertilizer, bool):
        fert_str = 'Yes' if fertilizer else 'No'
    else:
        fert_str = str(fertilizer)
    if isinstance(irrigation, bool):
        irr_str = 'Yes' if irrigation else 'No'
    else:
        irr_str = str(irrigation)

    # Auto climate
    clim = get_climate(month, season)
    temperature    = float(d.get('temperature',        clim['temperature']))
    rainfall       = float(d.get('rainfall',           clim['rainfall']))
    humidity       = float(d.get('humidity',           clim['humidity']))
    sunshine       = float(d.get('sunshine',           clim['sunshine']))
    wind_speed     = float(d.get('wind_speed',         clim['wind_speed']))
    evapotrans     = float(d.get('evapotranspiration', clim['evapotranspiration']))

    # Soil data from sector
    soil_data = SECTOR_SOIL.get(sector, SECTOR_SOIL['Gashora'])

    # Derive weather impact from rainfall
    if rainfall < 300:
        weather = 'Unfavorable'
    elif rainfall > 600:
        weather = 'Favorable'
    else:
        weather = 'Moderate'

    # Engineered features
    fert_score     = 1.0 if fert_str == 'Yes' else (0.5 if fert_str == 'Partial' else 0.0)
    irr_score      = 1.0 if irr_str  == 'Yes' else (0.5 if irr_str  == 'Partial' else 0.0)
    ph_optimality  = 1 - abs(soil_data['pH_Level'] - 6.5) / 2.0
    crop_rain      = {'Maize': 500, 'Beans': 400, 'Rice': 650}.get(crop, 500)
    rain_adequacy  = min(rainfall / crop_rain, 1.5)
    is_season_a    = 1 if season == 'Season A' else 0

    row = {
        'Year'                          : int(d.get('year', 2024)),
        'Season'                        : _enc('Season',              season),
        'Crop_Type'                     : _enc('Crop_Type',           crop),
        'Sector'                        : _enc('Sector',              sector),
        'Farm_Size_Are'                 : farm_are,
        'Area_Planted_Are'              : area_are,
        'Farmer_Category'               : _enc('Farmer_Category',     farmer_cat),
        'Fertilizer_Used'               : _enc('Fertilizer_Used',     fert_str),
        'Fertilizer_Amount_Kg_per_Are'  : 1.865 if fert_str == 'Yes' else (0.9 if fert_str == 'Partial' else 0.0),
        'Irrigation_Used'               : _enc('Irrigation_Used',     irr_str),
        'Soil_Health'                   : _enc('Soil_Health',         SOIL_HEALTH_MAP.get(soil_type, 'Fair')),
        'Previous_Crop'                 : _enc('Previous_Crop',       d.get('previous_crop','Beans')),
        'Weather_Impact'                : _enc('Weather_Impact',      weather),
        'Pest_Disease_Pressure'         : _enc('Pest_Disease_Pressure', d.get('pest_pressure','Low')),
        'Labor_Availability'            : _enc('Labor_Availability',  d.get('labor_availability','Adequate')),
        'Extension_Service_Access'      : _enc('Extension_Service_Access', d.get('extension_access','Yes')),
        'Credit_Access'                 : _enc('Credit_Access',       d.get('credit_access','No')),
        'Market_Distance_km'            : float(d.get('market_distance', 12.0)),
        'Avg_Temperature_Celsius'       : temperature,
        'Total_Rainfall_mm'             : rainfall,
        'Relative_Humidity_Percent'     : humidity,
        'Sunshine_Hours_per_Day'        : sunshine,
        'Wind_Speed_kmh'                : wind_speed,
        'Evapotranspiration_mm'         : evapotrans,
        'pH_Level'                      : soil_data['pH_Level'],
        'Organic_Matter_Percent'        : soil_data['Organic_Matter_Percent'],
        'Nitrogen_ppm'                  : soil_data['Nitrogen_ppm'],
        'Phosphorus_ppm'                : soil_data['Phosphorus_ppm'],
        'Potassium_ppm'                 : soil_data['Potassium_ppm'],
        'Avg_Pest_YieldLoss'            : float(d.get('pest_loss', 5.0)),
        'Total_Cost_RWF_per_Are'        : float(d.get('cost_per_are', 4500.0)),
        # Engineered
        'Fertilizer_Score'              : fert_score,
        'Irrigation_Score'              : irr_score,
        'Soil_pH_Optimality'            : ph_optimality,
        'Rain_Adequacy'                 : rain_adequacy,
        'Is_Season_A'                   : is_season_a,
    }

    X = pd.DataFrame([row]).reindex(columns=FEATURES, fill_value=0)
    return X


def get_recommendations(crop: str, yield_pa: float, sector: str = '') -> list:
    base = CROP_BENCHMARKS.get(crop, 20.0)
    pct  = (yield_pa - base) / base * 100

    if pct >= 20:
        return [
            {'type':'success','category':'🎉 Excellent Harvest!','icon':'🌟',
             'message':f'Your predicted yield of {yield_pa:.1f} kg/are is {pct:.0f}% above the district average ({base:.1f} kg/are). Outstanding season!'},
            {'type':'success','category':'📦 Storage','icon':'🏚️',
             'message':'Arrange hermetic storage bags or a silo immediately. Seal grain within 48 hours to prevent aflatoxin and pests.'},
            {'type':'success','category':'💰 Market & Sell','icon':'💰',
             'message':'Contact Bugesera cooperative market before harvest to lock in a good price. Consider selling 70% early and storing 30% as seed.'},
            {'type':'success','category':'📅 Next Season','icon':'📅',
             'message':f'Repeat the same fertilizer and soil management. Save the best {crop} seeds from this harvest for next season.'},
            {'type':'success','category':'🌱 Reinvest','icon':'🌱',
             'message':'Use profit to invest in drip irrigation or expand planted area next season.'},
        ]
    if pct > -20:
        return [
            {'type':'info','category':'📊 Good Average Harvest','icon':'👍',
             'message':f'Predicted yield of {yield_pa:.1f} kg/are is close to the district average ({base:.1f} kg/are). A solid season.'},
            {'type':'info','category':'🐛 Pest Scouting','icon':'⚙️',
             'message':'Scout for pests every 7 days in the final 4 weeks before harvest. A late attack can reduce yield by 15–20%.'},
            {'type':'info','category':'📦 Storage','icon':'🏚️',
             'message':'Dry grain to below 13% moisture before storage. Use hermetic bags to maintain quality for 3–6 months.'},
            {'type':'info','category':'📈 Improve Next Season','icon':'📈',
             'message':f'To reach excellent yield: apply DAP fertilizer at planting and amend with compost. These can boost {crop} by 20–30%.'},
            {'type':'info','category':'💰 Market','icon':'💰',
             'message':'Sell 60% within the first month after harvest. Keep 40% stored for off-season sale at better prices.'},
        ]
    return [
        {'type':'warning','category':'⚠️ Below-Average Harvest','icon':'🔴',
         'message':f'Predicted yield of {yield_pa:.1f} kg/are is {abs(pct):.0f}% below district average ({base:.1f} kg/are). Take action now.'},
        {'type':'warning','category':'🚨 Contact RAB Now','icon':'🚨',
         'message':'Contact the RAB extension officer in your sector this week to identify the root cause.'},
        {'type':'warning','category':'🧪 Soil pH Test','icon':'🧪',
         'message':f'Schedule a soil pH test. Low pH (below 5.5) is the most common cause of poor {crop} yields. Apply lime (2 kg/are) if pH is low.'},
        {'type':'warning','category':'💧 Water & Irrigation','icon':'💧',
         'message':'One extra watering per week during flowering can recover up to 20% of lost yield.'},
        {'type':'warning','category':'📋 Next Season Plan','icon':'📋',
         'message':f'Next season: apply DAP 0.5 kg/are at planting, add compost 20 kg/are two weeks before planting.'},
    ]


# ── In-memory stores ───────────────────────────────────────────────────────────
_predictions: list = []
_users: dict = {
    "F001": {"id":"F001","name":"Cesalie Uwimpuhwe","phone":"+250782001001",
             "sector":"Nyamata","farm_size_ha":0.25,"farm_size_are":25,
             "crops":["Maize","Beans"],"role":"farmer","password":"harvest2024"},
    "F002": {"id":"F002","name":"Jean Pierre Habimana","phone":"+250782002002",
             "sector":"Gashora","farm_size_ha":1.8,"farm_size_are":180,
             "crops":["Rice"],"role":"farmer","password":"harvest2024"},
    "F003": {"id":"F003","name":"Vestine Mukamana","phone":"+250782003003",
             "sector":"Juru","farm_size_ha":3.2,"farm_size_are":320,
             "crops":["Maize","Rice"],"role":"farmer","password":"harvest2024"},
    "A001": {"id":"A001","name":"Dr. Pascal Nkurunziza","phone":"+250788100100",
             "sector":"Bugesera","department":"Crop Production",
             "role":"officer","password":"harvest2024"},
}
_next_farmer = 4


# ═════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'api'      : 'Bugesera Harvest Prediction API v4.0',
        'status'   : 'running ✅',
        'units'    : 'ARE and kg/are (1 ha = 100 are)',
        'crops'    : CROPS,
        'sectors'  : SECTORS,
        'endpoints': {
            'POST /api/predict'          : 'Make a harvest prediction',
            'GET  /api/health'           : 'API health check',
            'POST /api/login'            : 'Login farmer/officer',
            'POST /api/register'         : 'Register new farmer',
            'GET  /api/predictions'      : 'Get predictions (?farmer_id=F001)',
            'GET  /api/district-stats'   : 'District-level statistics',
            'GET  /api/officer-dashboard': 'Officer dashboard data',
            'GET  /api/model-info'       : 'Model details',
            'GET  /api/crops'            : 'List crops',
            'GET  /api/sectors'          : 'List sectors',
        }
    })


@app.route('/api/health', methods=['GET'])
def health():
    best = META['best_model']
    r2   = META['_perf'].get(best, {}).get('r2', 0)
    return jsonify({
        'status'   : 'ok',
        'model'    : best,
        'accuracy' : f"{r2*100:.1f}%",
        'r2_score' : r2,
        'crops'    : CROPS,
        'sectors'  : SECTORS,
        'units'    : 'kg/are  (1 ha = 100 are)',
        'version'  : '4.0.0',
        'timestamp': datetime.now().isoformat(),
    })


@app.route('/api/login', methods=['POST'])
def login():
    d    = request.get_json() or {}
    uid  = d.get('id','').strip()
    pwd  = d.get('password','')
    role = d.get('role','farmer')

    if DB_ENABLED:
        try:
            user_row = get_farmer_by_id_or_phone(uid, role)
            if not user_row or user_row.get('password_hash') != pwd:
                return jsonify({'error': 'Invalid credentials.'}), 401
            update_last_login(user_row.get('farmer_id') or user_row.get('officer_id'), role)
            uid_key = 'farmer_id' if role == 'farmer' else 'officer_id'
            return jsonify({'success': True, 'user': {
                'id'          : user_row.get(uid_key),
                'name'        : user_row.get('full_name'),
                'phone'       : user_row.get('phone'),
                'role'        : role,
                'sector'      : user_row.get('sector_name') or user_row.get('sector',''),
                'farm_size_ha': user_row.get('farm_size_ha', 0),
                'farm_size_are': user_row.get('farm_size_are', 0),
                'crops'       : user_row.get('crops', []),
                'farmer_category': user_row.get('farmer_category','Medium'),
            }})
        except Exception as e:
            print(f"DB login error: {e}")

    # Fallback in-memory
    user = next((u for u in _users.values()
                 if (u['id'] == uid or
                     u.get('phone','').replace(' ','') == uid.replace(' ',''))
                 and u['password'] == pwd
                 and u['role'] == role), None)
    if user:
        return jsonify({'success': True,
                        'user': {k:v for k,v in user.items() if k != 'password'}})
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401


@app.route('/api/register', methods=['POST'])
def register():
    global _next_farmer
    d    = request.get_json() or {}
    role = d.get('role', 'farmer')

    required = (['name','phone','password','sector','farm_size_ha']
                if role == 'farmer' else ['name','phone','password','department'])
    for field in required:
        if not d.get(field):
            return jsonify({'error': f'Missing field: {field}'}), 400

    if any(u.get('phone','').replace(' ','') == d['phone'].replace(' ','')
           for u in _users.values()):
        return jsonify({'error': 'Phone number already registered'}), 400

    if role == 'officer':
        oc  = sum(1 for u in _users.values() if u['role'] == 'officer')
        nid = f"A{oc+1:03d}"
        _users[nid] = {'id':nid,'name':d['name'],'phone':d['phone'],
                       'sector':'Bugesera','department':d['department'],
                       'role':'officer','password':d['password']}
    else:
        farm_ha  = float(d['farm_size_ha'])
        farm_are = round(farm_ha * HA_TO_ARE, 2)
        nid      = f"F{_next_farmer:03d}"
        _next_farmer += 1
        _users[nid] = {'id':nid,'name':d['name'],'phone':d['phone'],
                       'sector':d['sector'],
                       'farm_size_ha': farm_ha,
                       'farm_size_are': farm_are,
                       'crops': d.get('crops', []),
                       'role':'farmer','password':d['password']}

    return jsonify({'success': True,
                    'user': {k:v for k,v in _users[nid].items() if k != 'password'}}), 201


@app.route('/api/predict', methods=['POST'])
def predict():
    d = request.get_json() or {}

    # Validate required fields
    required = ['crop', 'sector', 'season', 'farm_size']
    for field in required:
        if field not in d:
            return jsonify({'error': f'Missing required field: {field}'}), 400

    if d['crop'] not in CROPS:
        return jsonify({'error': f"Unknown crop '{d['crop']}'. Valid: {CROPS}"}), 400
    if d['sector'] not in SECTORS:
        return jsonify({'error': f"Unknown sector '{d['sector']}'. Valid: {SECTORS}"}), 400

    try:
        month  = d.get('month', 'October')
        season = d['season']

        # Build feature vector
        X = build_features(d)

        # Predict — model outputs kg/are directly
        yield_per_are  = float(model.predict(X)[0])
        yield_per_are  = max(1.0, round(yield_per_are, 2))   # floor at 1 kg/are
        yield_per_ha   = round(yield_per_are * HA_TO_ARE, 1)

        farm_size_are  = float(d['farm_size'])
        farm_size_ha   = round(farm_size_are * ARE_TO_HA, 4)
        area_planted_are = float(d.get('area_planted', farm_size_are * 0.9))
        total_yield_kg = round(yield_per_are * area_planted_are, 1)

        recs = get_recommendations(d['crop'], yield_per_are, d['sector'])

        best = META['best_model']
        r2   = META['_perf'].get(best, {}).get('r2', 0)

        # Get auto climate for display
        auto_clim = get_climate(month, season)

        result = {
            'id'                  : f"PRED-{uuid.uuid4().hex[:6].upper()}",
            'timestamp'           : datetime.now().isoformat(),
            'farmer_id'           : d.get('farmer_id', 'UNKNOWN'),
            'crop'                : d['crop'],
            'sector'              : d['sector'],
            'season'              : d['season'],
            'month'               : month,
            'planting_date'       : d.get('planting_date', ''),
            'farm_size_are'       : farm_size_are,
            'farm_size_ha'        : farm_size_ha,
            'area_planted_are'    : area_planted_are,
            'area_planted_ha'     : round(area_planted_are * ARE_TO_HA, 4),
            'yield_per_are_kg'    : yield_per_are,
            'yield_per_ha_kg'     : yield_per_ha,
            'total_yield_kg'      : total_yield_kg,
            'yield_range'         : f"{round(yield_per_are*0.92,1)}–{round(yield_per_are*1.08,1)} kg/are",
            'confidence_pct'      : round(r2 * 100, 1),
            'model_used'          : best,
            'district_avg_kg_are' : CROP_BENCHMARKS.get(d['crop'], 20.0),
            'soil_data'           : SECTOR_SOIL.get(d['sector'], {}),
            'inputs': {
                'temperature'     : auto_clim['temperature'],
                'rainfall'        : round(auto_clim['rainfall'] / 6, 1),  # back to monthly for display
                'humidity'        : auto_clim['humidity'],
                'sunshine'        : auto_clim['sunshine'],
                'fertilizer_used' : d.get('fertilizer_used', False),
                'irrigation_used' : d.get('irrigation_used', False),
                'soil_type'       : d.get('soil_type', 'Clay'),
                'farmer_category' : d.get('farmer_category', 'Medium'),
                'climate_source'  : 'auto (Bugesera historical avg)',
            },
            'recommendations'     : recs,
        }

        _predictions.append(result)
    if DB_ENABLED:
        try:
            save_prediction(result, result.get('recommendations', []))
        except Exception as e:
            print(f"DB save prediction error: {e}")
        return jsonify(result)

    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500


@app.route('/api/predictions', methods=['GET'])
def get_predictions():
    fid  = request.args.get('farmer_id')
    data = [p for p in _predictions if p.get('farmer_id') == fid] if fid else _predictions
    return jsonify({'count': len(data), 'predictions': data})


@app.route('/api/district-stats', methods=['GET'])
def district_stats():
    if DB_ENABLED:
        try:
            return jsonify(get_district_stats())
        except Exception as e:
            print(f"DB stats error: {e}")
    if not _predictions:
        return jsonify({
            'total_predictions': 0,
            'total_farmers'    : len([u for u in _users.values() if u['role']=='farmer']),
            'crop_stats'       : {c: {'avg_yield_kg_are': CROP_BENCHMARKS[c]} for c in CROPS},
            'sector_stats'     : {},
            'note'             : 'No predictions yet — showing benchmark values',
        })
    df = pd.DataFrame(_predictions)
    return jsonify({
        'total_predictions'   : len(df),
        'total_farmers'       : int(df['farmer_id'].nunique()),
        'avg_yield_per_are'   : round(float(df['yield_per_are_kg'].mean()), 2),
        'avg_yield_per_ha'    : round(float(df['yield_per_are_kg'].mean()) * 100, 1),
        'crop_stats'          : df.groupby('crop').agg(
            count=('yield_per_are_kg','count'),
            avg_yield_kg_are=('yield_per_are_kg','mean'),
            avg_total_kg=('total_yield_kg','mean')
        ).round(2).to_dict('index'),
        'sector_stats'        : df.groupby('sector')['yield_per_are_kg'].mean().round(2).to_dict(),
        'recent_predictions'  : df.tail(5)[['id','farmer_id','crop','sector',
                                            'yield_per_are_kg','total_yield_kg','timestamp']].to_dict('records'),
    })


@app.route('/api/officer-dashboard', methods=['GET'])
def officer_dashboard():
    if DB_ENABLED:
        try:
            return jsonify(get_officer_dashboard())
        except Exception as e:
            print(f"DB dashboard error: {e}")
    """Real-time data for officer dashboard based on actual predictions."""
    farmers = [u for u in _users.values() if u['role'] == 'farmer']
    preds   = _predictions

    # Sector yield summary
    sector_data = {}
    for sec in SECTORS:
        sec_preds = [p for p in preds if p.get('sector') == sec]
        sector_data[sec] = {
            'prediction_count' : len(sec_preds),
            'avg_yield_kg_are' : round(float(np.mean([p['yield_per_are_kg'] for p in sec_preds])), 2) if sec_preds else None,
            'farmer_count'     : len([f for f in farmers if f.get('sector') == sec]),
        }

    # Crop performance from predictions
    crop_data = {}
    for crop in CROPS:
        cp = [p for p in preds if p.get('crop') == crop]
        crop_data[crop] = {
            'prediction_count' : len(cp),
            'avg_yield_kg_are' : round(float(np.mean([p['yield_per_are_kg'] for p in cp])), 2) if cp else CROP_BENCHMARKS[crop],
            'benchmark_kg_are' : CROP_BENCHMARKS[crop],
        }

    return jsonify({
        'summary': {
            'total_farmers'     : len(farmers),
            'total_predictions' : len(preds),
            'registered_sectors': len(SECTORS),
            'model_accuracy'    : f"{META['_perf'].get(META['best_model'],{}).get('r2',0)*100:.1f}%",
        },
        'sector_data' : sector_data,
        'crop_data'   : crop_data,
        'recent_preds': preds[-10:][::-1] if preds else [],
        'farmers'     : [{'id':f['id'],'name':f['name'],'sector':f.get('sector',''),
                          'farm_size_ha':f.get('farm_size_ha',0),
                          'farm_size_are':f.get('farm_size_are',0)} for f in farmers],
    })


@app.route('/api/model-info', methods=['GET'])
def model_info():
    return jsonify({
        'best_model'     : META['best_model'],
        'features'       : FEATURES,
        'feature_count'  : len(FEATURES),
        'target'         : META['target'],
        'units'          : META.get('units', {}),
        'crops'          : CROPS,
        'sectors'        : SECTORS,
        'metrics'        : META.get('model_comparison', META['_perf']),
        'benchmarks_kg_are': CROP_BENCHMARKS,
        'yield_stats'    : META.get('yield_stats', {}),
    })


@app.route('/api/crops', methods=['GET'])
def get_crops():
    return jsonify(CROPS)


@app.route('/api/sectors', methods=['GET'])
def get_sectors():
    return jsonify(SECTORS)


@app.route('/api/farmer-stats/<farmer_id>', methods=['GET'])
def farmer_stats(farmer_id):
    if DB_ENABLED:
        try:
            return jsonify(get_farmer_stats(farmer_id))
        except Exception as e:
            print(f"DB farmer stats error: {e}")
    farmer = _users.get(farmer_id)
    if not farmer:
        return jsonify({'error': 'Farmer not found'}), 404
    preds = [p for p in _predictions if p.get('farmer_id') == farmer_id]
    return jsonify({
        'farmer'           : {k:v for k,v in farmer.items() if k != 'password'},
        'total_predictions': len(preds),
        'predictions'      : preds,
        'avg_yield_kg_are' : round(float(np.mean([p['yield_per_are_kg'] for p in preds])), 2) if preds else None,
    })



@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    d          = request.get_json() or {}
    identifier = d.get('identifier','').strip()
    new_pw     = d.get('new_password','')
    role       = d.get('role','farmer')

    if not identifier or not new_pw:
        return jsonify({'error': 'identifier and new_password are required'}), 400
    if len(new_pw) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    user = next((u for u in _users.values()
                 if (u['id'] == identifier or
                     u.get('phone','').replace(' ','') == identifier.replace(' ',''))
                 and u['role'] == role), None)

    if not user:
        return jsonify({'success': False, 'message': 'No account found with that phone/ID'}), 404

    if DB_ENABLED:
        try:
            ok = db_reset_password(identifier, new_pw, role)
            if ok:
                return jsonify({'success': True, 'message': 'Password reset successfully'})
        except Exception as e:
            print(f"DB reset error: {e}")
    user['password'] = new_pw
    return jsonify({'success': True, 'message': 'Password reset successfully', 'id': user.get('id','')})


# ── Init database on startup ──────────────────────────────────────────────────
if DB_ENABLED:
    try:
        init_db()
        print("  ✅ SQLite database ready (bugesera.db)")
    except Exception as e:
        print(f"  ⚠️  DB init error: {e} — falling back to in-memory")
        DB_ENABLED = False

# ═════════════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    best = META['best_model']
    r2   = META['_perf'].get(best, {}).get('r2', 0)
    mc   = META.get('model_comparison', {})
    print("\n" + "═" * 55)
    print("🌾  Bugesera Harvest Prediction API  v4.0")
    print("═" * 55)
    print(f"   Best Model  : {best}")
    print(f"   R² Score    : {r2:.4f}  ({r2*100:.1f}% accuracy)")
    if mc:
        for name, m in mc.items():
            r2  = m.get('r2_test', m.get('r2', 0))
            acc = m.get('accuracy', r2*100)
            print(f"   {name:22s}: R²={r2:.4f}  Acc={acc:.1f}%")
    print(f"   Crops       : {CROPS}")
    print(f"   Sectors     : {len(SECTORS)} sectors")
    print(f"   Units       : ARE and kg/are  (1 ha = 100 are)")
    print(f"   Target      : {META['target']}  ← model outputs kg/are directly")
    print(f"   Benchmarks  : Beans={CROP_BENCHMARKS['Beans']:.2f}, Maize={CROP_BENCHMARKS['Maize']:.2f}, Rice={CROP_BENCHMARKS['Rice']:.2f} kg/are")
    print(f"   Running     : http://localhost:5000")
    print("═" * 55 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
