/**
 * IndexedDB Storage Service for Task Persistence
 */

const DB_NAME = 'TimeTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'tasks';

class StorageService {
    constructor() {
        this.db = null;
        this.initPromise = this.init();
    }
    
    /**
     * Initialize IndexedDB connection
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB connected successfully');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create tasks object store
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                    store.createIndex('name', 'name', { unique: false });
                    console.log('Created tasks object store');
                }
            };
        });
    }
    
    /**
     * Ensure database is ready
     * @returns {Promise<IDBDatabase>}
     */
    async ensureReady() {
        if (!this.db) {
            await this.initPromise;
        }
        return this.db;
    }
    
    /**
     * Save a new task
     * @param {Object} task - Task object to save
     * @returns {Promise<Object>} Saved task with ID
     */
    async saveTask(task) {
        await this.ensureReady();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const request = store.add(task);
            
            request.onsuccess = () => {
                console.log('Task saved:', task.id);
                resolve(task);
            };
            
            request.onerror = () => {
                console.error('Failed to save task:', request.error);
                reject(request.error);
            };
        });
    }
    
    /**
     * Get all tasks, sorted by creation date (newest first)
     * @returns {Promise<Array>} Array of tasks
     */
    async getAllTasks() {
        await this.ensureReady();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('createdAt');
            
            const request = index.openCursor(null, 'prev');
            const tasks = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    tasks.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(tasks);
                }
            };
            
            request.onerror = () => {
                console.error('Failed to get tasks:', request.error);
                reject(request.error);
            };
        });
    }
    
    /**
     * Get a single task by ID
     * @param {string} id - Task ID
     * @returns {Promise<Object|null>} Task object or null
     */
    async getTask(id) {
        await this.ensureReady();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = () => {
                console.error('Failed to get task:', request.error);
                reject(request.error);
            };
        });
    }
    
    /**
     * Update an existing task
     * @param {string} id - Task ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated task
     */
    async updateTask(id, updates) {
        await this.ensureReady();
        
        const task = await this.getTask(id);
        if (!task) {
            throw new Error(`Task not found: ${id}`);
        }
        
        const updatedTask = { ...task, ...updates, updatedAt: Date.now() };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const request = store.put(updatedTask);
            
            request.onsuccess = () => {
                console.log('Task updated:', id);
                resolve(updatedTask);
            };
            
            request.onerror = () => {
                console.error('Failed to update task:', request.error);
                reject(request.error);
            };
        });
    }
    
    /**
     * Delete a task
     * @param {string} id - Task ID
     * @returns {Promise<void>}
     */
    async deleteTask(id) {
        await this.ensureReady();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log('Task deleted:', id);
                resolve();
            };
            
            request.onerror = () => {
                console.error('Failed to delete task:', request.error);
                reject(request.error);
            };
        });
    }
    
    /**
     * Get total time for all tasks
     * @returns {Promise<number>} Total seconds
     */
    async getTotalTime() {
        const tasks = await this.getAllTasks();
        return tasks.reduce((total, task) => total + (task.duration || 0), 0);
    }
    
    /**
     * Clear all tasks
     * @returns {Promise<void>}
     */
    async clearAll() {
        await this.ensureReady();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const request = store.clear();
            
            request.onsuccess = () => {
                console.log('All tasks cleared');
                resolve();
            };
            
            request.onerror = () => {
                console.error('Failed to clear tasks:', request.error);
                reject(request.error);
            };
        });
    }
}

// Export singleton instance
export const storage = new StorageService();
