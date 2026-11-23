import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { DemoBanner } from "@/components/site/demo-banner";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DemoBanner />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
