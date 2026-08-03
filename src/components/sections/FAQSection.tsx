"use client";

import { MessageCircleMore } from "lucide-react";

import { TrackedLink } from "@/components/analytics/TrackedLink";

import type { Faq } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal, RevealItem } from "@/components/common/Reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQSection({
  faqs,
  supportUrl,
}: {
  faqs: Faq[];
  supportUrl: string;
}) {
  if (faqs.length === 0) return null;

  return (
    <section id="faq" aria-labelledby="faq-title" className="relative scroll-mt-28 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:gap-12">
          {/* Aside */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading
              eyebrow="FAQ"
              title={
                <span id="faq-title">
                  Yang paling <span className="text-royal">sering ditanya</span>
                </span>
              }
              className="mb-6 sm:mb-8"
            />
            {supportUrl ? (
              <Reveal direction="up" delay={0.1}>
                <div className="glass seam rounded-[1.5rem] p-5 sm:p-6">
                  <p className="text-sm font-semibold text-foam">Belum terjawab?</p>
                  <p className="mt-1 text-sm text-mist">
                    Admin balas di bawah 3 menit.
                  </p>
                  <Button variant="gold" size="md" asChild className="mt-4 w-full">
                    {/* A conversion like any other. This button sends someone
                        who has just read the FAQ and still has a question
                        straight to the admin, which is about as high-intent as
                        this site gets — leaving it unmeasured means the FAQ
                        looks like it converts nobody. */}
                    <TrackedLink
                      href={supportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      event="contact_telegram"
                      params={{ location: "faq", destination: supportUrl }}
                    >
                      <MessageCircleMore aria-hidden />
                      Tanya admin
                    </TrackedLink>
                  </Button>
                </div>
              </Reveal>
            ) : null}
          </div>

          {/* Accordion */}
          <Reveal stagger={0.07}>
            <Accordion
              type="single"
              collapsible
              defaultValue={faqs[0]?.id}
              className="grid gap-3"
            >
              {faqs.map((faq) => (
                <RevealItem key={faq.id}>
                  <AccordionItem value={faq.id}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                </RevealItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
