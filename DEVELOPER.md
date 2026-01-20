# Developer Guide

Development documentation for the Time Tracker application.

## Project Structure

```
time-tracker/
├── index.html          # Main HTML
├── index.css           # Styles
├── app.js              # Main application logic
├── config.json         # Configuration
├── components/         # UI components
│   ├── timer.js
│   ├── taskEntry.js
│   ├── taskList.js
│   └── detailPanel.js
├── services/           # Backend services
│   ├── storage.js      # IndexedDB storage
│   ├── sync.js         # Sync service
│   └── taskApi.js      # Task API/autocomplete
├── utils/              # Utilities
│   └── formatters.js
├── server/             # Python backend (optional)
│   ├── server.py
│   ├── Dockerfile
│   └── requirements.txt
└── docker-compose.yml
```

## Running Locally

### With Docker (recommended)

```bash
docker-compose build
docker-compose up -d
```

Access at: http://localhost:8081

### Enabling the Python Backend

Edit `docker-compose.yml` and uncomment the `api` service:

```yaml
  api:
    build: ./server
    ports:
      - "5000:5000"
    # ...
```

Also uncomment `depends_on: - api` in the `web` service.

Then update `config.json`:
```json
{
  "syncServerUrl": "http://localhost:5000"
}
```

## Development

### Running Tests

```bash
npm test
```

### Mock Sync Service

The app includes a mock sync service using IndexedDB. To seed test data:

```javascript
// In browser console
import('./services/sync.js').then(m => m.syncService.seedServer())
```

### Data Structure

Tasks are stored in IndexedDB with the following structure:

```javascript
{
  id: "unique-id",
  name: "Task name",
  duration: 3600,           // seconds
  createdAt: 1234567890000, // timestamp
  updatedAt: 1234567890000, // timestamp
  sessionDate: "2024-01-01",
  timerLogs: [
    { event: "start", timestamp: "...", elapsedSeconds: 0 },
    { event: "stop", timestamp: "...", elapsedSeconds: 3600 }
  ],
  subtasks: [...]  // nested subtasks (same structure)
}
```

### Sync Behavior

- **Server only sees total duration** - subtasks are not sent to server
- **Sync status** compares local total (parent + subtasks) with server duration
- **Status icons**: ✅ synced | ❌ missing | ⚠️ inconsistent

## API Endpoints (when backend enabled)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | Get all tasks |
| GET | `/api/tasks?date=YYYY-MM-DD` | Get tasks by date |
| GET | `/api/tasks/:id` | Get single task |
| POST | `/api/tasks` | Create/update task |
| DELETE | `/api/tasks/:id` | Delete task |

## Configuration

`config.json` options:

```json
{
  "syncServerUrl": null,  // null = mock mode, or "http://localhost:5000"
  "minSearchLength": 2    // chars before autocomplete triggers
}
```

## Browser Compatibility

- Modern browsers with IndexedDB support
- ES6 modules (Chrome 61+, Firefox 60+, Safari 11+)
