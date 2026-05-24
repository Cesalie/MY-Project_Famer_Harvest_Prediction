"""
database.py — MySQL database layer for Bugesera Harvest Prediction System
Connects to XAMPP MySQL via PyMySQL
"""

import pymysql
import pymysql.cursors
from datetime import datetime
import secrets
import string

DB_CONFIG = {
    'host'     : 'localhost',
    'port'     : 3306,
    'user'     : 'root',
    'password' : '',
    'database' : 'bugesera_harvest',
    'charset'  : 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
}


def get_db():
    return pymysql.connect(**DB_CONFIG)


def init_db():
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) as cnt FROM sectors")
                row = cur.fetchone()
                print(f"  [check-circle] MySQL connected — {row['cnt']} sectors found")
        return True
    except Exception as e:
        print(f"  [x-circle] MySQL error: {e}")
        return False


def generate_password(length=8):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


# ─────────────────────────────────────────────────────────────────────────────
# USER & AUTH QUERIES
# ─────────────────────────────────────────────────────────────────────────────

def get_user_by_email(email: str) -> dict | None:
    # Check farmers
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT f.*, fm.farm_size_are, s.sector_name as sector, fm.sector_id, ROUND(fm.farm_size_are/100, 2) as farm_size_ha
                FROM farmers f
                LEFT JOIN farms fm ON f.farmer_id = fm.farmer_id
                LEFT JOIN sectors s ON fm.sector_id = s.sector_id
                WHERE LOWER(f.email)=LOWER(%s) AND f.is_active=1
                ORDER BY fm.farm_id ASC LIMIT 1
            """, (email,))
            row = cur.fetchone()
            if row:
                row['role'] = 'farmer'
                row['id'] = row['farmer_id']
                row['name'] = row['full_name']
                return row
            
            # Check officers
            cur.execute("SELECT * FROM officers WHERE LOWER(email)=LOWER(%s) AND is_active=1", (email,))
            row = cur.fetchone()
            if row:
                row['role'] = row['officer_type'] # 'sector' or 'district'
                row['id'] = row['officer_id']
                if row['sector_id']:
                    cur.execute("SELECT sector_name FROM sectors WHERE sector_id=%s", (row['sector_id'],))
                    sec = cur.fetchone()
                    row['sector_name'] = sec['sector_name'] if sec else ''
                    row['sector'] = row['sector_name']
                return row
    return None

def get_farmer_by_id_or_phone(ident: str, role: str = 'farmer') -> dict | None:
    table = "farmers" if role == "farmer" else "officers"
    id_col = "farmer_id" if role == "farmer" else "officer_id"
    with get_db() as conn:
        with conn.cursor() as cur:
            if role == 'farmer':
                cur.execute(f"""
                    SELECT f.*, fm.farm_size_are, s.sector_name as sector, fm.sector_id, ROUND(fm.farm_size_are/100, 2) as farm_size_ha
                    FROM {table} f
                    LEFT JOIN farms fm ON f.farmer_id = fm.farmer_id
                    LEFT JOIN sectors s ON fm.sector_id = s.sector_id
                    WHERE (LOWER(f.{id_col})=LOWER(%s) OR f.phone=%s) AND f.is_active=1
                    ORDER BY fm.farm_id ASC LIMIT 1
                """, (ident, ident))
            else:
                cur.execute(f"SELECT * FROM {table} WHERE (LOWER({id_col})=LOWER(%s) OR phone=%s) AND is_active=1", (ident, ident))
            
            row = cur.fetchone()
            if row:
                row['role'] = role if role == 'farmer' else row['officer_type']
                row['id'] = row[id_col]
                row['name'] = row.get('full_name') or row.get('name')
                if role != 'farmer' and row['sector_id']:
                    cur.execute("SELECT sector_name FROM sectors WHERE sector_id=%s", (row['sector_id'],))
                    sec = cur.fetchone()
                    row['sector_name'] = sec['sector_name'] if sec else ''
                    row['sector'] = row['sector_name']
                return row
    return None

def update_user_password(user_id: str, role: str, new_password: str) -> bool:
    """Update password for farmer or officer in the database"""
    table = "farmers" if role == "farmer" else "officers"
    id_col = "farmer_id" if role == "farmer" else "officer_id"
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                # We update both password and password_hash fields
                cur.execute(f"UPDATE {table} SET password=%s, password_hash=%s WHERE {id_col}=%s", 
                           (new_password, new_password, user_id))
                conn.commit()
                return cur.rowcount > 0
    except Exception as e:
        print(f"Error updating password in DB: {e}")
        return False

def check_email_exists(email: str) -> bool:
    """Check if email exists in either farmers or officers table (including inactive)"""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM farmers WHERE email=%s", (email,))
            if cur.fetchone(): return True
            cur.execute("SELECT 1 FROM officers WHERE email=%s", (email,))
            if cur.fetchone(): return True
    return False

def get_farmer(farmer_id: str) -> dict | None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM farmers WHERE farmer_id = %s AND is_active = 1", (farmer_id,))
            row = cur.fetchone()
            if not row: return None
            
            row['farms'] = get_farms(farmer_id)
            row['id'] = farmer_id
            row['role'] = 'farmer'
            return row

def register_farmer(data: dict) -> dict:
    password = generate_password()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT MAX(CAST(SUBSTRING(farmer_id, 2) AS UNSIGNED)) as current_max FROM farmers")
            row = cur.fetchone()
            current_max = row['current_max'] if row and row['current_max'] else 0
            farmer_id = f"F{current_max + 1:03d}"

            cur.execute("""
                INSERT INTO farmers (farmer_id, full_name, email, phone, password_hash)
                VALUES (%s,%s,%s,%s,%s)
            """, (farmer_id, data['name'], data['email'], data.get('phone'), password))
            conn.commit()
            
    res = get_farmer(farmer_id)
    res['generated_password'] = password
    return res


def register_officer(data: dict) -> dict:
    password = generate_password()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT MAX(CAST(SUBSTRING(officer_id, 2) AS UNSIGNED)) as current_max FROM officers")
            row = cur.fetchone()
            current_max = row['current_max'] if row and row['current_max'] else 0
            
            officer_type = data.get('role', 'district')
            prefix = 'S' if officer_type == 'sector' else 'A'
            officer_id = f"{prefix}{current_max + 1:03d}"

            sector_id = None
            if officer_type == 'sector':
                cur.execute("SELECT sector_id FROM sectors WHERE sector_name=%s", (data.get('sector', 'Bugesera'),))
                sec = cur.fetchone()
                sector_id = sec['sector_id'] if sec else 1

            cur.execute("""
                INSERT INTO officers (officer_id, full_name, email, phone, department, officer_type, sector_id, password_hash)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            """, (officer_id, data['name'], data['email'], data.get('phone'), data.get('department','General'), officer_type, sector_id, password))
            conn.commit()
            
    res = get_user_by_email(data['email'])
    res['generated_password'] = password
    return res


def get_officer(officer_id: str) -> dict | None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM officers WHERE officer_id = %s AND is_active = 1", (officer_id,))
            row = cur.fetchone()
            if not row: return None
            row['id'] = officer_id
            row['role'] = row['officer_type']
            if row['sector_id']:
                cur.execute("SELECT sector_name FROM sectors WHERE sector_id=%s", (row['sector_id'],))
                sec = cur.fetchone()
                row['sector_name'] = sec['sector_name'] if sec else ''
                row['sector'] = row['sector_name']
            return row

def update_last_login(user_id: str, role: str):
    table  = 'farmers'  if role == 'farmer'  else 'officers'
    id_col = 'farmer_id' if role == 'farmer' else 'officer_id'
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(f"UPDATE {table} SET last_login=%s WHERE {id_col}=%s", (datetime.now(), user_id))
            conn.commit()

def reset_password(identifier: str, new_password: str, role: str) -> bool:
    table  = 'farmers'  if role == 'farmer'  else 'officers'
    id_col = 'farmer_id' if role == 'farmer' else 'officer_id'
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {table} SET password_hash=%s WHERE ({id_col}=%s OR email=%s) AND is_active=1",
                (new_password, identifier, identifier)
            )
            affected = cur.rowcount
            if affected > 0:
                cur.execute("INSERT INTO password_resets (user_id, user_role, completed_at, is_used) VALUES (%s,%s,%s,1)", 
                            (identifier, role, datetime.now()))
                conn.commit()
            return affected > 0

# ─────────────────────────────────────────────────────────────────────────────
# FARM QUERIES
# ─────────────────────────────────────────────────────────────────────────────

def get_farms(farmer_id: str) -> list:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT f.*, s.sector_name, s.soil_type, ROUND(f.farm_size_are/100, 2) as farm_size_ha
                FROM farms f
                JOIN sectors s ON f.sector_id = s.sector_id
                WHERE f.farmer_id = %s
            """, (farmer_id,))
            return cur.fetchall()

