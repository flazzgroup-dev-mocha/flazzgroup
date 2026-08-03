import { reorderRoute } from "@/lib/crud";
import { applyOrder } from "@/lib/reorder";

export const { POST } = reorderRoute({
  resource: "payments",
  apply: (ids) => applyOrder("payments", ids),
});
