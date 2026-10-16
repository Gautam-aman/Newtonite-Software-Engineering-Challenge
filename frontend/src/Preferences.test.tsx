import {MotionPreferencesProvider,MotionToggle} from "./motion-preferences";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {ThemeProvider,ThemeToggle} from "./theme";
const persisted=new Map<string,string>();
const originalStorage=Object.getOwnPropertyDescriptor(window,"localStorage");
beforeEach(()=>{persisted.clear();Object.defineProperty(window,"localStorage",{configurable:true,value:{getItem:(key:string)=>persisted.get(key)??null,setItem:(key:string,value:string)=>persisted.set(key,value)}})});
afterEach(()=>{cleanup();vi.restoreAllMocks();if(originalStorage)Object.defineProperty(window,"localStorage",originalStorage);document.querySelectorAll('meta[name="theme-color"]').forEach(node=>node.remove())});
it("persists the chosen theme and keeps browser chrome and controls synchronized",async()=>{
 const meta=document.createElement("meta");meta.name="theme-color";document.head.append(meta);
 const view=render(<ThemeProvider><ThemeToggle/></ThemeProvider>);
 await userEvent.click(screen.getByRole("button",{name:"Switch to light theme"}));
 expect(document.documentElement.dataset.theme).toBe("light");expect(persisted.get("newtonops-theme")).toBe("light");expect(meta.content).toBe("#f6f7fb");
 view.unmount();render(<ThemeProvider><ThemeToggle/></ThemeProvider>);
 expect(screen.getByRole("button",{name:"Switch to dark theme"})).toBeInTheDocument();
});

vi.mock("motion/react",async original=>({...await original<typeof import("motion/react")>(),useReducedMotion:()=>true}));
it("follows reduced motion by default and persists an explicit user choice",async()=>{
 const view=render(<MotionPreferencesProvider><MotionToggle/></MotionPreferencesProvider>);
 expect(document.documentElement.dataset.motion).toBe("system");
 await userEvent.click(screen.getByRole("button",{name:"Enable animations"}));
 expect(document.documentElement.dataset.motion).toBe("full");expect(persisted.get("newtonops-motion")).toBe("full");
 view.unmount();render(<MotionPreferencesProvider><MotionToggle/></MotionPreferencesProvider>);
 await userEvent.click(screen.getByRole("button",{name:"Reduce animations"}));
 expect(document.documentElement.dataset.motion).toBe("reduced");
});
