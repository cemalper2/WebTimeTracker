/**
 * Time Tracker Application - Main Entry Point
 */

import { Timer } from './components/timer.js';
import { TaskEntry } from './components/taskEntry.js';
import { TaskList } from './components/taskList.js';
import { storage } from './services/storage.js';
import { formatTime, generateId } from './utils/formatters.js';

class TimeTrackerApp {
    constructor() {
        this.timer = null;
        this.taskEntry = null;
        this.taskList = null;
        this.resumeTaskId = null;  // Track if we're resuming a task
        this.editingTaskId = null; // Track if we're editing a saved task's time
        this.sessionDate = null;   // Current session date (YYYY-MM-DD)
        this.timerLogs = [];       // Logs of timer start/stop events
        this.init();
    }
    
    async init() {
        this.cacheElements();
        this.initTheme();
        this.initTimer();
        this.initTaskEntry();
        this.initTaskList();
        this.bindEvents();
        await this.loadTasks();
        this.updateSessionDisplay();
        this.showMotivationalQuote();
    }
    
    cacheElements() {
        this.els = {
            hours: document.getElementById('hours'),
            minutes: document.getElementById('minutes'),
            seconds: document.getElementById('seconds'),
            timerDisplay: document.getElementById('timerDisplay'),
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            resetBtn: document.getElementById('resetBtn'),
            saveBtn: document.getElementById('saveBtn'),
            taskName: document.getElementById('taskName'),
            suggestions: document.getElementById('suggestions'),
            taskListContainer: document.getElementById('taskList'),
            totalTasks: document.getElementById('totalTasks'),
            totalTime: document.getElementById('totalTime'),
            timeEditModal: document.getElementById('timeEditModal'),
            editHours: document.getElementById('editHours'),
            editMinutes: document.getElementById('editMinutes'),
            editSeconds: document.getElementById('editSeconds'),
            cancelEdit: document.getElementById('cancelEdit'),
            confirmEdit: document.getElementById('confirmEdit'),
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toastMessage'),
            exportBtn: document.getElementById('exportBtn'),
            exportAllBtn: document.getElementById('exportAllBtn'),
            importBtn: document.getElementById('importBtn'),
            importFile: document.getElementById('importFile'),
            sessionDate: document.getElementById('sessionDate'),
            newSessionBtn: document.getElementById('newSessionBtn'),
            themeToggle: document.getElementById('themeToggle'),
            themeIcon: document.querySelector('#themeToggle .theme-icon'),
            motivationalQuote: document.getElementById('motivationalQuote'),
            sessionDatePicker: document.getElementById('sessionDatePicker'),
            clearDataBtn: document.getElementById('clearDataBtn')
        };
    }
    
    initTimer() {
        this.timer = new Timer({
            onTick: (seconds) => this.updateTimerDisplay(seconds),
            onStateChange: (state) => this.handleTimerStateChange(state)
        });
    }
    
    initTaskEntry() {
        this.taskEntry = new TaskEntry({
            inputElement: this.els.taskName,
            suggestionsElement: this.els.suggestions,
            onSelect: (suggestion) => console.log('Selected:', suggestion.name)
        });
    }
    
    initTaskList() {
        this.taskList = new TaskList({
            container: this.els.taskListContainer,
            onDelete: (id) => this.deleteTask(id),
            onResume: (id) => this.resumeTask(id),
            onEdit: (id) => this.editTaskDuration(id)
        });
    }
    
