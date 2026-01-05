/**
 * Time Tracker Application - Main Entry Point
 */

import { Timer } from './components/timer.js';
import { TaskEntry } from './components/taskEntry.js';
import { TaskList } from './components/taskList.js';
import { DetailPanel } from './components/detailPanel.js';
import { storage } from './services/storage.js';
import { syncService } from './services/sync.js';
import { formatTime, formatDuration, formatDate, generateId } from './utils/formatters.js';

class TimeTrackerApp {
    constructor() {
        this.timer = null;
        this.taskEntry = null;
        this.taskList = null;
        this.taskList = null;
        this.detailPanel = null;
        this.activeTaskId = null;  // Current active task (new or resumed)
        this.editingTaskId = null; // for Time Edit Modal only
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
            // Task List Elements
            taskName: document.getElementById('taskName'),
            suggestions: document.getElementById('suggestions'),
            addTaskBtn: document.getElementById('addTaskBtn'),
            taskListContainer: document.getElementById('taskList'),
            totalTasks: document.getElementById('totalTasks'),
            totalTime: document.getElementById('totalTime'),
            
            // Modals
            timeEditModal: document.getElementById('timeEditModal'),
            editTimeInput: document.getElementById('editTimeInput'),
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
            clearDataBtn: document.getElementById('clearDataBtn'),
            prevDayBtn: document.getElementById('prevDayBtn'),
            nextDayBtn: document.getElementById('nextDayBtn'),
        
            // Confirm Modal
            confirmModal: document.getElementById('confirmModal'),
            confirmTitle: document.getElementById('confirmTitle'),
            confirmMessage: document.getElementById('confirmMessage'),
            confirmOkBtn: document.getElementById('confirmOkBtn'),
            confirmCancelBtn: document.getElementById('confirmCancelBtn'),
            
            // Rename Modal
            renameModal: document.getElementById('renameModal'),
            renameInput: document.getElementById('renameInput'),
            renameConfirmBtn: document.getElementById('renameConfirmBtn'),
            renameCancelBtn: document.getElementById('renameCancelBtn'),
            
            // Help Modal
            helpBtn: document.getElementById('helpBtn'),
            helpModal: document.getElementById('helpModal'),
            closeHelpBtn: document.getElementById('closeHelpBtn'),
            
            // Bulk Upload Modal
            bulkUploadBtn: document.getElementById('bulkUploadBtn'),
            bulkUploadModal: document.getElementById('bulkUploadModal'),
            bulkUploadList: document.getElementById('bulkUploadList'),
            bulkUploadCount: document.getElementById('bulkUploadCount'),
            bulkSelectAllBtn: document.getElementById('bulkSelectAllBtn'),
            bulkUploadSubmitBtn: document.getElementById('bulkUploadSubmitBtn'),
            closeBulkUploadBtn: document.getElementById('closeBulkUploadBtn'),
            
            // Re-use Rename Modal as generic Input Modal
            renameModalTitle: document.querySelector('#renameModal h3')
        };
    }
    
    initTimer() {
        this.timer = new Timer({
            onTick: (seconds) => {
                // Auto-save and update UI every second
                this.autoSaveDuration(seconds);
            },
            onStateChange: (state) => this.handleTimerStateChange(state)
        });
    }
    
    /**
     * Auto-save the current timer duration to IndexedDB
     * Called every second while timer is running
     * Also updates the UI in real-time
     * @param {number} seconds - Current timer value
     */
    async autoSaveDuration(seconds) {
        // Only save if there's an active task
        if (!this.activeTaskId) return;
        
        try {
            // Find context to save properly
            const context = await this.findTaskContext(this.activeTaskId);
            if (!context) return;
            
            const { task, root } = context;
            
            // Update the task object in memory
            task.duration = seconds;
            task.updatedAt = Date.now();
            
            // Save the ROOT task (which contains the updated subtask)
            await storage.overwriteTask(root);
            
            // Update the history list item in real-time
            this.updateTaskItemUI(this.activeTaskId, seconds);
            
            // Update the total time display
            this.updateTotalTimeUI();
        } catch (error) {
            // Silently fail - don't interrupt timer for save errors
            console.warn('[AutoSave] Failed to save duration:', error);
        }
    }
    
    
    
    /**
     * Find task context (task, parent, root)
     * @param {string} taskId 
     * @returns {Promise<{task: Object, parent: Object|null, root: Object}|null>}
     */
    async findTaskContext(taskId) {
        const allTasks = await storage.getAllTasks();
        
        for (const root of allTasks) {
            if (root.id === taskId) {
                return { task: root, parent: null, root };
            }
            if (root.subtasks) {
                const found = this.findSubtaskRecursive(root.subtasks, taskId, root);
                if (found) {
                    return { ...found, root };
                }
            }
        }
        return null;
    }

    findSubtaskRecursive(subtasks, id, parent) {
        for (const t of subtasks) {
            if (t.id === id) return { task: t, parent };
            if (t.subtasks) {
                const found = this.findSubtaskRecursive(t.subtasks, id, t);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * Update a specific task item's duration in the UI without full reload
     * @param {string} taskId - Task ID to update
     * @param {number} seconds - New duration in seconds
     */
    updateTaskItemUI(taskId, seconds) {
        const taskItem = this.els.taskListContainer?.querySelector(`[data-id="${taskId}"]`);
        if (!taskItem) return;
        
        const time = formatTime(seconds);
        
        // Check for dual timer display (parent task with subtasks)
        const totalTimeEl = taskItem.querySelector('.task-time-total');
        const ownTimeEl = taskItem.querySelector('.task-time-own');
        
        if (totalTimeEl && ownTimeEl) {
            // Task has subtasks - read current values BEFORE updating
            const currentTotalText = totalTimeEl.textContent;
            const currentOwnText = ownTimeEl.textContent.replace(/[()]/g, '');
            const currentTotal = this.parseTimeToSeconds(currentTotalText);
            const currentOwn = this.parseTimeToSeconds(currentOwnText);
            const subtasksDuration = currentTotal - currentOwn;
            const newTotal = seconds + subtasksDuration;
            
            // Now update the display
            ownTimeEl.textContent = `(${time.formatted})`;
            ownTimeEl.title = `Parent Only - Double-click to edit`;
            totalTimeEl.textContent = formatTime(newTotal).formatted;
        } else {
            // Simple task or subtask - update .task-time
            const timeEl = taskItem.querySelector('.task-time');
            if (timeEl) {
                timeEl.textContent = time.formatted;
                timeEl.title = `Duration`;
            }
        }
        
        // Walk up to update parent totals
        if (taskItem.dataset.parentId) {
            const parentId = taskItem.dataset.parentId;
            const parentItem = this.els.taskListContainer.querySelector(`[data-id="${parentId}"]`);
            if (parentItem) {
                const parentTotalEl = parentItem.querySelector('.task-time-total');
                if (parentTotalEl) {
                    const currentTotalText = parentTotalEl.textContent;
                    const currentTotal = this.parseTimeToSeconds(currentTotalText);
                    const newTotal = currentTotal + 1;
                    parentTotalEl.textContent = formatTime(newTotal).formatted;
                }
            }
        }
    }
    /**
     * Parses a time string (HH:MM:SS) into total seconds.
     * @param {string} timeString - The time string to parse.
     * @returns {number} The total duration in seconds.
     */
    parseTimeToSeconds(timeString) {
        if (!timeString) return 0;
        
        // Handle HH:MM:SS format
        if (timeString.includes(':')) {
            const parts = timeString.split(':').map(Number);
            if (parts.length === 3) {
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else if (parts.length === 2) {
                return parts[0] * 60 + parts[1];
            }
        }
        
        // Handle other formats like "0m", "5m", "1h 30m" - just return 0 for now
        // The real value will be set on next loadTasks()
        return 0;
    }
    
    /**
     * Update the total time display without full reload
     * Optimized to just increment by 1 second for real-time performance
     */
    updateTotalTimeUI() {
        if (!this.els.totalTime) return;
        
        // Fast path: just increment displayed value by 1 second
        const currentText = this.els.totalTime.textContent;
        const currentSeconds = this.parseTimeToSeconds(currentText);
        const newSeconds = currentSeconds + 1;
        this.els.totalTime.textContent = formatDuration(newSeconds);
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
            onStart: (id) => this.startTaskTimer(id),
            onStop: (id) => this.stopTaskTimer(id),
            onEdit: (id) => this.editTaskDuration(id),
            onSync: (id, direction) => this.syncTask(id, direction),
            onRename: (id) => this.openRenameModal(id),
            onDetails: (id) => this.openDetailPanel(id),
            onAddSubtask: (id) => this.inputSubtask(id)
        });
        
        // Initialize the detail panel
        this.detailPanel = new DetailPanel();
    }
    
    bindEvents() {
        // Add Task button
        this.els.addTaskBtn.addEventListener('click', () => this.addNewTask());
        
        // Enter key in task input also adds task
        this.els.taskName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addNewTask();
            }
        });
        
        // Modal event handlers
        this.els.cancelEdit.addEventListener('click', () => this.closeTimeEditModal());
        this.els.confirmEdit.addEventListener('click', () => this.applyTimeEdit());
        this.els.timeEditModal.addEventListener('click', (e) => {
            if (e.target === this.els.timeEditModal) this.closeTimeEditModal();
        });
        
        // Enter key in time edit modal
        this.els.editTimeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.applyTimeEdit();
            } else if (e.key === 'Escape') {
                this.closeTimeEditModal();
            }
        });

        // Global Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            const active = document.activeElement;
            // Ignore if user is typing in an input
            const isInput = active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable;
            
            if (!isInput) {
                if (e.code === 'Space') {
                    e.preventDefault(); // Prevent page scroll
                    // Toggle active task timer
                    if (this.activeTaskId) {
                        if (this.timer.getIsRunning()) {
                            this.stopTaskTimer(this.activeTaskId);
                        } else {
                            this.startTaskTimer(this.activeTaskId);
                        }
                    }
                } else if (e.code === 'ArrowLeft') {
                    e.preventDefault();
                    this.changeSessionDate(-1); // Previous day
                } else if (e.code === 'ArrowRight') {
                    e.preventDefault();
                    this.changeSessionDate(1); // Next day (blocked if future)
                }
            }
        });
        this.els.exportBtn.addEventListener('click', () => this.exportTasks());
        this.els.exportAllBtn.addEventListener('click', () => this.exportAllTasks());
        this.els.importBtn.addEventListener('click', () => this.els.importFile.click());
        this.els.importFile.addEventListener('change', (e) => this.importTasks(e));
        this.els.newSessionBtn.addEventListener('click', () => this.startNewSession());
        this.els.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.els.clearDataBtn.addEventListener('click', () => this.clearAllData());
        
        // Help Modal
        this.els.helpBtn.addEventListener('click', () => this.openHelpModal());
        this.els.closeHelpBtn.addEventListener('click', () => this.closeHelpModal());
        this.els.helpModal.addEventListener('click', (e) => {
            if (e.target === this.els.helpModal) this.closeHelpModal();
        });
        
        // Bulk Upload Modal
        this.els.bulkUploadBtn.addEventListener('click', () => this.openBulkUploadModal());
        this.els.closeBulkUploadBtn.addEventListener('click', () => this.closeBulkUploadModal());
        this.els.bulkUploadModal.addEventListener('click', (e) => {
            if (e.target === this.els.bulkUploadModal) this.closeBulkUploadModal();
        });
        this.els.bulkSelectAllBtn.addEventListener('click', () => this.handleBulkSelectAll());
        this.els.bulkUploadSubmitBtn.addEventListener('click', () => this.handleBulkUpload());
        
        // Date Navigation Buttons
        this.els.prevDayBtn.addEventListener('click', () => this.changeSessionDate(-1));
        this.els.nextDayBtn.addEventListener('click', () => this.changeSessionDate(1));
        
        // Date Navigation (click on date to pick)
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
        
        // Spinner Buttons Delegation
        this.els.timeEditModal.addEventListener('click', (e) => {
            const btn = e.target.closest('.spinner-btn');
            if (btn) {
                const targetId = btn.dataset.target;
                const input = document.getElementById(targetId);
                let value = parseInt(input.value, 10) || 0;
                const isUp = btn.classList.contains('up');
                const MAX_HOURS = 24;
                const max = targetId === 'editHours' ? MAX_HOURS : 59;
                
                if (isUp) {
                    value = value >= max ? 0 : value + 1;
                } else {
                    value = value <= 0 ? max : value - 1;
                }
                
                input.value = String(value); 
            } else if (e.target === this.els.timeEditModal) {
                 this.closeTimeEditModal();
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
    
    openHelpModal() {
        this.els.helpModal.classList.remove('hidden');
    }
    
    closeHelpModal() {
        this.els.helpModal.classList.add('hidden');
    }
    
    /**
     * Open bulk upload modal - shows tasks that need uploading
     */
    async openBulkUploadModal() {
        try {
            // Get all tasks from IndexedDB
            const allTasks = await storage.getAllTasks();
            
            // Get all tasks from server for comparison
            let serverTasks = [];
            try {
                serverTasks = await syncService.getAllServerTasks();
            } catch (e) {
                console.warn('Could not fetch server tasks for sync comparison:', e);
            }
            
            // Calculate syncStatus for each task
            allTasks.forEach(task => {
                const serverTask = serverTasks.find(st => st.id === task.id);
                task.syncStatus = syncService.compareTasks(task, serverTask);
            });
            
            // Filter for missing or inconsistent tasks
            const uploadableTasks = allTasks.filter(task => 
                task.syncStatus === 'missing' || task.syncStatus === 'inconsistent'
            );
            
            // Store for later use
            this.bulkUploadTasks = uploadableTasks;
            this.bulkUploadServerTasks = serverTasks;
            
            // Render the list (pass server tasks for comparison display)
            this.renderBulkUploadList(uploadableTasks, serverTasks);
            
            // Reset selection state
            this.updateBulkUploadCount();
            this.els.bulkSelectAllBtn.textContent = 'Select All';
            
            // Show modal
            this.els.bulkUploadModal.classList.remove('hidden');
        } catch (error) {
            console.error('Failed to open bulk upload modal:', error);
            this.showToast('Failed to load tasks', 'error');
        }
    }
    
    closeBulkUploadModal() {
        this.els.bulkUploadModal.classList.add('hidden');
        this.bulkUploadTasks = [];
    }
    
    renderBulkUploadList(tasks, serverTasks = []) {
        if (!tasks || tasks.length === 0) {
            this.els.bulkUploadList.innerHTML = `
                <div class="bulk-upload-empty">
                    <span>✅</span>
                    <p>All tasks are synced!</p>
                </div>
            `;
            this.els.bulkUploadSubmitBtn.disabled = true;
            return;
        }
        
        const statusIcons = {
            'missing': '❌',
            'inconsistent': '⚠️'
        };
        
        const statusLabels = {
            'missing': 'Not uploaded',
            'inconsistent': 'Needs update'
        };
        
        // Helper to calculate total duration (parent + subtasks)
        const calculateTotal = (task) => {
            let total = task.duration || 0;
            if (task.subtasks && task.subtasks.length > 0) {
                for (const sub of task.subtasks) {
                    total += calculateTotal(sub);
                }
            }
            return total;
        };
        
        this.els.bulkUploadList.innerHTML = tasks.map(task => {
            const localTotal = calculateTotal(task);
            const serverTask = serverTasks.find(st => st.id === task.id);
            const serverTotal = serverTask ? calculateTotal(serverTask) : 0;
            
            // For inconsistent tasks, show both local and server values
            let durationDisplay = formatDuration(localTotal);
            if (task.syncStatus === 'inconsistent' && serverTask) {
                durationDisplay = `${formatDuration(localTotal)} (server: ${formatDuration(serverTotal)})`;
            }
            
            return `
            <label class="bulk-upload-item" data-task-id="${task.id}">
                <input type="checkbox" value="${task.id}">
                <div class="bulk-upload-item-info">
                    <div class="bulk-upload-item-name">${this.escapeHtml(task.name)}</div>
                    <div class="bulk-upload-item-meta">
                        <span>${task.sessionDate || 'No date'}</span>
                        <span>${durationDisplay}</span>
                    </div>
                </div>
                <span class="bulk-upload-item-status" title="${statusLabels[task.syncStatus] || ''}">
                    ${statusIcons[task.syncStatus] || ''}
                </span>
            </label>
        `;
        }).join('');
        
        // Add change listeners to update count
        this.els.bulkUploadList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => this.updateBulkUploadCount());
        });
    }
    
    updateBulkUploadCount() {
        const checkboxes = this.els.bulkUploadList.querySelectorAll('input[type="checkbox"]');
        const checkedCount = this.els.bulkUploadList.querySelectorAll('input[type="checkbox"]:checked').length;
        
        this.els.bulkUploadCount.textContent = `${checkedCount} selected`;
        this.els.bulkUploadSubmitBtn.disabled = checkedCount === 0;
        
        // Update select all button text
        if (checkboxes.length > 0 && checkedCount === checkboxes.length) {
            this.els.bulkSelectAllBtn.textContent = 'Deselect All';
        } else {
            this.els.bulkSelectAllBtn.textContent = 'Select All';
        }
    }
    
    handleBulkSelectAll() {
        const checkboxes = this.els.bulkUploadList.querySelectorAll('input[type="checkbox"]');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(cb => {
            cb.checked = !allChecked;
        });
        
        this.updateBulkUploadCount();
    }
    
    async handleBulkUpload() {
        const checkedBoxes = this.els.bulkUploadList.querySelectorAll('input[type="checkbox"]:checked');
        const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            this.showToast('No tasks selected', 'error');
            return;
        }
        
        // Show confirmation
        const confirmed = await this.showConfirm(
            `Are you sure you want to upload ${selectedIds.length} task(s) to the server?`,
            'Upload Tasks'
        );
        
        if (!confirmed) return;
        
        // Close modal
        this.closeBulkUploadModal();
        
        // Upload each task
        let successCount = 0;
        let failCount = 0;
        
        for (const taskId of selectedIds) {
            try {
                await this.syncTask(taskId, 'up');
                successCount++;
            } catch (e) {
                console.error(`Failed to upload task ${taskId}:`, e);
                failCount++;
            }
        }
        
        // Show result
        if (failCount === 0) {
            this.showToast(`✅ Uploaded ${successCount} task(s)`, 'success');
        } else {
            this.showToast(`Uploaded ${successCount}, failed ${failCount}`, 'error');
        }
        
        // Reload tasks to update sync status
        await this.loadTasks();
    }
    
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    updateTimerDisplay(seconds) {
        const time = formatTime(seconds);
        this.els.hours.textContent = time.hours;
        this.els.minutes.textContent = time.minutes;
        this.els.seconds.textContent = time.seconds;
    }
    
    async handleTimerStateChange(state) {
        // NOTE: Event logging is handled by startTaskTimer/stopTaskTimer
        // This handler only manages tab indicator and auto-save
        
        // Update tab icon and title based on timer state
        this.updateTabIndicator(state);
        
        if (state === 'running') {
            // Auto-Create Task on Start if not exists
            if (!this.activeTaskId) {
                await this.createAutoSaveTask();
            }
        } else {
            // Auto-Update Task on Stop
            if (this.activeTaskId) {
                 const mergedLogs = await this.mergeTimerLogs(this.activeTaskId);
                 await this.updateAutoSaveTask({ 
                     duration: this.timer.getTime(),
                     timerLogs: mergedLogs
                 });
                 this.timerLogs = []; // Clear current logs after sync
            }
        }
    }
    
    /**
     * Update browser tab title and favicon based on timer state
     * @param {string} state - 'running', 'stopped', or null for idle
     */
    updateTabIndicator(state) {
        const baseTitle = 'Time Tracker';
        let favicon = '⏱️'; // default
        
        if (state === 'running') {
            document.title = `${baseTitle} - Running`;
            favicon = '▶️';
        } else if (this.activeTaskId) {
            document.title = `${baseTitle} - Paused`;
            favicon = '⏸️';
        } else {
            document.title = baseTitle;
            favicon = '⏱️';
        }
        
        // Update emoji favicon
        this.setEmojiFavicon(favicon);
    }
    
    /**
     * Set an emoji as the favicon using canvas
     * @param {string} emoji - Emoji to use as favicon
     */
    setEmojiFavicon(emoji) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.font = '28px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 16, 18);
        
        // Update or create favicon link
        let link = document.querySelector("link[rel*='icon']");
        if (!link) {
            link = document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            document.head.appendChild(link);
        }
        link.href = canvas.toDataURL();
    }
    
    openTimeEditModal() {
        if (this.timer.getIsRunning()) this.timer.stop();
        const time = formatTime(this.timer.getTime());
        // Set the single input with formatted time HH:MM:SS
        this.els.editTimeInput.value = `${time.hours}:${time.minutes}:${time.seconds}`;
        this.els.timeEditModal.classList.remove('hidden');
        this.els.editTimeInput.focus();
        this.els.editTimeInput.select();
    }
    
    initSpinnerButtons() {
        const MAX_HOURS = 24;
        const modal = this.els.timeEditModal;
        const buttons = modal.querySelectorAll('.spinner-btn');
        
        buttons.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.replaceWith(newBtn);
            
            newBtn.addEventListener('click', () => {
                const targetId = newBtn.dataset.target;
                const input = document.getElementById(targetId);
                console.log(`Spinner Click: ${targetId} Current: ${input.value}`);
                
                let value = parseInt(input.value, 10) || 0;
                const isUp = newBtn.classList.contains('up');
                const max = targetId === 'editHours' ? MAX_HOURS : 59;
                
                if (isUp) {
                    value = value >= max ? 0 : value + 1;
                } else {
                    value = value <= 0 ? max : value - 1;
                }
                
                input.value = String(value);
            });
        });
    }
    
    /**
     * Open the detail panel for a task
     * @param {string} id - Task ID
     */
    async openDetailPanel(id) {
        try {
            const context = await this.findTaskContext(id);
            if (!context) {
                this.showToast('Task not found', 'error');
                return;
            }
            const task = context.task;
            
            // Determine sync status
            let syncStatus = 'unknown';
            try {
                const serverTask = await syncService.getServerTask(id);
                const comparison = syncService.compareTasks(task, serverTask);
                syncStatus = comparison === 'consistent' ? 'synced' : comparison;
            } catch (e) {
                console.warn('Could not fetch sync status:', e);
            }
            
            // Include current session's in-memory logs if this is the active running task
            let displayTask = task;
            if (this.activeTaskId === id && this.timerLogs.length > 0) {
                displayTask = {
                    ...task,
                    timerLogs: [...(task.timerLogs || []), ...this.timerLogs]
                };
            }
            
            // Open the detail panel
            this.detailPanel.open(displayTask, syncStatus);
        } catch (error) {
            console.error('Error opening detail panel:', error);
            this.showToast('Error loading task details', 'error');
        }
    }
    
    async openRenameModal(id) {
        try {
            const context = await this.findTaskContext(id);
            if (!context) {
                this.showToast('Task not found', 'error');
                return;
            }
            const { task } = context;
            
            this.renamingTaskId = id;
            this.els.renameInput.value = task.name;
            this.els.renameModal.classList.remove('hidden');
            this.els.renameInput.focus();
            this.els.renameInput.select();
            
            // Set up event handlers
            const handleConfirm = async () => {
                await this.applyRename();
                cleanup();
            };
            
            const handleCancel = () => {
                this.closeRenameModal();
                cleanup();
            };
            
            const handleKeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                } else if (e.key === 'Escape') {
                    handleCancel();
                }
            };
            
            const cleanup = () => {
                this.els.renameConfirmBtn.removeEventListener('click', handleConfirm);
                this.els.renameCancelBtn.removeEventListener('click', handleCancel);
                this.els.renameInput.removeEventListener('keydown', handleKeydown);
            };
            
            this.els.renameConfirmBtn.addEventListener('click', handleConfirm);
            this.els.renameCancelBtn.addEventListener('click', handleCancel);
            this.els.renameInput.addEventListener('keydown', handleKeydown);
        } catch (error) {
            console.error('Rename modal failed:', error);
            this.showToast('Failed to open rename', 'error');
        }
    }
    
    closeRenameModal() {
        this.els.renameModal.classList.add('hidden');
        this.renamingTaskId = null;
    }
    
    async applyRename() {
        const newName = this.els.renameInput.value.trim();
        if (!newName) {
            this.showToast('Name cannot be empty', 'error');
            return;
        }
        
        if (!this.renamingTaskId) return;
        
        try {
            const context = await this.findTaskContext(this.renamingTaskId);
            if (!context) {
                this.showToast('Task not found', 'error');
                return;
            }
            const { task: oldTask } = context;
            if (!oldTask) {
                this.showToast('Task not found', 'error');
                return;
            }
            
            // Check if task is synced (exists on server)
            let isOnServer = false;
            try {
                const serverTask = await syncService.getServerTask(this.renamingTaskId);
                if (serverTask) isOnServer = true;
            } catch (e) {
                console.warn('Server check failed:', e);
            }
            
            if (isOnServer && !context.parent) { // Only split top-level tasks
                // SYNCED TASK: Create new task with new ID, delete old local copy
                // This allows the old synced task to be re-imported from server
                const newTask = {
                    ...oldTask,
                    id: generateId(),  // New ID
                    name: newName,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                
                // Save new task
                await storage.saveTask(newTask);
                
                // Delete old local task (will be re-imported from server)
                await storage.deleteTask(this.renamingTaskId);
                
                // Update active task reference if needed
                if (this.activeTaskId === this.renamingTaskId) {
                    this.activeTaskId = newTask.id;
                    this.taskEntry.inputElement.value = newName;
                }
                
                this.closeRenameModal();
                await this.loadTasks();  // Old task will be re-imported from server
                this.showToast('Task split: original synced + renamed copy', 'success');
            } else {
                // LOCAL-ONLY TASK OR SUBTASK: Just update the name
                // For subtasks, we must update the root
                oldTask.name = newName;
                oldTask.updatedAt = Date.now();
                
                await storage.overwriteTask(context.root);
                
                // Update active timer input if this is the active task
                if (this.activeTaskId === this.renamingTaskId) {
                    this.taskEntry.inputElement.value = newName;
                }
                
                this.closeRenameModal();
                await this.loadTasks();
                this.showToast('Task renamed', 'success');
            }
        } catch (error) {
            console.error('Rename failed:', error);
            this.showToast('Failed to rename task', 'error');
        }
    }
    
    /**
     * Parse time input string into hours, minutes, seconds
     * Supports formats: HH:MM:SS, MM:SS, or just seconds
     * @param {string} input - Time string
     * @returns {{h: number, m: number, s: number}|null} Parsed time or null if invalid
     */
    parseTimeInput(input) {
        if (!input) return null;
        
        // Try HH:MM:SS or MM:SS format
        const parts = input.split(':').map(p => parseInt(p.trim(), 10));
        
        if (parts.some(isNaN)) return null;
        
        let h = 0, m = 0, s = 0;
        
        if (parts.length === 3) {
            // HH:MM:SS
            [h, m, s] = parts;
        } else if (parts.length === 2) {
            // MM:SS
            [m, s] = parts;
        } else if (parts.length === 1) {
            // Just seconds or minutes
            s = parts[0];
        } else {
            return null;
        }
        
        // Validate ranges (allow overflow for normalization)
        if (h < 0 || m < 0 || s < 0) return null;
        
        // Normalize: e.g., 90 seconds -> 1 min 30 sec
        if (s >= 60) {
            m += Math.floor(s / 60);
            s = s % 60;
        }
        if (m >= 60) {
            h += Math.floor(m / 60);
            m = m % 60;
        }
        
        return { h, m, s };
    }
    
    closeTimeEditModal() {
        this.els.timeEditModal.classList.add('hidden');
    }
    
    async applyTimeEdit() {
        const input = this.els.editTimeInput.value.trim();
        
        // Parse time input: supports HH:MM:SS or MM:SS or just seconds
        const parsed = this.parseTimeInput(input);
        if (parsed === null) {
            this.showToast('Invalid time format. Use HH:MM:SS or MM:SS', 'error');
            this.els.editTimeInput.focus();
            return;
        }
        
        const { h, m, s } = parsed;
        const MAX_HOURS = 24;
        
        if (h > MAX_HOURS) {
            this.showToast(`Hours cannot exceed ${MAX_HOURS}`, 'error');
            this.els.editTimeInput.focus();
            return;
        }
        
        const newDuration = h * 3600 + m * 60 + s;
        console.log('[DEBUG] applyTimeEdit: newDuration=', newDuration, 'editingTaskId=', this.editingTaskId);
        
        if (this.editingTaskId) {
            // Editing a saved task's duration
            console.log('[DEBUG] Editing saved task:', this.editingTaskId);
            try {
                const context = await this.findTaskContext(this.editingTaskId);
                if (context) {
                    context.task.duration = newDuration;
                    context.task.updatedAt = Date.now();
                    context.root.updatedAt = Date.now(); 
                    await storage.overwriteTask(context.root);
                } else {
                    await storage.updateTask(this.editingTaskId, { duration: newDuration, updatedAt: Date.now() });
                }
                
                if (this.activeTaskId === this.editingTaskId) {
                    this.timer.setTime(newDuration);
                }
                
                this.editingTaskId = null;
                await this.loadTasks();
                this.showToast('Task duration updated', 'success');
            } catch (error) {
                console.error('[DEBUG] Update failed:', error);
                this.showToast('Failed to update duration', 'error');
            }
        } else {
            // Editing current timer
            this.timer.setTime(newDuration);
            
            if (this.activeTaskId) {
                try {
                    const context = await this.findTaskContext(this.activeTaskId);
                    if (context) {
                        context.task.duration = newDuration;
                        context.task.updatedAt = Date.now();
                        context.root.updatedAt = Date.now();
                        await storage.overwriteTask(context.root);
                    } else {
                        await storage.updateTask(this.activeTaskId, { duration: newDuration, updatedAt: Date.now() });
                    }
                    await this.loadTasks();
                    this.showToast('Task duration updated', 'success');
                } catch (error) {
                    console.error('Failed to update active task:', error);
                    this.showToast('Time updated locally', 'success');
                }
            } else if (newDuration > 0) {
                // Auto-add feature
                const taskName = this.taskEntry.getValue().trim();
                if (taskName) {
                    await this.createAutoSaveTask();
                    await this.updateAutoSaveTask({ duration: newDuration });
                    this.showToast('Task added to history', 'success');
                } else {
                    this.showToast('Time updated', 'success');
                }
            } else {
                this.showToast('Time updated', 'success');
            }
        }
        this.closeTimeEditModal();
    }
    
    async createAutoSaveTask() {
        if (this.activeTaskId) return;
        
        const name = this.taskEntry.getValue() || 'Untitled Task';
        const now = new Date();
        const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const currentSession = localStorage.getItem('timetracker-session-date') || today;
        
        const task = { 
            id: generateId(), 
            name, 
            duration: this.timer.getTime(), 
            createdAt: Date.now(),
            sessionDate: currentSession, 
            timerLogs: [...this.timerLogs],
            updatedAt: Date.now()
        };
        
        await storage.saveTask(task);
        this.activeTaskId = task.id;
        await this.loadTasks();
    }

    async updateAutoSaveTask(updates) {
        if (!this.activeTaskId) return;
        try {
             const context = await this.findTaskContext(this.activeTaskId);
             if (context) {
                 Object.assign(context.task, updates);
                 context.task.updatedAt = Date.now();
                 // Update root timestamp if it's a subtask
                 if (context.task !== context.root) {
                     context.root.updatedAt = Date.now();
                 }
                 await storage.overwriteTask(context.root);
             } else {
                 await storage.updateTask(this.activeTaskId, { ...updates, updatedAt: Date.now() });
             }
            await this.loadTasks(); 
        } catch (error) {
            console.error('Auto-save update failed:', error);
        }
    }
    
    handleTaskNameChange(name) {
        if (this.nameUpdateTimeout) clearTimeout(this.nameUpdateTimeout);
        this.nameUpdateTimeout = setTimeout(async () => {
            const trimmedName = (name || '').trim();
            const currentTime = this.timer.getTime();
            
            if (this.activeTaskId) {
                // Update existing task name
                this.updateAutoSaveTask({ name: trimmedName || 'Untitled Task' });
            } else if (trimmedName && currentTime > 0) {
                // Auto-add feature: Create history entry if BOTH time > 0 AND name provided
                await this.createAutoSaveTask();
                this.showToast('Task added to history', 'success');
            }
        }, 500);
    }

    async startNewTask() {
        if (this.timer.getIsRunning()) {
            this.timer.stop();
            // Wait briefly for stop handler to fire?
            // Since handler is async and not awaited by timer, we might race.
            // But we can forcibly create a new cycle.
        }
        
        // Ensure strictly synchronous cleanup of "current session" perception
        this.timer.reset();
        this.taskEntry.clear();
        this.activeTaskId = null;
        this.timerLogs = [];
        
        await this.loadTasks();
        this.showToast('Started new task', 'success');
    }
    
    async mergeTimerLogs(taskId) {
         try {
             // We need to get current logs from the specific task (subtask or root)
             const context = await this.findTaskContext(taskId);
             if (!context) return this.timerLogs;
             return [...(context.task.timerLogs || []), ...this.timerLogs];
         } catch (e) { return this.timerLogs; }
    }
    
    inputSubtask(parentId) {
        // Reuse rename modal for input
        this.renamingTaskId = null; // Ensure not renaming mode
        this.parentTaskId = parentId;
        
        // Change title temporarily
        const originalTitle = this.els.renameModalTitle.textContent;
        this.els.renameModalTitle.textContent = "Add Subtask";
        this.els.renameInput.value = "";
        this.els.renameInput.placeholder = "Subtask name";
        
        this.els.renameModal.classList.remove('hidden');
        this.els.renameInput.focus();
        
        const handleConfirm = async () => {
             const name = this.els.renameInput.value.trim();
             if (name) {
                 await this.addSubtask(parentId, name);
                 this.closeRenameModal();
             }
             cleanup();
        };
        
        const handleCancel = () => {
             this.closeRenameModal();
             cleanup();
        };
        
        const handleKeydown = (e) => {
             if (e.key === 'Enter') handleConfirm();
             if (e.key === 'Escape') handleCancel();
        };
        
        const cleanup = () => {
             // Restore title
             this.els.renameModalTitle.textContent = originalTitle;
             this.els.renameInput.placeholder = "Task name";
             
             this.els.renameConfirmBtn.removeEventListener('click', handleConfirm);
             this.els.renameCancelBtn.removeEventListener('click', handleCancel);
             this.els.renameInput.removeEventListener('keydown', handleKeydown);
             
             // Re-bind original rename listeners done in openRenameModal? 
             // No, openRenameModal binds fresh listeners every time.
             // We just need to make sure we don't leave zombie listeners or remove the wrong ones.
             // But my openRename logic binds valid listeners. 
        };
        
        this.els.renameConfirmBtn.addEventListener('click', handleConfirm);
        this.els.renameCancelBtn.addEventListener('click', handleCancel);
        this.els.renameInput.addEventListener('keydown', handleKeydown);
    }
    
    async addSubtask(parentId, name) {
        try {
            const context = await this.findTaskContext(parentId);
            if (!context) return;
            
            const { task, root } = context;
            if (!task.subtasks) task.subtasks = [];
            
            const newSub = {
                id: generateId(),
                name,
                duration: 0,
                createdAt: Date.now(),
                timerLogs: [],
                subtasks: []
            };
            
            task.subtasks.push(newSub);
            
            // Critical: Update root timestamp
            context.root.updatedAt = Date.now();
            
            await storage.overwriteTask(context.root);
            await this.loadTasks();
            this.showToast('Subtask added', 'success');
        } catch (e) {
            console.error(e);
            this.showToast('Failed to add subtask', 'error');
        }
    }
    
    /**
     * Add a new task from the input field
     */
    async addNewTask() {
        const name = this.els.taskName.value.trim();
        if (!name) {
            this.showToast('Please enter a task name', 'error');
            this.els.taskName.focus();
            return;
        }
        
        const now = new Date();
        const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const currentSession = localStorage.getItem('timetracker-session-date') || today;
        
        const task = {
            id: generateId(),
            name,
            duration: 0,
            createdAt: Date.now(),
            sessionDate: currentSession,
            timerLogs: [],
            updatedAt: Date.now()
        };
        
        await storage.saveTask(task);
        this.els.taskName.value = '';
        await this.loadTasks();
        
        // Automatically start the new task
        this.startTaskTimer(task.id);
        this.showToast('Task added and started!', 'success');
    }
    
    /**
     * Start timer on a specific task
     * @param {string} id - Task ID to start
     */
    async startTaskTimer(id) {
        try {
            // Stop current task if different
            if (this.activeTaskId && this.activeTaskId !== id) {
                await this.stopTaskTimer(this.activeTaskId);
            }
            
            const context = await this.findTaskContext(id);
            if (!context) { this.showToast('Task not found', 'error'); return; }
            const task = context.task;
            
            this.activeTaskId = id;
            this.timerLogs.push({
                event: 'start',
                timestamp: new Date().toISOString(),
                elapsedSeconds: task.duration
            });
            
            this.timer.setTime(task.duration);
            this.timer.start();
            
            // Update task list to show active state
            this.taskList.setActiveTask(id);
            await this.loadTasks();
        } catch (error) {
            console.error('Start task failed:', error);
            this.showToast('Failed to start task', 'error');
        }
    }
    
    /**
     * Stop timer on a specific task
     * @param {string} id - Task ID to stop
     */
    async stopTaskTimer(id) {
        try {
            if (this.activeTaskId !== id) return;
            
            this.timer.stop();
            
            this.timerLogs.push({
                event: 'stop',
                timestamp: new Date().toISOString(),
                elapsedSeconds: this.timer.getTime()
            });
            
            // Merge and save timer logs
            const mergedLogs = await this.mergeTimerLogs(id);
            
            const context = await this.findTaskContext(id);
            if (context) {
                context.task.duration = this.timer.getTime();
                context.task.timerLogs = mergedLogs;
                context.task.updatedAt = Date.now();
                // CRITICAL: Update root task timestamp to trigger sync status change
                context.root.updatedAt = Date.now();
                await storage.overwriteTask(context.root);
            }
            
            this.timerLogs = [];
            this.activeTaskId = null;
            
            // Update task list to remove active state
            this.taskList.setActiveTask(null);
            await this.loadTasks();
        } catch (error) {
            console.error('Stop task failed:', error);
            this.showToast('Failed to stop task', 'error');
        }
    }
    
    async editTaskDuration(id) {
        try {
            const context = await this.findTaskContext(id);
            if (!context) { this.showToast('Task not found', 'error'); return; }
            const task = context.task;
            
            this.editingTaskId = id;
            const time = formatTime(task.duration);
            this.els.editTimeInput.value = `${time.hours}:${time.minutes}:${time.seconds}`;
            this.els.timeEditModal.classList.remove('hidden');
            this.els.editTimeInput.focus();
            this.els.editTimeInput.select();
        } catch (error) {
            console.error('Edit failed:', error);
            this.showToast('Failed to edit task', 'error');
        }
    }
    
    async deleteTask(id) {
        // Fetch task to check status
        const context = await this.findTaskContext(id);
        if (!context) return;
        const task = context.task;

        // Check Sync Status
        // We rely on the status calculated during loadTasks, but it's not stored in DB.
        // So we must check `taskList` DOM or re-calculate.
        // Better: re-fetch status or just check if it exists on server.
        let isOnServer = false;
        try {
            const serverTask = await syncService.getServerTask(id);
            if (serverTask) isOnServer = true;
        } catch (e) {
            console.warn('Delete check failed:', e);
        }

        if (isOnServer) {
            const confirmed = await this.showConfirm(
                `"${task.name}" is synced to the server.\n\n` +
                `Click Confirm to delete it locally AND reset it on the server (Duration = 0).\n` +
                `Click Cancel to abort.`,
                'Sync Deletion'
            );
            
            if (!confirmed) return;
            
            try {
                // Post duration 0 to server to "soft delete" / reset
                // Must also clear timerLogs, otherwise server (or UI) might recalculate duration from logs.
                await syncService.postTask({ ...task, duration: 0, timerLogs: [] });
                this.showToast('Server task reset to 0s', 'success');
            } catch (e) {
                alert('Failed to update server. Task will be deleted locally only.');
            }

        } else {
             const confirmed = await this.showConfirm(
                `Delete "${task.name}"?`,
                'Delete Task'
            );
            if (!confirmed) return;
        }
        
        try {
            if (context.parent) {
                // It's a subtask - remove from parent array
                context.parent.subtasks = context.parent.subtasks.filter(t => t.id !== id);
                await storage.overwriteTask(context.root);
            } else {
                // Top level
                await storage.deleteTask(id);
            }
            this.showToast('Task deleted', 'success');
            await this.loadTasks();
        } catch (error) {
            console.error('Delete failed:', error);
            this.showToast('Failed to delete task', 'error');
        }
    }
    
    async syncTask(id, direction = 'up') {
        try {
            if (direction === 'down') {
                const serverTask = await syncService.getServerTask(id);
                if (!serverTask) {
                    this.showToast('Task not found on server', 'error');
                    return;
                }

                // Check for local subtasks that would be lost
                const localContext = await this.findTaskContext(id);
                if (localContext && localContext.task.subtasks && localContext.task.subtasks.length > 0) {
                    const confirmed = await this.showConfirm(
                        '⚠️ Warning: Syncing from server will replace this task.\n\n' +
                        'Your local subtasks will be DELETED because subtasks are not saved to the server.\n\n' +
                        'Do you want to proceed?',
                        'Potential Data Loss',
                        true
                    );
                    if (!confirmed) return;
                }

                // Explicitly ensure server task has no subtasks (server doesn't store subtasks)
                serverTask.subtasks = [];
                await storage.overwriteTask(serverTask);
                
                // REACTIVE UPDATE: If this is the active task, update the timer display
                if (this.activeTaskId === id) {
                    this.timer.setTime(serverTask.duration);
                    this.showToast('Task fetched from server & timer updated', 'success');
                } else {
                    this.showToast('Task fetched from server', 'success');
                }
            } else {
            const task = await storage.getTask(id);
                if (!task) return;
                
                // Sanitize task to remove any runtime helpers or circular references
                const sanitize = (t) => {
                    const { parent, root, ...clean } = t;
                    if (clean.subtasks) {
                        clean.subtasks = clean.subtasks.map(st => sanitize(st));
                    }
                    return clean;
                };
                
                const cleanTask = sanitize(task);
                // Note: postTask will calculate total duration (parent + subtasks)
                
                const serverResponse = await syncService.postTask(cleanTask);
                
                // CRITICAL: Update local task with server response (especially updatedAt) to ensure consistency
                // BUT: Keep local duration for tasks with subtasks (server has total, local has parent-only)
                const updatedLocalhelper = { ...task, ...serverResponse };
                
                // Restore subtasks which are not in server response
                if (task.subtasks && task.subtasks.length > 0) {
                    updatedLocalhelper.subtasks = task.subtasks;
                    // IMPORTANT: Keep local parent-only duration, not server's total
                    updatedLocalhelper.duration = task.duration;
                }
                
                await storage.overwriteTask(updatedLocalhelper);
                
                this.showToast('Task uploaded & sync status updated', 'success');
            }
            await this.loadTasks();
        } catch (error) {
            console.error('Sync failed:', error);
            this.showToast('Sync failed', 'error');
        }
    }
    
    async loadTasks() {
        try {
            // MERGE STRATEGY:
            // 1. Fetch Server Tasks first
            // 2. Identify "Server Only" tasks -> Create them locally (Auto-Download)
            // 3. Identify "Local Only" tasks -> Will be marked 'missing' (❌)
            // 4. Identify Common tasks -> Consistency check
            
            const now = new Date();
            const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const currentSession = localStorage.getItem('timetracker-session-date') || today;
            
            let serverTasks = [];
            try {
                serverTasks = await syncService.fetchServerTasks(currentSession);
                
                // Get pre-merge local tasks
                const localTasksRaw = await storage.getAllTasks();
                const localMap = new Map(localTasksRaw.map(t => [t.id, t]));
                
                // Import Server-Only tasks
                for (const st of serverTasks) {
                    if (!localMap.has(st.id)) {
                        // Task exists on server but not locally -> Create it (Tick ✅)
                        const newTask = {
                            ...st,
                            sessionDate: currentSession, // Ensure session match
                            timerLogs: st.timerLogs || [] 
                        };
                        // Use overwriteTask (put) instead of saveTask (add) to avoid ConstraintError
                        await storage.overwriteTask(newTask);
                    }
                }
            } catch (error) {
                console.warn('Merge: Server fetch failed (Offline?)', error);
            }

            // Reload all tasks (now merged)
            const allTasks = await storage.getAllTasks();
            
            // Filter
            const tasks = allTasks.filter(task => {
                if (task.sessionDate) return task.sessionDate === currentSession;
                return currentSession === today;
            });
            
            // Apply Sync Status
            tasks.forEach(task => {
                const serverTask = serverTasks.find(st => st.id === task.id);
                // If server fetch failed, serverTasks is empty -> everything is 'missing' or 'unknown'?
                // If offline, maybe we shouldn't show ❌? 
                // For now, assume consistent comparison logic.
                 task.syncStatus = syncService.compareTasks(task, serverTask);
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
            this.els.nextDayBtn.disabled = true;  // Can't go to future
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
            this.els.nextDayBtn.disabled = false;  // Can navigate forward
        }
    }
    
    /**
     * Change session date by offset (negative for past, positive for future)
     * @param {number} offset - Number of days to add/subtract
     */
    async changeSessionDate(offset) {
        const now = new Date();
        const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        
        // Parse current session date
        const currentDate = new Date(this.sessionDate + 'T00:00:00');
        
        // Calculate new date
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + offset);
        
        // Format new date as YYYY-MM-DD
        const newDateString = new Date(newDate.getTime() - (newDate.getTimezoneOffset() * 60000))
            .toISOString()
            .split('T')[0];
        
        // Prevent going into the future
        if (newDateString > today) {
            this.showToast('Cannot navigate to future dates', 'error');
            return;
        }
        
        // Update session date
        this.sessionDate = newDateString;
        localStorage.setItem('timetracker-session-date', newDateString);
        
        // Gracefully stop and save the active task before switching dates
        if (this.activeTaskId && this.timer.getIsRunning()) {
            await this.stopTaskTimer(this.activeTaskId);
            this.showToast('Active timer saved', 'info');
        }
        
        // Clear timer state for new session view
        this.timer.reset();
        this.activeTaskId = null;
        this.timerLogs = [];
        this.taskList.setActiveTask(null);
        
        // Update UI
        await this.loadTasks();
        this.updateSessionDisplay();
        
        // Show feedback
        const dateObj = new Date(newDateString + 'T00:00:00');
        const formatted = dateObj.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
        this.showToast(`Switched to ${newDateString === today ? 'Today' : formatted}`, 'success');
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
    
    /**
     * Show custom confirmation modal
     * @param {string} message 
     * @param {string} title 
     * @param {boolean} isDanger 
     * @returns {Promise<boolean>}
     */
    showConfirm(message, title = 'Are you sure?', isDanger = false) {
        return new Promise((resolve) => {
            this.els.confirmTitle.textContent = title;
            this.els.confirmMessage.textContent = message;
            
            // Allow line breaks in message
            this.els.confirmMessage.innerHTML = message.replace(/\n/g, '<br>');

            // Update button styles
            this.els.confirmOkBtn.className = isDanger ? 'btn btn-save' : 'btn btn-primary';
            // Actually dangerous actions should probably look dangerous (red)
            if (isDanger) {
                 this.els.confirmOkBtn.style.background = 'var(--color-danger)';
                 this.els.confirmOkBtn.style.color = 'white';
            } else {
                 this.els.confirmOkBtn.style.background = ''; // Reset to class default
                 this.els.confirmOkBtn.style.color = '';
            }

            this.els.confirmModal.classList.remove('hidden');

            const cleanup = () => {
                this.els.confirmModal.classList.add('hidden');
                // Clone to remove listeners
                const okClone = this.els.confirmOkBtn.cloneNode(true);
                const cancelClone = this.els.confirmCancelBtn.cloneNode(true);
                this.els.confirmOkBtn.replaceWith(okClone);
                this.els.confirmCancelBtn.replaceWith(cancelClone);
                
                // Update cache
                this.els.confirmOkBtn = okClone;
                this.els.confirmCancelBtn = cancelClone;
            };

            this.els.confirmOkBtn.onclick = () => {
                cleanup();
                resolve(true);
            };

            this.els.confirmCancelBtn.onclick = () => {
                cleanup();
                resolve(false);
            };
            
            // Close on background click
            // (Optional: can add later if requested, simpler for now to force button choice)
        });
    }

    async clearAllData() {
        const confirmed = await this.showConfirm(
            '⚠️ DANGER ZONE ⚠️\n\nAre you sure you want to delete all LOCAL data?\n\n' +
            '• Local task history and settings will be wiped.\n' +
            '• Synced server data will NOT be deleted.\n\n' +
            'This action cannot be undone.',
            'Clear Local Data',
            true
        );

        if (confirmed) {
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
