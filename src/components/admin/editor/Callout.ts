import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutTone = "info" | "tip" | "warning";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (tone: CalloutTone) => ReturnType;
      toggleCallout: (tone: CalloutTone) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

/**
 * A highlighted aside — the "note / tip / warning" box used to pull a key
 * fact out of the body copy.
 *
 * Stored as `<div data-callout="tip">…</div>`, which is exactly what the
 * article sanitiser allows through, so what the editor produces is what the
 * published page renders.
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: "info" as CalloutTone,
        parseHTML: (element) => element.getAttribute("data-callout") ?? "info",
        renderHTML: (attributes) => ({ "data-callout": attributes.tone }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCallout:
        (tone) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { tone }),
      toggleCallout:
        (tone) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { tone }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
