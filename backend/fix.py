import mysql.connector

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="1234",
    database="foodmenu"
)
cursor = db.cursor()

try:
    cursor.execute("ALTER TABLE orders ADD COLUMN bill_sent TINYINT(1) NOT NULL DEFAULT 0")
    db.commit()
    print("SUCCESS — bill_sent column added!")
except mysql.connector.Error as e:
    if e.errno == 1060:  # Duplicate column
        print("Column already exists — you're good!")
    else:
        print("Error:", e)

db.close()