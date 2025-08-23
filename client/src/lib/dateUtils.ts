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

/**
 * Converts a stored date (UTC) to local datetime-local input format
 * This ensures that datetime-local inputs show the correct local time
 */
export function convertToDateTimeLocalValue(
  date: string | Date | null | undefined
): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Get local timezone offset and adjust the date
    const localDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000));
    
    // Return in the format expected by datetime-local input (YYYY-MM-DDTHH:MM)
    return localDate.toISOString().slice(0, 16);
  } catch (error) {
    console.error('Error converting date to datetime-local value:', error);
    return '';
  }
}

/**
 * Converts a datetime-local input value to a proper Date object
 * This ensures that the selected local time is correctly stored
 */
export function convertFromDateTimeLocalValue(
  value: string
): Date | null {
  if (!value) return null;
  
  try {
    // datetime-local values are in format YYYY-MM-DDTHH:MM
    // Create a Date object treating it as local time
    const localDate = new Date(value);
    
    // If invalid date, return null
    if (isNaN(localDate.getTime())) return null;
    
    return localDate;
  } catch (error) {
    console.error('Error converting datetime-local value to date:', error);
    return null;
  }
}

/**
 * Determines the status of an exam for a student
 */
export function getExamStatus(
  exam: any,
  submissions: any[],
  t?: (key: string, params?: any) => string
): {
  status: 'upcoming' | 'available' | 'expired' | 'completed' | 'in_progress';
  label: string;
  canStart: boolean;
  attemptsUsed: number;
  attemptsRemaining: number;
} {
  const now = new Date();
  const availableFrom = exam.availableFrom ? new Date(exam.availableFrom) : null;
  const availableUntil = exam.availableUntil ? new Date(exam.availableUntil) : null;
  
  // Get student's submissions for this specific exam
  const examSubmissions = submissions?.filter((sub: any) => sub.examId === exam.id) || [];
  const attemptsUsed = examSubmissions.filter((sub: any) => sub.status !== 'in_progress').length;
  
  // Check for in-progress submissions
  const inProgressSubmission = examSubmissions.find((sub: any) => sub.status === 'in_progress');
  
  // Check if student has exhausted all allowed attempts
  const hasAttemptsRemaining = exam.attemptsAllowed === -1 || attemptsUsed < exam.attemptsAllowed;
  const attemptsRemaining = exam.attemptsAllowed === -1 ? 999 : Math.max(0, exam.attemptsAllowed - attemptsUsed);
  
  // Only mark as completed if no attempts remaining OR exam has unlimited attempts but student has submitted
  if (attemptsUsed > 0 && !hasAttemptsRemaining) {
    return {
      status: 'completed',
      label: t ? t('examStatus.completed') : 'Completed',
      canStart: false,
      attemptsUsed,
      attemptsRemaining
    };
  }
  
  // Check if exam is not yet available (upcoming)
  if (availableFrom && now < availableFrom) {
    return {
      status: 'upcoming',
      label: t ? t('examStatus.upcoming') : 'Upcoming',
      canStart: false,
      attemptsUsed,
      attemptsRemaining
    };
  }
  
  // Check if exam deadline has passed
  if (availableUntil && now > availableUntil) {
    // Check if the exam was within the valid scheduled time window
    const wasWithinSchedule = !availableFrom || availableFrom <= now;
    
    // Check if exam is not yet graded (no submissions exist to grade)
    const isNotGraded = attemptsUsed === 0;
    
    // If all conditions are met, mark as completed instead of expired
    if (wasWithinSchedule && hasAttemptsRemaining && isNotGraded) {
      return {
        status: 'completed',
        label: t ? t('examStatus.completed') : 'Completed',
        canStart: false,
        attemptsUsed,
        attemptsRemaining
      };
    }
    
    // Otherwise, mark as expired
    return {
      status: 'expired',
      label: t ? t('examStatus.expired') : 'Expired',
      canStart: false,
      attemptsUsed,
      attemptsRemaining
    };
  }
  
  // Check if there's an in-progress submission (saved progress)
  if (inProgressSubmission && hasAttemptsRemaining) {
    const isExpired = availableUntil && now > availableUntil;
    const isUpcoming = availableFrom && now < availableFrom;
    
    if (!isExpired && !isUpcoming) {
      return {
        status: 'in_progress',
        label: t ? t('examStatus.resumeExam') : 'Resume Exam',
        canStart: true,
        attemptsUsed,
        attemptsRemaining
      };
    }
  }
  
  // Exam is currently available - check if student has attempts remaining
  if (hasAttemptsRemaining) {
    return {
      status: 'available',
      label: attemptsUsed > 0 ? 
        (t ? t('examStatus.availableWithAttempts', { 
          remaining: exam.attemptsAllowed === -1 ? t('examStatus.unlimited') : exam.attemptsAllowed - attemptsUsed 
        }) : `Available (${exam.attemptsAllowed === -1 ? 'Unlimited' : exam.attemptsAllowed - attemptsUsed} attempts remaining)`) 
        : (t ? t('examStatus.available') : 'Available'),
      canStart: true,
      attemptsUsed,
      attemptsRemaining
    };
  } else {
    // Student has used all attempts but exam is still within availability window
    return {
      status: 'completed',
      label: t ? t('examStatus.completed') : 'Completed',
      canStart: false,
      attemptsUsed,
      attemptsRemaining
    };
  }
}