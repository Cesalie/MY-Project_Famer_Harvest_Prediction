import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from database import get_db

def check_farms():
    with get_db() as conn:
        with conn.cursor() as cur:
            print("--- FARMS TABLE ---")
            cur.execute("DESCRIBE farms")
            for col in cur.fetchall():
                print(col)

if __name__ == "__main__":
    check_farms()