def add_farm(data: dict) -> dict:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT sector_id FROM sectors WHERE sector_name=%s", (data.get('sector'),))
            sec = cur.fetchone()
            sector_id = sec['sector_id'] if sec else 1
            
            cur.execute("""
                INSERT INTO farms (farmer_id, farm_name, sector_id, farm_size_are)
                VALUES (%s,%s,%s,%s)
            """, (data['farmer_id'], data['farm_name'], sector_id, float(data['farm_size_are'])))
            conn.commit()
            farm_id = cur.lastrowid
            
            cur.execute("SELECT f.*, s.sector_name, s.soil_type, ROUND(f.farm_size_are/100, 2) as farm_size_ha FROM farms f JOIN sectors s ON f.sector_id=s.sector_id WHERE f.farm_id=%s", (farm_id,))
            return cur.fetchone()

# ─────────────────────────────────────────────────────────────────────────────
# PREDICTION QUERIES
# ─────────────────────────────────────────────────────────────────────────────

def save_prediction(pred: dict, recs: list) -> str:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT sector_id FROM sectors WHERE sector_name=%s", (pred.get('sector',''),))
            sec = cur.fetchone()
            sector_id = sec['sector_id'] if sec else 1
            pid = pred['prediction_id']

            cur.execute("""
                INSERT INTO predictions (
                    prediction_id, farmer_id, farm_id, sector_id, crop_type, season,
                    planting_date, planting_month, year, area_planted_are,
                    soil_type, fertilizer_used, irrigation_used, previous_crop,
                    pest_pressure, labor_availability, extension_access, credit_access,
                    avg_temperature, total_rainfall_mm, humidity_pct, sunshine_hrs,
                    yield_per_are_kg, yield_per_ha_kg, total_yield_kg,
                    yield_range_low, yield_range_high, district_avg_kg_are,
                    pct_vs_average, yield_grade, confidence_pct, model_used, is_offline, is_approved
                ) VALUES (
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,0
                ) ON DUPLICATE KEY UPDATE yield_per_are_kg=VALUES(yield_per_are_kg)
            """, (
                pid,
                pred.get('farmer_id'),
                pred.get('farm_id'),
                sector_id,
                pred.get('crop_type') or pred.get('crop'),
                pred.get('season'),
                pred.get('planting_date'),
                pred.get('month'),
                pred.get('year', datetime.now().year),
                pred.get('area_planted_are'),
                pred.get('soil_type') or pred.get('soil'),
                pred.get('fertilizer_used', 'No'),
                pred.get('irrigation_used', 'No'),
                pred.get('previous_crop', 'Beans'),
                pred.get('pest_pressure', 'Low'),
                pred.get('labor_availability', 'Adequate'),
                pred.get('extension_access', 'Yes'),
                pred.get('credit_access', 'No'),
                pred.get('inputs', {}).get('temperature'),
                pred.get('inputs', {}).get('rainfall'),
                pred.get('inputs', {}).get('humidity'),
                pred.get('inputs', {}).get('sunshine'),
                pred.get('yield_per_are_kg'),
                pred.get('yield_per_ha_kg'),
                pred.get('total_yield_kg'),
                pred.get('yield_range_low'),
                pred.get('yield_range_high'),
                pred.get('district_avg_kg_are'),
                pred.get('pct_vs_average'),
                pred.get('yield_grade'),
                pred.get('confidence_pct', 84.8),
                pred.get('model_used', 'Gradient Boosting'),
                1 if pred.get('is_offline') else 0,
            ))

            for i, rec in enumerate(recs):
                cur.execute("""
                    INSERT INTO recommendations
                        (prediction_id, rec_type, category, message, display_order)
                    VALUES (%s,%s,%s,%s,%s)
                """, (pid, rec.get('type','info'), rec.get('category',''), rec.get('message',''), i))
            conn.commit()
    return pid

