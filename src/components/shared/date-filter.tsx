"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar, X, Check } from "lucide-react";
import {
  formatDateForInput,
  formatDateDisplay,
  validateDateRange,
  getFilterLabel,
} from "@/lib/workorder-utils";
import { cn } from "@/lib/utils";

interface DateFilterProps {
  onFilterChange: (filterType: string, fromDate?: Date, toDate?: Date) => void;
  initialFilterType?: string;
  ticketCount?: number;
}

type FilterType = "none" | "today" | "specific" | "range";

export function DateFilter({
  onFilterChange,
  initialFilterType = "none",
  ticketCount,
}: DateFilterProps) {
  const [filterType, setFilterType] = useState<FilterType>(
    (initialFilterType as FilterType) || "none"
  );
  const [specificDate, setSpecificDate] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string>("");

  // Calculate display label
  const displayLabel = useMemo(() => {
    if (filterType === "today") return "Today";
    if (filterType === "specific" && specificDate) {
      const date = new Date(specificDate);
      return formatDateDisplay(date);
    }
    if (filterType === "range" && fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      return `${formatDateDisplay(from)} - ${formatDateDisplay(to)}`;
    }
    return "Date Filter";
  }, [filterType, specificDate, fromDate, toDate]);

  // Handle Today button
  const handleToday = useCallback(() => {
    setFilterType("today");
    setError("");
    onFilterChange("today");
    setIsOpen(false);
  }, [onFilterChange]);

  // Handle Specific Date
  const handleSpecificDate = useCallback(() => {
    if (!specificDate) {
      setError("Please select a date");
      return;
    }
    setFilterType("specific");
    setError("");
    const date = new Date(specificDate);
    onFilterChange("specific", date);
    setIsOpen(false);
  }, [specificDate, onFilterChange]);

  // Handle Date Range
  const handleDateRange = useCallback(() => {
    if (!fromDate || !toDate) {
      setError("Please enter both from and to dates");
      return;
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    const validation = validateDateRange(from, to);

    if (!validation.valid) {
      setError(validation.error || "Invalid date range");
      return;
    }

    setFilterType("range");
    setError("");
    onFilterChange("range", from, to);
    setIsOpen(false);
  }, [fromDate, toDate, onFilterChange]);

  // Clear filter
  const handleClear = useCallback(() => {
    setFilterType("none");
    setSpecificDate("");
    setFromDate("");
    setToDate("");
    setError("");
    onFilterChange("none");
    setIsOpen(false);
  }, [onFilterChange]);

  // Get active state indicator
  const isActive = filterType !== "none";

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={isActive ? "default" : "outline"}
            size="sm"
            className={cn(
              "gap-2",
              isActive && "bg-primary text-primary-foreground"
            )}
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">{displayLabel}</span>
            {isActive && <Check className="h-3 w-3" />}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            {/* Header */}
            <div>
              <h3 className="text-sm font-semibold">Filter by Date</h3>
              {ticketCount !== undefined && (
                <p className="text-xs text-muted-foreground mt-1">
                  Showing: {ticketCount} tickets
                </p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            {/* Today Button */}
            <div>
              <Button
                onClick={handleToday}
                variant={filterType === "today" ? "default" : "outline"}
                className="w-full justify-start"
                size="sm"
              >
                <Check className="h-4 w-4 mr-2" />
                Today
              </Button>
            </div>

            {/* Divider */}
            <div className="border-t"></div>

            {/* Specific Date */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Specific Date</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={specificDate}
                  onChange={(e) => {
                    setSpecificDate(e.target.value);
                    setError("");
                  }}
                  className="text-sm"
                />
                <Button
                  onClick={handleSpecificDate}
                  variant={filterType === "specific" ? "default" : "outline"}
                  size="sm"
                  className="px-3"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t"></div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Date Range</Label>
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground">From:</span>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setError("");
                    }}
                    className="text-sm"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground">To:</span>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setError("");
                    }}
                    className="text-sm"
                  />
                </div>
              </div>
              <Button
                onClick={handleDateRange}
                variant={filterType === "range" ? "default" : "outline"}
                className="w-full justify-center"
                size="sm"
              >
                <Check className="h-4 w-4 mr-2" />
                Apply Range
              </Button>
            </div>

            {/* Divider */}
            <div className="border-t"></div>

            {/* Clear Button */}
            {isActive && (
              <Button
                onClick={handleClear}
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filter
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Quick clear button when filter is active */}
      {isActive && (
        <Button
          onClick={handleClear}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Clear date filter"
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {/* Filter status text */}
      {isActive && (
        <span className="text-xs text-muted-foreground">
          Filtered by: <span className="font-medium">{displayLabel}</span>
        </span>
      )}
    </div>
  );
}
