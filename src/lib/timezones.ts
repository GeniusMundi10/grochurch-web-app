/**
 * Common timezones list for timezone selector dropdowns.
 * Uses IANA timezone identifiers.
 */

export const COMMON_TIMEZONES = [
    // Americas
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { value: 'America/Anchorage', label: 'Alaska' },
    { value: 'Pacific/Honolulu', label: 'Hawaii' },
    { value: 'America/Toronto', label: 'Eastern Time (Canada)' },
    { value: 'America/Vancouver', label: 'Pacific Time (Canada)' },
    { value: 'America/Mexico_City', label: 'Mexico City' },
    { value: 'America/Sao_Paulo', label: 'Sao Paulo (Brazil)' },
    { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires' },

    // Europe
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris / Berlin / Rome' },
    { value: 'Europe/Amsterdam', label: 'Amsterdam' },
    { value: 'Europe/Madrid', label: 'Madrid' },
    { value: 'Europe/Zurich', label: 'Zurich / Bern' },
    { value: 'Europe/Moscow', label: 'Moscow' },
    { value: 'Europe/Istanbul', label: 'Istanbul' },

    // Asia
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Dubai', label: 'Dubai / Abu Dhabi' },
    { value: 'Asia/Singapore', label: 'Singapore' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
    { value: 'Asia/Tokyo', label: 'Tokyo / Osaka' },
    { value: 'Asia/Seoul', label: 'Seoul' },
    { value: 'Asia/Shanghai', label: 'Beijing / Shanghai' },
    { value: 'Asia/Jakarta', label: 'Jakarta' },
    { value: 'Asia/Bangkok', label: 'Bangkok' },
    { value: 'Asia/Karachi', label: 'Karachi' },
    { value: 'Asia/Dhaka', label: 'Dhaka' },

    // Pacific / Australia
    { value: 'Australia/Sydney', label: 'Sydney / Melbourne' },
    { value: 'Australia/Perth', label: 'Perth' },
    { value: 'Australia/Brisbane', label: 'Brisbane' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZ)' },

    // Africa / Middle East
    { value: 'Africa/Johannesburg', label: 'Johannesburg' },
    { value: 'Africa/Cairo', label: 'Cairo' },
    { value: 'Africa/Lagos', label: 'Lagos' },
    { value: 'Asia/Riyadh', label: 'Riyadh' },
    { value: 'Asia/Jerusalem', label: 'Jerusalem / Tel Aviv' },

    // UTC
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
] as const;

export type TimezoneValue = (typeof COMMON_TIMEZONES)[number]['value'];

/**
 * Get user's browser timezone
 */
export function getBrowserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        return 'UTC';
    }
}

/**
 * Find the closest matching timezone from our list
 */
export function findMatchingTimezone(browserTz: string): string {
    const match = COMMON_TIMEZONES.find(tz => tz.value === browserTz);
    if (match) return match.value;

    // Try to find by region prefix (e.g., America/, Europe/)
    const region = browserTz.split('/')[0];
    const regionMatch = COMMON_TIMEZONES.find(tz => tz.value.startsWith(region + '/'));
    return regionMatch?.value || 'UTC';
}
