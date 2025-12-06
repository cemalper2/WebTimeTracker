/**
 * Task Entry Component
 * Handles task name input with autocomplete
 */

import { taskApi } from '../services/taskApi.js';

export class TaskEntry {
    constructor(options = {}) {
        this.inputElement = options.inputElement;
        this.suggestionsElement = options.suggestionsElement;
        this.onSelect = options.onSelect || (() => {});
        this.debounceTimer = null;
        this.selectedIndex = -1;
        this.suggestions = [];
        this.init();
    }
    
    init() {
        if (!this.inputElement) return;
        this.inputElement.addEventListener('input', (e) => this.handleInput(e));
        this.inputElement.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.inputElement.addEventListener('blur', () => setTimeout(() => this.hideSuggestions(), 150));
        document.addEventListener('click', (e) => {
            if (!this.inputElement.contains(e.target)) this.hideSuggestions();
        });
    }
    
    handleInput(e) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.fetchSuggestions(e.target.value.trim()), 200);
    }
    
    handleKeydown(e) {
        if (!this.suggestions.length) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1); this.updateSelection(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); this.selectedIndex = Math.max(this.selectedIndex - 1, -1); this.updateSelection(); }
        else if (e.key === 'Enter' && this.selectedIndex >= 0) { e.preventDefault(); this.selectSuggestion(this.suggestions[this.selectedIndex]); }
        else if (e.key === 'Escape') this.hideSuggestions();
    }
    
    async fetchSuggestions(query) {
        if (query.length < 2) { this.hideSuggestions(); return; }
        this.suggestions = await taskApi.searchTasks(query);
        this.selectedIndex = -1;
        if (this.suggestions.length) { this.renderSuggestions(); this.showSuggestions(); }
        else this.hideSuggestions();
    }
    
    renderSuggestions() {
        this.suggestionsElement.innerHTML = this.suggestions.map((s, i) => 
            `<div class="suggestion-item${i === this.selectedIndex ? ' active' : ''}" data-index="${i}">
                <span class="icon">📋</span><span>${s.name}</span>
                <span style="margin-left:auto;opacity:0.5;font-size:0.75rem">${s.category || ''}</span>
            </div>`
        ).join('');
        this.suggestionsElement.querySelectorAll('.suggestion-item').forEach((item, i) => {
            item.addEventListener('mousedown', (e) => { e.preventDefault(); this.selectSuggestion(this.suggestions[i]); });
        });
    }
    
    updateSelection() {
        this.suggestionsElement.querySelectorAll('.suggestion-item').forEach((item, i) => 
            item.classList.toggle('active', i === this.selectedIndex));
    }
    
    selectSuggestion(s) { this.inputElement.value = s.name; this.hideSuggestions(); this.onSelect(s); }
    showSuggestions() { this.suggestionsElement.classList.remove('hidden'); }
    hideSuggestions() { this.suggestionsElement.classList.add('hidden'); }
    getValue() { return this.inputElement.value.trim(); }
    clear() { this.inputElement.value = ''; this.hideSuggestions(); }
    focus() { this.inputElement.focus(); }
}
