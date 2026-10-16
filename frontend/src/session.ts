import { createContext,useContext } from "react";
import type { Team,User } from "./api";
export interface Session {
  user: User;
  teams: Team[];
  teamId: string;
  setTeamId: (id: string) => void;
  create: () => void;
}
export const SessionContext = createContext<Session>(null!);
export const useSession = () => useContext(SessionContext);
