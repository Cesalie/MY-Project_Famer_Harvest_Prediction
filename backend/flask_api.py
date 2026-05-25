"""
+==================================================================+
|   BUGESERA HARVEST PREDICTION SYSTEM - Flask REST API v4.0      |
|   Author  : Cesalie UWIMPUHWE | Rwanda Polytechnic               |
|   Units   : ARE (1 ha = 100 are) | Yield: kg/are                |
|   Models  : Gradient Boosting (best), Random Forest, Linear Reg |
+==================================================================+
"""

from flask import Flask, request, jsonify
import sys, pathlib, re
sys.path.insert(0, str(pathlib.Path(__file__).parent))
try:
    from database import (
        get_db, init_db, get_farmer, get_officer, get_user_by_email, get_farms, add_farm,
        register_farmer, register_officer, update_last_login,
        reset_password as db_reset_password, approve_prediction, get_sector_dashboard,
        save_prediction, get_predictions, get_district_stats,
        get_officer_dashboard, get_farmer_stats, get_all_sectors,
        get_sector, save_advice, get_farmer_advice,
        update_user, verify_password, save_report, get_reports_for_officer,
        get_all_users, toggle_user_status, get_system_settings, update_system_settings,
        get_sector_full_details
    )
    DB_ENABLED = init_db()  # Call init_db to check actual connectivity (reloaded)
except ImportError as e:
    DB_ENABLED = False
    print("[exclamation-triangle]️  database.py not found — using in-memory store")

from flask_cors import CORS
import numpy as np
import pandas as pd
import joblib
import json
import os
import uuid
from datetime import datetime
import base64
from email.mime.text import MIMEText
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

# ── Email configuration ───────────────────────────────────────────────────────
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
SMTP_USER = "tuyisengeelysee1@gmail.com"
SMTP_PASS = "vobk yjcw ajsa jrpw"
CONTACT_TO_EMAIL = "tuyisengeelysee1@gmail.com"

def send_email(to_email, subject, body_html, body_text=None):
    """Sends an email using SMTP with the provided configuration."""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = formataddr(("Bugesera Harvest System", SMTP_USER))
        msg['To'] = to_email

        if not body_text:
            body_text = "Please enable HTML to view this email."
        
        part1 = MIMEText(body_text, 'plain')
        part2 = MIMEText(body_html, 'html')

        msg.attach(part1)
        msg.attach(part2)

        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        
        print(f"  [check-circle] Email successfully sent to {to_email}")
        return True
    except Exception as e:
        print(f"  [x-circle] Failed to send email to {to_email}: {e}")
        return False

def get_registration_html(name, email, password, role):
    role_name = "Farmer" if role == 'farmer' else "Agricultural Officer"
    return f"""
    <html>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2e7d32; margin-bottom: 5px;">Bugesera Harvest System</h1>
            <p style="color: #666; font-size: 14px;">Optimizing Agriculture in Bugesera District</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #2e7d32; margin-top: 0;">Welcome, {name}!</h2>
            <p>Your registration as a <strong>{role_name}</strong> has been completed successfully. You can now access the system to manage your farm and predict harvests.</p>
            <div style="background-color: #fff; padding: 15px; border-left: 4px solid #2e7d32; margin: 20px 0;">
                <p style="margin: 0;"><strong>Your Credentials:</strong></p>
                <p style="margin: 5px 0;"><strong>Email:</strong> {email}</p>
                <p style="margin: 5px 0;"><strong>Password:</strong> {password}</p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
                <a href="http://localhost:5173/" style="background-color: #2e7d32; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Access System Now</a>
            </div>
        </div>
        <div style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">
            <p>If you did not register for this account, please contact us at {CONTACT_TO_EMAIL}</p>
            <p>&copy; 2024 Bugesera Harvest Prediction System. All rights reserved.</p>
        </div>
    </body>
    </html>
    """

def get_otp_html(name, otp, purpose="password reset"):
    return f"""
    <html>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2e7d32; margin-bottom: 5px;">Bugesera Harvest System</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #2e7d32; margin-top: 0;">Verification Code</h2>
            <p>Hello {name},</p>
            <p>You have requested a <strong>{purpose}</strong>. Please use the following One-Time Password (OTP) to complete the process:</p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2e7d32; background-color: #fff; padding: 10px 20px; border: 1px dashed #2e7d32; border-radius: 5px;">{otp}</span>
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
        </div>
        <div style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">
            <p>&copy; 2024 Bugesera Harvest Prediction System. All rights reserved.</p>
        </div>
    </body>
    </html>
    """

# OTP storage: {email: {"otp": "123456", "expires": datetime}}
_otps = {}

def generate_otp():
    import random
    return "".join([str(random.randint(0, 9)) for _ in range(6)])

# ── App setup ──────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from flask import send_file

BASE = os.path.dirname(os.path.abspath(__file__))

# ── Load ML artifacts ──────────────────────────────────────────────────────────
print("[arrow-repeat] Loading ML artifacts...")
try:
    model   = joblib.load(os.path.join(BASE, 'best_model.pkl'))
    scaler  = joblib.load(os.path.join(BASE, 'scaler.pkl'))
    le_dict = joblib.load(os.path.join(BASE, 'label_encoders.pkl'))
    print("  [check-circle] best_model.pkl")
    print("  [check-circle] scaler.pkl")
    print("  [check-circle] label_encoders.pkl")
except FileNotFoundError as e:
    raise SystemExit(f"[x-circle] Missing artifact: {e}\n   Run Harvest_Prediction_ML.ipynb first.")

# ── Load metadata ──────────────────────────────────────────────────────────────
META_PATH = os.path.join(BASE, 'model_metadata.json')
if not os.path.exists(META_PATH):
    raise SystemExit("[x-circle] model_metadata.json not found. Run the notebook first.")
with open(META_PATH) as f:
    META = json.load(f)
print("  [check-circle] model_metadata.json")

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

