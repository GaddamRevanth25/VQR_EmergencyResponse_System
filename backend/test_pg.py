import os
import sys
import psycopg2
from dotenv import load_dotenv

# Load environment variables from the backend/.env file
load_dotenv(override=True)

db_url = os.getenv("DATABASE_URL")

if not db_url:
    print("Error: DATABASE_URL is not set in environment or .env file.")
    sys.exit(1)

# Check if current setting is SQLite
if db_url.startswith("sqlite"):
    print("----------------------------------------------------------------------")
    print(f"Current DATABASE_URL: {db_url}")
    print("NOTICE: SQLite is configured. psycopg2 can only connect to PostgreSQL.")
    print("Please configure DATABASE_URL in your .env to a postgresql:// URL first.")
    print("----------------------------------------------------------------------")
    sys.exit(0)

try:
    # Print hidden/masked database URL for privacy
    masked_url = db_url
    if "@" in db_url:
        creds, host = db_url.split("@", 1)
        scheme = creds.split("://", 1)[0]
        masked_url = f"{scheme}://****:****@{host}"
        
    print(f"Testing connection to database: {masked_url} ...")
    conn = psycopg2.connect(db_url)
    print("Connection successful!")
    conn.close()
except Exception as e:
    print("Connection failed with error:")
    print(e)
