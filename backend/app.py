from flask import Flask, render_template, request, redirect, url_for, jsonify
import mysql.connector
import os
import json
from werkzeug.utils import secure_filename

app = Flask(__name__)

UPLOAD_FOLDER = os.path.join('static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Jinja filter to parse JSON in templates
@app.template_filter('from_json')
def from_json_filter(value):
    try:
        return json.loads(value)
    except:
        return []

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_db():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        port=int(os.getenv("DB_PORT")),
        ssl_disabled=False  # Required for Aiven SSL
    )

# ── AUTO-MIGRATE: add columns if they don't exist ──
def migrate_db():
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) NOT NULL DEFAULT 'dinein'
        """)
        cursor.execute("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT NULL
        """)
        cursor.execute("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100) DEFAULT NULL
        """)
        cursor.execute("""
            ALTER TABLE items
            ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL
        """)
        cursor.execute("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS bill_sent TINYINT(1) NOT NULL DEFAULT 0
        """)
        db.commit()
        db.close()
    except Exception as e:
        print(f"[migrate_db] {e}")

# ── HOME ───────────────────────────────────────────
@app.route('/')
def home():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM items WHERE status = 'available'")
    items = cursor.fetchall()
    cursor.execute("SELECT * FROM items WHERE featured = 1 AND status = 'available'")
    featured_items = cursor.fetchall()
    db.close()
    table = request.args.get('table', '')
    return render_template("index.html", items=items, featured_items=featured_items, table=table)

# ── PLACE ORDER ────────────────────────────────────
@app.route('/place-order', methods=['POST'])
def place_order():
    db = get_db()
    cursor = db.cursor()
    data       = request.get_json()
    order_type = data.get('order_type', 'dinein')
    items      = json.dumps(data.get('items', []))
    total      = data.get('total', 0)
    note       = data.get('note', '')

    if order_type == 'delivery':
        delivery_address = data.get('delivery_address', '')
        customer_name    = data.get('customer_name', 'Customer')
        table_number     = 'DELIVERY'
        cursor.execute(
            """INSERT INTO orders
               (table_number, items, total, note, status, order_type, delivery_address, customer_name)
               VALUES (%s, %s, %s, %s, 'pending', 'delivery', %s, %s)""",
            (table_number, items, total, note, delivery_address, customer_name)
        )
    else:
        table_number = data.get('table', '')
        cursor.execute(
            """INSERT INTO orders
               (table_number, items, total, note, status, order_type)
               VALUES (%s, %s, %s, %s, 'pending', 'dinein')""",
            (table_number, items, total, note)
        )

    db.commit()
    order_id = cursor.lastrowid
    db.close()
    return jsonify({'success': True, 'order_id': order_id})

# ── KITCHEN PANEL ──────────────────────────────────
@app.route('/kitchen')
def kitchen():
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM orders WHERE status IN ('pending','preparing') ORDER BY created_at ASC"
    )
    orders = cursor.fetchall()
    db.close()
    return render_template("kitchen.html", orders=orders)

@app.route('/kitchen/poll')
def kitchen_poll():
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM orders WHERE status IN ('pending','preparing') ORDER BY created_at ASC"
    )
    rows = cursor.fetchall()
    db.close()
    orders = []
    for o in rows:
        order_type       = o[7]  if len(o) > 7 else 'dinein'
        delivery_address = o[8]  if len(o) > 8 else ''
        customer_name    = o[9]  if len(o) > 9 else ''
        orders.append({
            'id':               o[0],
            'table':            o[1],
            'items':            json.loads(o[2]),
            'total':            float(o[3]),
            'status':           o[4],
            'note':             o[5] or '',
            'created':          str(o[6]),
            'order_type':       order_type,
            'delivery_address': delivery_address or '',
            'customer_name':    customer_name or '',
        })
    return jsonify(orders)

