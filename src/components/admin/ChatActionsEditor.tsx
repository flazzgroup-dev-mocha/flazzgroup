"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChatQuickAction } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/field";

/**
 * The buttons inside the floating chat panel.
 *
 * Kept out of SettingsForm because each row is three linked controls, and the
 * ordering matters — the list renders top to bottom exactly as it reads here.
 */

const MAX_ACTIONS = 6;

const EMPTY: ChatQuickAction = {
  label: "",
  message: "Halo Admin,\n\n",
  channel: "WHATSAPP",
};

export function ChatActionsEditor({
  actions,
  onChange,
  errors,
  whatsappConfigured,
  telegramConfigured,
}: {
  actions: ChatQuickAction[];
  onChange: (next: ChatQuickAction[]) => void;
  errors: Record<string, string>;
  whatsappConfigured: boolean;
  telegramConfigured: boolean;
}) {
  function update(index: number, values: Partial<ChatQuickAction>) {
    onChange(
      actions.map((action, i) => (i === index ? { ...action, ...values } : action))
    );
  }

  function remove(index: number) {
    onChange(actions.filter((_, i) => i !== index));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= actions.length) return;

    const next = [...actions];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="grid gap-3">
      {actions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/12 bg-white/[.02] px-4 py-6 text-center text-sm text-mist">
          No quick actions. The panel will still show the direct WhatsApp and
          Telegram buttons.
        </p>
      ) : null}

      {actions.map((action, index) => {
        const unreachable =
          (action.channel === "WHATSAPP" && !whatsappConfigured) ||
          (action.channel === "TELEGRAM" && !telegramConfigured);

        return (
          <div
            key={index}
            className={cn(
              "grid gap-3 rounded-2xl border p-3.5",
              unreachable
                ? "border-amber-400/30 bg-amber-400/[.04]"
                : "border-white/10 bg-white/[.02]"
            )}
          >
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${action.label || "action"} up`}
                  className="grid size-5 place-items-center rounded text-fog transition-colors hover:text-foam disabled:opacity-25"
                >
                  <GripVertical className="size-3.5 rotate-90" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === actions.length - 1}
                  aria-label={`Move ${action.label || "action"} down`}
                  className="grid size-5 place-items-center rounded text-fog transition-colors hover:text-foam disabled:opacity-25"
                >
                  <GripVertical className="size-3.5 -rotate-90" aria-hidden />
                </button>
              </div>

              <input
                type="text"
                value={action.label}
                onChange={(event) => update(index, { label: event.target.value })}
                placeholder="Button label — e.g. Top Up Royal Dream"
                aria-label={`Quick action ${index + 1} label`}
                className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-ink-800/60 px-3 text-sm font-medium text-foam placeholder:text-fog focus:border-volt/60 focus:outline-none"
              />

              <NativeSelect
                value={action.channel}
                onChange={(event) =>
                  update(index, {
                    channel: event.target.value as ChatQuickAction["channel"],
                  })
                }
                aria-label={`Quick action ${index + 1} channel`}
                className="h-10 w-32 shrink-0 py-0"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="TELEGRAM">Telegram</option>
              </NativeSelect>

              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove ${action.label || `quick action ${index + 1}`}`}
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 text-mist transition-colors hover:border-red-500/50 hover:text-red-300"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>

            <textarea
              value={action.message}
              onChange={(event) => update(index, { message: event.target.value })}
              rows={3}
              placeholder="Halo Admin,&#10;&#10;Saya ingin…"
              aria-label={`Quick action ${index + 1} message`}
              className="w-full rounded-xl border border-white/10 bg-ink-800/60 px-3 py-2 text-sm text-foam placeholder:text-fog focus:border-volt/60 focus:outline-none"
            />

            {action.channel === "TELEGRAM" ? (
              <p className="text-xs text-amber-300/90">
                Telegram cannot pre-fill a message in a direct chat — this action
                opens the conversation, and the text above is not sent. Use
                WhatsApp if the wording matters.
              </p>
            ) : null}

            {unreachable ? (
              <p className="text-xs text-amber-300/90">
                No{" "}
                {action.channel === "WHATSAPP" ? "WhatsApp" : "Telegram"} link is
                set under Contact &amp; social, so this action is hidden from
                visitors.
              </p>
            ) : null}

            {errors[`chatQuickActions.${index}.label`] ? (
              <p role="alert" className="text-xs font-medium text-red-400">
                {errors[`chatQuickActions.${index}.label`]}
              </p>
            ) : null}
            {errors[`chatQuickActions.${index}.message`] ? (
              <p role="alert" className="text-xs font-medium text-red-400">
                {errors[`chatQuickActions.${index}.message`]}
              </p>
            ) : null}
          </div>
        );
      })}

      {actions.length < MAX_ACTIONS ? (
        <Button
          type="button"
          variant="glass"
          size="sm"
          onClick={() => onChange([...actions, { ...EMPTY }])}
          className="justify-self-start"
        >
          <Plus aria-hidden />
          Add quick action
        </Button>
      ) : (
        <p className="text-xs text-fog">
          Six is the maximum — beyond that the panel stops being a shortcut.
        </p>
      )}
    </div>
  );
}
