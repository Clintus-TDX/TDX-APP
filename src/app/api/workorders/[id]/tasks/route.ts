// Techadox Integrated Field Coordinator Portal
// API Route: /api/workorders/[id]/tasks
// Handles task IDs management: add, remove, list

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateTaskId, validateTaskIds, addTaskId as addTaskIdUtil } from "@/lib/workorder-utils";

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/workorders/[id]/tasks
 * Returns task IDs for a specific work order
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const workOrderId = params.id;

    if (!workOrderId) {
      return NextResponse.json(
        { success: false, error: "Work order ID is required" },
        { status: 400 }
      );
    }

    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { taskIds: true, taskNumber: true },
    });

    if (!workOrder) {
      return NextResponse.json(
        { success: false, error: "Work order not found" },
        { status: 404 }
      );
    }

    const taskIds = workOrder.taskIds
      ? JSON.parse(workOrder.taskIds as string)
      : [];

    return NextResponse.json({
      success: true,
      data: {
        taskIds,
        legacyTaskNumber: workOrder.taskNumber,
      },
    });
  } catch (error) {
    console.error("[GET /api/workorders/[id]/tasks]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch task IDs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workorders/[id]/tasks
 * Add a new task ID to work order
 * Body: { taskId: string }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const workOrderId = params.id;
    const body = await req.json();
    const { taskId } = body;

    if (!workOrderId) {
      return NextResponse.json(
        { success: false, error: "Work order ID is required" },
        { status: 400 }
      );
    }

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      );
    }

    if (!validateTaskId(taskId)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid task ID format. Use alphanumeric, hyphens, or underscores.',
        },
        { status: 400 }
      );
    }

    // Get current work order
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { taskIds: true },
    });

    if (!workOrder) {
      return NextResponse.json(
        { success: false, error: "Work order not found" },
        { status: 404 }
      );
    }

    let currentTaskIds: string[] = [];
    if (workOrder.taskIds) {
      try {
        currentTaskIds = JSON.parse(workOrder.taskIds as string);
        if (!Array.isArray(currentTaskIds)) {
          currentTaskIds = [];
        }
      } catch {
        currentTaskIds = [];
      }
    }

    // Try to add task ID
    const result = addTaskIdUtil(currentTaskIds, taskId);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Update work order
    const updated = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        taskIds: JSON.stringify(result.data),
        updatedAt: new Date(),
      },
      select: { taskIds: true },
    });

    const updatedTaskIds = updated.taskIds
      ? JSON.parse(updated.taskIds as string)
      : [];

    return NextResponse.json({
      success: true,
      data: {
        taskIds: updatedTaskIds,
        message: `Task ID "${taskId}" added successfully`,
      },
    });
  } catch (error) {
    console.error("[POST /api/workorders/[id]/tasks]", error);
    return NextResponse.json(
      { success: false, error: "Failed to add task ID" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workorders/[id]/tasks
 * Replace all task IDs for a work order
 * Body: { taskIds: string[] }
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const workOrderId = params.id;
    const body = await req.json();
    const { taskIds: newTaskIds } = body;

    if (!workOrderId) {
      return NextResponse.json(
        { success: false, error: "Work order ID is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(newTaskIds)) {
      return NextResponse.json(
        { success: false, error: "Task IDs must be an array" },
        { status: 400 }
      );
    }

    // Validate all task IDs
    const validation = validateTaskIds(newTaskIds);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    // Check work order exists
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });

    if (!workOrder) {
      return NextResponse.json(
        { success: false, error: "Work order not found" },
        { status: 404 }
      );
    }

    // Update work order
    const updated = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        taskIds: JSON.stringify(newTaskIds),
        updatedAt: new Date(),
      },
      select: { taskIds: true },
    });

    const updatedTaskIds = updated.taskIds
      ? JSON.parse(updated.taskIds as string)
      : [];

    return NextResponse.json({
      success: true,
      data: {
        taskIds: updatedTaskIds,
        message: "Task IDs updated successfully",
      },
    });
  } catch (error) {
    console.error("[PUT /api/workorders/[id]/tasks]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update task IDs" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workorders/[id]/tasks
 * Remove a task ID from work order
 * Body: { taskId: string }
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const workOrderId = params.id;
    const body = await req.json();
    const { taskId } = body;

    if (!workOrderId) {
      return NextResponse.json(
        { success: false, error: "Work order ID is required" },
        { status: 400 }
      );
    }

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Get current work order
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { taskIds: true },
    });

    if (!workOrder) {
      return NextResponse.json(
        { success: false, error: "Work order not found" },
        { status: 404 }
      );
    }

    let currentTaskIds: string[] = [];
    if (workOrder.taskIds) {
      try {
        currentTaskIds = JSON.parse(workOrder.taskIds as string);
        if (!Array.isArray(currentTaskIds)) {
          currentTaskIds = [];
        }
      } catch {
        currentTaskIds = [];
      }
    }

    // Remove task ID
    const updated = currentTaskIds.filter(
      (id) => id.toUpperCase() !== taskId.toUpperCase()
    );

    // Update work order
    const result = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        taskIds: updated.length > 0 ? JSON.stringify(updated) : null,
        updatedAt: new Date(),
      },
      select: { taskIds: true },
    });

    const updatedTaskIds = result.taskIds
      ? JSON.parse(result.taskIds as string)
      : [];

    return NextResponse.json({
      success: true,
      data: {
        taskIds: updatedTaskIds,
        message: `Task ID "${taskId}" removed successfully`,
      },
    });
  } catch (error) {
    console.error("[DELETE /api/workorders/[id]/tasks]", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove task ID" },
      { status: 500 }
    );
  }
}