def send_sms(phone, message):
    """Simulate sending an SMS (logs to console for demo)."""
    print(f"\n[phone] [SIMULATED SMS SENT] To: {phone}")
    print(f"   [chat-dots] Message: {message}")
    print("   [check-circle] Status: Delivered to Bugesera Network\n")

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
    print(f"[exclamation-triangle]️  '{value}' not in {key} classes: {le.classes_.tolist()} — using fallback {fallback}")
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
    """
    Goal: Provide data-driven agricultural recommendations from harvest predictions
    to help farmers optimize planting schedules, resource use, and harvest planning.
    All cards include bilingual EN/RW messages so farmers can easily understand.
    """
    base = CROP_BENCHMARKS.get(crop, 20.0)
    pct  = (yield_pa - base) / base * 100

    if pct >= 20:
        return [
            {
                'type': 'success',
                'icon': 'bi-trophy',
                'category': 'Excellent Harvest! / Imyaka Myiza Cyane!',
                'message': f'Your predicted yield of {yield_pa:.1f} kg/are is {pct:.0f}% above the district average ({base:.1f} kg/are). Outstanding season! 🎉',
                'message_rw': f'Umusaruro wateganyijwe ni {yield_pa:.1f} kg/are, ni {pct:.0f}% hejuru y\'impuzandengo y\'akarere ({base:.1f} kg/are). Igihe cy\'isarura cyiza cyane! 🎉',
                'goal': 'Confirms excellent performance and encourages the farmer to sustain good practices.',
                'goal_rw': 'Kwemeza umusaruro mwiza cyane no gushishikariza umuhinzi gukomeza gukoresha uburyo bwiza bw\'ubuhinzi.'
            },
            {
                'type': 'success',
                'icon': 'bi-box-seam',
                'category': 'Storage Planning / Gutegura Ububiko bw\'Imyaka',
                'message': 'Prepare hermetic storage bags or silo space now. Seal grain within 48 hours of harvest to prevent aflatoxin and pest damage — this protects 100% of your yield value.',
                'message_rw': 'Tegura imifuko itinjiza umwuka cyangwa ububiko (silo) ubu. Fungira imyaka mu masaha 48 nyuma yo gusarura kugira ngo wirinde aflatoxin n\'udukoko — ibi birinda agaciro k\'umusaruro wawe 100%.',
                'goal': 'Helps farmer plan post-harvest storage to reduce losses (typically 20-30% without proper storage).',
                'goal_rw': 'Gufasha umuhinzi guteganyiriza ububiko nyuma yo gusarura kugira ngo agabanye igihombo (busanzwe kigera kuri 20-30% iyo nta bubiko bwiza buhari).'
            },
            {
                'type': 'success',
                'icon': 'bi-cash-stack',
                'category': 'Market & Sell Smart / Kugurisha ku Isoko mu Buryo Bwenge',
                'message': 'Contact the Bugesera cooperative market before harvest to lock in a fair price. Sell 70% early at market price and store 30% as quality seed for next season.',
                'message_rw': 'Baza isoko rya koperative yo muri Bugesera mbere yo gusarura kugira ngo ubone igiciro cyiza. Gurisha 70% vuba ku giciro cy\'isoko, hanyuma ubike 30% nk\'imbuto nziza y\'igihe gikurikira.',
                'goal': 'Guides the farmer on optimal selling strategy to maximize income and prepare for next planting season.',
                'goal_rw': 'Kuyobora umuhinzi ku buryo bwiza bwo kugurisha kugira ngo yongere inyungu kandi ategure igihe cyo gutera gikurikira.'
            },
            {
                'type': 'success',
                'icon': 'bi-calendar-check',
                'category': 'Next Season Planning / Gutegura Igihe cy\'Ihinga Gikurikira',
                'message': f'Repeat the same fertilizer and soil management practices — they worked! Save the biggest and healthiest {crop} grains from this harvest as seed for next season.',
                'message_rw': f'Komeza gukoresha ifumbire n\'uburyo bwo gufata neza ubutaka — byagize akamaro! Bika imbuto nziza n\'izishishikaritse za {crop} kuva muri aya masarura kugira ngo uzazitere mu gihe gikurikira.',
                'goal': 'Encourages sustainable farming by replicating successful practices and saving good seed for continuity.',
                'goal_rw': 'Gushishikariza ubuhinzi burambye binyuze mu gusubiramo uburyo bwagize akamaro no kubika imbuto nziza.'
            },
            {
                'type': 'success',
                'icon': 'bi-graph-up-arrow',
                'category': 'Reinvest Profits / Gushora Inyungu mu Buhinga',
                'message': 'Use part of this season\'s profit to invest in drip irrigation or expand your planted area next season. This can increase long-term yield by 25–40%.',
                'message_rw': 'Koresha igice cy\'inyungu wungutse uyu munsi mu gushora mu buryo bwo kuhira cyangwa kwagura ubuso bw\'ubutaka uteraho mu gihe gikurikira. Ibi bishobora kongera umusaruro w\'igihe kirekire ku kigero cya 25-40%.',
                'goal': 'Promotes long-term farm productivity growth by reinvesting seasonal profits into infrastructure.',
                'goal_rw': 'Guteza imbere umusaruro w\'igihe kirekire binyuze mu gushora inyungu z\'igihe cy\'isarura mu bikorwa remezo.'
            },
        ]

    if pct > -20:
        return [
            {
                'type': 'info',
                'icon': 'bi-bar-chart-line',
                'category': 'Good Average Harvest / Isarura Nziza Igiranye n\'Impuzandengo',
                'message': f'Your predicted yield of {yield_pa:.1f} kg/are is close to the district average ({base:.1f} kg/are) — a solid season. Small improvements can push you into the excellent category.',
                'message_rw': f'Umusaruro wateganyijwe ni {yield_pa:.1f} kg/are, wegereye impuzandengo y\'akarere ({base:.1f} kg/are) — igihe cy\'isarura cyiza. Impinduka nto zishobora kugushyira mu cyiciro cy\'umusaruro mwiza cyane.',
                'goal': 'Sets realistic expectations and motivates the farmer to aim higher through small improvements.',
                'goal_rw': 'Gushyiraho intego zishoboka no gushishikariza umuhinzi gushaka ibyiza birenzeho binyuze mu mpinduka nto.'
            },
            {
                'type': 'info',
                'icon': 'bi-bug',
                'category': 'Pest Scouting / Kureba udukoko n\'indwara',
                'message': 'Scout your fields for pests every 7 days during the last 4 weeks before harvest. A late pest attack can reduce your yield by 15–20% in just days — early action is key.',
                'message_rw': 'Jya ugenzura udukoko mu mirima yawe buri minsi 7 mu byumweru 4 bya nyuma mbere yo gusarura. Igitero cy\'udukoko kije gutinda gishobora kugabanya umusaruro wawe ku kigero cya 15-20% mu minsi mike — gutangira kare ni ingenzi.',
                'goal': 'Reduces late-season crop losses by building a consistent pest monitoring habit during the critical pre-harvest window.',
                'goal_rw': 'Kugabanya igihombo cy\'imyaka mu gihe cy\'isarura binyuze mu kumenyereza uburyo bwo kugenzura udukoko buri gihe.'
            },
            {
                'type': 'info',
                'icon': 'bi-box-seam',
                'category': 'Storage Preparation / Gutegura Ububiko',
                'message': 'Dry your grain to below 13% moisture content before storing. Use hermetic (airtight) bags to keep quality for 3–6 months and avoid selling at low prices immediately after harvest.',
                'message_rw': 'Yubika imyaka yawe kugeza munsi y\'ubumidure bwa 13% mbere yo kuyibika. Koresha imifuko itinjiza umwuka (hermetic) kugira ngo imyaka igumane umwimerere mu mezi 3-6 kandi wirinde kugurisha ku giciro gito hejuru y\'isarura.',
                'goal': 'Prevents post-harvest losses from moisture and pests, and enables the farmer to sell at better off-season prices.',
                'goal_rw': 'Kukumira igihombo nyuma yo gusarura bivuye ku bumidure n\'udukoko, kandi bigafasha umuhinzi kugurisha ku giciro cyiza mu gihe imyaka yabuze.'
            },
            {
                'type': 'info',
                'icon': 'bi-graph-up',
                'category': 'Improve Next Season / Kunoza Igihe cy\'Ihingasizaho',
                'message': f'To reach the excellent yield category: apply DAP fertilizer (0.5 kg/are) at planting and add compost (20 kg/are) two weeks before. These changes can boost your {crop} yield by 20–30% next season.',
                'message_rw': f'Kugira ngo ugere mu cyiciro cy\'umusaruro mwiza cyane: koresha ifumbire ya DAP (0.5 kg/are) igihe uteye kandi wongereho kompositi (20 kg/are) ibyumweru bibiri mbere. Ibi bishobora kongera umusaruro wa {crop} wawe ku kigero cya 20-30% mu gihe gukurikira.',
                'goal': 'Provides specific, actionable agronomy advice to help the farmer improve their yield in the next growing season.',
                'goal_rw': 'Gutanga inama zifatika z\'ubuhinzi kugira ngo zifashe umuhinzi kongera umusaruro we mu gihe cy\'ihinga gikurikira.'
            },
            {
                'type': 'info',
                'icon': 'bi-cash-stack',
                'category': 'Market Strategy / Ingamba zo ku Isoko',
                'message': 'Sell 60% of your harvest within the first month after harvest when your quality is at its best. Store the remaining 40% in hermetic bags for sale 2–3 months later at higher off-season prices.',
                'message_rw': 'Gurisha 60% by\'isarura ryawe mu kwezi kwa mbere nyuma yo gusarura igihe imyaka ifite umwimerere mwiza. Bika 40% isigaye mu mifuko itinjiza umwuka kugira ngo uzayigurishe nyuma y\'amezi 2-3 ku giciro cyo hejuru igihe isoko rimeze neza.',
                'goal': 'Helps farmer plan optimal selling schedule to maximize income from a good-but-not-peak season.',
                'goal_rw': 'Gufasha umuhinzi guteganya gahunda nziza yo kugurisha kugira ngo yongere inyungu niyo isarura ryaba ritarageze ku rwego rwo hejuru cyane.'
            },
        ]

    return [
        {
            'type': 'warning',
            'icon': 'bi-exclamation-triangle',
            'category': 'Below-Average Harvest / Isarura riri munsi y\'impuzandengo',
            'message': f'Predicted yield of {yield_pa:.1f} kg/are is {abs(pct):.0f}% below the district average ({base:.1f} kg/are). Act now — there is still time to improve outcomes before harvest.',
            'message_rw': f'Umusaruro wateganyijwe ni {yield_pa:.1f} kg/are, uri kuri {abs(pct):.0f}% munsi y\'impuzandengo y\'akarere ({base:.1f} kg/are). Gira icyo ukora ubu — haracyari igihe cyo kunoza isarura mbere y\'uko rirenga.',
            'goal': 'Alerts the farmer early so they can take corrective action before the season ends.',
            'goal_rw': 'Kugaragariza umuhinzi hakiri kare kugira ngo afate ingamba zo gukosora mbere y\'uko igihe cy\'ihinga kirangira.'
        },
        {
            'type': 'warning',
            'icon': 'bi-person-lines-fill',
            'category': 'Contact Extension Officer / Baza Umunyamwuga w\'Ubuhinzi',
            'message': 'Contact the RAB extension officer in your sector this week. Bring your farm records and this prediction report. They can identify the specific cause and give you a free soil or crop rescue plan.',
            'message_rw': 'Baza umunyamwuga w\'ubuhinzi (agronome) wo muri kagari cyangwa umurenge wawe muri iki cyumweru. Jyana amakuru yawe n\'iyi raporo y\'umusaruro wateganyijwe. Ashobora kumenya impamvu nyayo kandi akaguha gahunda y\'ubufasha mu kurokora imyaka yawe.',
            'goal': 'Connects the farmer to free professional support so they can accurately diagnose and address the root cause of low yield.',
            'goal_rw': 'Guhuza umuhinzi n\'ubufasha bw\'abanyamwuga kugira ngo bamusuzumire neza impamvu itera umusaruro muke kandi bayishakire umuti.'
        },
        {
            'type': 'warning',
            'icon': 'bi-eyedropper',
            'category': 'Soil pH Test / Ipimo rya pH y\'Ubutaka',
            'message': f'Schedule a soil pH test as soon as possible. A pH below 5.5 is the most common cause of poor {crop} yields in Bugesera. If pH is low, apply agricultural lime at 2 kg/are — cost is very low but recovery is significant.',
            'message_rw': f'Teganya gupimisha pH y\'ubutaka vuba bishoboka. pH iri munsi ya 5.5 ni yo mpamvu ikunze gutera umusaruro muke wa {crop} muri Bugesera. Niba pH iri hasi, koresha ishwagara y\'ubuhinzi (agricultural lime) ku kigero cya 2kg/are — igiciro ni gito cyane ariko inyungu uzahakura ni nini.',
            'goal': 'Addresses the most common agronomic root cause of below-average yields in the district with a specific, affordable solution.',
            'goal_rw': 'Gukemura impamvu y\'ubuhinzi ikunze gutera umusaruro muke mu karere ukoresheje igisubizo cyihariye kandi gihendutse.'
        },
        {
            'type': 'warning',
            'icon': 'bi-droplet-half',
            'category': 'Water Management / Gucunga Amazi',
            'message': 'If you have irrigation access, add one extra watering session per week during the flowering and grain-fill stage. This single action can recover up to 20% of expected lost yield.',
            'message_rw': 'Niba ufite uburyo bwo kuhira, ongeraho inshuro imwe yo kuhira buri cyumweru mu gihe cy\'uburabyo n\'igihe imyaka ishyira amagara. Iki gikorwa kimwe gishobora kigarura kugeza kuri 20% by\'umusaruro washoboraga guhomba.',
            'goal': 'Provides a simple, high-impact action to partially recover yield loss during the critical crop-fill period.',
            'goal_rw': 'Gutanga igikorwa cyoroshye ariko gifite akamaro kanini mu kugarura igice cy\'umusaruro washoboraga guhomba mu gihe gikomeye cy\'imikure y\'ibihingwa.'
        },
        {
            'type': 'warning',
            'icon': 'bi-clipboard-check',
            'category': 'Next Season Recovery Plan / Gahunda yo Kugarura Umusaruro mu Gihe Gikurikira',
            'message': f'For next season, start strong: apply DAP fertilizer at 0.5 kg/are at planting time, and add 20 kg/are of compost two weeks before planting. Also consider crop rotation — avoid planting {crop} in the same field two seasons in a row.',
            'message_rw': f'Mu gihe cy\'ihinga gikurikira, tangirira ku ntego: koresha ifumbire ya DAP ku kigero cya 0.5kg/are igihe utera, kandi wongereho 20kg/are za kompositi ibyumweru bibiri mbere yo gutera. Nanone tekereza guhinduranya ibihingwa — irinda gutera {crop} mu murima umwe ibihe bibiri bikurikiranye.',
            'goal': 'Gives the farmer a clear, structured recovery plan to significantly improve performance in the following planting season.',
            'goal_rw': 'Guha umuhinzi gahunda isobanutse yo kwiyuburura kugira ngo yongere umusaruro we mu buryo bugaragara mu gihe cy\'ihinga gikurikira.'
        },
    ]


