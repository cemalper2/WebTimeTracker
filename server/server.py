"""
Time Tracker Sync Server

A Flask-based REST API server for the Time Tracker application.
Provides endpoints for task synchronization with SQLite persistence.
"""

import os
import json
import sqlite3
import random
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, g
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
DATABASE = os.environ.get('DATABASE_PATH', 'tasks.db')


def get_db():
    """Get database connection for current request context."""
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db


@app.teardown_appcontext
def close_connection(exception):
    """Close database connection at end of request."""
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


def init_db():
    """Initialize the database schema."""
    with app.app_context():
        db = get_db()
        # Create tasks table if not exists - now with subtasks and updated_at!
        db.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                duration INTEGER DEFAULT 0,
                session_date TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER DEFAULT 0,
                timer_logs TEXT DEFAULT '[]',
                subtasks TEXT DEFAULT '[]'
            )
        ''')
        
        # Check if subtasks/updated_at column exists (migration for existing DBs)
        cursor = db.execute("PRAGMA table_info(tasks)")
        columns = [info[1] for info in cursor.fetchall()]
        if 'subtasks' not in columns:
            print("Migrating database: Adding subtasks column...")
            db.execute("ALTER TABLE tasks ADD COLUMN subtasks TEXT DEFAULT '[]'")
        if 'updated_at' not in columns:
            print("Migrating database: Adding updated_at column...")
            db.execute("ALTER TABLE tasks ADD COLUMN updated_at INTEGER DEFAULT 0")
            
        db.commit()


def row_to_dict(row):
    """Convert a sqlite3.Row to a dictionary with camelCase keys."""
    if row is None:
        return None
    return {
        'id': row['id'],
        'name': row['name'],
        'duration': row['duration'],
        'sessionDate': row['session_date'],
        'createdAt': row['created_at'],
        'updatedAt': row['updated_at'] if 'updated_at' in row.keys() else row['created_at'],
        'timerLogs': json.loads(row['timer_logs']) if row['timer_logs'] else [],
        'subtasks': json.loads(row['subtasks']) if row.keys().__contains__('subtasks') and row['subtasks'] else []
    }


# Health check endpoint
@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'service': 'time-tracker-api'})


# GET /api/tasks - Get all tasks or filter by date
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Get tasks, optionally filtered by date."""
    date_filter = request.args.get('date')
    db = get_db()
    
    if date_filter:
        cursor = db.execute(
            'SELECT * FROM tasks WHERE session_date = ? ORDER BY created_at DESC',
            (date_filter,)
        )
    else:
        cursor = db.execute('SELECT * FROM tasks ORDER BY created_at DESC')
    
    tasks = [row_to_dict(row) for row in cursor.fetchall()]
    return jsonify(tasks)


# POST /api/tasks - Create or update a task
@app.route('/api/tasks', methods=['POST'])
def create_or_update_task():
    """Create a new task or update existing one (upsert)."""
    data = request.get_json()
    
    if not data or 'id' not in data:
        return jsonify({'error': 'Task ID is required'}), 400
    
    db = get_db()
    
    # Check if task exists
    existing = db.execute('SELECT id FROM tasks WHERE id = ?', (data['id'],)).fetchone()
    
    timer_logs = json.dumps(data.get('timerLogs', []))
    subtasks = json.dumps(data.get('subtasks', []))
    updated_at = data.get('updatedAt', int(datetime.now().timestamp() * 1000))
    
    if existing:
        # Update existing task
        db.execute('''
            UPDATE tasks SET 
                name = ?,
                duration = ?,
                session_date = ?,
                created_at = ?,
                updated_at = ?,
                timer_logs = ?,
                subtasks = ?
            WHERE id = ?
        ''', (
            data.get('name', 'Untitled'),
            data.get('duration', 0),
            data.get('sessionDate', datetime.now().strftime('%Y-%m-%d')),
            data.get('createdAt', int(datetime.now().timestamp() * 1000)),
            updated_at,
            timer_logs,
            subtasks,
            data['id']
        ))
    else:
        # Insert new task
        db.execute('''
            INSERT INTO tasks (id, name, duration, session_date, created_at, updated_at, timer_logs, subtasks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['id'],
            data.get('name', 'Untitled'),
            data.get('duration', 0),
            data.get('sessionDate', datetime.now().strftime('%Y-%m-%d')),
            data.get('createdAt', int(datetime.now().timestamp() * 1000)),
            updated_at,
            timer_logs,
            subtasks
        ))
    
    db.commit()
    
    # Return the saved task
    saved = db.execute('SELECT * FROM tasks WHERE id = ?', (data['id'],)).fetchone()
    return jsonify(row_to_dict(saved)), 201


# GET /api/tasks/<id> - Get a single task
@app.route('/api/tasks/<task_id>', methods=['GET'])
def get_task(task_id):
    """Get a single task by ID."""
    db = get_db()
    row = db.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
    
    if row is None:
        return jsonify({'error': 'Task not found'}), 404
    
    return jsonify(row_to_dict(row))


# DELETE /api/tasks/<id> - Delete a task
@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Delete a task by ID."""
    db = get_db()
    result = db.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
    db.commit()
    
    if result.rowcount == 0:
        return jsonify({'error': 'Task not found'}), 404
    
    return jsonify({'message': 'Task deleted', 'id': task_id})


# POST /api/tasks/seed - Seed with sample data
@app.route('/api/tasks/seed', methods=['POST'])
def seed_tasks():
    """Seed the database with sample data for the past 30 days."""
    task_names = [
        'Morning Standup', 'Code Review', 'Feature Development',
        'Bug Fixes', 'Documentation', 'Team Meeting', 'Design Session',
        'Testing', 'Deployment', 'Research', 'Learning', 'Planning',
        'Client Call', 'Refactoring', 'Performance Optimization'
    ]
    
    db = get_db()
    now = datetime.now()
    tasks_created = 0
    
    for days_ago in range(30):
        date = now - timedelta(days=days_ago)
        date_str = date.strftime('%Y-%m-%d')
        
        # 2-5 tasks per day
        tasks_per_day = random.randint(2, 5)
        
        for i in range(tasks_per_day):
            task_id = f"seed_{date_str}_{i}"
            name = random.choice(task_names)
            duration = random.randint(900, 7200)  # 15min to 2hrs
            created_at = int((date - timedelta(hours=i)).timestamp() * 1000)
            
            db.execute('''
                INSERT OR REPLACE INTO tasks (id, name, duration, session_date, created_at, updated_at, timer_logs, subtasks)
                VALUES (?, ?, ?, ?, ?, ?, '[]', '[]')
            ''', (task_id, name, duration, date_str, created_at, created_at))
            tasks_created += 1
    
    db.commit()
    return jsonify({'message': f'Seeded {tasks_created} tasks across 30 days'})


# DELETE /api/tasks/clear - Clear all data
@app.route('/api/tasks/clear', methods=['DELETE'])
def clear_tasks():
    """Clear all tasks from the database."""
    db = get_db()
    result = db.execute('DELETE FROM tasks')
    db.commit()
    return jsonify({'message': f'Cleared {result.rowcount} tasks'})

# Initialize DB on module load (ensures migration runs in Gunicorn)
with app.app_context():
    init_db()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    print(f"Starting Time Tracker API on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
