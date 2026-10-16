import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  isLead,
  label,
  priorities,
  types,
  type Item,
  type Member,
} from "./api";
import { useSession } from "./App";
import { Avatar, ErrorBox, Modal, Spinner } from "./ui";
const schema = z.object({
  title: z.string().trim().min(1, "Give this item a clear title.").max(180),
  description: z.string().max(10000),
  type: z.enum(types),
  priority: z.enum(priorities),
  teamId: z.string().min(1, "Choose a team."),
  assigneeId: z.string(),
  dueDate: z.string(),
});
type Values = z.infer<typeof schema>;
export function ItemForm({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item?: Item;
  onSaved: (item: Item) => void;
}) {
  const { teams, teamId } = useSession();
  const queryClient = useQueryClient();
  const key = useRef(crypto.randomUUID());
  const previous = useRef("");
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      type: "TASK",
      priority: "MEDIUM",
      teamId: "",
      assigneeId: "",
      dueDate: "",
    },
  });
  useEffect(() => {
    if (open) {
      key.current = crypto.randomUUID();
      previous.current = "";
      form.reset(
        item
          ? {
              ...item,
              assigneeId: item.assigneeId ?? "",
              dueDate: item.dueDate ?? "",
            }
          : {
              title: "",
              description: "",
              type: "TASK",
              priority: "MEDIUM",
              teamId:
                teamId || teams.find((t) => t.role !== "VIEWER")?.id || "",
              assigneeId: "",
              dueDate: "",
            },
      );
      mutation.reset();
    }
  }, [open, item]); // New edit sessions always start from the selected server snapshot.
  const watchedTeam = form.watch("teamId");
  const role = teams.find((t) => t.id === watchedTeam)?.role;
  const members = useQuery({
    queryKey: ["members", watchedTeam],
    queryFn: () => api<Member[]>("/teams/" + watchedTeam + "/members"),
    enabled: open && !!item && !!watchedTeam,
  });
  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const payload = item
        ? {
            title: values.title,
            description: values.description,
            type: values.type,
            priority: values.priority,
            assigneeId: values.assigneeId || null,
            dueDate: values.dueDate || null,
            version: item.version,
          }
        : {
            title: values.title,
            description: values.description,
            type: values.type,
            priority: values.priority,
            teamId: values.teamId,
            dueDate: values.dueDate || null,
          };
      const serialized = JSON.stringify(payload);
      if (previous.current && previous.current !== serialized)
        key.current = crypto.randomUUID();
      previous.current = serialized;
      return api<Item>(item ? "/items/" + item.id : "/items", {
        method: item ? "PATCH" : "POST",
        body: serialized,
        headers: item ? {} : { "Idempotency-Key": key.current },
      });
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries();
      onSaved(result);
    },
  });
  function error(name: keyof Values) {
    return form.formState.errors[name]?.message;
  }
  return (
    <Modal
      open={open}
      onOpenChange={(v) => {
        if (!mutation.isPending) onOpenChange(v);
      }}
      title={item ? "Edit work item" : "Create a work item"}
      description={
        item
          ? "Keep the team aligned with a clear, up-to-date record."
          : "Turn an operational signal into clear, accountable work."
      }
    >
      <form
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        className="item-form" aria-busy={mutation.isPending}
      >
        <label>
          <span className="field-label-row"><span>Title <span className="required">*</span></span><span className="field-count">{form.watch("title").length} / 180</span></span>
          <input
            autoFocus aria-label="Title"
            placeholder="What needs to happen?"
            {...form.register("title")}
            maxLength={180} readOnly={mutation.isPending}
            aria-invalid={!!error("title")} aria-describedby={error("title")?"item-title-error":undefined}
          />
          {error("title") && (
            <small className="field-error" id="item-title-error" role="alert">{error("title")}</small>
          )}
        </label>
        <label>
          <span className="field-label-row"><span>Description</span><span className="field-count">{form.watch("description").length.toLocaleString()} / 10,000</span></span>
          <textarea aria-label="Description" aria-describedby="item-description-hint"
            rows={4}
            placeholder="Add context, impact, and what success looks like…"
            {...form.register("description")}
            maxLength={10000} readOnly={mutation.isPending}
          />
          <small className="field-hint" id="item-description-hint">
            A little context makes the next handoff easier.
          </small>
        </label>
        <fieldset className="form-grid" disabled={mutation.isPending}>
          <label>
            Team
            <select {...form.register("teamId")} disabled={!!item}>
              {teams
                .filter((t) => t.role !== "VIEWER" || item)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
            {error("teamId") && (
              <small className="field-error">{error("teamId")}</small>
            )}
          </label>
          <label>
            Type
            <select {...form.register("type")}>
              {types.map((t) => (
                <option key={t} value={t}>
                  {label(t)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              {...form.register("priority")}
              disabled={!!item && !isLead(role)}
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {label(p)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input type="date" aria-label="Due date" {...form.register("dueDate")} /><span className="date-shortcuts"><button type="button" className="text-button" onClick={()=>form.setValue("dueDate",new Date().toLocaleDateString("en-CA"),{shouldDirty:true})}>Today</button><button type="button" className="text-button" onClick={()=>form.setValue("dueDate","",{shouldDirty:true})}>Clear</button></span>
          </label>
          {item && (
            <label className="span-two">
              Assignee
              <select {...form.register("assigneeId")} disabled={!isLead(role)}>
                <option value="">Unassigned</option>
                {members.data?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {form.watch("assigneeId") && <span className="selected-assignee"><Avatar name={members.data?.find(m=>m.id===form.watch("assigneeId"))?.name??item.assigneeName??"Team member"}/><span>{members.data?.find(m=>m.id===form.watch("assigneeId"))?.name??item.assigneeName}</span><small>{members.data?.find(m=>m.id===form.watch("assigneeId"))?.role.toLowerCase()}</small></span>}
            </label>
          )}
        </fieldset>
        {mutation.isError && (
          <ErrorBox
            error={mutation.error}
            retry={() => {
              void queryClient.invalidateQueries({
                queryKey: ["item", item?.id],
              });
              onOpenChange(false);
            }}
          />
        )}
        <div className="form-footer">
          <span>
            {item
              ? `Editing version ${item.version}`
              : "Your team can see this item immediately."}
          </span>
          <button
            className="button secondary"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </button>
          <button
            className="button primary"
            disabled={mutation.isPending || !watchedTeam}
          >
            {mutation.isPending ? (
              <Spinner />
            ) : item ? (
              "Save changes"
            ) : (
              "Create item"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
