import "@testing-library/jest-dom/vitest";

import { vi } from "vitest";
import { configure } from "@testing-library/react";
// Cold lazy imports can exceed RTL's one-second default on shared CI runners.
configure({ asyncUtilTimeout: 3000 });
Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });
