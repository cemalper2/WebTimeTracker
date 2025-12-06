/**
 * Mock Sync Service
 * Simulates a remote API using a separate IndexedDB database 'TimeTrackerMockServer'
 */

const DB_NAME = 'TimeTrackerMockServer';
const STORE_NAME = 'tasks';
const DB_VERSION = 1;

class MockSyncService {
    constructor() {
        this.db = null;
        this.readyPromise = this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('MockServer DB error:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    }

    async ensureReady() {
        await this.readyPromise;
    }

    /**
     * Simulate GET /tasks?date=YYYY-MM-DD
     * @param {string} dateString 
     * @returns {Promise<Array>}
     */
    async fetchServerTasks(dateString) {
        await this.ensureReady();
        // Simulate network delay
        await new Promise(r => setTimeout(r, 500));

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const allTasks = request.result;
                // Filter by date (simulating server-side filter)
                const tasksForDate = allTasks.filter(t => t.sessionDate === dateString);
                resolve(tasksForDate);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Simulate POST /tasks
     * @param {Object} task 
     * @returns {Promise<Object>}
     */
    async postTask(task) {
        await this.ensureReady();
        await new Promise(r => setTimeout(r, 300)); // Network delay simulation

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(task); // Upsert

            request.onsuccess = () => {
                console.log('Mock Server: Received task', task.id);
                resolve(task);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get single task from server
     * @param {string} id
     * @returns {Promise<Object>}
     */
    async getServerTask(id) {
        await this.ensureReady();
        await new Promise(r => setTimeout(r, 200));

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Compare local task with server task
     * @param {Object} local 
     * @param {Object|undefined} server 
     * @returns {string} 'consistent' | 'inconsistent' | 'missing'
     */
    compareTasks(local, server) {
        if (!server) return 'missing';

        // Check critical fields
        const isDurationMatch = local.duration === server.duration;
        const isNameMatch = local.name === server.name;
        
        // Timer logs comparison (check start/end times matches)
        const localLogs = local.timerLogs || [];
        const serverLogs = server.timerLogs || [];
        const isLogsCountMatch = localLogs.length === serverLogs.length;

        if (isDurationMatch && isNameMatch && isLogsCountMatch) {
            return 'consistent';
        }
        return 'inconsistent';
    }
}

export const syncService = new MockSyncService();
