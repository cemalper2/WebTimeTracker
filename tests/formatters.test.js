/**
 * Unit tests for utils/formatters.js
 */

import { 
    formatTime, 
    parseTime, 
    formatDuration, 
    formatDate,
    formatTimeOfDay,
    generateId 
} from '../utils/formatters.js';

describe('formatTime', () => {
    test('formats 0 seconds correctly', () => {
        const result = formatTime(0);
        expect(result.hours).toBe('00');
        expect(result.minutes).toBe('00');
        expect(result.seconds).toBe('00');
        expect(result.formatted).toBe('00:00:00');
    });

    test('formats 61 seconds correctly', () => {
        const result = formatTime(61);
        expect(result.hours).toBe('00');
        expect(result.minutes).toBe('01');
        expect(result.seconds).toBe('01');
        expect(result.formatted).toBe('00:01:01');
    });

    test('formats 3661 seconds (1:01:01) correctly', () => {
        const result = formatTime(3661);
        expect(result.hours).toBe('01');
        expect(result.minutes).toBe('01');
        expect(result.seconds).toBe('01');
        expect(result.formatted).toBe('01:01:01');
    });

    test('formats large values (10+ hours) correctly', () => {
        const result = formatTime(36000); // 10 hours
        expect(result.hours).toBe('10');
        expect(result.minutes).toBe('00');
        expect(result.seconds).toBe('00');
    });

    test('pads single digit values with leading zeros', () => {
        const result = formatTime(3723); // 1:02:03
        expect(result.hours).toBe('01');
        expect(result.minutes).toBe('02');
        expect(result.seconds).toBe('03');
    });
});

describe('parseTime', () => {
    test('parses HH:MM:SS format', () => {
        expect(parseTime('01:30:00')).toBe(5400);
        expect(parseTime('00:01:30')).toBe(90);
        expect(parseTime('10:00:00')).toBe(36000);
    });

    test('parses MM:SS format', () => {
        expect(parseTime('30:00')).toBe(1800);
        expect(parseTime('01:30')).toBe(90);
        expect(parseTime('00:45')).toBe(45);
    });

    test('parses single number as seconds', () => {
        expect(parseTime('90')).toBe(90);
        expect(parseTime('0')).toBe(0);
    });

    test('handles invalid input gracefully', () => {
        expect(parseTime('abc')).toBe(0);
        expect(parseTime('')).toBe(0);
    });
});

describe('formatDuration', () => {
    test('formats 0 seconds as 0m', () => {
        expect(formatDuration(0)).toBe('0m');
    });

    test('formats minutes only (less than 1 hour)', () => {
        expect(formatDuration(300)).toBe('5m');
        expect(formatDuration(1800)).toBe('30m');
        expect(formatDuration(3599)).toBe('59m');
    });

    test('formats hours and minutes', () => {
        expect(formatDuration(3600)).toBe('1h 0m');
        expect(formatDuration(5400)).toBe('1h 30m');
        expect(formatDuration(7200)).toBe('2h 0m');
    });

    test('rounds down partial minutes', () => {
        expect(formatDuration(90)).toBe('1m');
        expect(formatDuration(119)).toBe('1m');
    });
});

describe('formatDate', () => {
    test('returns "Today" for today\'s date', () => {
        const today = new Date();
        expect(formatDate(today)).toBe('Today');
    });

    test('returns "Yesterday" for yesterday\'s date', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        expect(formatDate(yesterday)).toBe('Yesterday');
    });

    test('returns formatted date for older dates', () => {
        const oldDate = new Date('2024-01-15');
        const result = formatDate(oldDate);
        // Should contain the day and month
        expect(result).toMatch(/Mon|Jan|15/);
    });
});

describe('formatTimeOfDay', () => {
    test('formats time correctly in 24-hour format', () => {
        const date = new Date('2024-01-15T14:30:00');
        const result = formatTimeOfDay(date);
        expect(result).toBe('14:30');
    });

    test('formats midnight correctly', () => {
        const date = new Date('2024-01-15T00:00:00');
        const result = formatTimeOfDay(date);
        // Some locales return 24:00, others 00:00
        expect(['00:00', '24:00']).toContain(result);
    });

    test('formats noon correctly', () => {
        const date = new Date('2024-01-15T12:00:00');
        const result = formatTimeOfDay(date);
        expect(result).toBe('12:00');
    });
});

describe('generateId', () => {
    test('generates a string ID', () => {
        const id = generateId();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
    });

    test('generates unique IDs', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
            ids.add(generateId());
        }
        expect(ids.size).toBe(100);
    });
});
