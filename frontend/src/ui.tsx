import { createContext, useContext, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronsUp,
  Minus,
  RefreshCw,
  X,
  LoaderCircle,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { ApiError, label, type Item, type Priority, type Status } from "./api";
export const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);
export function Avatar({
  name,
  size = "small",
}: {
  name: string;
  size?: string;
}) {
  return (
    <span className={`avatar ${size}`} aria-label={name}>
      {name
        .split(" ")
        .slice(0, 2)
        .map((s) => s[0])
        .join("")}
    </span>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status status-${status.toLowerCase()}`}>
      <span className="status-dot" />
      {label(status)}
    </span>
  );
}
export function PriorityMark({ priority }: { priority: Priority }) {
  const Icon = {
    CRITICAL: ChevronsUp,
    HIGH: ArrowUp,
    MEDIUM: Minus,
    LOW: ArrowDown,
  }[priority];
  return (
    <span className={`priority priority-${priority.toLowerCase()}`}>
      <Icon size={14} />
      {label(priority)}
    </span>
  );
}
export function Spinner() {
  return <LoaderCircle className="spin" size={17} aria-label="Loading" />;
}
export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading data" className="skeleton-list">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <AlertCircle size={19} />
      <div>
        <strong>
          {error instanceof ApiError && error.status === 409
            ? "This item changed"
            : "Unable to complete this request"}
        </strong>
        <p>{error instanceof Error ? error.message : "Please try again."}</p>
        {retry && (
          <button className="text-button" onClick={retry}>
            <RefreshCw size={14} />
            Refresh latest data
          </button>
        )}
      </div>
    </div>
  );
}
export function Empty({
  title = "All clear",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Check size={23} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal">
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close dialog">
              <X size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function PageEnter({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
export function dueLabel(date: string | null) {
  if (!date) return "No due date";
  return new Date(date + "T00:00:00").toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
export function overdue(item: Item) {
  return (
    !!item.dueDate &&
    item.dueDate < new Date().toLocaleDateString("en-CA") &&
    !["RESOLVED", "CLOSED"].includes(item.status)
  );
}
export function shortId(id: string) {
  return "OPS-" + id.slice(0, 6).toUpperCase();
}
