import * as Dialog from "@radix-ui/react-dialog";
import {
AlertCircle,
ArrowDown,
ArrowUp,
Check,
ChevronsUp,
LoaderCircle,
LockKeyhole,
Minus,
RefreshCw,
WifiOff,
X,
} from "lucide-react";
import { AnimatePresence,motion } from "motion/react";
import {
Component,createContext,
useContext,
useEffect,
useState,
type ReactNode
} from "react";
import { ApiError,label,type Item,type Priority,type Status } from "./api";
import { motionTokens } from "./motion";
import { useMotionPreference } from "./motion-preferences";
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
    <motion.span
      key={status}
      className={`status status-${status.toLowerCase()}`}
      initial={{ opacity: 0.6, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={motionTokens.spring}
    >
      <span className="status-dot" />
      {label(status)}
    </motion.span>
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
        <div className="skeleton-row" key={i} aria-hidden="true">
          <span className="skeleton skeleton-avatar" />
          <div>
            <span className="skeleton skeleton-title" />
            <span className="skeleton skeleton-subtitle" />
          </div>
          <span className="skeleton skeleton-meta" />
        </div>
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
  const conflict = error instanceof ApiError && error.status === 409;
  const forbidden = error instanceof ApiError && error.status === 403;
  const network = error instanceof ApiError && error.status === 0;
  const Icon = conflict
    ? RefreshCw
    : forbidden
      ? LockKeyhole
      : network
        ? WifiOff
        : AlertCircle;
  return (
    <motion.div
      className="error-box"
      data-tone={conflict ? "warning" : forbidden ? "info" : "danger"}
      role="alert"
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.control }}
    >
      <Icon size={19} />
      <div>
        <strong>
          {error instanceof ApiError && error.status === 409
            ? "This item changed"
            : error instanceof ApiError && error.status === 403
              ? "This workspace is restricted"
              : network
                ? "Connection interrupted"
                : "Unable to complete this request"}
        </strong>
        <p>{error instanceof Error ? error.message : "Please try again."}</p>
        {retry && (
          <button className="text-button" onClick={retry}>
            <RefreshCw size={14} />
            {conflict ? "Refresh latest data" : "Try again"}
          </button>
        )}
      </div>
    </motion.div>
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
    <motion.div
      className="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: motionTokens.control }}
    >
      <span className="empty-icon">
        <Check size={23} />
      </span>
      <h3>{title}</h3>
      <div className="empty-description">{children}</div>
    </motion.div>
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
  const reduced = useMotionPreference();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay forceMount asChild>
              <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: motionTokens.fast }}
              />
            </Dialog.Overlay>
            <Dialog.Content forceMount asChild>
              <motion.div
                className="modal"
                initial={
                  reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 18 }
                }
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={
                  reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }
                }
                transition={{
                  duration: motionTokens.control,
                  ease: motionTokens.ease,
                }}
              >
                <div className="modal-heading">
                  <div>
                    <span className="eyebrow">NEWTONOPS WORKSPACE</span>
                    <Dialog.Title>{title}</Dialog.Title>
                    <Dialog.Description>{description}</Dialog.Description>
                  </div>
                  <Dialog.Close
                    className="icon-button"
                    aria-label="Close dialog"
                  >
                    <X size={20} />
                  </Dialog.Close>
                </div>
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
// Route animation is owned by the shell; page content does not animate twice.
export function PageEnter({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
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

export function ActionLabel({
  pending,
  children,
  loadingText = "Saving…",
}: {
  pending: boolean;
  children: ReactNode;
  loadingText?: string;
}) {
  return (
    <span className="action-label">
      <motion.span
        className="action-label-idle"
        aria-hidden={pending}
        animate={{ opacity: pending ? 0 : 1 }}
        transition={{ duration: motionTokens.fast }}
      >
        {children}
      </motion.span>
      <AnimatePresence initial={false}>
        {pending && (
          <motion.span
            className="action-label-pending"
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.fast }}
          >
            <span aria-hidden="true">
              <Spinner />
            </span>
            {loadingText}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function Toast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [paused, onDismiss]);
  useEffect(() => {
    const visibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  return (
    <motion.div
      role="status"
      className="toast"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setPaused(false);
      }}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8 }}
      transition={motionTokens.spring}
    >
      <span aria-hidden="true">
        <Check size={16} />
      </span>
      <div>
        <strong>Update confirmed</strong>
        <p>{message}</p>
      </div>
      <button
        className="icon-button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
    </motion.div>
  );
}

export class ScreenBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<main className="screen-recovery"><span className="empty-icon"><RefreshCw size={23}/></span><h1>The workspace could not finish loading.</h1><p>A screen or resource could not be loaded. Reload the workspace, then sign in again.</p><button className="button primary" onClick={()=>window.location.reload()}>Reload workspace</button></main>:this.props.children}
}