def get_predictions(farmer_id: str = None, limit: int = 50, sector_id: int = None, unapproved_only: bool = False) -> list:
    with get_db() as conn:
        with conn.cursor() as cur:
            query = """
                SELECT p.*, s.sector_name, f.full_name as farmer_name, frm.farm_name
                FROM predictions p
                JOIN sectors s ON p.sector_id = s.sector_id
                JOIN farmers f ON p.farmer_id = f.farmer_id
                LEFT JOIN farms frm ON p.farm_id = frm.farm_id
                WHERE 1=1
            """
            params = []
            if farmer_id:
                query += " AND p.farmer_id = %s"
                params.append(farmer_id)
            if sector_id:
                query += " AND p.sector_id = %s"
                params.append(sector_id)
            if unapproved_only:
                query += " AND p.is_approved = 0"
                
            query += " ORDER BY p.created_at DESC LIMIT %s"
            params.append(limit)
            
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            
            result = []
            for r in rows:
                d = {}
                for k, v in r.items():
                    d[k] = float(v) if hasattr(v, '__float__') and not isinstance(v, (int, str, bool, type(None))) else v
                    if hasattr(v, 'strftime'):
                        d[k] = v.isoformat()
                result.append(d)
            return result

def approve_prediction(prediction_id: str) -> bool:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE predictions SET is_approved=1 WHERE prediction_id=%s", (prediction_id,))
            conn.commit()
            return cur.rowcount > 0

