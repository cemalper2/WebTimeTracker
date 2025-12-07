/**
 * Task List Component - Renders saved tasks
 */

import { formatTime, formatDate, formatTimeOfDay, formatDuration } from '../utils/formatters.js';

export class TaskList {
    constructor(options = {}) {
        this.container = options.container;
        this.onDelete = options.onDelete || (() => {});
        this.onEdit = options.onEdit || (() => {});
        this.onResume = options.onResume || (() => {});
        this.onSync = options.onSync || (() => {});
        this.onRename = options.onRename || (() => {});
    }
    
    render(tasks) {
        if (!this.container) return;
        
        if (!tasks || tasks.length === 0) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📭</span>
                    <p>No tasks tracked yet</p>
                    <p class="empty-hint">Start the timer and save your first task!</p>
                </div>`;
            return;
        }
        
        this.container.innerHTML = tasks.map(task => {
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

            return `
            <div class="task-item" data-id="${task.id}">
                <div class="task-info">
                    <div class="task-header-row" style="display: flex; align-items: center; gap: 8px;">
                        <span class="task-name">${this.escapeHtml(task.name)}</span>
                        ${syncIcon ? `<span class="sync-status" title="${syncTitle}" style="cursor: help; font-size: 0.8em;">${syncIcon}</span>` : ''}
                    </div>
                    <div class="task-meta">
                        <span>${formatDate(task.createdAt)}</span>
                        <span>${formatTimeOfDay(task.createdAt)}</span>
                    </div>
                </div>
                <span class="task-time">${formatTime(task.duration).formatted}</span>
                <div class="task-actions">
                    <button class="btn-icon-only resume" data-action="resume" title="Resume">▶️</button>
                    ${task.syncStatus === 'inconsistent' 
                        ? `<div class="sync-actions" style="display: flex; gap: 4px;">
                             <button class="btn-icon-only sync" data-action="sync" data-direction="up" title="Push to Server (Overwrite)">☁️⬆️</button>
                             <button class="btn-icon-only sync" data-action="sync" data-direction="down" title="Pull from Server (Overwrite Local)">☁️⬇️</button>
                           </div>`
                        : (task.syncStatus === 'missing' 
                            ? `<button class="btn-icon-only sync" data-action="sync" data-direction="up" title="Push to Server (Upload)">☁️⬆️</button>`
                            : '')
                    }
                    <button class="btn-icon-only rename" data-action="rename" title="Rename">📝</button>
                    <button class="btn-icon-only edit" data-action="edit" title="Edit Time">✏️</button>
                    <button class="btn-icon-only delete" data-action="delete" title="Delete">🗑️</button>
                </div>
            </div>
        `}).join('');
        
        this.container.querySelectorAll('[data-action="sync"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.closest('.task-item').dataset.id;
                const direction = btn.dataset.direction || 'up';
                this.onSync(id, direction);
            });
        });

        this.container.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.closest('.task-item').dataset.id;
                this.onDelete(id);
            });
        });
        
        this.container.querySelectorAll('[data-action="resume"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.closest('.task-item').dataset.id;
                this.onResume(id);
            });
        });
        
        this.container.querySelectorAll('[data-action="rename"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.closest('.task-item').dataset.id;
                this.onRename(id);
            });
        });
        
        this.container.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.closest('.task-item').dataset.id;
                this.onEdit(id);
            });
        });
        
        // Click on task item itself to resume
        this.container.querySelectorAll('.task-item').forEach(item => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                this.onResume(id);
            });
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
        totalTasksEl.textContent = `${count} task${count !== 1 ? 's' : ''}`;
        totalTimeEl.textContent = formatDuration(totalSeconds);
    }
}
