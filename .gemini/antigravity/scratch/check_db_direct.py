import pymysql
import sys

DB_CONFIG = {
    'host'     : 'localhost',
    'port'     : 3306,
    'user'     : 'root',
    'password' : '',
    'database' : 'bugesera_harvest',
    'charset'  : 'utf8mb4',
}

try:
    conn = pymysql.connect(**DB_CONFIG)
    print("SUCCESS: Connected to MySQL")
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) as cnt FROM farmers")
        print(f"Farmers count: {cur.fetchone()['cnt']}")
    conn.close()
except Exception as e:
    print(f"ERROR: {e}")