# ── In-memory stores ───────────────────────────────────────────────────────────
_predictions: list = []
_users: dict = {
    "F001": {"id":"F001","name":"Cesalie Uwimpuhwe","phone":"+250782001001", "email":"cesalie@gmail.com",
             "sector":"Nyamata","farm_size_ha":0.25,"farm_size_are":25,
             "crops":["Maize","Beans"],"role":"farmer","password":"harvest2024"},
    "F002": {"id":"F002","name":"Jean Pierre Habimana","phone":"+250782002002", "email":"jean@gmail.com",
             "sector":"Gashora","farm_size_ha":1.8,"farm_size_are":180,
             "crops":["Rice"],"role":"farmer","password":"harvest2024"},
    "F003": {"id":"F003","name":"Vestine Mukamana","phone":"+250782003003", "email":"vestine@gmail.com",
             "sector":"Juru","farm_size_ha":3.2,"farm_size_are":320,
             "crops":["Maize","Rice"],"role":"farmer","password":"harvest2024"},
    "A001": {"id":"A001","name":"Dr. Pascal Nkurunziza","phone":"+250788100100", "email":"pascal@district.gov.rw",
             "sector":"Bugesera","department":"Crop Production",
             "role":"officer","password":"harvest2024"},
    "A100": {"id":"A100","name":"District Agri Officer","phone":"+250788000000", "email":"admin@bugesera.gov.rw",
             "sector":"Bugesera","department":"Administration",
             "role":"district","password":"harvest2024"},
    "S001": {"id":"S001","name":"Marie Mukaso","phone":"+250788222333", "email":"marie@sector.gov.rw",
             "sector":"Nyamata","department":"Extension Services",
             "role":"sector","password":"harvest2024"},
}
_next_farmer = 4


# ═════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'api'      : 'Bugesera Harvest Prediction API v4.0',
        'status'   : 'running [check-circle]',
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


# ── OTP and Password Routes ──────────────────────────────────────────────────

@app.route('/api/forgot-password/request', methods=['POST'])
def forgot_password_request():
    d = request.get_json() or {}
    email = d.get('email', '').strip().lower()
    role = d.get('role', 'farmer')

    if not email:
        return jsonify({'error': 'Email is required.'}), 400

    user = None
    if DB_ENABLED:
        try:
            user = get_user_by_email(email)
        except Exception as e:
            print(f"DB error in forgot password request: {e}")
    
    # Fallback in-memory
    if not user:
        user = next((u for u in _users.values() if u.get('email', '').lower() == email and u['role'] == role), None)

    if not user:
        return jsonify({'error': 'No account found with this email address.'}), 404

    otp = generate_otp()
    from datetime import datetime, timedelta
    _otps[email] = {
        'otp': otp,
        'expires': datetime.now() + timedelta(minutes=10),
        'user_id': user.get('id') or user.get('farmer_id') or user.get('officer_id'),
        'role': role
    }

    html_content = get_otp_html(user.get('full_name') or user.get('name', 'User'), otp, "password reset")
    if send_email(email, "Your Password Reset OTP", html_content):
        return jsonify({'success': True, 'message': 'OTP sent to your email.'})
    else:
        return jsonify({'error': 'Failed to send OTP. Please try again later.'}), 500

