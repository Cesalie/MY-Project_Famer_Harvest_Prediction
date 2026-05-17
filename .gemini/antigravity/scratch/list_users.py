import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from database import get_db

def list_all():
    with get_db() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute("SELECT farmer_id, full_name, email, phone, is_active FROM farmers")
                farmers = cur.fetchall()
                print(f"--- FARMERS ({len(farmers)}) ---")
                for f in farmers:
                    print(f)
            except Exception as e: print(f"Error farmers: {e}")
            
            try:
                cur.execute("SELECT officer_id, full_name, email, officer_type, is_active FROM officers")
                officers = cur.fetchall()
                print(f"\n--- OFFICERS ({len(officers)}) ---")
                for o in officers:
                    print(o)
            except Exception as e: print(f"Error officers: {e}")

if __name__ == "__main__":
    list_all()
