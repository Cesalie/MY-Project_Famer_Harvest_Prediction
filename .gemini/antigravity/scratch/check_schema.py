import pymysql
import pymysql.cursors

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'bugesera_harvest',
    'cursorclass': pymysql.cursors.DictCursor
}

def check_schema():
    try:
        conn = pymysql.connect(**DB_CONFIG)
        with conn.cursor() as cur:
            cur.execute("DESCRIBE predictions")
            columns = cur.fetchall()
            print("Predictions Table Columns:")
            for col in columns:
                print(f"- {col['Field']} ({col['Type']})")
            
            cur.execute("SELECT * FROM predictions LIMIT 1")
            row = cur.fetchone()
            if row:
                print("\nSample Data:")
                print(row)
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    check_schema()