@app.route('/api/forgot-password/verify', methods=['POST'])
def forgot_password_verify():
    d = request.get_json() or {}
    email = d.get('email', '').strip().lower()
    otp = d.get('otp', '').strip()
    new_pw = d.get('new_password', '').strip()

    if not all([email, otp, new_pw]):
        return jsonify({'error': 'Email, OTP, and new password are required.'}), 400

    otp_data = _otps.get(email)
    if not otp_data:
        return jsonify({'error': 'No OTP request found for this email.'}), 400

    from datetime import datetime
    if datetime.now() > otp_data['expires']:
        del _otps[email]
        return jsonify({'error': 'OTP has expired.'}), 400

    if otp_data['otp'] != otp:
        return jsonify({'error': 'Invalid OTP.'}), 400

    # OTP is valid, reset password
    uid = otp_data['user_id']
    role = otp_data['role']

    if DB_ENABLED:
        try:
            from database import update_user_password
            if update_user_password(uid, role, new_pw):
                del _otps[email]
                return jsonify({'success': True, 'message': 'Password reset successfully.'})
        except Exception as e:
            print(f"DB error in forgot password verify: {e}")

    # Fallback in-memory
    user = _users.get(uid)
    if user:
        user['password'] = new_pw
        del _otps[email]
        return jsonify({'success': True, 'message': 'Password reset successfully.'})

    return jsonify({'error': 'Failed to reset password. User not found or database update failed.'}), 400

@app.route('/api/change-password/request-otp', methods=['POST'])
def change_password_request_otp():
    d = request.get_json() or {}
    uid = d.get('user_id')
    role = d.get('role', 'farmer')
    old_pw = d.get('old_password', '').strip()

    if not all([uid, old_pw]):
        return jsonify({'error': 'User ID and current password are required.'}), 400

    user = None
    if DB_ENABLED:
        try:
            from database import verify_password, get_farmer, get_officer
            if verify_password(uid, role, old_pw):
                user = get_farmer(uid) if role == 'farmer' else get_officer(uid)
            else:
                return jsonify({'error': 'Current password is incorrect.'}), 401
        except Exception as e:
            print(f"DB error in change password request: {e}")

    # Fallback in-memory
    if not user:
        mem_user = _users.get(uid)
        if mem_user and mem_user.get('password') == old_pw:
            user = mem_user
        else:
            return jsonify({'error': 'Current password is incorrect.'}), 401

    email = user.get('email')
    if not email:
        return jsonify({'error': 'User email not found.'}), 400

    otp = generate_otp()
    from datetime import datetime, timedelta
    _otps[email] = {
        'otp': otp,
        'expires': datetime.now() + timedelta(minutes=10),
        'user_id': uid,
        'role': role
    }

    html_content = get_otp_html(user.get('full_name') or user.get('name', 'User'), otp, "password change")
    if send_email(email, "Your Password Change OTP", html_content):
        return jsonify({'success': True, 'message': 'OTP sent to your email.'})
    else:
        return jsonify({'error': 'Failed to send OTP. Please try again later.'}), 500

@app.route('/api/change-password/verify', methods=['POST'])
def change_password_verify():
    d = request.get_json() or {}
    uid = d.get('user_id')
    role = d.get('role', 'farmer')
    otp = d.get('otp', '').strip()
    new_pw = d.get('new_password', '').strip()

    if not all([uid, otp, new_pw]):
        return jsonify({'error': 'All fields are required.'}), 400

    user = None
    if DB_ENABLED:
        try:
            from database import get_farmer, get_officer
            user = get_farmer(uid) if role == 'farmer' else get_officer(uid)
        except Exception as e:
            print(f"DB error in change password verify: {e}")
    
    if not user:
        user = _users.get(uid)
    
    if not user:
        return jsonify({'error': 'User not found.'}), 404

    email = user.get('email')
    otp_data = _otps.get(email)

    if not otp_data or otp_data['user_id'] != uid:
        return jsonify({'error': 'No OTP request found.'}), 400

    from datetime import datetime
    if datetime.now() > otp_data['expires']:
        del _otps[email]
        return jsonify({'error': 'OTP has expired.'}), 400

    if otp_data['otp'] != otp:
        return jsonify({'error': 'Invalid OTP.'}), 400

    # OTP is valid, update password
    if DB_ENABLED:
        try:
            from database import update_user_password
            if update_user_password(uid, role, new_pw):
                del _otps[email]
                return jsonify({'success': True, 'message': 'Password updated successfully.'})
        except Exception as e:
            print(f"DB error in update password: {e}")

    # Fallback in-memory
    if uid in _users:
        _users[uid]['password'] = new_pw
        del _otps[email]
        return jsonify({'success': True, 'message': 'Password updated successfully.'})

    return jsonify({'error': 'Failed to update password. User not found or database update failed.'}), 400

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
    d         = request.get_json() or {}
    ident     = d.get('email', '').strip().lower()
    pwd       = d.get('password', '').strip()

    print(f"[DEBUG] Login attempt for ident: '{ident}'")

    if DB_ENABLED:
        try:
            # Flexible lookup: Email, ID, or Phone
            user_row = get_user_by_email(ident)
            if not user_row:
                # Fallback to ID or Phone search in DB if get_user_by_email only does email
                from database import get_farmer_by_id_or_phone
                user_row = get_farmer_by_id_or_phone(ident, 'farmer') or get_farmer_by_id_or_phone(ident, 'officer')

            if user_row:
                print(f"[DEBUG] Found user in DB: {user_row['id']}")
                # Basic password check (assuming cleartext or hash match)
                if user_row.get('password_hash') == pwd or user_row.get('password') == pwd:
                    update_last_login(user_row['id'], user_row['role'])
                    return jsonify({'success': True, 'user': {
                        'id'          : user_row['id'],
                        'name'        : user_row.get('full_name') or user_row.get('name'),
                        'email'       : user_row.get('email'),
                        'phone'       : user_row.get('phone'),
                        'role'        : user_row['role'],
                        'sector'      : user_row.get('sector_name') or user_row.get('sector',''),
                        'sector_id'   : user_row.get('sector_id'),
                        'farm_size_ha': user_row.get('farm_size_ha', 0),
                        'farm_size_are': user_row.get('farm_size_are', 0),
                        'crops'       : user_row.get('crops', []),
                        'farmer_category': user_row.get('farmer_category','Medium'),
                    }})
                else:
                    print(f"[DEBUG] Password mismatch for DB user")
        except Exception as e:
            print(f"DB login error: {e}")

    # Fallback in-memory
    ident_lower = ident.lower()
    user = next((u for u in _users.values() if (
        (u.get('email') and u.get('email').lower() == ident_lower) or 
        (u.get('id') and u.get('id').lower() == ident_lower) or 
        (u.get('phone') == ident)
    ) and u['password'] == pwd), None)
    
    if user:
        print(f"[DEBUG] Found user in-memory: {user['id']}")
        return jsonify({'success': True, 'user': {k:v for k,v in user.items() if k != 'password'}})
    
    print(f"[DEBUG] Login failed for ident: '{ident}'")

    return jsonify({'success': False, 'error': 'Invalid credentials.'}), 401


@app.route('/api/change-password', methods=['POST'])
def change_password():
    d = request.get_json() or {}
    uid = d.get('user_id')
    role = d.get('role', 'farmer')
    old_pwd = d.get('old_password')
    new_pwd = d.get('new_password')

    if not all([uid, old_pwd, new_pwd]):
        return jsonify({'success': False, 'error': 'Missing required fields.'}), 400

    # 1. Verification and Update in DB
    if DB_ENABLED:
        try:
            from database import get_farmer, get_user_by_email, update_user_password
            # Verify old password first
            user_row = None
            if role == 'farmer':
                user_row = get_farmer(uid)
            else:
                # Officers don't have a simple get_officer, but we can find them in _users if needed
                # or just use update directly if we trust the session (but here we check old_pwd)
                pass 

            # Direct check if we can get the user
            if user_row:
                db_pwd = user_row.get('password') or user_row.get('password_hash')
                if db_pwd != old_pwd:
                    return jsonify({'success': False, 'error': 'Current password is incorrect.'}), 401
                
                success = update_user_password(uid, role, new_pwd)
                if success:
                    return jsonify({'success': True, 'message': 'Password updated in database.'})
        except Exception as e:
            print(f"DB change-password error: {e}")

    # 2. Fallback / Update in Memory
    user = _users.get(uid)
    if user:
        if user.get('password') != old_pwd:
            return jsonify({'success': False, 'error': 'Current password is incorrect.'}), 401
        user['password'] = new_pwd
        return jsonify({'success': True, 'message': 'Password updated successfully.'})

    return jsonify({'success': False, 'error': 'User not found.'}), 404