def update_actual_yield(prediction_id: str, actual_yield: float, harvest_date: str = None) -> bool:
    with get_db() as conn:
        with conn.cursor() as cur:
            h_date = harvest_date or datetime.now().strftime('%Y-%m-%d')
            cur.execute("""
                UPDATE predictions 
                SET actual_yield_kg_are=%s, actual_harvest_date=%s 
                WHERE prediction_id=%s
            """, (actual_yield, h_date, prediction_id))
            conn.commit()
            return cur.rowcount > 0

def get_district_stats() -> dict:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM v_district_stats")
            stats = cur.fetchall()
            cur.execute("SELECT * FROM v_sector_ranking")
            sector_rank = cur.fetchall()
            cur.execute("""
                SELECT COUNT(*) as total_preds,
                       COUNT(DISTINCT farmer_id) as total_farmers,
                       ROUND(AVG(yield_per_are_kg),2) as avg_yield,
                       ROUND(SUM(total_yield_kg),1) as total_yield
                FROM predictions
                WHERE is_approved=1
            """)
            totals = cur.fetchone()
            cur.execute("""
                SELECT season, ROUND(AVG(yield_per_are_kg),2) as avg_yield, COUNT(*) as count
                FROM predictions
                GROUP BY season
            """)
            seasons = cur.fetchall()

            return {
                'totals': totals or {},
                'by_crop': list(stats),
                'sector_ranking': list(sector_rank),
                'seasons': list(seasons),
            }

def get_sector_dashboard_by_id(sector_id: int) -> dict:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as pending FROM predictions WHERE sector_id=%s AND is_approved=0", (sector_id,))
            pending_count = cur.fetchone()['pending']
            
            cur.execute("""
                SELECT COUNT(*) as total_preds, ROUND(AVG(yield_per_are_kg),2) as avg_yield
                FROM predictions WHERE sector_id=%s AND is_approved=1
            """, (sector_id,))
            stats = cur.fetchone()
            return {
                'pending_count': pending_count,
                'stats': stats,
            }