    bindEvents() {
        this.els.startBtn.addEventListener('click', () => this.timer.start());
        this.els.stopBtn.addEventListener('click', () => this.timer.stop());
        this.els.resetBtn.addEventListener('click', () => this.timer.reset());
        this.els.saveBtn.addEventListener('click', () => this.saveTask());
        this.els.timerDisplay.addEventListener('click', () => this.openTimeEditModal());
        this.els.cancelEdit.addEventListener('click', () => this.closeTimeEditModal());
        this.els.confirmEdit.addEventListener('click', () => this.applyTimeEdit());
        this.els.timeEditModal.addEventListener('click', (e) => {
            if (e.target === this.els.timeEditModal) this.closeTimeEditModal();
        });
        this.els.exportBtn.addEventListener('click', () => this.exportTasks());
        this.els.exportAllBtn.addEventListener('click', () => this.exportAllTasks());
        this.els.importBtn.addEventListener('click', () => this.els.importFile.click());
        this.els.importFile.addEventListener('change', (e) => this.importTasks(e));
        this.els.newSessionBtn.addEventListener('click', () => this.startNewSession());
        this.els.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.els.clearDataBtn.addEventListener('click', () => this.clearAllData());
        
        // Date Navigation
        this.els.sessionDate.addEventListener('click', () => {
            // Set picker value to current session date before opening
            this.els.sessionDatePicker.value = this.sessionDate;
            this.els.sessionDatePicker.showPicker(); // Modern API to open picker
        });
        
        this.els.sessionDatePicker.addEventListener('change', async (e) => {
            const selectedDate = e.target.value;
            if (selectedDate) {
                this.sessionDate = selectedDate;
                localStorage.setItem('timetracker-session-date', selectedDate);
                
                // Clear current timer if switching days (avoid saving to wrong day)
                this.timer.reset();
                this.taskEntry.clear();
                this.resumeTaskId = null;
                
                await this.loadTasks();
                this.updateSessionDisplay();
                this.showToast(`Switched to ${selectedDate}`, 'success');
            }
        });
    }
    
    initTheme() {
        const savedTheme = localStorage.getItem('timetracker-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('timetracker-theme', newTheme);
        this.updateThemeIcon(newTheme);
    }
    
    updateThemeIcon(theme) {
        this.els.themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
    
    updateTimerDisplay(seconds) {
        const time = formatTime(seconds);
        this.els.hours.textContent = time.hours;
        this.els.minutes.textContent = time.minutes;
        this.els.seconds.textContent = time.seconds;
    }
    
    handleTimerStateChange(state) {
        // Log timer events with timestamps
        this.timerLogs.push({
            event: state === 'running' ? 'start' : 'stop',
            timestamp: new Date().toISOString(),
            elapsedSeconds: this.timer.getTime()
        });
        
        if (state === 'running') {
            this.els.startBtn.classList.add('hidden');
            this.els.stopBtn.classList.remove('hidden');
            this.els.timerDisplay.classList.add('running');
        } else {
            this.els.startBtn.classList.remove('hidden');
            this.els.stopBtn.classList.add('hidden');
            this.els.timerDisplay.classList.remove('running');
        }
    }
    
    openTimeEditModal() {
        if (this.timer.getIsRunning()) this.timer.stop();
        const time = formatTime(this.timer.getTime());
        this.els.editHours.value = parseInt(time.hours, 10);
        this.els.editMinutes.value = parseInt(time.minutes, 10);
        this.els.editSeconds.value = parseInt(time.seconds, 10);
        this.els.timeEditModal.classList.remove('hidden');
        this.initSpinnerButtons();
        this.els.editHours.focus();
    }
    
    initSpinnerButtons() {
        const MAX_HOURS = 24;  // Same limit as validation
        const modal = this.els.timeEditModal;
        modal.querySelectorAll('.spinner-btn').forEach(btn => {
            // Remove old listeners by cloning
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', () => {
                const targetId = newBtn.dataset.target;
                const input = document.getElementById(targetId);
                let value = parseInt(input.value, 10) || 0;
                const isUp = newBtn.classList.contains('up');
                const max = targetId === 'editHours' ? MAX_HOURS : 59;
                
                if (isUp) {
                    value = value >= max ? 0 : value + 1;
                } else {
                    value = value <= 0 ? max : value - 1;
                }
                
                input.value = value;
            });
        });
    }
    
    closeTimeEditModal() {
        this.els.timeEditModal.classList.add('hidden');
    }
    
