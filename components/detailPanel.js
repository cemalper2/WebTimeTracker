/**
 * DetailPanel Component
 * Manages the sliding side panel that shows task event history
 */

import { formatTime as formatDuration } from '../utils/formatters.js';

export class DetailPanel {
    constructor() {
        this.panel = document.getElementById('detailPanel');
        this.overlay = document.getElementById('detailPanelOverlay');
        this.closeBtn = document.getElementById('closeDetailPanel');
        this.taskNameEl = document.getElementById('detailTaskName');
        this.durationEl = document.getElementById('detailDuration');
        this.sessionDateEl = document.getElementById('detailSessionDate');
        this.syncStatusEl = document.getElementById('detailSyncStatus');
        this.timelineEl = document.getElementById('detailTimeline');
        
        this.currentTask = null;
        this.isOpen = false;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Close button click
        this.closeBtn?.addEventListener('click', () => this.close());
        
        // Overlay click to close
        this.overlay?.addEventListener('click', () => this.close());
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
    
    /**
     * Open the panel with task details
     * @param {Object} task - Task object with timerLogs
     * @param {string} syncStatus - 'synced', 'missing', 'inconsistent'
     */
    open(task, syncStatus = 'unknown') {
        if (!task) return;
        
        this.currentTask = task;
        this.isOpen = true;
        
        // Update task info
        this.taskNameEl.textContent = task.name || 'Unnamed Task';
        this.durationEl.textContent = this.formatDurationString(task.duration || 0);
        this.sessionDateEl.textContent = this.formatSessionDate(task.sessionDate);
        this.syncStatusEl.textContent = this.getSyncStatusDisplay(syncStatus);
        
        // Render timeline
        this.renderTimeline(task.timerLogs || []);
        
        // Show panel with animation
        this.panel.classList.add('open');
        this.overlay.classList.remove('hidden');
        this.overlay.classList.add('visible');
    }
    
    /**
     * Close the panel
     */
    close() {
        this.isOpen = false;
        this.currentTask = null;
        
        this.panel.classList.remove('open');
        this.overlay.classList.remove('visible');
        
        // Wait for animation to complete before hiding overlay
        setTimeout(() => {
            if (!this.isOpen) {
                this.overlay.classList.add('hidden');
            }
        }, 300);
    }
    
    /**
     * Render the event timeline
     * @param {Array} timerLogs - Array of timer log events
     */
    renderTimeline(timerLogs) {
        if (!timerLogs || timerLogs.length === 0) {
            this.timelineEl.innerHTML = '<div class="empty-timeline">No events recorded</div>';
            return;
        }
        
        // Sort by timestamp (oldest first)
        const sortedLogs = [...timerLogs].sort((a, b) => {
            return new Date(a.timestamp) - new Date(b.timestamp);
        });
        
        const html = sortedLogs.map(log => this.createEventHTML(log)).join('');
        this.timelineEl.innerHTML = html;
    }
    
    /**
     * Create HTML for a single timeline event
     * @param {Object} log - Log event object
     * @returns {string} HTML string
     */
    createEventHTML(log) {
        const eventType = log.event || 'unknown';
        const icon = this.getEventIcon(eventType);
        const description = this.getEventDescription(eventType);
        const time = this.formatEventTime(log.timestamp);
        const elapsed = this.formatDurationString(log.elapsedSeconds || 0);
        
        return `
            <div class="timeline-event ${eventType}">
                <div class="timeline-icon">${icon}</div>
                <div class="timeline-details">
                    <span class="timeline-time">${time}</span>
                    <span class="timeline-description">${description}</span>
                    <span class="timeline-elapsed">Elapsed: ${elapsed}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Get emoji icon for event type
     * @param {string} eventType 
     * @returns {string} Emoji icon
     */
    getEventIcon(eventType) {
        const icons = {
            'start': '▶️',
            'stop': '⏸️',
            'edit': '✏️',
            'sync': '☁️'
        };
        return icons[eventType] || '📌';
    }
    
    /**
     * Get description for event type
     * @param {string} eventType 
     * @returns {string} Description
     */
    getEventDescription(eventType) {
        const descriptions = {
            'start': 'Timer started',
            'stop': 'Timer stopped',
            'edit': 'Duration edited',
            'sync': 'Synced to server'
        };
        return descriptions[eventType] || 'Event';
    }
    
    /**
     * Format timestamp for display
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Formatted time
     */
    formatEventTime(timestamp) {
        if (!timestamp) return '--:--:--';
        
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        } catch (e) {
            return '--:--:--';
        }
    }
    
    /**
     * Format duration in HH:MM:SS
     * @param {number} seconds 
     * @returns {string} Formatted duration
     */
    formatDurationString(seconds) {
        const time = formatDuration(seconds);
        return `${time.hours}:${time.minutes}:${time.seconds}`;
    }
    
    /**
     * Format session date for display
     * @param {string} dateString - YYYY-MM-DD format
     * @returns {string} Formatted date
     */
    formatSessionDate(dateString) {
        if (!dateString) return 'Unknown';
        
        try {
            const date = new Date(dateString + 'T12:00:00');
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }
    
    /**
     * Get sync status display text
     * @param {string} status 
     * @returns {string} Display text with emoji
     */
    getSyncStatusDisplay(status) {
        const displays = {
            'synced': '✅ Synced',
            'missing': '❌ Not synced',
            'inconsistent': '⚠️ Out of sync',
            'unknown': '❓ Unknown'
        };
        return displays[status] || displays['unknown'];
    }
}