def get_all_sectors() -> list:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM sectors ORDER BY sector_name")
            return cur.fetchall()

def verify_password(user_id: str, role: str, password: str) -> bool:
    table  = 'farmers'  if role == 'farmer'  else 'officers'
    id_col = 'farmer_id' if role == 'farmer' else 'officer_id'
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(f"SELECT password_hash FROM {table} WHERE {id_col}=%s", (user_id,))
            row = cur.fetchone()
            return row and row['password_hash'] == password

# --- Restored Functions ---

def update_user(user_id: str, role: str, data: dict) -> bool:
    table  = 'farmers'  if role == 'farmer'  else 'officers'
    id_col = 'farmer_id' if role == 'farmer' else 'officer_id'
    
    with get_db() as conn:
        with conn.cursor() as cur:
            if role == 'farmer':
                # Update farmers table
                updates = []
                params = []
                if 'name' in data:
                    updates.append("full_name = %s")
                    params.append(data['name'])
                if 'email' in data:
                    updates.append("email = %s")
                    params.append(data['email'])
                
                if updates:
                    params.append(user_id)
                    cur.execute(f"UPDATE {table} SET {', '.join(updates)} WHERE {id_col}=%s", tuple(params))
                
                # Update farms table (Primary farm)
                new_sector = data.get('sector')
                new_size_ha = data.get('farm_size_ha')
                
                if new_sector or new_size_ha is not None:
                    farm_updates = []
                    farm_params = []
                    
                    if new_sector:
                        cur.execute("SELECT sector_id FROM sectors WHERE sector_name=%s", (new_sector,))
                        sec = cur.fetchone()
                        sector_id = sec['sector_id'] if sec else 1
                        farm_updates.append("sector_id = %s")
                        farm_params.append(sector_id)
                    
                    if new_size_ha is not None:
                        farm_updates.append("farm_size_are = %s")
                        farm_params.append(float(new_size_ha) * 100)
                    
                    if farm_updates:
                        farm_params.append(user_id)
                        cur.execute(f"UPDATE farms SET {', '.join(farm_updates)} WHERE farmer_id=%s", tuple(farm_params))
            else:
                # Update officer table
                updates = []
                params = []
                if 'name' in data:
                    updates.append("full_name = %s")
                    params.append(data['name'])
                if 'email' in data:
                    updates.append("email = %s")
                    params.append(data['email'])
                if 'department' in data:
                    updates.append("department = %s")
                    params.append(data['department'])
                
                if updates:
                    params.append(user_id)
                    cur.execute(f"UPDATE {table} SET {', '.join(updates)} WHERE {id_col}=%s", tuple(params))
            
            conn.commit()
            return True

def get_farmer_stats(farmer_id: str) -> dict:
    with get_db() as conn:
        with conn.cursor() as cur:
            # We don't have v_farmer_summary anymore, let's build it dynamically
            cur.execute("""
                SELECT COUNT(p.prediction_id) as total_predictions,
                       ROUND(AVG(p.yield_per_are_kg),2) as avg_yield_kg_are,
                       ROUND(SUM(p.total_yield_kg),1) as total_yield_ever_kg
                FROM predictions p WHERE p.farmer_id=%s
            """, (farmer_id,))
            summary = cur.fetchone() or {}
            
            cur.execute("""
                SELECT crop_type, season, yield_per_are_kg, total_yield_kg, yield_grade, created_at, is_approved
                FROM predictions WHERE farmer_id=%s ORDER BY created_at DESC LIMIT 5
            """, (farmer_id,))
            recent = cur.fetchall()
            return {'summary': summary, 'recent_predictions': list(recent)}