    async applyTimeEdit() {
        let h = parseInt(this.els.editHours.value, 10) || 0;
        let m = parseInt(this.els.editMinutes.value, 10) || 0;
        let s = parseInt(this.els.editSeconds.value, 10) || 0;
        
        // Sanity checks
        const MAX_HOURS = 24;  // Maximum reasonable work hours
        if (h < 0) h = 0;
        if (h > MAX_HOURS) {
            this.showToast(`Hours cannot exceed ${MAX_HOURS}`, 'error');
            this.els.editHours.value = MAX_HOURS;
            this.els.editHours.focus();
            return;
        }
        if (m < 0 || m > 59) {
            this.showToast('Minutes must be 0-59', 'error');
            this.els.editMinutes.value = Math.min(59, Math.max(0, m));
            this.els.editMinutes.focus();
            return;
        }
        if (s < 0 || s > 59) {
            this.showToast('Seconds must be 0-59', 'error');
            this.els.editSeconds.value = Math.min(59, Math.max(0, s));
            this.els.editSeconds.focus();
            return;
        }
        
        const newDuration = h * 3600 + m * 60 + s;
        
        if (this.editingTaskId) {
            // Editing a saved task's duration
            try {
                await storage.updateTask(this.editingTaskId, { duration: newDuration });
                this.editingTaskId = null;
                await this.loadTasks();
                this.showToast('Task duration updated', 'success');
            } catch (error) {
                console.error('Update failed:', error);
                this.showToast('Failed to update duration', 'error');
            }
        } else {
            // Editing current timer
            this.timer.setTime(newDuration);
            this.showToast('Time updated', 'success');
        }
        this.closeTimeEditModal();
    }
    
    async saveTask() {
        const name = this.taskEntry.getValue();
        const duration = this.timer.getTime();
        
        if (!name) { this.showToast('Please enter a task name', 'error'); this.taskEntry.focus(); return; }
        if (duration === 0) { this.showToast('Timer is at 0:00:00', 'error'); return; }
        
        try {
            if (this.resumeTaskId) {
                // Update existing task - merge logs
                const existingTask = await storage.getTask(this.resumeTaskId);
                const mergedLogs = [...(existingTask.timerLogs || []), ...this.timerLogs];
                await storage.updateTask(this.resumeTaskId, { name, duration, timerLogs: mergedLogs });
                this.resumeTaskId = null;
                this.showToast('Task updated!', 'success');
            } else {
                // Create new task with logs and sessionDate
                const now = new Date();
                const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                const currentSession = localStorage.getItem('timetracker-session-date') || today;
                const task = { 
                    id: generateId(), 
                    name, 
                    duration, 
                    createdAt: Date.now(),
                    sessionDate: currentSession,  // Tag task with its session
                    timerLogs: [...this.timerLogs]
                };
                await storage.saveTask(task);
                this.showToast('Task saved!', 'success');
            }
            this.timerLogs = [];  // Clear logs after saving
            this.timer.reset();
            this.taskEntry.clear();
            await this.loadTasks();
        } catch (error) {
            console.error('Save failed:', error);
            this.showToast('Failed to save task', 'error');
        }
    }
    
    async resumeTask(id) {
        try {
            const task = await storage.getTask(id);
            if (!task) { this.showToast('Task not found', 'error'); return; }
            
            this.resumeTaskId = id;
            this.taskEntry.inputElement.value = task.name;
            this.timer.setTime(task.duration);
            this.showToast('Task resumed - continue timing!', 'success');
        } catch (error) {
            console.error('Resume failed:', error);
            this.showToast('Failed to resume task', 'error');
        }
    }
    
    async editTaskDuration(id) {
        try {
            const task = await storage.getTask(id);
            if (!task) { this.showToast('Task not found', 'error'); return; }
            
            this.editingTaskId = id;
            const time = formatTime(task.duration);
            this.els.editHours.value = parseInt(time.hours, 10);
            this.els.editMinutes.value = parseInt(time.minutes, 10);
            this.els.editSeconds.value = parseInt(time.seconds, 10);
            this.els.timeEditModal.classList.remove('hidden');
            this.els.editHours.focus();
        } catch (error) {
            console.error('Edit failed:', error);
            this.showToast('Failed to edit task', 'error');
        }
    }
    
    async deleteTask(id) {
        try {
            await storage.deleteTask(id);
            await this.loadTasks();
            this.showToast('Task deleted', 'success');
        } catch (error) {
            console.error('Delete failed:', error);
            this.showToast('Failed to delete', 'error');
        }
    }
    
