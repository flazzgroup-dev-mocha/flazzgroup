"use client";

import type { Faq } from "@/lib/models";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import { ActiveBadge } from "@/components/admin/cells";
import { ResourceScreen } from "@/components/admin/ResourceScreen";

type Draft = {
  question: string;
  answer: string;
  isActive: boolean;
  order: number;
};

export function FaqManager({ items }: { items: Faq[] }) {
  return (
    <ResourceScreen<Faq, Draft>
      endpoint="/api/faq"
      items={items}
      singular="FAQ"
      addLabel="Add question"
      emptyHint="Questions also feed the FAQ structured data used by search engines."
      columns={[
        {
          header: "Question",
          cell: (row) => (
            <span className="block max-w-md truncate font-semibold text-foam">
              {row.question}
            </span>
          ),
        },
        {
          header: "Answer",
          cell: (row) => (
            <span className="block max-w-md truncate text-xs text-fog">
              {row.answer}
            </span>
          ),
        },
        { header: "Status", cell: (row) => <ActiveBadge active={row.isActive} /> },
      ]}
      itemLabel={(row) => row.question}
      toDraft={(row) => ({
        question: row?.question ?? "",
        answer: row?.answer ?? "",
        isActive: row?.isActive ?? true,
        order: row?.order ?? items.length,
      })}
      renderForm={(draft, patch, errors) => (
        <>
          <Field label="Question" htmlFor="question" error={errors.question} required>
            <Input
              id="question"
              value={draft.question}
              onChange={(e) => patch({ question: e.target.value })}
              aria-invalid={Boolean(errors.question)}
            />
          </Field>

          <Field label="Answer" htmlFor="answer" error={errors.answer} required hint="Keep it to two or three sentences.">
            <Textarea
              id="answer"
              value={draft.answer}
              onChange={(e) => patch({ answer: e.target.value })}
              className="min-h-32"
              aria-invalid={Boolean(errors.answer)}
            />
          </Field>

          <SwitchRow
            id="isActive"
            label="Show this question"
            checked={draft.isActive}
            onCheckedChange={(value) => patch({ isActive: value })}
          />
        </>
      )}
    />
  );
}
