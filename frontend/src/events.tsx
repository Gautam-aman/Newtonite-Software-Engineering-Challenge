import { ArrowRight, Check, MessageSquare, Pencil, Plus, ShieldCheck, UserRound, X } from "lucide-react";
export function EventGlyph({type}:{type:string}) {
 const Icon=({CREATED:Plus,CLAIMED:UserRound,UPDATED:Pencil,STATUS_CHANGED:ArrowRight,APPROVED:ShieldCheck,REJECTED:X,COMMENTED:MessageSquare,RESOLVED:Check} as Record<string,typeof Plus>)[type]??ArrowRight;
 return <span className="event-glyph" data-event={type} aria-hidden="true"><Icon size={14}/></span>;
}