def get_officer_dashboard() -> dict:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as cnt FROM farmers WHERE is_active=1")
            farmer_count = cur.fetchone()['cnt']
            cur.execute("SELECT COUNT(*) as cnt FROM predictions WHERE is_approved=1")
            pred_count = cur.fetchone()['cnt']
            cur.execute("""
                SELECT s.sector_name, ROUND(AVG(p.yield_per_are_kg),2) as avg_yield, COUNT(*) as pred_count
                FROM predictions p JOIN sectors s ON p.sector_id=s.sector_id
                WHERE p.is_approved=1 GROUP BY p.sector_id HAVING avg_yield < 15
            """)
            alerts = cur.fetchall()
            return {
                'total_farmers': farmer_count,
                'total_predictions': pred_count,
                'accuracy_pct': 84.8,
                'low_yield_alerts': list(alerts),
            }

def get_sector_dashboard(sector_name: str) -> dict:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT sector_id FROM sectors WHERE sector_name=%s", (sector_name,))
            sec = cur.fetchone()
            sec_id = sec['sector_id'] if sec else 1

            cur.execute("""
                SELECT COUNT(DISTINCT f.farmer_id) as cnt 
                FROM farmers f
                JOIN farms fm ON f.farmer_id = fm.farmer_id
                WHERE fm.sector_id=%s AND f.is_active=1
            """, (sec_id,))
            farmer_count = cur.fetchone()['cnt']

            cur.execute("SELECT COUNT(*) as cnt FROM predictions WHERE sector_id=%s AND is_approved=1", (sec_id,))
            pred_count = cur.fetchone()['cnt']
            
            cur.execute("""
                SELECT p.prediction_id, p.farmer_id, f.full_name as farmer_name, p.crop_type, 
                       p.yield_per_are_kg, p.total_yield_kg, p.created_at, p.is_approved
                FROM predictions p
                JOIN farmers f ON p.farmer_id = f.farmer_id
                WHERE p.sector_id=%s AND p.is_approved=0
                ORDER BY p.created_at DESC
            """, (sec_id,))
            pending = cur.fetchall()

            cur.execute("""
                SELECT f.farmer_id as id, f.full_name as name, f.email, f.phone, 
                       fm.farm_size_are, ROUND(fm.farm_size_are/100, 2) as farm_size_ha
                FROM farmers f
                JOIN farms fm ON f.farmer_id = fm.farmer_id
                WHERE fm.sector_id=%s AND f.is_active=1
                ORDER BY f.created_at DESC
            """, (sec_id,))
            farmers = cur.fetchall()
            
            cur.execute("""
                SELECT p.prediction_id, p.farmer_id, f.full_name as farmer_name, 
                       p.crop_type as crop, s.sector_name as sector,
                       p.yield_per_are_kg, p.total_yield_kg, p.created_at as timestamp, p.is_approved
                FROM predictions p
                JOIN farmers f ON p.farmer_id = f.farmer_id
                JOIN sectors s ON p.sector_id = s.sector_id
                WHERE p.sector_id=%s
                ORDER BY p.created_at DESC
            """, (sec_id,))
            all_preds = cur.fetchall()
            
            cur.execute("""
                SELECT season, ROUND(AVG(yield_per_are_kg),2) as avg_yield, COUNT(*) as count
                FROM predictions
                WHERE sector_id=%s
                GROUP BY season
            """, (sec_id,))
            seasons = cur.fetchall()

            return {
                'total_farmers': farmer_count,
                'total_predictions': pred_count,
                'pending_predictions': list(pending),
                'farmers': list(farmers),
                'all_predictions': list(all_preds),
                'seasons': list(seasons),
            }

def get_underperforming_farms(sector_id: int = None) -> list:
    with get_db() as conn:
        with conn.cursor() as cur:
            query = """
                SELECT f.farmer_id as id, f.full_name as name, s.sector_name,
                       p.crop_type, p.yield_per_are_kg as predicted, 
                       p.actual_yield_kg_are as actual,
                       ROUND(p.yield_per_are_kg - p.actual_yield_kg_are, 2) as gap,
                       ROUND((p.yield_per_are_kg - p.actual_yield_kg_are)/p.yield_per_are_kg * 100, 1) as gap_pct
                FROM predictions p
                JOIN farmers f ON p.farmer_id = f.farmer_id
                JOIN sectors s ON p.sector_id = s.sector_id
                WHERE p.actual_yield_kg_are IS NOT NULL 
                  AND p.actual_yield_kg_are < p.yield_per_are_kg * 0.8
            """
            params = []
            if sector_id:
                query += " AND p.sector_id = %s"
                params.append(sector_id)
            
            query += " ORDER BY gap DESC LIMIT 20"
            cur.execute(query, tuple(params))
            return cur.fetchall()

