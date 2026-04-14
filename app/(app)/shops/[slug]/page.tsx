import { notFound } from "next/navigation";
import { getShopBySlug, getShopSessions } from "../actions";
import { ShopDetailView } from "@/components/shop/shop-detail-view";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ShopDetailPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);

  if (!shop) notFound();

  const sessions = await getShopSessions(shop.id);

  return <ShopDetailView shop={shop} sessions={sessions} />;
}
