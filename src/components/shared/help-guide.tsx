"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardList,
  BarChart3,
  FileText,
  Shield,
  Landmark,
  Palette,
  Upload,
  PlusCircle,
  Edit3,
  Maximize2,
  Link2,
} from "lucide-react";

interface HelpGuideProps {
  open: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    title: "Getting Started",
    icon: ClipboardList,
    steps: [
      "Sign in with your Techadox company email (@techadox.com or @techadox.net).",
      "If you don't have an account, click Register and create one using your company email.",
      "After logging in, you'll land on the Core Dispatch board — your main workspace.",
      "Use the sidebar on the left to navigate between sections.",
    ],
  },
  {
    title: "Core Dispatch",
    icon: ClipboardList,
    steps: [
      "View all work orders in the spreadsheet grid. Each row shows key details.",
      "Use the Search bar to find work orders by ticket ID, client, location, or engineer.",
      "Filter by status, client, or platform using the filter dropdowns.",
      "Sort any column by clicking its header.",
      "Change a work order's status inline using the status dropdown in each row.",
      "Click the + New Ticket button to open the Inbound Ticket Intake Form.",
      "Click a row or the Edit button to open the Edit Ticket panel for detailed editing.",
      "Reorder columns by dragging column headers. Your layout is saved automatically.",
    ],
  },
  {
    title: "Ticket Intake Form",
    icon: PlusCircle,
    steps: [
      "Click + New Ticket to open the intake form modal.",
      "Fill in all required fields (marked with *): Client, Ticket ID, Job Platform, Status, Field Engineer.",
      "Optionally fill in Site/Location, Pay Rates, Hours, Expenses, Comments, and Attachments.",
      "Ticket ID auto-generates, but you can override it manually.",
      "Date Created is automatically populated when you submit.",
      "Click Submit to create the work order, or Cancel to close without saving.",
    ],
  },
  {
    title: "Edit Ticket",
    icon: Edit3,
    steps: [
      "Click any work order row to open the Edit Ticket slide-out panel on the right.",
      "All work order fields are editable directly in the panel.",
      "Add quick notes — each note is timestamped and tracked in the edit history.",
      "View and manage attachments in the thumbnail grid.",
      "Click Save to persist changes, or Close to dismiss.",
    ],
  },
  {
    title: "Attachments",
    icon: Upload,
    steps: [
      "Upload files in the Ticket Intake Form or the Edit Ticket panel.",
      "Supported formats: images (.jpg, .png, .gif) and documents (.pdf, .docx, .xlsx).",
      "Maximum 10 files per work order, 10 MB per file.",
      "Click a thumbnail to view the file at full size in a modal.",
      "Drag to reorder attachments. Click the delete icon to remove (with confirmation).",
    ],
  },
  {
    title: "Reports",
    icon: BarChart3,
    steps: [
      "Select a date range to filter work orders by creation or modification date.",
      "Filter by client (multi-select) or field engineer (multi-select).",
      "Use the search bar to find specific work orders.",
      "Choose which columns to display using the Select Columns panel.",
      "Drag to reorder selected columns.",
      "Export XLSX using the Standard or Dashboard format export buttons.",
      "Export CSV for raw data or click Print for a print-friendly view.",
      "Your column selections and order are saved automatically.",
    ],
  },
  {
    title: "Invoices",
    icon: FileText,
    steps: [
      "View invoice summary cards showing totals by status (Draft, Pending, Paid, Overdue).",
      "Filter the invoice list by client or status.",
      "Generate an invoice from one or more work orders.",
      "Edit the invoice template: add line items, set tax rate, add notes and signature.",
      "Open an invoice in the expanded full-page view for detailed editing.",
      "Edit line items inline: change description, quantity, rate — amounts auto-calculate.",
      "Record payments directly from the expanded invoice view.",
      "Copy the invoice number to clipboard using the copy button.",
      "Export to PDF or send via email.",
      "Manage payments: submit, pay, cancel, or schedule future payments.",
    ],
  },
  {
    title: "Expanded Invoice View",
    icon: Maximize2,
    steps: [
      "Click the Expand (Maximize) icon on any invoice row or inside the quick preview dialog.",
      "The expanded view replaces the main content area with a full-page invoice detail.",
      "View comprehensive invoice details: header, bill-to info, job details, and field engineer.",
      "Click Edit to enter edit mode — modify status, bill-to address, notes, and due date.",
      "Edit line items inline: add new items, remove items, or change quantity/rate (amounts auto-calculate).",
      "Record a payment: click Record Payment, enter amount and method (Card/ACH/Wire/Check/Cash).",
      "The invoice status auto-updates to Paid when the balance reaches zero.",
      "Use Print/PDF or Download HTML to generate a printable invoice.",
      "Click Copy Link to copy a shareable invoice link, or use the back arrow to return.",
    ],
  },
  {
    title: "QuickBooks Integration",
    icon: Link2,
    steps: [
      "Go to the Accounts tab (Super Admin only) to access QuickBooks integration.",
      "Click Connect to QuickBooks to start the OAuth 2.0 authorization flow.",
      "A popup opens to Intuit's login — sign in and authorize the connection.",
      "Once connected, view your account name, realm ID, and connection status.",
      "Sync tab: Push invoices and payments to QuickBooks, or pull data (customers, invoices, accounts).",
      "Reports tab: Fetch Profit & Loss, Balance Sheet, and AR Aging reports from QuickBooks.",
      "Logs tab: View the full sync history with status, direction, and summary for each operation.",
      "The token auto-refreshes when expired. Disconnect anytime to revoke access.",
    ],
  },
  {
    title: "Admin & Settings",
    icon: Shield,
    steps: [
      "User Management: view all users, add new users, edit roles, or deactivate accounts.",
      "Custom Roles: create roles with granular permission checkboxes and assign them to users.",
      "Theme Selector: choose from 7 color themes (Teal, Classic Blue, Slate, Emerald, Crimson, Midnight, Sunset).",
      "Dark/Light Mode: toggle using the sun/moon icon in the header. Your preference is saved.",
      "Notification Settings: configure email and in-app notification preferences per alert type.",
      "Set quiet hours to mute notifications during specific times.",
    ],
  },
  {
    title: "Accounts (Super Admin)",
    icon: Landmark,
    steps: [
      "Connect to QuickBooks using the Connect button (OAuth popup).",
      "View your connected QuickBooks account and connection status.",
      "Submit payments against invoices, or pay pending invoices with one click.",
      "Cancel payments or schedule future-dated payments.",
      "Use Bulk Payment to pay multiple filtered invoices at once.",
      "Toggle advanced features using the checkbox in the Accounts tab.",
    ],
  },
  {
    title: "Dark/Light Mode & Themes",
    icon: Palette,
    steps: [
      "Click the Sun/Moon icon in the header to toggle between light and dark mode.",
      "Open Admin & Settings → Theme Selector to change the color theme.",
      "Choose from Teal, Classic Blue, Slate, Emerald, Crimson, Midnight, or Sunset.",
      "Your theme and mode preferences are saved and persist across sessions.",
    ],
  },
];

export function HelpGuide({ open, onClose }: HelpGuideProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="text-lg">How to Use the Techadox Portal</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 px-6 pb-6">
          <div className="space-y-6">
            {SECTIONS.map((section, idx) => {
              const Icon = section.icon;
              return (
                <div key={idx}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-sm">{section.title}</h3>
                  </div>
                  <ol className="ml-7 space-y-1 text-sm text-muted-foreground list-decimal">
                    {section.steps.map((step, si) => (
                      <li key={si}>{step}</li>
                    ))}
                  </ol>
                  {idx < SECTIONS.length - 1 && <Separator className="mt-4" />}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
