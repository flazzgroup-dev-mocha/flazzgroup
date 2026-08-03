import { reorderRoute } from "@/lib/crud";
import { applyOrder } from "@/lib/reorder";

export const { POST } = reorderRoute({
  resource: "products",
  apply: (ids) => applyOrder("products", ids),
});