    async loadTasks() {
        try {
            const allTasks = await storage.getAllTasks();
            
            // Use local date for today (handle timezone offset)
            const now = new Date();
            const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const currentSession = localStorage.getItem('timetracker-session-date') || today;
            
            console.log(`Loading tasks. Session: ${currentSession}, Today: ${today}, Total tasks in DB: ${allTasks.length}`);
            
            // Filter tasks for current session
            // Include tasks without sessionDate (legacy) only if viewing today
            const tasks = allTasks.filter(task => {
                if (task.sessionDate) {
                    return task.sessionDate === currentSession;
                }
                // Legacy tasks without sessionDate - show if viewing today
                return currentSession === today;
            });
            
            this.taskList.render(tasks);
            this.taskList.updateStats(tasks, this.els.totalTasks, this.els.totalTime);
        } catch (error) {
            console.error('Load failed:', error);
        }
    }
    
    async exportTasks() {
        try {
            const allTasks = await storage.getAllTasks();
            
            // Get the current session date (the day being tracked, not export time)
            const now = new Date();
            const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const sessionDate = localStorage.getItem('timetracker-session-date') || today;
            
            // Filter tasks for current session only
            const tasks = allTasks.filter(task => {
                if (task.sessionDate) return task.sessionDate === sessionDate;
                return sessionDate === today;  // Legacy tasks
            });
            
            if (tasks.length === 0) {
                this.showToast('No tasks to export for this session', 'error');
                return;
            }
            
            const exportData = {
                version: 1,
                sessionDate: sessionDate,  // The actual working day
                exportedAt: new Date().toISOString(),
                tasks: tasks
            };
            
            const jsonString = JSON.stringify(exportData, null, 2);
            const filename = `timetracker-${sessionDate}.json`;  // Use sessionDate for filename
            
            // Try modern File System Access API first (Chrome)
            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: filename,
                        types: [{
                            description: 'JSON File',
                            accept: { 'application/json': ['.json'] }
                        }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(jsonString);
                    await writable.close();
                    this.showToast(`Exported ${tasks.length} tasks`, 'success');
                    return;
                } catch (err) {
                    if (err.name === 'AbortError') return; // User cancelled
                    // Fall through to legacy method
                }
            }
            
            // Fallback for Firefox and older browsers
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            this.showToast(`Exported ${tasks.length} tasks`, 'success');
        }
    

