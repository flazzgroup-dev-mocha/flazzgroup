import { reorderRoute } from "@/lib/crud";
import { applyOrder } from "@/lib/reorder";

export const { POST } = reorderRoute({
  resource: "popular",
  apply: (ids) => applyOrder("popular", ids),
});
