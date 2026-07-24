import sys
sys.path.insert(0, ".venv/lib/python3.13/site-packages")
import psycopg2

try:
    print("Testing connection to database...")
    conn = psycopg2.connect("postgresql://revanthgaddam:pass1234@127.0.0.1:5432/vqr_db")
    print("Connection successful!")
    conn.close()
except Exception as e:
    print("Connection failed with error:")
    print(e)
