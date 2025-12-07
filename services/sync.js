/**
 * Sync Service
 * 
 * Supports two modes:
 * 1. HTTP Mode: When config.json has syncServerUrl set, uses real HTTP endpoints
 * 2. Mock Mode: Falls back to IndexedDB-based mock server (offline/demo)
 */

const MOCK_DB_NAME = 'TimeTrackerMockServer';
const MOCK_STORE_NAME = 'tasks';
const MOCK_DB_VERSION = 1;

class SyncService {
    constructor() {
        this.serverUrl = null;
        this.useHttpMode = false;
        this.mockDb = null;
        this.readyPromise = this.init();
    }

    async init() {
        // Try to load config
        try {
            const response = await fetch('./config.json');
            if (response.ok) {
                const config = await response.json();
                if (config.syncServerUrl && config.syncEnabled !== false) {
                    this.serverUrl = config.syncServerUrl;
                    this.useHttpMode = true;
                    console.log('[Sync] Using HTTP mode:', this.serverUrl);
                    
                    // Verify server is reachable
                    try {
                        const health = await fetch(`${this.serverUrl}/health`);
                        if (!health.ok) {
                            console.warn('[Sync] Server not reachable, falling back to mock');
                            this.useHttpMode = false;
                        }
                    } catch (e) {
                        console.warn('[Sync] Server connection failed, falling back to mock:', e.message);
                        this.useHttpMode = false;
                    }
                }
            }
        } catch (e) {
            console.log('[Sync] No config.json found, using mock mode');
        }

        // Initialize mock DB if not using HTTP
        if (!this.useHttpMode) {
            await this.initMockDb();
        }
    }

    async initMockDb() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(MOCK_DB_NAME, MOCK_DB_VERSION);

