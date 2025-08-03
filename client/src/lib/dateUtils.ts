/**
 * Date utility functions for handling Eastern Time formatting
 */

/**
 * Formats a date in Eastern Time
 * @param date - Date to format (can be string, Date, or null/undefined)
 * @param options - Formatting options
 * @returns Formatted date string in Eastern Time
 */
export function formatEasternTime(
  date: string | Date | null | undefined,
  options: {
    includeTime?: boolean;
    includeDate?: boolean;
    includeSeconds?: boolean;
    format?: 'short' | 'long' | 'medium';
  } = {}
): string {
  if (!date) return 'Not submitted';
  
  const {
    includeTime = true,
    includeDate = true,
    includeSeconds = false,
    format = 'medium'
  } = options;

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Create formatter for Eastern Time
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: includeDate ? 'numeric' : undefined,
      month: includeDate ? (format === 'short' ? 'numeric' : format === 'long' ? 'long' : 'short') : undefined,
      day: includeDate ? 'numeric' : undefined,
      hour: includeTime ? 'numeric' : undefined,
      minute: includeTime ? '2-digit' : undefined,
      second: includeTime && includeSeconds ? '2-digit' : undefined,
      hour12: includeTime,
    });

    return formatter.format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Formats a date for display in submission lists
 */
export function formatSubmissionTime(date: string | Date | null | undefined): string {
  return formatEasternTime(date, { 
    includeTime: true, 
    includeDate: true, 
    format: 'medium',
    includeSeconds: false 
  });
}

/**
 * Formats a date for detailed submission view
 */
export function formatDetailedSubmissionTime(date: string | Date | null | undefined): string {
  return formatEasternTime(date, { 
    includeTime: true, 
    includeDate: true, 
    format: 'long',
    includeSeconds: true 
  });
}

/**
 * Gets the current time in Eastern Time for display
 */
export function getCurrentEasternTime(): string {
  return formatEasternTime(new Date(), {
    includeTime: true,
    includeDate: true,
    format: 'medium'
  });
}

/**
 * Calculates and formats the duration between start and submission times
 */
export function formatSubmissionDuration(
  startedAt: string | Date | null | undefined,
  submittedAt: string | Date | null | undefined
): string {
  if (!startedAt || !submittedAt) return 'N/A';
  
  try {
    const start = new Date(startedAt);
    const end = new Date(submittedAt);
    const durationMs = end.getTime() - start.getTime();
    
    if (durationMs < 0) return 'Invalid duration';
    
    const minutes = Math.floor(durationMs / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 'Invalid duration';
  }
}