    catch (error) {
            console.error('Export failed:', error);
            this.showToast('Failed to export', 'error');
        }
    }
    
    async exportAllTasks() {
        try {
            const allTasks = await storage.getAllTasks();
            
            if (allTasks.length === 0) {
                this.showToast('No tasks to export', 'error');
                return;
            }
            
            const exportData = {
                version: 1,
                exportType: 'full',
                exportedAt: new Date().toISOString(),
                taskCount: allTasks.length,
                tasks: allTasks
            };
            
            const jsonString = JSON.stringify(exportData, null, 2);
            // Filename includes timestamp for backup versions
            const now = new Date();
            const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const filename = `timetracker-backup-${today}.json`;
            
            // Try modern File System Access API first (Chrome)
            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: filename,
                        types: [{
                            description: 'JSON Backup',
                            accept: { 'application/json': ['.json'] }
                        }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(jsonString);
                    await writable.close();
                    this.showToast(`Exported all ${allTasks.length} tasks`, 'success');
                    return;
                } catch (err) {
                    if (err.name === 'AbortError') return;
                }
            }
            
            // Fallback
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            this.showToast(`Exported all ${allTasks.length} tasks`, 'success');
        } catch (error) {
            console.error('Export all failed:', error);
            this.showToast('Failed to export all tasks', 'error');
        }
    }
    
    async importTasks(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.tasks || !Array.isArray(data.tasks)) {
                this.showToast('Invalid export file', 'error');
                return;
            }
            
            let imported = 0;
            let skipped = 0;
            
            for (const task of data.tasks) {
                if (!task.id || !task.name || typeof task.duration !== 'number') {
                    skipped++;
                    continue;
                }
                
                // Check if task already exists
                const existing = await storage.getTask(task.id);
                
                const taskData = {
                    id: task.id,
                    name: task.name,
                    duration: task.duration,
                    createdAt: task.createdAt || Date.now(),
                    sessionDate: task.sessionDate || data.sessionDate,
                    timerLogs: task.timerLogs || []
                };

                if (existing) {
                    await storage.updateTask(task.id, taskData);
                } else {
                    await storage.saveTask(taskData);
                }
                imported++;
            }
            
            // Set session date from the export file
            // Priority: sessionDate (new) > exportedAt (legacy fallback)
            const importedSessionDate = data.sessionDate || (data.exportedAt ? data.exportedAt.split('T')[0] : null);
            if (importedSessionDate) {
                localStorage.setItem('timetracker-session-date', importedSessionDate);
                this.updateSessionDisplay();
            }
            
            await this.loadTasks();
            this.showToast(`Imported ${imported} tasks${skipped ? `, ${skipped} skipped` : ''}`, 'success');
        } catch (error) {
            console.error('Import failed:', error);
            this.showToast('Failed to import - invalid file', 'error');
        } finally {
            event.target.value = '';  // Reset file input
        }
    }
    
    updateSessionDisplay() {
        // Determine session date from tasks
        const now = new Date();
        const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        
        // Get session date from localStorage or default to today
        this.sessionDate = localStorage.getItem('timetracker-session-date') || today;
        
        const isToday = this.sessionDate === today;
        
        if (isToday) {
            this.els.sessionDate.textContent = '📅 Today';
            this.els.sessionDate.classList.remove('past-session');
            this.els.newSessionBtn.classList.add('hidden');
        } else {
            // Format the date nicely
            const date = new Date(this.sessionDate + 'T00:00:00');
            const formatted = date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
            this.els.sessionDate.textContent = `📅 ${formatted}`;
            this.els.sessionDate.classList.add('past-session');
            this.els.newSessionBtn.classList.remove('hidden');
        }
    }
    
    async startNewSession() {
        const now = new Date();
        const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        this.sessionDate = today;
        localStorage.setItem('timetracker-session-date', today);
        
        // Reset timer and input for fresh start (but don't clear stored tasks!)
        this.timer.reset();
        this.taskEntry.clear();
        this.resumeTaskId = null;
        
        // Load today's existing tasks (if any)
        await this.loadTasks();
        this.updateSessionDisplay();
        this.showToast('Switched to today', 'success');
    }
    
    async clearAllData() {
        console.log('Clear Data button clicked');
        if (confirm('⚠️ DANGER ZONE ⚠️\n\nAre you sure you want to delete ALL data? This includes all task history and settings.\n\nThis action cannot be undone.')) {
            console.log('User confirmed. Clearing data...');
            try {
                // Clear IndexedDB
                await storage.clearAll();
                
                // Clear LocalStorage settings
                localStorage.removeItem('timetracker-theme');
                localStorage.removeItem('timetracker-session-date');
                
                this.showToast('All data cleared. Restarting...', 'success');
                
                // Reload to reset state
                setTimeout(() => window.location.reload(), 1500);
            } catch (error) {
                console.error('Failed to clear data:', error);
                this.showToast('Failed to clear data', 'error');
            }
        }
    }
    

    
    showToast(message, type = 'success') {
        this.els.toastMessage.textContent = message;
        this.els.toast.className = `toast ${type} show`;
        setTimeout(() => this.els.toast.classList.remove('show'), 3000);
    }
    
    showMotivationalQuote() {
        const quotes = [
            "What gets measured, gets managed.",
            "Time is what we want most, but use worst.",
            "The key is not spending time, but investing it.",
            "Lost time is never found again.",
            "Track your hours, own your days.",
            "Small progress is still progress.",
            "Where your attention goes, your time flows.",
            "Every minute counts when you count every minute.",
            "Awareness is the first step to improvement.",
            "You can't improve what you don't measure.",
            "Time flies, but you're the pilot.",
            "Today's tracking builds tomorrow's focus.",
            "Know your time, know yourself.",
            "The present moment is a gift—track it wisely."
        ];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        this.els.motivationalQuote.textContent = `"${randomQuote}"`;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => new TimeTrackerApp());