            request.onerror = (event) => {
                console.error('MockServer DB error:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.mockDb = event.target.result;
                console.log('[Sync] Using IndexedDB mock mode');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(MOCK_STORE_NAME)) {
                    db.createObjectStore(MOCK_STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    }

    async ensureReady() {
        await this.readyPromise;
    }

    /**
     * GET /tasks?date=YYYY-MM-DD
     * @param {string} dateString 
     * @returns {Promise<Array>}
     */
    async fetchServerTasks(dateString) {
        await this.ensureReady();

        if (this.useHttpMode) {
            try {
                const url = dateString 
                    ? `${this.serverUrl}/api/tasks?date=${dateString}`
                    : `${this.serverUrl}/api/tasks`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (e) {
                console.error('[Sync] HTTP fetch failed:', e);
                return [];
            }
        }

        // Mock mode
        await new Promise(r => setTimeout(r, 500)); // Simulate delay

        return new Promise((resolve, reject) => {
            const transaction = this.mockDb.transaction([MOCK_STORE_NAME], 'readonly');
            const store = transaction.objectStore(MOCK_STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const allTasks = request.result;
                const tasksForDate = allTasks.filter(t => t.sessionDate === dateString);
                resolve(tasksForDate);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * POST /tasks - Create or update task
     * @param {Object} task 
     * @returns {Promise<Object>}
     */
    async postTask(task) {
        await this.ensureReady();

        if (this.useHttpMode) {
            try {
                const response = await fetch(`${this.serverUrl}/api/tasks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(task)
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (e) {
                console.error('[Sync] HTTP post failed:', e);
                throw e;
            }
        }

        // Mock mode
        await new Promise(r => setTimeout(r, 300));

        return new Promise((resolve, reject) => {
            const transaction = this.mockDb.transaction([MOCK_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(MOCK_STORE_NAME);
            const request = store.put(task);

            request.onsuccess = () => {
                console.log('Mock Server: Received task', task.id);
                resolve(task);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * GET /tasks/:id - Get single task
     * @param {string} id
     * @returns {Promise<Object>}
     */
    async getServerTask(id) {
        await this.ensureReady();

        if (this.useHttpMode) {
            try {
                const response = await fetch(`${this.serverUrl}/api/tasks/${id}`);
                if (response.status === 404) return null;
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (e) {
                console.error('[Sync] HTTP get task failed:', e);
                return null;
            }
        }

        // Mock mode
        await new Promise(r => setTimeout(r, 200));

        return new Promise((resolve, reject) => {
            const transaction = this.mockDb.transaction([MOCK_STORE_NAME], 'readonly');
            const store = transaction.objectStore(MOCK_STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * DELETE /tasks/:id - Delete task from server
     * @param {string} id
     * @returns {Promise<void>}
     */
    async deleteServerTask(id) {
        await this.ensureReady();

        if (this.useHttpMode) {
            try {
                const response = await fetch(`${this.serverUrl}/api/tasks/${id}`, {
                    method: 'DELETE'
                });
                if (!response.ok && response.status !== 404) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return;
            } catch (e) {
                console.error('[Sync] HTTP delete failed:', e);
                throw e;
            }
        }

        // Mock mode
        await new Promise(r => setTimeout(r, 200));

        return new Promise((resolve, reject) => {
            const transaction = this.mockDb.transaction([MOCK_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(MOCK_STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get ALL tasks from server (no date filter)
     * @returns {Promise<Array>}
     */
    async getAllServerTasks() {
        await this.ensureReady();

        if (this.useHttpMode) {
            try {
                const response = await fetch(`${this.serverUrl}/api/tasks`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const tasks = await response.json();
                console.log('Server Total Tasks:', tasks.length);
                tasks.forEach(t => {
                    console.log(`  - ${t.name} (${t.sessionDate}): ${t.duration}s`);
                });
                return tasks;
            } catch (e) {
                console.error('[Sync] HTTP get all failed:', e);
                return [];
            }
        }

        // Mock mode
        return new Promise((resolve, reject) => {
            const transaction = this.mockDb.transaction([MOCK_STORE_NAME], 'readonly');
            const store = transaction.objectStore(MOCK_STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                console.log('Mock Server Total Tasks:', request.result.length);
                request.result.forEach(t => {
                    console.log(`  - ${t.name} (${t.sessionDate}): ${t.duration}s`);
                });
                resolve(request.result);
            };
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

        const isDurationMatch = local.duration === server.duration;
        const isNameMatch = local.name === server.name;
        
        const localLogs = local.timerLogs || [];
        const serverLogs = server.timerLogs || [];
        const isLogsCountMatch = localLogs.length === serverLogs.length;

        if (isDurationMatch && isNameMatch && isLogsCountMatch) {
            return 'consistent';
        }
        return 'inconsistent';
    }

    /**
     * Clear all server data
     */
    async clearServer() {
        await this.ensureReady();

        if (this.useHttpMode) {
            try {
                const response = await fetch(`${this.serverUrl}/api/tasks/clear`, {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                console.log('Server:', result.message);
                return;
            } catch (e) {
                console.error('[Sync] HTTP clear failed:', e);
                throw e;
            }
        }

        // Mock mode
        return new Promise((resolve, reject) => {
            const transaction = this.mockDb.transaction([MOCK_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(MOCK_STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('Mock Server: All data cleared');
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Seed server with sample data
     */
    async seedServer() {
        await this.ensureReady();

        if (this.useHttpMode) {
            try {
                const response = await fetch(`${this.serverUrl}/api/tasks/seed`, {
                    method: 'POST'
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                console.log('Server:', result.message);
                return;
            } catch (e) {
                console.error('[Sync] HTTP seed failed:', e);
                throw e;
            }
        }

        // Mock mode - generate sample data locally
        const now = new Date();
        const taskNames = [
            'Morning Standup', 'Code Review', 'Feature Development',
            'Bug Fixes', 'Documentation', 'Team Meeting', 'Design Session',
            'Testing', 'Deployment', 'Research', 'Learning', 'Planning',
            'Client Call', 'Refactoring', 'Performance Optimization'
        ];

        const sampleTasks = [];
        
        for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
            const date = new Date(now);
            date.setDate(date.getDate() - daysAgo);
            const dateString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
                .toISOString()
                .split('T')[0];
            
            const tasksPerDay = Math.floor(Math.random() * 4) + 2;
            
            for (let i = 0; i < tasksPerDay; i++) {
                const name = taskNames[Math.floor(Math.random() * taskNames.length)];
                const duration = Math.floor(Math.random() * 7200) + 900;
                
                sampleTasks.push({
                    id: `seed_${dateString}_${i}`,
                    name,
                    duration,
                    sessionDate: dateString,
                    createdAt: date.getTime() - (i * 3600000),
                    timerLogs: []
                });
            }
        }

        return new Promise((resolve, reject) => {
            const transaction = this.mockDb.transaction([MOCK_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(MOCK_STORE_NAME);
            
            for (const task of sampleTasks) {
                store.put(task);
            }
            
            transaction.oncomplete = () => {
                console.log(`Mock Server: Seeded with ${sampleTasks.length} tasks across 30 days`);
                resolve(sampleTasks);
            };
            
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Check if using HTTP mode
     * @returns {boolean}
     */
    isHttpMode() {
        return this.useHttpMode;
    }

    /**
     * Get server URL if in HTTP mode
     * @returns {string|null}
     */
    getServerUrl() {
        return this.serverUrl;
    }
}

export const syncService = new SyncService();
