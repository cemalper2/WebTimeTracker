"""
Tests for the Time Tracker Sync Server
"""

import pytest
import json
import os
import tempfile
from server import app, init_db, DATABASE


@pytest.fixture
def client():
    """Create a test client with a temporary database."""
    # Use temp file for test database
    db_fd, db_path = tempfile.mkstemp()
    
    app.config['TESTING'] = True
    
    # Override DATABASE path
    import server
    original_db = server.DATABASE
    server.DATABASE = db_path
    
    with app.test_client() as client:
        with app.app_context():
            init_db()
        yield client
    
    # Cleanup
    server.DATABASE = original_db
    os.close(db_fd)
    os.unlink(db_path)


def test_health_check(client):
    """Test health endpoint."""
    response = client.get('/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'ok'
    assert data['service'] == 'time-tracker-api'


def test_get_tasks_empty(client):
    """Test getting tasks when database is empty."""
    response = client.get('/api/tasks')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data == []


def test_create_task(client):
    """Test creating a new task."""
    task = {
        'id': 'test-1',
        'name': 'Test Task',
        'duration': 3600,
        'sessionDate': '2024-01-15',
        'createdAt': 1705330800000,
        'timerLogs': [{'event': 'start', 'timestamp': 1705330800000}]
    }
    
    response = client.post(
        '/api/tasks',
        data=json.dumps(task),
        content_type='application/json'
    )
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['id'] == 'test-1'
    assert data['name'] == 'Test Task'
    assert data['duration'] == 3600


def test_get_task_by_id(client):
    """Test getting a single task by ID."""
    # Create a task first
    task = {
        'id': 'test-2',
        'name': 'Get Task Test',
        'duration': 1800,
        'sessionDate': '2024-01-15',
        'createdAt': 1705330800000
    }
    client.post('/api/tasks', data=json.dumps(task), content_type='application/json')
    
    # Get the task
    response = client.get('/api/tasks/test-2')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['name'] == 'Get Task Test'


def test_get_task_not_found(client):
    """Test getting a non-existent task."""
    response = client.get('/api/tasks/non-existent')
    assert response.status_code == 404


def test_update_task(client):
    """Test updating an existing task."""
    # Create a task
    task = {
        'id': 'test-3',
        'name': 'Original Name',
        'duration': 100,
        'sessionDate': '2024-01-15',
        'createdAt': 1705330800000
    }
    client.post('/api/tasks', data=json.dumps(task), content_type='application/json')
    
    # Update the task
    task['name'] = 'Updated Name'
    task['duration'] = 200
    response = client.post('/api/tasks', data=json.dumps(task), content_type='application/json')
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['name'] == 'Updated Name'
    assert data['duration'] == 200


def test_delete_task(client):
    """Test deleting a task."""
    # Create a task
    task = {
        'id': 'test-4',
        'name': 'To Delete',
        'duration': 100,
        'sessionDate': '2024-01-15',
        'createdAt': 1705330800000
    }
    client.post('/api/tasks', data=json.dumps(task), content_type='application/json')
    
    # Delete the task
    response = client.delete('/api/tasks/test-4')
    assert response.status_code == 200
    
    # Verify it's gone
    response = client.get('/api/tasks/test-4')
    assert response.status_code == 404


def test_filter_tasks_by_date(client):
    """Test filtering tasks by date."""
    # Create tasks on different dates
    task1 = {
        'id': 'date-1',
        'name': 'Task Jan 15',
        'duration': 100,
        'sessionDate': '2024-01-15',
        'createdAt': 1705330800000
    }
    task2 = {
        'id': 'date-2',
        'name': 'Task Jan 16',
        'duration': 100,
        'sessionDate': '2024-01-16',
        'createdAt': 1705417200000
    }
    
    client.post('/api/tasks', data=json.dumps(task1), content_type='application/json')
    client.post('/api/tasks', data=json.dumps(task2), content_type='application/json')
    
    # Filter by Jan 15
    response = client.get('/api/tasks?date=2024-01-15')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data) == 1
    assert data[0]['name'] == 'Task Jan 15'


def test_seed_tasks(client):
    """Test seeding the database with sample data."""
    response = client.post('/api/tasks/seed')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'Seeded' in data['message']
    
    # Verify tasks exist
    response = client.get('/api/tasks')
    data = json.loads(response.data)
    assert len(data) > 0


def test_clear_tasks(client):
    """Test clearing all tasks."""
    # Create some tasks
    for i in range(3):
        task = {
            'id': f'clear-{i}',
            'name': f'Task {i}',
            'duration': 100,
            'sessionDate': '2024-01-15',
            'createdAt': 1705330800000
        }
        client.post('/api/tasks', data=json.dumps(task), content_type='application/json')
    
    # Clear all
    response = client.delete('/api/tasks/clear')
    assert response.status_code == 200
    
    # Verify empty
    response = client.get('/api/tasks')
    data = json.loads(response.data)
    assert len(data) == 0
