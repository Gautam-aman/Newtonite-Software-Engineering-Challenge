import { MotionPreferencesProvider, MotionToggle, useMotionPreference } from "./motion-preferences";
import { useEffect, useState, createContext, useContext } from "react";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useLocation,
  Link,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  Check,
  ChevronDown,
  Command,
  Eye,
  EyeOff,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  X,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import * as Dialog from "@radix-ui/react-dialog";
import { api, setToken, type Team, type User } from "./api";
import { Avatar, ErrorBox, Loading, ActionLabel, ToastContext } from "./ui";
import { Dashboard, Explorer, Detail } from "./pages";
import { ItemForm } from "./forms";
import { ThemeProvider, ThemeToggle } from "./theme";
import { motionTokens, RouteSurface } from "./motion";
export const client = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 15000 },
  },
});
interface Session {
  user: User;
  teams: Team[];
  teamId: string;
  setTeamId: (id: string) => void;
  create: () => void;
}
const SessionContext = createContext<Session>(null!);
export const useSession = () => useContext(SessionContext);
function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <Command size={21} />
      </span>
      <span>
        Newton<span className="brand-light">Ops</span>
        <small>OPERATIONS WORKSPACE</small>
      </span>
    </div>
  );
}
function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [email, setEmail] = useState("member@newtonops.local");
  const [password, setPassword] = useState("NewtonOps!2026");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<unknown>();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const result = await api<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(result.token);
      onLogin(result.user);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <section className="login-story">
        <Brand />
        <motion.div className="login-copy" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.5,ease:motionTokens.ease}}>
          <span className="eyebrow light">CLARITY UNDER PRESSURE</span>
          <h1>
            Keep work moving.
            <br />
            <em>Stay in control.</em>
          </h1>
          <p>
            One shared workspace for the issues that matter.
            <br />
            From the first signal to the final resolution.
          </p>
          <div className="signal-card">
            <span className="signal-orbit">
              <Activity size={32} />
            </span>
            <div>
              <span className="eyebrow light">THE NEWTONOPS WAY</span>
              <h3>Every action. Accounted for.</h3>
              <p>Clear ownership · Controlled workflows · Complete history</p>
            </div>
          </div>
        </motion.div>
        <div className="login-footer">
          <span>Built for the teams behind the scenes.</span>
          <span>01 / OPERATIONS</span>
        </div>
      </section>
      <section className="login-form-side">
        <motion.div className="login-form" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:.45,delay:.1,ease:motionTokens.ease}}>
          <span className="eyebrow">YOUR OPERATIONS, TOGETHER</span>
          <h2>Welcome to your workspace</h2>
          <p className="muted">Sign in to see what needs your attention.</p>
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
              />
            </label>
            <label>
              Password
              <div className="password-field"><input
                type={showPassword ? "text" : "password"} aria-label="Password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={128}
              /><button type="button" className="icon-button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
            </label>
            {!!error && <ErrorBox error={error} />}
            <button className="button primary full" disabled={busy} aria-busy={busy}>
              <ActionLabel pending={busy} loadingText="Signing in…">Sign in to NewtonOps<ArrowUpRight size={16}/></ActionLabel>
            </button>
          </form>
          <div className="demo-box">
            <div>
              <ShieldCheck size={17} />
              <strong>Explore the local demo</strong>
            </div>
            <p>Choose a role. Demo credentials are filled in for you.</p>
            <div className="demo-roles">
              {["member", "lead", "viewer", "admin"].map((role) => (
                <button
                  key={role}
                  type="button"
                  className={email.startsWith(role + "@") ? "selected" : ""}
                  aria-pressed={email.startsWith(role + "@")}
                  onClick={() => {
                    setEmail(role + "@newtonops.local");
                    setPassword("NewtonOps!2026");
                  }}
                >
                  {email.startsWith(role + "@") && <motion.span className="role-selection" layoutId="demo-role-selection" transition={motionTokens.spring}/>}<span className="role-label">{role}</span>
                </button>
              ))}
            </div>
            <small>Development accounts only. Sessions last 8 hours.</small>
          </div>
        </motion.div>
        <div className="login-theme">
          <ThemeToggle /><MotionToggle/>
        </div>
        <div className="login-bottom">
          <span className="mini-dot" />A calmer way to manage the critical.
        </div>
      </section>
    </div>
  );
}
function Workspace({ user, onLogout }: { user: User; onLogout: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [teamId, setTeamId] = useState("");
  const [creating, setCreating] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState("");
  const teams = useQuery({
    queryKey: ["teams"],
    queryFn: () => api<Team[]>("/teams"),
  });
  const selected = teams.data?.find((t) => t.id === teamId);
  const canCreate = teamId
    ? selected?.role !== "VIEWER"
    : teams.data?.some((t) => t.role !== "VIEWER");
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);

  return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    const handler = () => onLogout();
    window.addEventListener("session-expired", handler);
    return () => window.removeEventListener("session-expired", handler);
  }, [onLogout]);
      const reduced = useMotionPreference();
  const sidebarContent = (<>
            <Brand />
            <button
              className="mobile-close icon-button"
              onClick={() => setMobile(false)}
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
            <div className="workspace-tag">
              <span className="workspace-monogram">N</span>
              <div>
                <strong>Newtonite</strong>
                <small>Internal operations</small>
              </div>
              <span className="workspace-plan">DEMO</span>
            </div>
            <span className="nav-label">WORKSPACE</span>
            <nav onClick={() => setMobile(false)}>
              <NavLink to="/" end aria-label="Overview" data-tooltip="Overview">{({isActive})=><>
                {isActive&&<motion.span className="nav-active-indicator" layoutId="active-navigation" transition={motionTokens.spring}/>}
                <LayoutDashboard size={18} />
                <span className="nav-text">Overview</span></>}
              </NavLink>
              <NavLink to="/items" aria-label="Work items" data-tooltip="Work items">{({isActive})=><>
                {isActive&&<motion.span className="nav-active-indicator" layoutId="active-navigation" transition={motionTokens.spring}/>}
                <ListTodo size={18} />
                <span className="nav-text">Work items</span><span className="nav-shortcut">↗</span></>}
              </NavLink>
            </nav>
            <div className="sidebar-note">
              <span className="note-icon">
                <ShieldCheck size={18} />
              </span>
              <h4>Confidence in every handoff.</h4>
              <p>
                Team permissions and a complete activity trail keep work
                accountable.
              </p>
              <Link to="/items?view=approvals">
                Review approvals
                <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="sidebar-bottom"><button className="sidebar-toggle" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} onClick={()=>setCollapsed(v=>!v)}>{collapsed ? <PanelLeftOpen size={17}/> : <PanelLeftClose size={17}/>}<span>Collapse sidebar</span></button>
              <div className="system-status">
                <span className="mini-dot" />
                Operations workspace
              </div>
              <div className="user-profile">
                <Avatar name={user.name} />
                <div>
                  <strong>{user.name}</strong>
                  <small>
                    {selected ? selected.role.toLowerCase() : "Team workspace"}
                  </small>
                </div>
                <button
                  className="icon-button"
                  aria-label="Sign out"
                  onClick={async () => {
                    try {
                      await api("/auth/logout", { method: "POST" });
                    } finally {
                      onLogout();
                    }
                  }}
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>

