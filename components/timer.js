/**
 * Timer Component
 * Handles all timer-related functionality
 */

export class Timer {
    constructor(options = {}) {
        this.seconds = 0;
        this.isRunning = false;
        this.intervalId = null;
        this.onTick = options.onTick || (() => {});
        this.onStateChange = options.onStateChange || (() => {});
    }
    
    /**
     * Start the timer
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.intervalId = setInterval(() => {
            this.seconds++;
            this.onTick(this.seconds);
        }, 1000);
        
        this.onStateChange('running');
    }
    
    /**
     * Stop/pause the timer
     */
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.onStateChange('stopped');
    }
    
    /**
     * Reset the timer to zero
     */
    reset() {
        this.stop();
        this.seconds = 0;
        this.onTick(this.seconds);
        this.onStateChange('reset');
    }
    
    /**
     * Set timer to a specific value
     * @param {number} seconds - Time in seconds
     */
    setTime(seconds) {
        this.seconds = Math.max(0, Math.floor(seconds));
        this.onTick(this.seconds);
    }
    
    /**
     * Get current time in seconds
     * @returns {number} Current seconds
     */
    getTime() {
        return this.seconds;
    }
    
    /**
     * Check if timer is currently running
     * @returns {boolean} Running state
     */
    getIsRunning() {
        return this.isRunning;
    }
    
    /**
     * Toggle timer state
     */
    toggle() {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }
    
    /**
     * Cleanup - stop timer and remove interval
     */
    destroy() {
        this.stop();
    }
}