@app.route('/kitchen/action/<int:id>/<action>')
def kitchen_action(id, action):
    allowed = {'preparing': 'preparing', 'delivered': 'delivered', 'ready': 'ready'}
    if action not in allowed:
        return jsonify({'error': 'invalid'}), 400
    db = get_db()
    cursor = db.cursor()
    cursor.execute("UPDATE orders SET status=%s WHERE id=%s", (allowed[action], id))
    db.commit()
    db.close()
    return jsonify({'success': True})

# ── BILLING PANEL ──────────────────────────────────
@app.route('/billing')
def billing():
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM orders WHERE status != 'cancelled' ORDER BY created_at DESC"
    )
    orders = cursor.fetchall()
    db.close()
    return render_template("billing.html", orders=orders)

@app.route('/billing/poll')
def billing_poll():
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM orders WHERE status != 'cancelled' ORDER BY created_at DESC"
    )
    rows = cursor.fetchall()
    db.close()
    orders = []
    for o in rows:
        order_type       = o[7]  if len(o) > 7 else 'dinein'
        delivery_address = o[8]  if len(o) > 8 else ''
        customer_name    = o[9]  if len(o) > 9 else ''
        orders.append({
            'id':               o[0],
            'table':            o[1],
            'items':            json.loads(o[2]),
            'total':            float(o[3]),
            'status':           o[4],
            'note':             o[5] or '',
            'created':          str(o[6]),
            'order_type':       order_type,
            'delivery_address': delivery_address or '',
            'customer_name':    customer_name or '',
        })
    return jsonify(orders)

@app.route('/billing/generate/<int:id>')
def billing_generate(id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("UPDATE orders SET status='billed' WHERE id=%s", (id,))
    db.commit()
    db.close()
    return jsonify({'success': True})

# ── SEND BILL TO CUSTOMER UI ───────────────────────
@app.route('/billing/send/<int:id>', methods=['POST'])
def billing_send(id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("UPDATE orders SET bill_sent=1 WHERE id=%s AND order_type='dinein'", (id,))
    db.commit()
    db.close()
    return jsonify({'success': True})

# ── ONE-TIME FIX: add bill_sent column ────────────
@app.route('/fix-db')
def fix_db():
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS bill_sent TINYINT(1) NOT NULL DEFAULT 0")
        db.commit()
        db.close()
        return "✅ bill_sent column added successfully. You can close this tab."
    except Exception as e:
        return f"ℹ️ {e}"

# -- CUSTOMER: GET BILL FOR TABLE --
@app.route('/get-bill')
def get_bill():
    table = request.args.get('table', '')
    if not table:
        return jsonify({'bill': None})
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """SELECT id, items, total FROM orders
           WHERE table_number=%s AND order_type='dinein'
           AND bill_sent=1 AND status='bill_requested'
           ORDER BY created_at ASC""",
        (table,)
    )
    rows = cursor.fetchall()
    db.close()
    if not rows:
        return jsonify({'bill': None})
    all_items = []
    grand_total = 0.0
    for row in rows:
        all_items.extend(json.loads(row[1]))
        grand_total += float(row[2])
    return jsonify({
        'bill': {
            'items': all_items,
            'total': grand_total,
        }
    })

@app.route('/request-bill', methods=['POST'])
def request_bill():
    data  = request.get_json()
    table = data.get('table', '')
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """UPDATE orders SET status='bill_requested'
           WHERE table_number=%s
           AND order_type='dinein'
           AND status IN ('pending','preparing','delivered','ready')""",
        (table,)
    )
    db.commit()
    db.close()
    return jsonify({'success': True})

# ── ORDER STATUS (admin shortcut) ─────────────────
@app.route('/admin/order/status/<int:id>/<status>')
def update_order_status(id, status):
    allowed = ['pending', 'preparing', 'delivered', 'bill_requested', 'billed', 'cancelled']
    if status not in allowed:
        return redirect(url_for('admin'))
    db = get_db()
    cursor = db.cursor()
    cursor.execute("UPDATE orders SET status=%s WHERE id=%s", (status, id))
    db.commit()
    db.close()
    return redirect(url_for('admin'))