def get_sector(sector_name: str) -> dict | None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM sectors WHERE sector_name=%s", (sector_name,))
            return cur.fetchone()

def save_advice(officer_id: str, data: dict) -> int:
    with get_db() as conn:
        with conn.cursor() as cur:
            # Get officer type and sector_id
            cur.execute("SELECT officer_type, sector_id FROM officers WHERE officer_id=%s", (officer_id,))
            off = cur.fetchone()
            
            # Use officer's sector if it's a sector officer
            sector_id = off['sector_id'] if off and off['officer_type'] == 'sector' else None
            # Or if it's specifically provided (e.g. from a filter)
            if data.get('sector_id'): sector_id = data.get('sector_id')
            elif data.get('sector'):
                cur.execute("SELECT sector_id FROM sectors WHERE sector_name=%s", (data.get('sector',''),))
                sec = cur.fetchone()
                if sec: sector_id = sec['sector_id']

            cur.execute("""
                INSERT INTO officer_advice (officer_id, farmer_id, prediction_id, sector_id, subject, message, advice_type)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
            """, (officer_id, data.get('farmer_id'), data.get('prediction_id'), sector_id, data.get('subject', 'Advisory'), data.get('message', ''), data.get('advice_type', 'general')))
            conn.commit()
            return cur.lastrowid

def get_farmer_advice(farmer_id: str) -> list:
    with get_db() as conn:
        with conn.cursor() as cur:
            # 1. Get farmer's sector_id from farms
            cur.execute("""
                SELECT fm.sector_id 
                FROM farms fm 
                WHERE fm.farmer_id=%s LIMIT 1
            """, (farmer_id,))
            res = cur.fetchone()
            sector_id = res['sector_id'] if res else None

            # 2. Get advice: directed to them, or broadcast to all, or broadcast to their sector
            cur.execute("""
                SELECT a.*, o.full_name as officer_name, o.officer_type, s.sector_name as officer_sector
                FROM officer_advice a
                JOIN officers o ON a.officer_id = o.officer_id
                LEFT JOIN sectors s ON o.sector_id = s.sector_id
                WHERE a.farmer_id=%s 
                   OR (a.farmer_id IS NULL AND a.sector_id IS NULL)
                   OR (a.farmer_id IS NULL AND a.sector_id=%s)
                ORDER BY a.created_at DESC LIMIT 20
            """, (farmer_id, sector_id))
            return cur.fetchall()

def save_report(sender_id: str, data: dict) -> int:
    with get_db() as conn:
        with conn.cursor() as cur:
            # Resolve sector_id if sector_name provided
            sec_id = None
            if data.get('sector_name'):
                cur.execute("SELECT sector_id FROM sectors WHERE sector_name=%s", (data['sector_name'],))
                res = cur.fetchone()
                if res: sec_id = res['sector_id']
            
            # If no receiver_id, find the first available district officer
            receiver_id = data.get('receiver_id')
            if not receiver_id:
                cur.execute("SELECT officer_id FROM officers WHERE officer_type='district' LIMIT 1")
                res = cur.fetchone()
                if res: receiver_id = res['officer_id']

            cur.execute("""
                INSERT INTO reports (sender_id, receiver_id, sector_id, title, content)
                VALUES (%s,%s,%s,%s,%s)
            """, (sender_id, receiver_id, sec_id, data.get('title', 'Sector Report'), data.get('content', '')))
            conn.commit()
            return cur.lastrowid

