"""
Tests for the Time Tracker Sync Server including Subtasks
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

def test_create_task_with_subtasks(client):
    """Test creating a new task with subtasks."""
    subtask1 = {
        'id': 'sub-1',
        'name': 'Subtask 1',
        'duration': 100,
        'createdAt': 1705330800000
    }
    
    task = {
        'id': 'test-parent',
        'name': 'Parent Task',
        'duration': 200, # Own duration
        'sessionDate': '2024-01-15',
        'createdAt': 1705330800000,
        'subtasks': [subtask1]
    }
    
    # POST
    response = client.post(
        '/api/tasks',
        data=json.dumps(task),
        content_type='application/json'
    )
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['id'] == 'test-parent'
    assert 'subtasks' in data
    assert len(data['subtasks']) == 1
    assert data['subtasks'][0]['name'] == 'Subtask 1'
    
    # GET
    response = client.get('/api/tasks/test-parent')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['subtasks']) == 1
    assert data['subtasks'][0]['id'] == 'sub-1'

def test_update_task_subtasks(client):
    """Test updating subtasks."""
    # Create valid initial task
    task = {
        'id': 'test-update',
        'name': 'Parent',
        'subtasks': []
    }
    client.post('/api/tasks', data=json.dumps(task), content_type='application/json')
    
    # Update with subtask
    task['subtasks'] = [{
        'id': 'sub-new',
        'name': 'New Subtask',
        'duration': 50
    }]
    
    response = client.post('/api/tasks', data=json.dumps(task), content_type='application/json')
    assert response.status_code == 201
    data = json.loads(response.data)
    assert len(data['subtasks']) == 1
    assert data['subtasks'][0]['name'] == 'New Subtask'

def test_create_task_without_subtasks(client):
    """Regression test: Normal task without subtasks field should default to empty list."""
    task = {
        'id': 'test-simple',
        'name': 'Simple Task'
    }
    response = client.post('/api/tasks', data=json.dumps(task), content_type='application/json')
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['subtasks'] == []