@app.route('/admin/order/delete/<int:id>')
def delete_order(id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("DELETE FROM orders WHERE id=%s", (id,))
    db.commit()
    db.close()
    return redirect(url_for('admin'))

# ── BOOKING ────────────────────────────────────────
@app.route('/booking')
def booking():
    return render_template("booking.html")

@app.route('/booking/submit', methods=['POST'])
def booking_submit():
    db = get_db()
    cursor = db.cursor()
    name     = request.form['name']
    phone    = request.form['phone']
    date     = request.form['date']
    time_    = request.form['time']
    guests   = request.form['guests']
    requests = request.form.get('requests', '')
    cursor.execute(
        "INSERT INTO bookings (name, phone, date, time, guests, requests, status, assigned_table) VALUES (%s,%s,%s,%s,%s,%s,'pending',NULL)",
        (name, phone, date, time_, guests, requests)
    )
    db.commit()
    db.close()
    return render_template("booking.html", success=True)

# ── ADMIN ──────────────────────────────────────────
@app.route('/admin')
def admin():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT id, name, price, category, type, status, image, featured, description FROM items")
    items = cursor.fetchall()
    cursor.execute("SELECT * FROM bookings ORDER BY created_at DESC")
    bookings = cursor.fetchall()
    cursor.execute("SELECT * FROM tables ORDER BY table_number ASC")
    tables = cursor.fetchall()
    cursor.execute("SELECT * FROM orders ORDER BY created_at DESC")
    orders = cursor.fetchall()
    db.close()
    return render_template("admin.html", items=items, bookings=bookings, tables=tables, orders=orders)

@app.route('/admin/add', methods=['POST'])
def add_item():
    db = get_db()
    cursor = db.cursor()
    name        = request.form['name']
    price       = request.form['price']
    category    = request.form['category']
    type_       = request.form['type']
    description = request.form.get('description', '').strip()
    image_filename = ''
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            image_filename = filename
    cursor.execute(
        "INSERT INTO items (name, price, category, type, status, image, featured, description) VALUES (%s,%s,%s,%s,'available',%s,0,%s)",
        (name, price, category, type_, image_filename, description)
    )
    db.commit()
    db.close()
    return redirect(url_for('admin'))

@app.route('/admin/delete/<int:id>')
def delete_item(id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("DELETE FROM items WHERE id=%s", (id,))
    db.commit()
    db.close()
    return redirect(url_for('admin'))

@app.route('/admin/toggle/<int:id>')
def toggle_status(id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT status FROM items WHERE id=%s", (id,))
    current = cursor.fetchone()[0]
    new_status = 'unavailable' if current == 'available' else 'available'
    cursor.execute("UPDATE items SET status=%s WHERE id=%s", (new_status, id))
    db.commit()
    db.close()
    return redirect(url_for('admin'))

@app.route('/admin/feature/<int:id>')
def toggle_featured(id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT featured FROM items WHERE id=%s", (id,))
    current = cursor.fetchone()[0]
    new_val = 0 if current == 1 else 1
    cursor.execute("UPDATE items SET featured=%s WHERE id=%s", (new_val, id))
    db.commit()
    db.close()
    return redirect(url_for('admin'))

@app.route('/admin/edit/<int:id>', methods=['GET', 'POST'])
def edit_item(id):
    db = get_db()
    cursor = db.cursor()
    if request.method == 'POST':
        name        = request.form['name']
        price       = request.form['price']
        category    = request.form['category']
        type_       = request.form['type']
        description = request.form.get('description', '').strip()
        cursor.execute("SELECT image FROM items WHERE id=%s", (id,))
        row = cursor.fetchone()
        image_filename = row[0] if row else ''
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                image_filename = filename
        cursor.execute(
            "UPDATE items SET name=%s, price=%s, category=%s, type=%s, image=%s, description=%s WHERE id=%s",
            (name, price, category, type_, image_filename, description, id)
        )
        db.commit()
        db.close()
        return redirect(url_for('admin'))
    cursor.execute(
        "SELECT id, name, price, category, type, status, image, featured, description FROM items WHERE id=%s", (id,)
    )
    item = cursor.fetchone()
    db.close()
    return render_template("edit.html", item=item)

# ── BOOKING ACTIONS ────────────────────────────────
@app.route('/admin/booking/confirm/<int:id>', methods=['POST'])
def confirm_booking(id):
    db = get_db()
    cursor = db.cursor()
    assigned_table = request.form.get('assigned_table') or None
    cursor.execute(
        "UPDATE bookings SET status='confirmed', assigned_table=%s WHERE id=%s",
        (assigned_table, id)
    )
    db.commit()
    db.close()
    return redirect(url_for('admin'))

@app.route('/admin/booking/reject/<int:id>')
def reject_booking(id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("UPDATE bookings SET status='rejected' WHERE id=%s", (id,))
    db.commit()
    db.close()
    return redirect(url_for('admin'))

@app.route('/admin/booking/delete/<int:id>')
def delete_booking(id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("DELETE FROM bookings WHERE id=%s", (id,))
    db.commit()
    db.close()
    return redirect(url_for('admin'))

# ── QR / TABLES ────────────────────────────────────
@app.route('/admin/qr')
def qr_page():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM tables ORDER BY table_number ASC")
    tables = cursor.fetchall()
    db.close()
    base_url = request.host_url.rstrip('/')
    return render_template("qr.html", tables=tables, base_url=base_url)

@app.route('/admin/qr/add', methods=['POST'])
def add_table():
    db = get_db()
    cursor = db.cursor()
    table_number = request.form['table_number']
    try:
        cursor.execute("INSERT INTO tables (table_number) VALUES (%s)", (table_number,))
        db.commit()
    except:
        pass
    db.close()
    return redirect(url_for('qr_page'))

@app.route('/admin/qr/add-bulk', methods=['POST'])
def add_bulk_tables():
    db = get_db()
    cursor = db.cursor()
    count = int(request.form.get('count', 0))
    for i in range(1, count + 1):
        try:
            cursor.execute("INSERT IGNORE INTO tables (table_number) VALUES (%s)", (i,))
        except:
            pass
    db.commit()
    db.close()
    return redirect(url_for('qr_page'))

@app.route('/admin/qr/delete/<int:id>')
def delete_table(id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("DELETE FROM tables WHERE id=%s", (id,))
    db.commit()
    db.close()
    return redirect(url_for('qr_page'))

# ── DELIVERY PANEL ─────────────────────────────────
@app.route('/delivery')
def delivery():
    return render_template("delivery.html")

@app.route('/delivery/poll')
def delivery_poll():
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM orders WHERE order_type='delivery' AND status IN ('ready','delivered') ORDER BY created_at DESC"
    )
    rows = cursor.fetchall()
    db.close()
    orders = []
    for o in rows:
        orders.append({
            'id':               o[0],
            'table':            o[1],
            'items':            json.loads(o[2]),
            'total':            float(o[3]),
            'status':           o[4],
            'note':             o[5] or '',
            'created':          str(o[6]),
            'order_type':       o[7] if len(o) > 7 else 'delivery',
            'delivery_address': o[8] if len(o) > 8 else '',
            'customer_name':    o[9] if len(o) > 9 else '',
        })
    return jsonify(orders)

@app.route('/delivery/action/<int:id>/delivered', methods=['POST'])
def delivery_action(id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("UPDATE orders SET status='delivered' WHERE id=%s AND order_type='delivery'", (id,))
    db.commit()
    db.close()
    return jsonify({'success': True})

if __name__ == '__main__':
    migrate_db()
    app.run(debug=False, host='0.0.0.0', port=5000)