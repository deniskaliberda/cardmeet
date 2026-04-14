import { getAllShopsWithCounts } from "./actions";
import { ShopsPageClient } from "@/components/shop/shops-page-client";

export default async function ShopsPage() {
  const shops = await getAllShopsWithCounts();

  return <ShopsPageClient shops={shops} />;
}
