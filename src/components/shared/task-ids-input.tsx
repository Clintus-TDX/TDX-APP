"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, AlertCircle, CheckCircle } from "lucide-react";
import {
  validateTaskId,
  parseTaskIdsFromString,
  removeTaskId as removeTaskIdUtil,
} from "@/lib/workorder-utils";
import { cn } from "@/lib/utils";

interface TaskIdsInputProps {
  taskIds: string[];
  onTaskIdsChange: (taskIds: string[]) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  placeholder?: string;
  showCounter?: boolean;
  maxTasks?: number;
}

export function TaskIdsInput({
  taskIds,
  onTaskIdsChange,
  disabled = false,
  label = "Task IDs",
  description = "Add task IDs (1-40). Supported formats: alphanumeric, hyphens, underscores.",
  placeholder = "Enter task ID (e.g., TASK-001) or paste multiple separated by commas or newlines",
  showCounter = true,
  maxTasks = 40,
}: TaskIdsInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [bulkInput, setbulkInput] = useState("");
  const [error, setError] = useState<string>("");
  const [showBulkMode, setShowBulkMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Calculate remaining slots
  const remainingSlots = useMemo(() => maxTasks - taskIds.length, [taskIds, maxTasks]);
  const isFull = remainingSlots <= 0;

  // Clear messages after delay
  const clearMessages = useCallback(() => {
    setTimeout(() => {
      setError("");
      setSuccessMessage("");
    }, 3000);
  }, []);

  // Handle single task ID addition
  const handleAddTaskId = useCallback(() => {
    const trimmedValue = inputValue.trim();
    setError("");

    if (!trimmedValue) {
      setError("Please enter a task ID");
      return;
    }

    if (!validateTaskId(trimmedValue)) {
      setError(
        `Invalid format: "${trimmedValue}". Use alphanumeric, hyphens, or underscores.`
      );
      clearMessages();
      return;
    }

    if (taskIds.includes(trimmedValue)) {
      setError(`Task ID "${trimmedValue}" already exists`);
      clearMessages();
      return;
    }

    if (isFull) {
      setError(`Maximum ${maxTasks} task IDs reached`);
      clearMessages();
      return;
    }

    onTaskIdsChange([...taskIds, trimmedValue]);
    setInputValue("");
    setSuccessMessage(`Task ID "${trimmedValue}" added`);
    clearMessages();
  }, [inputValue, taskIds, isFull, onTaskIdsChange, maxTasks, clearMessages]);

  // Handle bulk paste
  const handleBulkPaste = useCallback(() => {
    const parsed = parseTaskIdsFromString(bulkInput);
    setError("");

    if (parsed.length === 0) {
      setError("No valid task IDs found in input");
      clearMessages();
      return;
    }

    // Validate all
    const invalid: string[] = [];
    const duplicates: string[] = [];
    const toAdd: string[] = [];

    parsed.forEach((id) => {
      if (!validateTaskId(id)) {
        invalid.push(id);
      } else if (taskIds.includes(id) || toAdd.includes(id)) {
        duplicates.push(id);
      } else if (toAdd.length < remainingSlots) {
        toAdd.push(id);
      }
    });

    // Report errors if any
    if (invalid.length > 0) {
      setError(
        `Invalid task IDs: ${invalid.join(", ")}. Use alphanumeric, hyphens, or underscores.`
      );
      clearMessages();
      return;
    }

    if (duplicates.length > 0) {
      setError(`Duplicate task IDs: ${duplicates.join(", ")}`);
      clearMessages();
      return;
    }

    if (toAdd.length === 0) {
      setError("No new task IDs to add");
      clearMessages();
      return;
    }

    if (toAdd.length < parsed.length) {
      setError(
        `Only ${toAdd.length} of ${parsed.length} task IDs added (limit reached)`
      );
      clearMessages();
    }

    onTaskIdsChange([...taskIds, ...toAdd]);
    setbulkInput("");
    setShowBulkMode(false);
    setSuccessMessage(`${toAdd.length} task ID(s) added`);
    clearMessages();
  }, [bulkInput, taskIds, remainingSlots, onTaskIdsChange, clearMessages]);

  // Handle task ID removal
  const handleRemoveTaskId = useCallback(
    (idToRemove: string) => {
      onTaskIdsChange(removeTaskIdUtil(taskIds, idToRemove));
      setSuccessMessage(`Task ID "${idToRemove}" removed`);
      setTimeout(() => setSuccessMessage(""), 2000);
    },
    [taskIds, onTaskIdsChange]
  );

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !disabled) {
        e.preventDefault();
        handleAddTaskId();
      }
    },
    [handleAddTaskId, disabled]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">{label}</Label>
          {showCounter && (
            <span
              className={cn(
                "text-xs font-medium",
                isFull ? "text-red-600" : "text-muted-foreground"
              )}
            >
              {taskIds.length}/{maxTasks}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="flex gap-2 text-xs p-2 rounded bg-red-50 text-red-800 border border-red-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex gap-2 text-xs p-2 rounded bg-green-50 text-green-800 border border-green-200">
          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Input Section */}
      {!showBulkMode ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              disabled={disabled || isFull}
              className="text-sm"
            />
            <Button
              onClick={handleAddTaskId}
              disabled={disabled || isFull || !inputValue.trim()}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Bulk mode toggle */}
          <Button
            onClick={() => setShowBulkMode(true)}
            disabled={disabled || isFull}
            variant="ghost"
            size="sm"
            className="text-xs h-auto py-1"
          >
            Or paste multiple task IDs
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            placeholder="Paste task IDs (comma, newline, or semicolon separated)&#10;Examples:&#10;TASK-001&#10;TASK-002, TASK-003&#10;TASK-004; TASK-005"
            value={bulkInput}
            onChange={(e) => {
              setbulkInput(e.target.value);
              setError("");
            }}
            disabled={disabled || isFull}
            className="text-sm min-h-24"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleBulkPaste}
              disabled={disabled || isFull || !bulkInput.trim()}
              size="sm"
              className="gap-2 flex-1"
            >
              <Plus className="h-4 w-4" />
              Add All
            </Button>
            <Button
              onClick={() => setShowBulkMode(false)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Task IDs List */}
      {taskIds.length > 0 && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Added Task IDs ({taskIds.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {taskIds.map((id) => (
                <Badge
                  key={id}
                  variant="secondary"
                  className="gap-1 pl-2 py-1 text-xs"
                >
                  {id}
                  <button
                    onClick={() => handleRemoveTaskId(id)}
                    disabled={disabled}
                    className="ml-1 hover:text-red-600 disabled:opacity-50"
                    aria-label={`Remove ${id}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status messages */}
      {isFull && (
        <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
          Maximum task IDs reached. Remove some to add more.
        </div>
      )}

      {taskIds.length === 0 && (
        <div className="text-xs text-muted-foreground italic py-4 text-center">
          No task IDs added yet
        </div>
      )}
    </div>
  );
}