@app.route('/api/register', methods=['POST'])
def register():
    global _next_farmer
    d    = request.get_json() or {}
    role = d.get('role', 'farmer')

    required = ['name','email']
    if role != 'farmer':
        required.append('department')
        if role == 'sector':
            required.append('sector')

    for field in required:
        if not d.get(field):
            return jsonify({'error': f'Missing field: {field}'}), 400

    # Strict Email Validation
    email_val = d.get('email', '').strip().lower()
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email_val):
        return jsonify({'error': 'Invalid email format. Please use a real email address (e.g., user@example.com).'}), 400
    
    if any(c.isupper() for c in d.get('email', '')):
        return jsonify({'error': 'Email cannot contain capital letters. Please use small letters and numbers only.'}), 400
    
    if role == 'farmer' and not email_val.endswith('@gmail.com'):
        return jsonify({'error': 'Farmer registration requires a valid Gmail account (@gmail.com).'}), 400

    if DB_ENABLED:
        try:
            from database import check_email_exists
            
            email_normalized = d['email'].strip().lower()
            if check_email_exists(email_normalized):
                return jsonify({'error': 'This email is already registered. Please login with your existing account.'}), 400
            
            d['email'] = email_normalized # Ensure normalized email is used for registration
            
            if role == 'farmer':
                user = register_farmer(d)
                user['role'] = 'farmer'
                
                # 1. Automatically create their first farm
                try:
                    from database import add_farm, save_advice
                    add_farm({
                        'farmer_id': user['farmer_id'],
                        'farm_name': 'Primary Farm',
                        'sector': d.get('sector'),
                        'farm_size_are': float(d.get('farm_size_ha', 0)) * 100
                    })
                    
                    # 2. Create Welcome Notification (Advice)
                    generated_pw = user.get('generated_password', 'harvest2024')
                    welcome_subject = "Welcome to Bugesera Harvest Predictor!" if d.get('lang') != 'rw' else "Murakaza neza muri Sisitemu y'Imyaka!"
                    
                    # 3. Send Beautiful Email
                    html_content = get_registration_html(user['full_name'], user['email'], generated_pw, 'farmer')
                    send_email(user['email'], welcome_subject, html_content)
                    
                    # Save notification to DB for in-app viewing
                    welcome_msg = f"Hello {user['full_name']}, your account has been created. ID: {user['farmer_id']}, PW: {generated_pw}"
                    save_advice('A001', {
                        'farmer_id': user['farmer_id'],
                        'subject': welcome_subject,
                        'message': welcome_msg,
                        'advice_type': 'system'
                    })
                    
                except Exception as fe:
                    print(f"Initial farm/notification creation failed: {fe}")
            else:
                user = register_officer(d)
                # 4. Send Beautiful Email for Officers
                try:
                    gen_pw = user.get('generated_password', 'harvest2024')
                    officer_subject = "Your Agriculture Officer Account" if d.get('lang') != 'rw' else "Konti yawe ya Ofisiye w'Ubuhinzi"
                    html_content = get_registration_html(user.get('full_name') or user.get('name'), user['email'], gen_pw, user['role'])
                    send_email(user['email'], officer_subject, html_content)
                except Exception as oe:
                    print(f"Officer email send failed: {oe}")
                
            return jsonify({'success': True, 'user': user, 'generated_password': user.get('generated_password')}), 201
        except Exception as e:
            print(f"DB registration error: {e}")
            return jsonify({'error': f'Database error: {str(e)}. Please check if MySQL is running.'}), 500

    return jsonify({'error': 'Registration failed. Backend in-memory mode active.'}), 500

