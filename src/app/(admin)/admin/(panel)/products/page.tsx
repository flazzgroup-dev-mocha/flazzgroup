import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductManager } from "@/components/admin/managers/ProductManager";

export const dynamic = "force-dynamic";

export default async function ProductPage() {
  const items = await prisma.product.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <>
      <PageHeader
        eyebrow="Homepage"
        title="Products"
        description="Coin denominations and services in the Royal Dream grid."
      />
      <ProductManager items={items} />
    </>
  );
}
