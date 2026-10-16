import { Moon,Sun } from "lucide-react";
import {
createContext,
useContext,
useEffect,
useState,
type ReactNode,
} from "react";

type Theme = "dark" | "light";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return window.localStorage.getItem("newtonops-theme") === "light"
        ? "light"
        : "dark";
    } catch {
      return "dark";
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content",theme==="dark"?"#0c1019":"#f6f7fb");
    try {
      window.localStorage.setItem("newtonops-theme", theme);
    } catch {
      /* Storage can be disabled without breaking the workspace. */
    }
  }, [theme]);
  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export function ThemeToggle() {
  const { theme, toggle } = useContext(ThemeContext);
  return (
    <button
      className="icon-button theme-toggle"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      onClick={toggle}
    >
      <span key={theme}>
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </span>
    </button>
  );
}
