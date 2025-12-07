# Time Tracker User Guide

A comprehensive guide to using the Time Tracker application.

## Table of Contents

- [Getting Started](#getting-started)
- [Basic Usage](#basic-usage)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Task History](#task-history)
- [Editing Tasks](#editing-tasks)
- [Data Sync](#data-sync)
- [Import & Export](#import--export)
- [Settings](#settings)

---

## Getting Started

1. Open the application in your browser
2. Enter a task name in the "What are you working on?" field
3. Click **Start** or press `Space` to begin timing

Your task will automatically be saved to history when you start the timer.

---

## Basic Usage

### Starting a Task

1. Type your task name (e.g., "Code Review")
2. Click **▶ Start** or press `Space`
3. The timer begins counting

### Pausing

- Click **⏸ Pause** or press `Space` to pause
- Click **▶ Start** again to resume

### Creating a New Task

- Click **➕ New Task** to save current work and start fresh
- Or simply change the task name and start the timer

### Resuming Previous Tasks

Click any task in the history list to resume working on it. The timer will continue from where you left off.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Start/Pause timer |
| `←` | Previous day |
| `→` | Next day |
| `Escape` | Close modals |

---

## Task History

The history section shows all tasks for the selected date.

### Task Status Icons

| Icon | Meaning |
|------|---------|
| ✅ | Synced with server |
| ❌ | Not synced (local only) |
| ⚠️ | Out of sync (data differs from server) |

### Task Actions

Each task has actions available:

- **▶️** Resume - Continue timing this task
- **ℹ️** Details - View full event history
- **📝** Rename - Change task name
- **✏️** Edit Time - Adjust duration
- **🗑️** Delete - Remove task

### Quick Editing

- **Double-click task name** → Opens rename modal
- **Double-click duration** → Opens time edit modal
- Single clicks on name/time do NOT resume the task

---

## Editing Tasks

### Edit Time Modal

Click the timer display or double-click a task's duration to edit time.

**Supported formats:**
- `HH:MM:SS` (e.g., `01:30:00`)
- `MM:SS` (e.g., `45:30`)
- Just seconds (e.g., `90` becomes `01:30`)

The parser auto-normalizes overflow values.

### Rename Modal

Click 📝 or double-click a task name to rename it.

---

## Task Details Panel

Click **ℹ️** on any task to open the details panel showing:

- Task name
- Total duration
- Session date
- Sync status
- **Event Timeline** - Complete history of start/stop events with timestamps

---

## Data Sync

The app includes a mock sync service for demonstration:

### Sync Status

- **✅ Synced** - Local matches server
- **❌ Missing** - Local only, click ☁️⬆️ to upload
- **⚠️ Inconsistent** - Data differs, choose:
  - ☁️⬆️ Push local → server
  - ☁️⬇️ Pull server → local

### Seeding Test Data

Open browser console and run:
```javascript
import('./services/sync.js').then(m => m.syncService.seedServer())
```

---

## Import & Export

### Export Current Day

Click **📤 Export Current Day** to download today's tasks as JSON.

### Export All

Click **📦 Export All** to backup your complete task history.

### Import

Click **📥 Import** to restore tasks from a JSON backup file.

---

## Settings

### Theme Toggle

Click the 🌙/☀️ button in the header to switch between dark and light themes.

### Date Navigation

- Use **◀ ▶** buttons or `←` `→` keys to navigate dates
- Click the date label to open a date picker
- Click **📅 Switch to Today** when viewing past dates

---

## Data Storage

All data is stored locally in your browser using IndexedDB:

- **TimeTrackerDB** - Your task data
- **TimeTrackerMockServer** - Simulated server for sync testing

> ⚠️ **Warning**: Clearing browser data will delete your tasks. Use Export to backup!

---

## Tips & Tricks

1. **Quick task switching**: Click any task in history to resume it instantly
2. **Batch editing**: Use double-click for quick edits without extra button clicks
3. **Time overflow**: Enter `90:00` (90 minutes) and it auto-converts to `01:30:00`
4. **Keyboard workflow**: Use `Space` to toggle timer, arrows to navigate dates
5. **Backup regularly**: Export your data periodically as JSON backup

---

## Troubleshooting

### Timer not saving?
- Ensure you have a task name entered
- Check that browser storage is not full

### Data not syncing?
- The sync service is a mock/demo - data stays in browser
- Use Import/Export for actual backups

### UI not updating?
- Try refreshing the page
- Clear browser cache if issues persist
