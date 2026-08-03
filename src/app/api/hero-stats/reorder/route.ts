import { reorderRoute } from "@/lib/crud";
import { applyOrder } from "@/lib/reorder";

export const { POST } = reorderRoute({
  resource: "heroStats",
  apply: (ids) => applyOrder("hero-stats", ids),
});
