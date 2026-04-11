import { SiteFooter } from "@/components/layout/site-footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">{children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}
