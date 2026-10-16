import { Accessibility,Sparkles } from "lucide-react";
import { MotionConfig,useReducedMotion } from "motion/react";
import {
createContext,
useContext,
useEffect,
useState,
type ReactNode,
} from "react";

type MotionMode = "system" | "reduced" | "full";
const MotionPreferences = createContext({
  reduced: false,
  mode: "system" as MotionMode,
  toggle: () => {},
});
export function MotionPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const systemReduced = useReducedMotion();
  const [mode, setMode] = useState<MotionMode>(() => {
    try {
      const value = window.localStorage.getItem("newtonops-motion");
      return value === "reduced" || value === "full" ? value : "system";
    } catch {
      return "system";
    }
  });
  const reduced = mode === "reduced" || (mode === "system" && !!systemReduced);
  useEffect(() => {
    document.documentElement.dataset.motion = mode;
    try {
      window.localStorage.setItem("newtonops-motion", mode);
    } catch {
      /* Optional preference storage. */
    }
  }, [mode]);
  return (
    <MotionPreferences.Provider
      value={{
        reduced,
        mode,
        toggle: () => setMode(reduced ? "full" : "reduced"),
      }}
    >
      <MotionConfig
        reducedMotion={
          mode === "system" ? "user" : mode === "reduced" ? "always" : "never"
        }
        transition={{ duration: 0.22 }}
      >
        {children}
      </MotionConfig>
    </MotionPreferences.Provider>
  );
}
export const useMotionPreference = () => useContext(MotionPreferences).reduced;
export function MotionToggle() {
  const { reduced, toggle, mode } = useContext(MotionPreferences);
  const title = reduced ? "Enable animations" : "Reduce animations";
  return (
    <button
      className="icon-button motion-toggle"
      onClick={toggle}
      aria-label={title}
      aria-pressed={!reduced}
      title={`${title}${mode === "system" ? " · currently follows your device" : " · your workspace preference"}`}
    >
      {reduced ? <Sparkles size={17} /> : <Accessibility size={17} />}
    </button>
  );
}
