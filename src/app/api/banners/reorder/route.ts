import { reorderRoute } from "@/lib/crud";
import { applyOrder } from "@/lib/reorder";

export const { POST } = reorderRoute({
  resource: "banners",
  apply: (ids) => applyOrder("banners", ids),
});
