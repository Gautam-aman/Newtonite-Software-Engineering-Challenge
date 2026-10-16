import { animate,motion,type Variants } from "motion/react";
import { useEffect,useRef,type ReactNode } from "react";
import { useMotionPreference } from "./motion-preferences";

// Shared timing vocabulary. Major entrances are deliberately longer than controls.
export const motionTokens = {
  fast: 0.16,
  control: 0.22,
  page: 0.32,
  numeric: 0.45,
  ease: [0.22, 1, 0.36, 1] as const,
  spring: { type: "spring" as const, stiffness: 360, damping: 32 },
};
export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useMotionPreference();
  const variants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduced ? 0 : 0.055 } },
  };
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}
export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useMotionPreference();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 16 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: motionTokens.page, ease: motionTokens.ease },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
export function AnimatedNumber({ value }: { value: number }) {
  const reduced = useMotionPreference();
  const node = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (reduced || from === value) {
      if (node.current) node.current.textContent = value.toLocaleString();
      return;
    }
    // Update the text node, not the component tree, on each animation frame.
    const animation = animate(from, value, {
      duration: motionTokens.numeric,
      ease: motionTokens.ease,
      onUpdate: (latest) => {
        if (node.current)
          node.current.textContent = Math.round(latest).toLocaleString();
      },
    });
    return () => animation.stop();
  }, [value, reduced]);
  return (
    <span className="animated-number" aria-label={value.toLocaleString()}>
      <span ref={node} aria-hidden="true">
        {value.toLocaleString()}
      </span>
    </span>
  );
}

// Wait for asynchronous page content without moving focus on filter/query changes.
export function RouteSurface({ children }: { children: ReactNode }) {
  const reduced = useMotionPreference();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    function focusHeading() {
      const heading = root.current?.querySelector<HTMLElement>("h1");
      if (!heading) return false;
      if (!document.activeElement?.closest('[role="dialog"]')) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        document.title = heading.textContent + " · NewtonOps";
      }
      return true;
    }
    if (focusHeading()) return;
    const observer = new MutationObserver(() => {
      if (focusHeading()) observer.disconnect();
    });
    if (root.current)
      observer.observe(root.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return (
    <motion.div
      ref={root}
      className="route-frame"
      initial={{ opacity: 0, y: reduced ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduced ? 0 : -5 }}
      transition={{
        duration: reduced ? 0 : motionTokens.control,
        ease: motionTokens.ease,
      }}
    >
      {children}
    </motion.div>
  );
}
