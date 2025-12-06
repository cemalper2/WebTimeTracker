/**
 * Task API Service - Mock implementation for task name suggestions
 * Can be replaced with real API endpoint later
 */

// Mock task database - common work tasks
const MOCK_TASKS = [
    // Development
    { id: 1, name: 'Code Review', category: 'Development' },
    { id: 2, name: 'Bug Fixing', category: 'Development' },
    { id: 3, name: 'Feature Development', category: 'Development' },
    { id: 4, name: 'Code Refactoring', category: 'Development' },
    { id: 5, name: 'Unit Testing', category: 'Development' },
    { id: 6, name: 'Integration Testing', category: 'Development' },
    { id: 7, name: 'Debugging', category: 'Development' },
    { id: 8, name: 'Documentation', category: 'Development' },
    { id: 9, name: 'API Development', category: 'Development' },
    { id: 10, name: 'Database Design', category: 'Development' },
    
    // Meetings
    { id: 11, name: 'Team Standup', category: 'Meetings' },
    { id: 12, name: 'Sprint Planning', category: 'Meetings' },
    { id: 13, name: 'Sprint Retrospective', category: 'Meetings' },
    { id: 14, name: 'Client Meeting', category: 'Meetings' },
    { id: 15, name: 'One-on-One', category: 'Meetings' },
    { id: 16, name: 'Team Sync', category: 'Meetings' },
    { id: 17, name: 'Project Kickoff', category: 'Meetings' },
    { id: 18, name: 'Design Review', category: 'Meetings' },
    
    // Planning
    { id: 19, name: 'Requirements Analysis', category: 'Planning' },
    { id: 20, name: 'Technical Planning', category: 'Planning' },
    { id: 21, name: 'Estimation', category: 'Planning' },
    { id: 22, name: 'Backlog Grooming', category: 'Planning' },
    { id: 23, name: 'Research', category: 'Planning' },
    { id: 24, name: 'Prototyping', category: 'Planning' },
    
    // Communication
    { id: 25, name: 'Email', category: 'Communication' },
    { id: 26, name: 'Slack/Chat', category: 'Communication' },
    { id: 27, name: 'Code PR Comments', category: 'Communication' },
    { id: 28, name: 'Technical Support', category: 'Communication' },
    
    // DevOps
    { id: 29, name: 'Deployment', category: 'DevOps' },
    { id: 30, name: 'Server Maintenance', category: 'DevOps' },
    { id: 31, name: 'CI/CD Pipeline', category: 'DevOps' },
    { id: 32, name: 'Monitoring', category: 'DevOps' },
    { id: 33, name: 'Infrastructure Setup', category: 'DevOps' },
    
    // Learning
    { id: 34, name: 'Training', category: 'Learning' },
    { id: 35, name: 'Reading Documentation', category: 'Learning' },
    { id: 36, name: 'Online Course', category: 'Learning' },
    { id: 37, name: 'Knowledge Sharing', category: 'Learning' },
    
    // Admin
    { id: 38, name: 'Time Tracking', category: 'Admin' },
    { id: 39, name: 'Status Report', category: 'Admin' },
    { id: 40, name: 'Break', category: 'Admin' }
];

class TaskApiService {
    constructor() {
        // Configuration - can be updated to use real API
        this.useRealApi = false;
        this.apiEndpoint = null; // Set your API endpoint here
        this.minSearchLength = 2;
    }
    
    /**
     * Configure the service to use a real API
     * @param {string} endpoint - API endpoint URL
     */
    configureApi(endpoint) {
        this.apiEndpoint = endpoint;
        this.useRealApi = true;
    }
    
    /**
     * Search for task suggestions
     * @param {string} query - Search query
     * @returns {Promise<Array>} Array of suggestions
     */
    async searchTasks(query) {
        if (!query || query.length < this.minSearchLength) {
            return [];
        }
        
        if (this.useRealApi && this.apiEndpoint) {
            return this.fetchFromApi(query);
        }
        
        return this.searchMockTasks(query);
    }
    
    /**
     * Fetch suggestions from real API
     * @param {string} query - Search query
     * @returns {Promise<Array>} Array of suggestions
     */
    async fetchFromApi(query) {
        try {
            const url = new URL(this.apiEndpoint);
            url.searchParams.set('q', query);
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Normalize response - adapt this based on your actual API response format
            return this.normalizeApiResponse(data);
        } catch (error) {
            console.warn('API request failed, falling back to mock data:', error);
            return this.searchMockTasks(query);
        }
    }
    
    /**
     * Normalize API response to expected format
     * @param {Object} data - API response
     * @returns {Array} Normalized suggestions
     */
    normalizeApiResponse(data) {
        // Adapt this based on your actual API response format
        // Expected format: { suggestions: [{ id, name, category? }] }
        if (Array.isArray(data)) {
            return data.map(item => ({
                id: item.id || item.name,
                name: item.name || item.title || item.label,
                category: item.category || item.type || 'General'
            }));
        }
        
        if (data.suggestions) {
            return this.normalizeApiResponse(data.suggestions);
        }
        
        if (data.results) {
            return this.normalizeApiResponse(data.results);
        }
        
        return [];
    }
    
    /**
     * Search mock tasks locally
     * @param {string} query - Search query
     * @returns {Array} Matching tasks
     */
    searchMockTasks(query) {
        const lowerQuery = query.toLowerCase();
        
        // Score and sort by relevance
        const results = MOCK_TASKS
            .map(task => {
                const lowerName = task.name.toLowerCase();
                const lowerCategory = task.category.toLowerCase();
                
                let score = 0;
                
                // Exact match at start
                if (lowerName.startsWith(lowerQuery)) {
                    score += 100;
                }
                // Word starts with query
                else if (lowerName.split(' ').some(word => word.startsWith(lowerQuery))) {
                    score += 50;
                }
                // Contains query
                else if (lowerName.includes(lowerQuery)) {
                    score += 25;
                }
                // Category match
                else if (lowerCategory.includes(lowerQuery)) {
                    score += 10;
                }
                
                return { ...task, score };
            })
            .filter(task => task.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8); // Limit to 8 suggestions
        
        // Simulate network delay
        return new Promise(resolve => {
            setTimeout(() => resolve(results), 50);
        });
    }
    
    /**
     * Get all available categories
     * @returns {Array<string>} Category names
     */
    getCategories() {
        const categories = new Set(MOCK_TASKS.map(t => t.category));
        return Array.from(categories);
    }
}

// Export singleton instance
export const taskApi = new TaskApiService();
