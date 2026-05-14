from flask import Blueprint, render_template, request, jsonify
import sqlite3

trainer_bp = Blueprint('trainer_bp', __name__)

def get_db():
    conn = sqlite3.connect('Fitness.db')
    conn.row_factory = sqlite3.Row
    # Make sure the table exists if it hasn't been created yet
    conn.execute('''
        CREATE TABLE IF NOT EXISTS Trainer_Availability_table (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trainer_id INTEGER,
            day_of_week INTEGER,
            start_time TEXT,
            end_time TEXT
        )
    ''')
    conn.commit()
    return conn

# LOAD THE PAGE
@trainer_bp.route('/trainer')
def trainer_portal():
    conn = get_db()
    # Fetching data for Trainer #1
    rows = conn.execute('''
        SELECT day_of_week, start_time, end_time 
        FROM Trainer_Availability_table 
        WHERE trainer_id = 1 
    ''').fetchall()
    conn.close()

    # Organize data into a dictionary for the JavaScript calendar
    availability_data = {i: [] for i in range(7)}
    for row in rows:
        if row['day_of_week'] is not None:
            availability_data[int(row['day_of_week'])].append({
                'startTime': row['start_time'],
                'endTime': row['end_time']
            })

    # Send the data to your HTML file inside the 'templates' folder
    return render_template("Trainer's Page.html", availability_data=availability_data)

# SAVE NEW SLOTS
@trainer_bp.route('/api/add-availability', methods=['POST'])
def add_availability():
    data = request.get_json()
    day_of_week = data.get('dayOfWeek')
    start_time = data.get('startTime')
    end_time = data.get('endTime')
    trainer_id = 1 # Hardcoded until you build a login system

    try:
        conn = get_db()
        conn.execute('''
            INSERT INTO Trainer_Availability_table (trainer_id, day_of_week, start_time, end_time) 
            VALUES (?, ?, ?, ?)
        ''', (trainer_id, day_of_week, start_time, end_time))
        conn.commit()
        conn.close()
        return jsonify({'status': 'success', 'message': 'Saved to Database!'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500