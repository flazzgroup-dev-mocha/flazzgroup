import { reorderRoute } from "@/lib/crud";
import { applyOrder } from "@/lib/reorder";

export const { POST } = reorderRoute({
  resource: "games",
  apply: (ids) => applyOrder("games", ids),
});
