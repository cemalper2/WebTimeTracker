# Time Tracker User Guide

A simple, elegant time tracking application that runs in your browser.

## Table of Contents

- [Getting Started](#getting-started)
- [Basic Usage](#basic-usage)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Task History](#task-history)
- [Editing Tasks](#editing-tasks)
- [Task Details](#task-details)
- [Import & Export](#import--export)
- [Settings](#settings)
- [Tips & Tricks](#tips--tricks)

---

## Getting Started

1. Open the application in your browser
2. Enter a task name in the "What are you working on?" field
3. Click **Start** or press `Space` to begin timing

Your task will automatically be saved when you start the timer.

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

- Click **➕ Add Task** to start a fresh task
- Or simply change the task name and start the timer

### Resuming Previous Tasks

Click the **▶** play button on any task in history to resume it.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Start/Pause timer |
| `←` | Previous day |
| `→` | Next day |
| `Escape` | Close modals |
| `Enter` | Confirm in modals |

---

## Task History

The history section shows all tasks for the selected date.

### Task Status Icons

| Icon | Meaning |
|------|---------| 
| ✅ | Synced with server |
| ❌ | Not synced (local only) |
| ⚠️ | Out of sync (data differs) |

### Task Actions

- **▶️** Resume - Continue timing this task
- **➕** Add Subtask - Create a subtask
- **ℹ️** Details - View event history
- **📝** Rename - Change task name
- **✏️** Edit Time - Adjust duration
- **🗑️** Delete - Remove task

### Quick Editing

- **Double-click task name** → Opens rename modal
- **Double-click duration** → Opens time edit modal

---

## Editing Tasks

### Edit Time Modal

Click **✏️** or double-click a task's duration to edit time.

**Supported formats:**
- `HH:MM:SS` (e.g., `01:30:00`)
- `MM:SS` (e.g., `45:30`)
- Just seconds (e.g., `90` becomes `01:30`)

### Rename Modal

Click **📝** or double-click a task name to rename it.

---

## Task Details

Click **ℹ️** on any task to open the details panel showing:

- Task name and total duration
- Session date and sync status
- **Event Timeline** - History of start/stop events with timestamps

---

## Import & Export

### Export Current Day

Click **📤 Export** to download the current day's tasks as JSON.

### Export All (Backup)

Click **📦 Backup** to export your complete task history.

### Import

Click **📥 Import** to restore tasks from a JSON backup file.

### Bulk Upload

Click **☁️ Bulk Upload** to upload multiple unsynced tasks at once.

---

## Settings

### Theme Toggle

Click the 🌙/☀️ button to switch between dark and light themes.

### Date Navigation

- Use **◀ ▶** buttons or arrow keys to navigate dates
- Click the date label to open a date picker
- Click **📅 Switch to Today** when viewing past dates

---

## Data Storage

All data is stored locally in your browser using IndexedDB.

> ⚠️ **Important**: Clearing browser data will delete your tasks. Use Backup regularly!

---

## Tips & Tricks

1. **Quick task switching** - Click ▶ on any task to resume instantly
2. **Time overflow** - Enter `90:00` and it auto-converts to `01:30:00`
3. **Subtasks** - Organize related work under parent tasks
4. **Drag & drop** - Drag a task onto another to make it a subtask
5. **Backup regularly** - Export your data periodically

---

## Troubleshooting

### Timer not saving?
- Ensure you have a task name entered
- Check that browser storage is not full

### UI not updating?
- Try refreshing the page
- Clear browser cache if issues persist
