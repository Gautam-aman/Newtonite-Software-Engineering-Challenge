import { ArrowRight, Check, MessageSquare, Pencil, Plus, ShieldCheck, UserRound, X } from "lucide-react";
export function EventGlyph({type}:{type:string}) {
 const Icon=({CREATED:Plus,CLAIMED:UserRound,UPDATED:Pencil,STATUS_CHANGED:ArrowRight,APPROVED:ShieldCheck,REJECTED:X,COMMENTED:MessageSquare,RESOLVED:Check} as Record<string,typeof Plus>)[type]??ArrowRight;
 return <span className="event-glyph" data-event={type} aria-hidden="true"><Icon size={14}/></span>;
}

export function AuditChanges({details}:{details:Record<string,unknown>}) {
 const before=details.before;const after=details.after;
 if(!before||!after||typeof before!=="object"||typeof after!=="object")return null;
 const fields:Record<string,string>={title:"Title",description:"Description",type:"Type",priority:"Priority",assigneeName:"Assignee",dueDate:"Due date"};
 const changes=Object.entries(fields).filter(([key])=>JSON.stringify((before as Record<string,unknown>)[key])!==JSON.stringify((after as Record<string,unknown>)[key]));
 const text=(value:unknown)=>value===null||value===undefined?"None":String(value).replaceAll("_"," ").slice(0,150);
 return changes.length?<dl className="audit-changes">{changes.map(([key,label])=><div key={key}><dt>{label}</dt><dd><span>{text((before as Record<string,unknown>)[key])}</span><ArrowRight size={12}/><strong>{text((after as Record<string,unknown>)[key])}</strong></dd></div>)}</dl>:null;
}
