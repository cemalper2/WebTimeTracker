/**
 * Task List Component - Renders task list with per-task timers
 */

import { formatTime, formatDate, formatTimeOfDay, formatDuration } from '../utils/formatters.js';

export class TaskList {
    constructor(options = {}) {
        this.container = options.container;
        this.onDelete = options.onDelete || (() => {});
        this.onEdit = options.onEdit || (() => {});
        this.onStart = options.onStart || (() => {});  // Start timer on task
        this.onStop = options.onStop || (() => {});    // Stop timer on task
        this.onSync = options.onSync || (() => {});
        this.onRename = options.onRename || (() => {});
        this.onDetails = options.onDetails || (() => {});
        this.activeTaskId = null;  // Currently running task
    }
    
    /**
     * Set the active task ID (for highlighting)
     * @param {string|null} taskId 
     */
    setActiveTask(taskId) {
        this.activeTaskId = taskId;
    }
    
    render(tasks) {
        if (!this.container) return;
        
        if (!tasks || tasks.length === 0) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📭</span>
                    <p>No tasks yet</p>
                    <p class="empty-hint">Add a task above to get started!</p>
                </div>`;
            return;
        }
        
        this.container.innerHTML = tasks.map(task => {
            const isActive = task.id === this.activeTaskId;
            const syncIcon = {
                'consistent': '✅',
                'missing': '❌',
                'inconsistent': '❓'
            }[task.syncStatus];
            
            const syncTitle = {
                'consistent': 'Synced with server',
                'missing': 'Missing on server',
                'inconsistent': 'Data mismatch with server'
            }[task.syncStatus] || '';

            // Start/Stop button based on active state
            const playStopBtn = isActive 
                ? `<button class="btn-icon-only stop active-btn" data-action="stop" title="Stop">⏸️</button>`
                : `<button class="btn-icon-only start" data-action="start" title="Start">▶️</button>`;

            return `
            <div class="task-item ${isActive ? 'active' : ''}" data-id="${task.id}">
                <div class="task-info">
                    <div class="task-header-row">
                        <span class="task-name">${this.escapeHtml(task.name)}</span>
                        ${syncIcon ? `<span class="sync-status" title="${syncTitle}">${syncIcon}</span>` : ''}
                    </div>
                    <div class="task-meta">
                        <span>${formatDate(task.createdAt)}</span>
                        <span>${formatTimeOfDay(task.createdAt)}</span>
                    </div>
                </div>
                <span class="task-time">${formatTime(task.duration).formatted}</span>
                <div class="task-actions">
                    ${playStopBtn}
                    ${task.syncStatus === 'inconsistent' 
                        ? `<div class="sync-actions">
                             <button class="btn-icon-only sync" data-action="sync" data-direction="up" title="Push to Server">☁️⬆️</button>
                             <button class="btn-icon-only sync" data-action="sync" data-direction="down" title="Pull from Server">☁️⬇️</button>
                           </div>`
                        : (task.syncStatus === 'missing' 
                            ? `<button class="btn-icon-only sync" data-action="sync" data-direction="up" title="Upload">☁️⬆️</button>`
                            : '')
                    }
                    <button class="btn-icon-only details" data-action="details" title="Details">ℹ️</button>
                    <button class="btn-icon-only rename" data-action="rename" title="Rename">📝</button>
                    <button class="btn-icon-only edit" data-action="edit" title="Edit Time">✏️</button>
                    <button class="btn-icon-only delete" data-action="delete" title="Delete">🗑️</button>
                </div>
            </div>
        `}).join('');
        
        this.attachEventListeners();
    }
    
    attachEventListeners() {
        // Start button
        this.container.querySelectorAll('[data-action="start"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.closest('.task-item').dataset.id;
                this.onStart(id);
            });
        });
        
        // Stop button
        this.container.querySelectorAll('[data-action="stop"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.closest('.task-item').dataset.id;
                this.onStop(id);
            });
        });
        
        // Sync buttons
        this.container.querySelectorAll('[data-action="sync"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.closest('.task-item').dataset.id;
                const direction = btn.dataset.direction || 'up';
                this.onSync(id, direction);
            });
        });

        // Delete button
        this.container.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.closest('.task-item').dataset.id;
                this.onDelete(id);
            });
        });
        
        // Rename button
        this.container.querySelectorAll('[data-action="rename"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.closest('.task-item').dataset.id;
                this.onRename(id);
            });
        });
        
        // Edit button
        this.container.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.closest('.task-item').dataset.id;
                this.onEdit(id);
            });
        });
        
        // Details button
        this.container.querySelectorAll('[data-action="details"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.closest('.task-item').dataset.id;
                this.onDetails(id);
            });
        });
        
        // Double-click on task name to rename
        this.container.querySelectorAll('.task-name').forEach(nameEl => {
            nameEl.style.cursor = 'text';
            nameEl.title = 'Double-click to rename';
            nameEl.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const id = nameEl.closest('.task-item').dataset.id;
                this.onRename(id);
            });
            nameEl.addEventListener('click', (e) => e.stopPropagation());
        });
        
        // Double-click on task time to edit duration
        this.container.querySelectorAll('.task-time').forEach(timeEl => {
            timeEl.style.cursor = 'text';
            timeEl.title = 'Double-click to edit time';
            timeEl.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const id = timeEl.closest('.task-item').dataset.id;
                this.onEdit(id);
            });
            timeEl.addEventListener('click', (e) => e.stopPropagation());
        });
    }
    
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    updateStats(tasks, totalTasksEl, totalTimeEl) {
        if (!totalTasksEl || !totalTimeEl) return;
        const count = tasks.length;
        const totalSeconds = tasks.reduce((sum, t) => sum + (t.duration || 0), 0);
        totalTasksEl.textContent = count;
        totalTimeEl.textContent = formatDuration(totalSeconds);
    }
}
