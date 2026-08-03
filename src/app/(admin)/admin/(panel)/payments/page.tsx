import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { PaymentManager } from "@/components/admin/managers/PaymentManager";

export const dynamic = "force-dynamic";

export default async function PaymentPage() {
  const items = await prisma.paymentMethod.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <>
      <PageHeader
        eyebrow="Homepage"
        title="Payment methods"
        description="Methods scrolling through the payment marquee."
      />
      <PaymentManager items={items} />
    </>
  );
}
