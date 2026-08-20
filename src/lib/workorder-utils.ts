// Techadox Integrated Field Coordinator Portal
// Utility functions for work order task IDs and date filtering
// Human-built system.

/**
 * Validates a single task ID format
 * Allowed: alphanumeric, hyphens, underscores
 * Examples: TASK-001, TASK_001, TASK001, task-123
 */
export function validateTaskId(taskId: string): boolean {
  if (!taskId || typeof taskId !== "string") return false;
  const trimmed = taskId.trim();
  if (trimmed.length === 0 || trimmed.length > 50) return false;
  // Allow alphanumeric, hyphens, underscores
  return /^[a-zA-Z0-9\-_]+$/.test(trimmed);
}

/**
 * Validates an array of task IDs
 * Checks format and uniqueness
 */
export function validateTaskIds(taskIds: string[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(taskIds)) {
    return { valid: false, errors: ["Task IDs must be an array"] };
  }

  if (taskIds.length === 0) {
    return { valid: false, errors: ["At least one task ID is required"] };
  }

  if (taskIds.length > 40) {
    return {
      valid: false,
      errors: [`Maximum 40 task IDs allowed (${taskIds.length} provided)`],
    };
  }

  const seen = new Set<string>();
  const duplicates: string[] = [];

  taskIds.forEach((id, index) => {
    if (!validateTaskId(id)) {
      errors.push(
        `Task ID at position ${index + 1} is invalid: "${id}". Allowed characters: alphanumeric, hyphens, underscores`
      );
    }

    const normalized = id.trim().toUpperCase();
    if (seen.has(normalized)) {
      duplicates.push(id);
    }
    seen.add(normalized);
  });

  if (duplicates.length > 0) {
    errors.push(`Duplicate task IDs found: ${duplicates.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse task IDs from string (comma/newline separated)
 * Returns trimmed, non-empty values
 */
export function parseTaskIdsFromString(input: string): string[] {
  if (!input) return [];
  return input
    .split(/[\n,;]/)
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/**
 * Format task IDs for display
 */
export function formatTaskIds(taskIds: string[] | null | undefined): string {
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return "None";
  }
  return taskIds.join(", ");
}

/**
 * Add a task ID to existing array
 * Returns new array or error
 */
export function addTaskId(
  currentIds: string[],
  newId: string
): { success: boolean; data?: string[]; error?: string } {
  if (!validateTaskId(newId)) {
    return {
      success: false,
      error: `Invalid task ID format: "${newId}". Use alphanumeric, hyphens, or underscores.`,
    };
  }

  const normalized = newId.trim().toUpperCase();
  const exists = currentIds.some((id) => id.toUpperCase() === normalized);

  if (exists) {
    return {
      success: false,
      error: `Task ID "${newId}" already exists.`,
    };
  }

  if (currentIds.length >= 40) {
    return {
      success: false,
      error: "Maximum 40 task IDs reached.",
    };
  }

  return {
    success: true,
    data: [...currentIds, newId],
  };
}

/**
 * Remove a task ID from array
 */
export function removeTaskId(
  currentIds: string[],
  idToRemove: string
): string[] {
  return currentIds.filter(
    (id) => id.toUpperCase() !== idToRemove.toUpperCase()
  );
}

/**
 * Get date range for "today"
 */
export function getTodayRange(): {
  start: Date;
  end: Date;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  return {
    start: today,
    end: endOfDay,
  };
}

/**
 * Get date range for a specific date
 */
export function getDateRange(date: Date): {
  start: Date;
  end: Date;
} {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Validate date range
 */
export function validateDateRange(from: Date, to: Date): {
  valid: boolean;
  error?: string;
} {
  if (from > to) {
    return {
      valid: false,
      error: "Start date cannot be after end date",
    };
  }

  return { valid: true };
}

/**
 * Format date for display
 */
export function formatDateDisplay(date: Date | null | undefined): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format date for filter input (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  const checkDate = new Date(date);

  return (
    today.getFullYear() === checkDate.getFullYear() &&
    today.getMonth() === checkDate.getMonth() &&
    today.getDate() === checkDate.getDate()
  );
}

/**
 * Check if a date is in the future
 */
export function isFutureDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate > today;
}

/**
 * Get the next X days including today
 */
export function getNextNDays(n: number): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < n; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);
    dates.push(date);
  }
  return dates;
}

/**
 * Filter work orders by date range
 * Used for database queries
 */
export function buildDateRangeQuery(filterType: string, fromDate?: Date, toDate?: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  switch (filterType) {
    case "today":
      return {
        gte: today,
        lte: endOfToday,
      };

    case "specific":
      if (!fromDate) throw new Error("From date required for specific date filter");
      const startDate = new Date(fromDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(fromDate);
      endDate.setHours(23, 59, 59, 999);
      return {
        gte: startDate,
        lte: endDate,
      };

    case "range":
      if (!fromDate || !toDate) {
        throw new Error("Both from and to dates required for range filter");
      }
      const rangeStart = new Date(fromDate);
      rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd = new Date(toDate);
      rangeEnd.setHours(23, 59, 59, 999);
      return {
        gte: rangeStart,
        lte: rangeEnd,
      };

    default:
      return null;
  }
}

/**
 * Get filter label for display
 */
export function getFilterLabel(
  filterType: string,
  fromDate?: Date,
  toDate?: Date
): string {
  switch (filterType) {
    case "today":
      return "Today";

    case "specific":
      return fromDate ? `${formatDateDisplay(fromDate)}` : "Specific Date";

    case "range":
      if (fromDate && toDate) {
        return `${formatDateDisplay(fromDate)} - ${formatDateDisplay(toDate)}`;
      }
      return "Date Range";

    default:
      return "No Filter";
  }
}