def get_reports_for_officer(officer_id: str, role: str) -> list:
    with get_db() as conn:
        with conn.cursor() as cur:
            if role == 'district':
                # District sees all reports or reports sent to them
                cur.execute("""
                    SELECT r.*, o.full_name as sender_name, s.sector_name
                    FROM reports r
                    JOIN officers o ON r.sender_id = o.officer_id
                    LEFT JOIN sectors s ON r.sector_id = s.sector_id
                    ORDER BY r.created_at DESC
                """)
            else:
                # Sector officer sees reports they sent
                cur.execute("""
                    SELECT r.*, o.full_name as sender_name, s.sector_name
                    FROM reports r
                    JOIN officers o ON r.sender_id = o.officer_id
                    LEFT JOIN sectors s ON r.sector_id = s.sector_id
                    WHERE r.sender_id=%s
                    ORDER BY r.created_at DESC
                """, (officer_id,))
            return cur.fetchall()

def get_all_users() -> list:
    with get_db() as conn:
        with conn.cursor() as cur:
            # Get Officers
            cur.execute("""
                SELECT officer_id as id, full_name as name, email, officer_type as role, 
                       department, is_active, last_login, created_at, 'officer' as type
                FROM officers
            """)
            officers = cur.fetchall()
            
            # Get Farmers
            cur.execute("""
                SELECT farmer_id as id, full_name as name, email, 'farmer' as role, 
                       'Farming' as department, is_active, last_login, created_at, 'farmer' as type
                FROM farmers
            """)
            farmers = cur.fetchall()
            
            return list(officers) + list(farmers)

def toggle_user_status(user_id: str, is_farmer: bool, status: int) -> bool:
    table  = 'farmers'  if is_farmer else 'officers'
    id_col = 'farmer_id' if is_farmer else 'officer_id'
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(f"UPDATE {table} SET is_active=%s WHERE {id_col}=%s", (status, user_id))
            conn.commit()
            return cur.rowcount > 0

def get_system_settings() -> dict:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT setting_key, setting_value FROM system_settings")
            rows = cur.fetchall()
            return {r['setting_key']: r['setting_value'] for r in rows}

def update_system_settings(settings: dict) -> bool:
    with get_db() as conn:
        with conn.cursor() as cur:
            for k, v in settings.items():
                cur.execute("""
                    INSERT INTO system_settings (setting_key, setting_value) 
                    VALUES (%s, %s) ON DUPLICATE KEY UPDATE setting_value=%s
                """, (k, v, v))
            conn.commit()
            return True

def get_sector_full_details(sector_id: int) -> dict:
    with get_db() as conn:
        with conn.cursor() as cur:
            # 1. Fetch sector info
            cur.execute("SELECT * FROM sectors WHERE sector_id=%s", (sector_id,))
            sector = cur.fetchone()
            if not sector: return {}
            
            # 2. Fetch farmers in this sector
            # Linking via the farms table
            cur.execute("""
                SELECT DISTINCT f.*
                FROM farmers f
                JOIN farms fm ON f.farmer_id = fm.farmer_id
                WHERE fm.sector_id = %s AND f.is_active = 1
            """, (sector_id,))
            farmers = cur.fetchall()
            
            # 3. Fetch predictions in this sector
            cur.execute("""
                SELECT p.*, f.full_name as farmer_name
                FROM predictions p
                JOIN farmers f ON p.farmer_id = f.farmer_id
                WHERE p.sector_id = %s
                ORDER BY p.created_at DESC
            """, (sector_id,))
            predictions = cur.fetchall()
            
            # 4. Filter and process
            clean_preds = []
            for r in predictions:
                d = {}
                for k,v in r.items():
                    if hasattr(v, 'isoformat'): d[k] = v.isoformat()
                    elif hasattr(v, '__float__') and not isinstance(v, (int, str, bool, type(None))): d[k] = float(v)
                    else: d[k] = v
                clean_preds.append(d)
            
            return {
                'sector': sector,
                'farmers': list(farmers),
                'predictions': clean_preds
            }

if __name__ == '__main__':
    print("[tree] Testing MySQL connection...")
    init_db()
