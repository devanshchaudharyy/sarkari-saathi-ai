export const REMINDER_KINDS = [
  { value: "prepare", label: "Finish preparation" },
  { value: "follow_up", label: "Follow up on application" },
];
export const REMINDER_STATES = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
];
export const reminderState = (row, today) =>
  row.completedAt
    ? "completed"
    : row.dueOn < today
      ? "overdue"
      : row.dueOn === today
        ? "today"
        : "upcoming";
