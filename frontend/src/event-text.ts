import { label } from "./api";
export function eventLabel(type: string) {
  return (
    (
      {
        CREATED: "created a work item",
        UPDATED: "updated the work details",
        CLAIMED: "claimed ownership",
        STATUS_CHANGED: "moved the work forward",
        APPROVED: "approved the resolution",
        REJECTED: "requested further work",
        COMMENTED: "added a comment",
      } as Record<string, string>
    )[type] ?? label(type)
  );
}
export function relativeTime(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  if (elapsed < 60000) return "Just now";
  if (elapsed < 3600000) return Math.floor(elapsed / 60000) + "m ago";
  if (elapsed < 86400000) return Math.floor(elapsed / 3600000) + "h ago";
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