</>);
  return (
    <SessionContext.Provider
      value={{
        user,
        teams: teams.data ?? [],
        teamId,
        setTeamId,
        create: () => setCreating(true),
      }}
    >
      <ToastContext.Provider value={setToast}>
        <div className={`workspace ${collapsed ? "sidebar-collapsed" : ""}`}><a className="skip-link" href="#main-content">Skip to main content</a>
          <aside className="sidebar desktop-sidebar"><LayoutGroup id="desktop-nav">{sidebarContent}</LayoutGroup></aside>
          <Dialog.Root open={mobile} onOpenChange={setMobile}>
            <AnimatePresence>{mobile && <Dialog.Portal forceMount>
              <Dialog.Overlay forceMount asChild><motion.div className="mobile-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:motionTokens.fast}}/></Dialog.Overlay>
              <Dialog.Content forceMount asChild><motion.aside className="sidebar mobile-open drawer-sidebar" initial={{x:reduced?0:-260}} animate={{x:0}} exit={{x:reduced?0:-260}} transition={motionTokens.spring}>
                <Dialog.Title className="sr-only">Workspace navigation</Dialog.Title><Dialog.Description className="sr-only">Choose a workspace page or sign out.</Dialog.Description>
                <LayoutGroup id="mobile-nav">{sidebarContent}</LayoutGroup>
              </motion.aside></Dialog.Content>
            </Dialog.Portal>}</AnimatePresence>
          </Dialog.Root>
          <div className="workspace-main">
            <header className="topbar">
              <div>
                <button
                  className="icon-button mobile-menu"
                  aria-label="Open navigation"
                  onClick={() => {setCollapsed(false);setMobile(true)}}
                >
                  <Menu size={21} />
                </button>
                <span className="breadcrumb">
                  Workspace <span>/</span> <strong>Operations</strong>
                </span>
              </div>
              <div className="header-actions">
                <ThemeToggle /><MotionToggle/>
                <div className="team-select">
                  <label className="sr-only" htmlFor="team-switcher">
                    Active team
                  </label>
                  <select
                    id="team-switcher"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                  >
                    <option value="">All my teams</option>
                    {teams.data?.map((t) => (
                      <option value={t.id} key={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </div>
                {canCreate && (
                  <button
                    className="button primary small-button"
                    onClick={() => setCreating(true)}
                  >
                    <Plus size={16} />
                    New item
                  </button>
                )}
              </div>
            </header>
            <main className="main-content" id="main-content" tabIndex={-1}>
              {teams.isPending ? (
                <Loading />
              ) : teams.isError ? (
                <ErrorBox
                  error={teams.error}
                  retry={() => void teams.refetch()}
                />
              ) : (
                <AnimatePresence mode="wait" initial={false}><RouteSurface key={location.pathname}><Routes location={location}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/items" element={<Explorer />} />
                  <Route path="/items/:id" element={<Detail />} />
                  <Route
                    path="*"
                    element={
                      <div className="empty">
                        <h1>Page not found</h1>
                        <Link to="/">Return to overview</Link>
                      </div>
                    }
                  />
                </Routes></RouteSurface></AnimatePresence>
              )}
            </main>
            <footer className="workspace-footer">
              <span>
                NewtonOps <span>·</span> Clarity in every operation
              </span>
              <span>
                Built for accountability <ShieldCheck size={12} />
              </span>
            </footer>
          </div>
        </div>
        <ItemForm
          open={creating}
          onOpenChange={setCreating}
          onSaved={(item) => {
            setCreating(false);
            navigate("/items/" + item.id);
            setToast("Work item created");
          }}
        />
        <AnimatePresence>
          {toast && (
            <motion.div
              role="status"
              className="toast"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <span>
                <Check size={16} />
              </span>
              {toast}
              <button
                className="icon-button"
                onClick={() => setToast("")}
                aria-label="Dismiss notification"
              >
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </ToastContext.Provider>
    </SessionContext.Provider>
  );
}
function Root() {
  const [user, setUser] = useState<User | null>(null);
  function logout() {
    setToken(null);
    client.clear();
    setUser(null);
  }
  return user ? (
    <Workspace user={user} onLogout={logout} />
  ) : (
    <Login onLogin={setUser} />
  );
}
export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <MotionPreferencesProvider>
            <Root />
          </MotionPreferencesProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
