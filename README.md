# Time Tracker

[![CI](https://github.com/cemalper2/WebTimeTracker/actions/workflows/ci.yml/badge.svg)](https://github.com/cemalper2/WebTimeTracker/actions/workflows/ci.yml)

A modern, feature-rich time tracking application with keyboard shortcuts, data synchronization, and session management.

📖 **[User Guide](USER_GUIDE.md)** - Complete documentation for all features

## Features

- ⏱️ **Auto-Save Workflow**: Tasks automatically save when you start/stop the timer
- 🎹 **Keyboard Shortcuts**: 
  - `Space`: Start/Pause timer
  - `←/→`: Navigate between dates
- 📅 **Date Navigation**: Track tasks across multiple days with easy navigation
- ☁️ **Mock Sync Service**: Simulates server synchronization with conflict resolution
- 🌙 **Dark/Light Theme**: Toggle between themes
- 📤 **Import/Export**: Backup and restore your data
- 🎨 **Premium Design**: Modern glassmorphism UI with smooth animations

## Running Locally

### Using Python (Simple HTTP Server)

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080 in your browser.

## Running with Docker

### Build and run with docker-compose (recommended)

```bash
docker-compose up -d
```

The app will be available at http://localhost:8081

### Build and run with Docker directly

```bash
# Build the image
docker build -t time-tracker .

# Run the container
docker run -d -p 8081:80 --name time-tracker-app time-tracker
```

### Stop the container

```bash
docker-compose down
# or
docker stop time-tracker-app && docker rm time-tracker-app
```

## Data Storage

All data is stored locally in your browser using IndexedDB. This includes:
- **TimeTrackerDB**: Your local task data
- **TimeTrackerMockServer**: Simulated server data for sync testing

**Note**: Clearing browser data will delete your tasks. Use the Export feature to backup your data.

## Development

This is a vanilla JavaScript application with no build step required. Key files:

- `index.html` - Main HTML structure
- `index.css` - Styles and themes
- `app.js` - Application logic
- `components/` - UI components (Timer, TaskList, TaskEntry)
- `services/` - Data services (Storage, Sync)
- `utils/` - Helper functions

## Console Commands

For debugging and testing, you can use these commands in the browser console:

```javascript
// Seed mock server with 30 days of sample data
import('./services/sync.js').then(m => m.syncService.seedServer())

// View all tasks on mock server
import('./services/sync.js').then(m => m.syncService.getAllServerTasks())

// Clear mock server
import('./services/sync.js').then(m => m.syncService.clearServer())
```

## License

MIT
