import { reorderRoute } from "@/lib/crud";
import { applyOrder } from "@/lib/reorder";

export const { POST } = reorderRoute({
  resource: "brands",
  apply: (ids) => applyOrder("brands", ids),
});
