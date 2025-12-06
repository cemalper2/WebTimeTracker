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
        
        this.container.innerHTML = tasks.map(task => `
            <div class="task-item" data-id="${task.id}">
                <div class="task-info">
                    <span class="task-name">${this.escapeHtml(task.name)}</span>
                    <div class="task-meta">
                        <span>${formatDate(task.createdAt)}</span>
                        <span>${formatTimeOfDay(task.createdAt)}</span>
                    </div>
                </div>
                <span class="task-time">${formatTime(task.duration).formatted}</span>
                <div class="task-actions">
                    <button class="btn-icon-only resume" data-action="resume" title="Resume">▶️</button>
                    <button class="btn-icon-only edit" data-action="edit" title="Edit Time">✏️</button>
                    <button class="btn-icon-only delete" data-action="delete" title="Delete">🗑️</button>
                </div>
            </div>
        `).join('');
        
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