@app.route('/api/officers', methods=['GET'])
def list_officers():
    if not DB_ENABLED:
        return jsonify({'success': True, 'officers': []})
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT o.officer_id as id, o.full_name as name, o.email, o.department, o.officer_type as role, s.sector_name as sector
                    FROM officers o
                    LEFT JOIN sectors s ON o.sector_id = s.sector_id
                    WHERE o.is_active = 1
                """)
                return jsonify({'success': True, 'officers': cur.fetchall()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/farms', methods=['GET', 'POST'])
def manage_farms():
    if not DB_ENABLED:
        return jsonify({'error': 'DB essentially required for this feature.'}), 500
    if request.method == 'POST':
        data = request.get_json()
        if not data.get('farmer_id') or not data.get('farm_name'):
            return jsonify({'error': 'Missing required fields'}), 400
        farm = add_farm(data)
        return jsonify({'success': True, 'farm': farm})
    else:
        farmer_id = request.args.get('farmer_id')
        if not farmer_id: return jsonify({'error': 'Missing farmer_id'}), 400
        farms = get_farms(farmer_id)
        return jsonify({'success': True, 'farms': farms})

@app.route('/api/predictions/approve', methods=['POST'])
def approve_pred():
    if not DB_ENABLED: return jsonify({'error': 'DB required'}), 500
    d = request.get_json()
    pid = d.get('prediction_id')
    if approve_prediction(pid):
        return jsonify({'success': True})
    return jsonify({'error': 'Failed to approve'}), 400

@app.route('/api/predict', methods=['POST'])
def predict():
    d = request.get_json() or {}

    # Smart Sector Detection
    farmer_id = d.get('farmer_id')
    sector    = d.get('sector')
    
    if not sector and farmer_id and DB_ENABLED:
        try:
            from database import get_farmer
            f = get_farmer(farmer_id)
            if f: 
                sector = f.get('sector')
                print(f"  [search] Smart Sector: Auto-detected {sector} for {farmer_id}")
        except: pass

    # If still no sector, try in-memory fallback
    if not sector and farmer_id and farmer_id in _users:
        sector = _users[farmer_id].get('sector')

    # Validate required fields
    required = ['crop', 'season', 'farm_size']
    for field in required:
        if field not in d:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    if not sector:
        return jsonify({'error': 'Sector location is required and could not be auto-detected.'}), 400

    if d['crop'] not in CROPS:
        return jsonify({'error': f"Unknown crop '{d['crop']}'. Valid: {CROPS}"}), 400
    if sector not in SECTORS:
        return jsonify({'error': f"Unknown sector '{sector}'. Valid: {SECTORS}"}), 400

    try:
        month  = d.get('month', 'October')
        season = d['season']
        # Update dict so build_features sees the auto-detected sector
        d['sector'] = sector 

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
        # Dynamic Confidence Score based on user inputs
        conf = (r2 * 100) if r2 > 0 else 84.8
        
        # Adjust base on factors:
        if d.get('fertilizer_used') == True or d.get('fertilizer_used') == 'Yes': conf += 1.5
        if d.get('irrigation_used') == True or d.get('irrigation_used') == 'Yes': conf += 2.0
        pest = d.get('pest_pressure', 'Low')
        if pest == 'High': conf -= 4.5
        elif pest == 'Medium': conf -= 1.0
        else: conf += 1.0
        
        if d.get('extension_access') == 'Yes': conf += 1.2
        if d.get('credit_access') == 'Yes': conf += 0.8
        
        # Cap confidence between 75% and 98% for realism
        dynamic_conf = max(75.0, min(98.0, round(conf, 1)))

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
            'confidence_pct'      : dynamic_conf,
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
                db_pred = {
                    'prediction_id'    : result['id'],
                    'farmer_id'        : result.get('farmer_id','UNKNOWN'),
                    'crop_type'        : result.get('crop'),
                    'crop'             : result.get('crop'),
                    'sector'           : result.get('sector'),
                    'season'           : result.get('season'),
                    'month'            : result.get('month'),
                    'planting_date'    : result.get('planting_date') or datetime.now().strftime('%Y-%m-%d'),
                    'year'             : datetime.now().year,
                    'area_planted_are' : result.get('area_planted_are'),
                    'soil_type'        : result.get('inputs',{}).get('soil_type','Clay'),
                    'fertilizer_used'  : 'Yes' if result.get('inputs',{}).get('fertilizer_used') else 'No',
                    'irrigation_used'  : 'Yes' if result.get('inputs',{}).get('irrigation_used') else 'No',
                    'previous_crop'    : d.get('previous_crop','Beans'),
                    'pest_pressure'    : d.get('pest_pressure','Low'),
                    'labor_availability': d.get('labor_availability','Adequate'),
                    'extension_access' : d.get('extension_access','Yes'),
                    'credit_access'    : d.get('credit_access','No'),
                    'yield_per_are_kg' : result.get('yield_per_are_kg'),
                    'yield_per_ha_kg'  : result.get('yield_per_ha_kg'),
                    'total_yield_kg'   : result.get('total_yield_kg'),
                    'yield_range_low'  : round(result.get('yield_per_are_kg',0)*0.92, 4),
                    'yield_range_high' : round(result.get('yield_per_are_kg',0)*1.08, 4),
                    'district_avg_kg_are': result.get('district_avg_kg_are'),
                    'confidence_pct'   : result.get('confidence_pct', 84.8),
                    'model_used'       : result.get('model_used','Gradient Boosting'),
                    'inputs'           : result.get('inputs',{}),
                    'is_offline'       : False,
                }
                save_prediction(db_pred, result.get('recommendations', []))
                print(f"  [check-circle] Prediction {result['id']} saved to MySQL")
            except Exception as e:
                print(f"  [exclamation-triangle]️  DB save prediction error: {e}")
        return jsonify(result)

    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500


@app.route('/api/predictions', methods=['GET'])
def get_predictions():
    fid = request.args.get('farmer_id')
    if DB_ENABLED:
        try:
            from database import get_predictions as db_get_predictions
            data = db_get_predictions(farmer_id=fid or None, limit=100)
            # Serialize datetime/decimal fields
            import decimal
            clean = []
            for p in data:
                row = {}
                for k,v in p.items():
                    if isinstance(v, decimal.Decimal): row[k] = float(v)
                    elif hasattr(v,'isoformat'):        row[k] = v.isoformat()
                    else:                               row[k] = v
                clean.append(row)
            return jsonify({'count': len(clean), 'predictions': clean})
        except Exception as e:
            print(f"DB get_predictions error: {e}")
    # Fallback in-memory
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
    sector = request.args.get('sector')
    if DB_ENABLED:
        try:
            from database import get_district_stats, get_db, get_predictions as db_preds, get_officer_dashboard, get_sector_dashboard
            import decimal

            def clean_row(d):
                r = {}
                for k,v in d.items():
                    if isinstance(v, decimal.Decimal): r[k] = float(v)
                    elif hasattr(v, 'isoformat'): r[k] = v.isoformat()
                    else: r[k] = v
                if 'crop_type' in r and 'crop' not in r:
                    r['crop'] = r['crop_type']
                return r

            if sector:
                data = get_sector_dashboard(sector)
                # Map to keys expected by frontend Overview
                clean_farmers = [clean_row(f) for f in data.get('farmers', [])]
                clean_all_preds = [clean_row(p) for p in data.get('all_predictions', [])]
                
                # Derive crop stats for this sector
                crop_stats = {}
                for p in clean_all_preds:
                    c = p.get('crop')
                    if c not in crop_stats: crop_stats[c] = []
                    crop_stats[c].append(p.get('yield_per_are_kg', 0))
                
                final_crop_data = {}
                for c, yields in crop_stats.items():
                    final_crop_data[c] = {
                        'avg_yield_kg_are': sum(yields) / len(yields) if yields else 0,
                        'prediction_count': len(yields)
                    }

                return jsonify({
                    'success': True, 
                    'farmer_count': data.get('total_farmers', 0),
                    'farmer_list': clean_farmers,
                    'recent_preds': clean_all_preds[:5], 
                    'crop_data': final_crop_data,
                    'all_predictions': clean_all_preds,
                    'pending_predictions': [clean_row(p) for p in data.get('pending_predictions', [])],
                    'seasons': data.get('seasons', []),
                    'is_sector_level': True,
                    'sector_name': sector
                })

            db_data = get_officer_dashboard()
            dist = get_district_stats()
            
            # Map seasons from district stats
            seasons_data = dist.get('seasons', [])

            # crop_data
            crop_data = {}
            for row in dist.get('by_crop', []):
                crop = row.get('crop_type','')
                crop_data[crop] = {
                    'prediction_count': int(row.get('total_predictions',0)),
                    'avg_yield_kg_are': float(row.get('avg_yield_kg_are') or CROP_BENCHMARKS.get(crop,20)),
                    'benchmark_kg_are': CROP_BENCHMARKS.get(crop, 20),
                }

            # sector_data
            sector_data = {}
            for row in dist.get('sector_ranking', []):
                sec = row.get('sector_name','')
                sector_data[sec] = {
                    'prediction_count': int(row.get('total_predictions') or 0),
                    'avg_yield_kg_are': float(row.get('avg_yield_kg_are') or 0),
                    'farmer_count'    : 0,
                }

            # recent predictions
            recent_clean = [clean_row(p) for p in db_preds(limit=10)]

            # farmers list with prediction counts
            with get_db() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT f.farmer_id as id, f.full_name as name, "
                        "s.sector_name as sector, "
                        "ROUND(f.farm_size_are/100,2) as farm_size_ha, "
                        "f.farm_size_are, "
                        "COUNT(p.prediction_id) as prediction_count, "
                        "ROUND(AVG(p.yield_per_are_kg),2) as avg_yield "
                        "FROM farmers f "
                        "JOIN sectors s ON f.sector_id=s.sector_id "
                        "LEFT JOIN predictions p ON f.farmer_id=p.farmer_id "
                        "WHERE f.is_active=1 "
                        "GROUP BY f.farmer_id "
                        "ORDER BY prediction_count DESC"
                    )
                    farmers_list = [clean_row(dict(r)) for r in cur.fetchall()]

            return jsonify({
                'summary': {
                    'total_farmers'     : db_data.get('total_farmers', 0),
                    'total_predictions' : db_data.get('total_predictions', 0),
                    'registered_sectors': 15,
                    'model_accuracy'    : f"{META['_perf'].get(META['best_model'],{}).get('r2',0)*100:.1f}%",
                    'db_status': 'connected',
                    'db_error': None
                },
                'crop_data'   : crop_data,
                'sector_data' : sector_data,
                'recent_preds': recent_clean,
                'farmers'     : farmers_list,
                'seasons'     : seasons_data,
                'db_connected': True
            })
        except Exception as e:
            import traceback
            print(f"DB dashboard error: {e}")
            traceback.print_exc()
            db_error = str(e)
    
    # --- FALLBACK / MERGE MODE ---
    db_error = db_error if 'db_error' in locals() else None
    farmers = [u for u in _users.values() if u['role'] == 'farmer']
    preds   = _predictions

    # Sector yield summary
    sector_data = {}
    for sec in SECTORS[:12]: # Limit for dashboard view
        sec_preds = [p for p in preds if p.get('sector') == sec]
        sector_data[sec] = {
            'prediction_count' : len(sec_preds),
            'avg_yield_kg_are' : round(float(np.mean([p['yield_per_are_kg'] for p in sec_preds])), 2) if sec_preds else 0,
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
            'db_status': 'error' if db_error else 'offline',
            'db_error': db_error
        },
        'sector_data' : sector_data,
        'crop_data'   : crop_data,
        'recent_preds': preds[-10:][::-1] if preds else [],
        'farmers'     : [{'id':f['id'],'name':f['name'],'sector':f.get('sector',''),
                          'farm_size_ha':f.get('farm_size_ha',0),
                          'farm_size_are':f.get('farm_size_are',0)} for f in farmers],
        'db_connected': False
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


@app.route('/api/farmer/<farmer_id>/advice', methods=['GET'])
def get_advice(farmer_id):
    if DB_ENABLED:
        try:
            from database import get_farmer_advice
            advice = get_farmer_advice(farmer_id)
            return jsonify({'success': True, 'advice': list(advice)})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    return jsonify({'success': True, 'advice': []})

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



@app.route('/api/save-prediction', methods=['POST'])
def save_pred_endpoint():
    """Save a prediction directly from frontend (used for offline predictions too)."""
    d = request.get_json() or {}
    if not d.get('prediction_id') or not d.get('farmer_id'):
        return jsonify({'error': 'prediction_id and farmer_id required'}), 400
    if DB_ENABLED:
        try:
            db_pred = {
                'prediction_id'    : d['prediction_id'],
                'farmer_id'        : d['farmer_id'],
                'crop_type'        : d.get('crop_type','Maize'),
                'crop'             : d.get('crop_type','Maize'),
                'sector'           : d.get('sector','Gashora'),
                'season'           : d.get('season','Season A'),
                'month'            : d.get('month','October'),
                'planting_date'    : d.get('planting_date') or datetime.now().strftime('%Y-%m-%d'),
                'year'             : datetime.now().year,
                'area_planted_are' : float(d.get('area_planted_are', 0)),
                'soil_type'        : d.get('soil_type','Clay'),
                'fertilizer_used'  : d.get('fertilizer_used','No'),
                'irrigation_used'  : d.get('irrigation_used','No'),
                'previous_crop'    : d.get('previous_crop','Beans'),
                'pest_pressure'    : d.get('pest_pressure','Low'),
                'labor_availability': d.get('labor_availability','Adequate'),
                'extension_access' : d.get('extension_access','Yes'),
                'credit_access'    : d.get('credit_access','No'),
                'yield_per_are_kg' : float(d.get('yield_per_are_kg', 0)),
                'yield_per_ha_kg'  : float(d.get('yield_per_ha_kg', 0)),
                'total_yield_kg'   : float(d.get('total_yield_kg', 0)),
                'yield_range_low'  : float(d.get('yield_per_are_kg', 0)) * 0.92,
                'yield_range_high' : float(d.get('yield_per_are_kg', 0)) * 1.08,
                'district_avg_kg_are': float(d.get('district_avg_kg_are', 20)),
                'confidence_pct'   : float(d.get('confidence_pct', 84.8)),
                'model_used'       : d.get('model_used','Gradient Boosting'),
                'inputs'           : {},
                'is_offline'       : d.get('is_offline', False),
            }
            save_prediction(db_pred, d.get('recommendations', []))
            return jsonify({'success': True, 'prediction_id': d['prediction_id']})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    return jsonify({'success': True, 'message': 'Saved in-memory only (DB not available)'})


@app.route('/api/update-profile', methods=['POST'])
def update_profile():
    d = request.get_json() or {}
    uid = d.get('user_id')
    role = d.get('role', 'farmer')
    if not uid: return jsonify({'error': 'user_id required'}), 400
    
    if DB_ENABLED:
        try:
            from database import update_user, get_farmer, get_officer
            if update_user(uid, role, d):
                # Fetch updated user info to return to frontend
                user_row = get_farmer(uid) if role == 'farmer' else get_officer(uid)
                if user_row:
                    return jsonify({
                        'success': True, 
                        'user': {
                            'id'          : user_row['id'],
                            'name'        : user_row.get('full_name'),
                            'email'       : user_row.get('email'),
                            'phone'       : user_row.get('phone'),
                            'role'        : user_row['role'],
                            'sector'      : user_row.get('sector_name') or user_row.get('sector',''),
                            'farm_size_ha': user_row.get('farm_size_ha', 0),
                            'farm_size_are': user_row.get('farm_size_are', 0),
                            'crops'       : user_row.get('crops', []),
                            'farmer_category': user_row.get('farmer_category','Medium'),
                        }
                    })
            return jsonify({'error': 'Failed to update profile'}), 400
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    return jsonify({'success': True, 'message': 'Simulated profile update'})

@app.route('/api/change-password', methods=['POST'])
def change_password_api():
    d = request.get_json() or {}
    uid = d.get('user_id')
    old_pw = d.get('old_password')
    new_pw = d.get('new_password')
    role = d.get('role', 'farmer')
    
    if not all([uid, old_pw, new_pw]):
        return jsonify({'error': 'Missing fields'}), 400
        
    if DB_ENABLED:
        try:
            from database import verify_password, update_user
            # Verify old password
            if verify_password(uid, role, old_pw):
                if update_user(uid, role, {'password': new_pw}):
                    return jsonify({'success': True})
                return jsonify({'error': 'Failed to update password'}), 500
            return jsonify({'error': 'Incorrect current password'}), 401
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    return jsonify({'success': True})

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
                     u.get('email', '').lower() == identifier.lower() or
                     u.get('phone','').replace(' ','') == identifier.replace(' ',''))
                 and u['role'] == role), None)

    if DB_ENABLED:
        try:
            from database import reset_password as db_reset_password
            ok = db_reset_password(identifier, new_pw, role)
            if ok:
                return jsonify({'success': True, 'message': 'Password reset successfully'})
        except Exception as e:
            print(f"DB reset error: {e}")

    if not user:
        return jsonify({'success': False, 'message': 'No account found with that email, phone, or ID'}), 404
    user['password'] = new_pw
    return jsonify({'success': True, 'message': 'Password reset successfully', 'id': user.get('id','')})






@app.route('/api/send-advice', methods=['POST'])
def send_advice_route():
    if not DB_ENABLED:
        return jsonify({'error': 'Database not enabled'}), 503
    d = request.get_json() or {}
    officer_id = d.get('officer_id')
    if not officer_id:
        return jsonify({'error': 'officer_id required'}), 400
    try:
        # If target_group is "All Farmers", we set farmer_id to None for a global broadcast
        target = d.get('target_group', 'All Farmers')
        if target == "All Farmers":
            d['farmer_id'] = None
        
        advice_id = save_advice(officer_id, d)
        
        # --- EMAIL FOR BROADCASTS ---
        if DB_ENABLED:
            try:
                from database import get_db
                with get_db() as conn:
                    with conn.cursor() as cur:
                        query = "SELECT full_name, email FROM farmers WHERE is_active=1"
                        if d.get('farmer_id'):
                            query += " AND farmer_id = %s"
                            cur.execute(query, (d['farmer_id'],))
                        elif target != "All Farmers":
                            # Basic filtering logic for target groups
                            if "Maize" in target: query += " AND EXISTS (SELECT 1 FROM predictions p WHERE p.farmer_id = farmers.farmer_id AND p.crop_type='Maize')"
                            elif "Beans" in target: query += " AND EXISTS (SELECT 1 FROM predictions p WHERE p.farmer_id = farmers.farmer_id AND p.crop_type='Beans')"
                            elif "Rice" in target: query += " AND EXISTS (SELECT 1 FROM predictions p WHERE p.farmer_id = farmers.farmer_id AND p.crop_type='Rice')"
                            cur.execute(query)
                        else:
                            cur.execute(query)
                        
                        recipients = cur.fetchall()
                        print(f"  [broadcast] Sending advice to {len(recipients)} farmers...")
                        for r in recipients:
                            subject = f"Agriculture Advice: {d.get('subject', 'Important Update')}"
                            body_text = f"Hello {r['full_name']},\n\n{d.get('message')}\n\nBest regards,\nAgri Officer"
                            # Simple HTML wrapper for advice
                            body_html = f"<h2>Agriculture Advice</h2><p>Hello {r['full_name']},</p><p>{d.get('message')}</p><br><p>Best regards,<br>Agri Officer</p>"
                            send_email(r['email'], subject, body_html, body_text)
            except Exception as e:
                print(f"Broadcast email error: {e}")
        
        return jsonify({'success': True, 'advice_id': advice_id})
    except Exception as e:
        print(f"Send Advice error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/predictions/record-actual', methods=['POST'])
def record_actual_yield():
    if not DB_ENABLED:
        return jsonify({'error': 'Database not enabled'}), 503
    d = request.get_json() or {}
    pid = d.get('prediction_id')
    actual = d.get('actual_yield')
    h_date = d.get('harvest_date')
    
    if not pid or actual is None:
        return jsonify({'error': 'prediction_id and actual_yield required'}), 400
    
    try:
        from database import update_actual_yield
        if update_actual_yield(pid, float(actual), h_date):
            return jsonify({'success': True})
        return jsonify({'error': 'Failed to update record'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/officer/underperforming-farms', methods=['GET'])
def get_underperforming_farms_route():
    if not DB_ENABLED:
        return jsonify({'error': 'Database not enabled'}), 503
    sector_id = request.args.get('sector_id')
    try:
        from database import get_underperforming_farms
        farms = get_underperforming_farms(sector_id)
        return jsonify({'success': True, 'farms': farms})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/notifications/<farmer_id>', methods=['GET'])
def get_notifications_route(farmer_id):
    if not DB_ENABLED:
        return jsonify({'error': 'Database not enabled'}), 503
    try:
        data = get_farmer_advice(farmer_id)
        # Serialize datetime fields
        clean = []
        for row in data:
            r = {}
            for k,v in row.items():
                if hasattr(v, 'isoformat'): r[k] = v.isoformat()
                else: r[k] = v
            clean.append(r)
        return jsonify({'success': True, 'advice': clean})
    except Exception as e:
        print(f"Get Notifications error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/send-report', methods=['POST'])
def submit_report_route():
    if not DB_ENABLED:
        return jsonify({'error': 'Database not enabled'}), 503
    d = request.get_json() or {}
    sender_id = d.get('sender_id')
    if not sender_id:
        return jsonify({'error': 'sender_id required'}), 400
    try:
        report_id = save_report(sender_id, d)
        return jsonify({'success': True, 'report_id': report_id})
    except Exception as e:
        print(f"Submit Report error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports', methods=['GET'])
def get_reports_route():
    if not DB_ENABLED:
        return jsonify({'error': 'Database not enabled'}), 503
    officer_id = request.args.get('officer_id')
    role = request.args.get('role')
    if not officer_id or not role:
        return jsonify({'error': 'officer_id and role required'}), 400
    try:
        data = get_reports_for_officer(officer_id, role)
        clean = []
        for row in data:
            r = {}
            for k,v in row.items():
                if hasattr(v, 'isoformat'): r[k] = v.isoformat()
                else: r[k] = v
            clean.append(r)
        return jsonify({'success': True, 'reports': clean})
    except Exception as e:
        print(f"Get Reports error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/generate-district-pdf', methods=['GET'])
def generate_district_pdf():
    if not DB_ENABLED:
        return jsonify({'error': 'Database not enabled'}), 503
    
    try:
        # 1. Fetch data
        stats = get_district_stats()
        totals = stats.get('totals', {})
        by_crop = stats.get('by_crop', [])
        ranking = stats.get('sector_ranking', [])

        # 2. Create PDF buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
        elements = []
        styles = getSampleStyleSheet()

        # Custom Styles
        title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=20, alignment=1, spaceAfter=20)
        sub_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=12, alignment=1, spaceAfter=30, textColor=colors.grey)
        sec_style = ParagraphStyle('Sec', parent=styles['Heading2'], fontSize=14, spaceBefore=20, spaceAfter=10, color=colors.HexColor('#22c55e'))

        # Header
        elements.append(Paragraph("BUGESERA HARVEST PREDICTION SYSTEM", title_style))
        elements.append(Paragraph(f"District Agricultural Report - {datetime.now().strftime('%d %B %Y')}", sub_style))

        # Dashboard Summary
        elements.append(Paragraph("DASHBOARD SUMMARY", sec_style))
        summary_data = [
            ["Total Farmers Registered", f"{int(totals.get('total_farmers') or 0):,}"],
            ["Total Yield Predicted (kg)", f"{float(totals.get('total_yield') or 0):,}"],
            ["Average Yield (kg/are)", f"{float(totals.get('avg_yield') or 0):.2f}"],
            ["Total Predictions Made", f"{int(totals.get('total_preds') or 0):,}"],
        ]
        t_summary = Table(summary_data, colWidths=[250, 200])
        t_summary.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('BACKGROUND', (0,0), (0,-1), colors.whitesmoke),
            ('PADDING', (0,0), (-1,-1), 8),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ]))
        elements.append(t_summary)
        elements.append(Spacer(1, 20))

        # Crop Performance Table
        elements.append(Paragraph("CROP PERFORMANCE", sec_style))
        crop_data = [["Crop Type", "Total Predictions", "Avg Yield (kg/are)", "Total Yield (kg)"]]
        for row in by_crop:
            crop_data.append([
                row.get('crop_type'),
                f"{int(row.get('total_predictions') or 0):,}",
                f"{float(row.get('avg_yield_kg_are') or 0):.2f}",
                f"{float(row.get('total_yield_kg') or 0):,}"
            ])
        t_crop = Table(crop_data, colWidths=[120, 110, 110, 110])
        t_crop.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#22c55e')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(t_crop)
        elements.append(Spacer(1, 20))

        # Sector Rankings
        elements.append(Paragraph("SECTOR PERFORMANCE RANKINGS", sec_style))
        sec_data = [["Rank", "Sector Name", "Avg Yield (kg/are)", "Total Forecast (kg)"]]
        for i, row in enumerate(ranking):
            sec_data.append([
                i+1,
                row.get('sector_name'),
                f"{float(row.get('avg_yield_kg_are') or 0):.2f}",
                f"{float(row.get('total_yield_kg') or 0):,}"
            ])
        t_sec = Table(sec_data, colWidths=[50, 180, 110, 110])
        t_sec.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#3b82f6')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(t_sec)

        # Build PDF
        doc.build(elements)
        buffer.seek(0)

        filename = f"Bugesera_District_Report_{datetime.now().strftime('%Y%m%d')}.pdf"
        return send_file(buffer, as_attachment=True, download_name=filename, mimetype='application/pdf')

    except Exception as e:
        import traceback
        print(f"PDF Gen Error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/users', methods=['GET'])
def admin_get_users():
    if not DB_ENABLED:
        return jsonify({'error': 'Database not enabled'}), 503
    try:
        data = get_all_users()
        clean = []
        for row in data:
            r = {}
            for k,v in row.items():
                if hasattr(v, 'isoformat'): r[k] = v.isoformat()
                else: r[k] = v
            clean.append(r)
        return jsonify({'success': True, 'users': clean})
    except Exception as e:
        print(f"Admin Get Users error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/toggle-status', methods=['POST'])
def admin_toggle_status():
    if not DB_ENABLED:
        return jsonify({'error': 'Database not enabled'}), 503
    d = request.get_json() or {}
    uid = d.get('user_id')
    u_role = d.get('role')
    status = d.get('status') # 1 for active, 0 for inactive
    if uid is None or u_role is None or status is None:
        return jsonify({'error': 'Missing data'}), 400
    try:
        res = toggle_user_status(uid, u_role == 'farmer', int(status))
        return jsonify({'success': res})
    except Exception as e:
        print(f"Admin Toggle Status error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/settings', methods=['GET', 'POST'])
def admin_settings_route():
    if not DB_ENABLED:
        return jsonify({'error': 'Database not enabled'}), 503
    if request.method == 'POST':
        d = request.get_json() or {}
        try:
            update_system_settings(d)
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        try:
            data = get_system_settings()
            return jsonify({'success': True, 'settings': data})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/api/admin/sector-details/<int:sector_id>', methods=['GET'])
def admin_sector_details(sector_id):
    if not DB_ENABLED:
        return jsonify({'error': 'Database not enabled'}), 503
    try:
        data = get_sector_full_details(sector_id)
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        print(f"Sector Details error: {e}")
        return jsonify({'error': str(e)}), 500

# ── Init database on startup ──────────────────────────────────────────────────
if DB_ENABLED:
    try:
        init_db()
        print("  [check-circle] MySQL database ready (bugesera_harvest)")
    except Exception as e:
        print(f"  [exclamation-triangle]️  DB init error: {e} — falling back to in-memory")
        DB_ENABLED = False

# =============================================================================
if __name__ == '__main__':
    best = META['best_model']
    r2   = META['_perf'].get(best, {}).get('r2', 0)
    mc   = META.get('model_comparison', {})
    print("\n" + "=" * 55)
    print("[tree]  Bugesera Harvest Prediction API  v4.0")
    print("=" * 55)
    print(f"   Best Model  : {best}")
    print(f"   R2 Score    : {r2:.4f}  ({r2*100:.1f}% accuracy)")
    if mc:
        for name, m in mc.items():
            r2  = m.get('r2_test', m.get('r2', 0))
            acc = m.get('accuracy', r2*100)
            print(f"   {name:22s}: R2={r2:.4f}  Acc={acc:.1f}%")
    print(f"   Crops       : {CROPS}")
    print(f"   Sectors     : {len(SECTORS)} sectors")
    print(f"   Units       : ARE and kg/are  (1 ha = 100 are)")
    print(f"   Target      : {META['target']}  <- model outputs kg/are directly")
    print(f"   Benchmarks  : Beans={CROP_BENCHMARKS['Beans']:.2f}, Maize={CROP_BENCHMARKS['Maize']:.2f}, Rice={CROP_BENCHMARKS['Rice']:.2f} kg/are")
    print(f"   Running     : http://localhost:5000")
    print("=" * 55 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
