import OpenApp from "./OpenApp";

/* Hand-off page for flows that leave the mobile app for an https-only site
   (Stripe Connect onboarding). Only known destinations are allowed, so this
   can't be used as an open redirect. */
const DESTINATIONS: Record<string, string> = {
  banking: "movochauffeur://banking",
};

export default async function AppReturnPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { to = "", connect } = await searchParams;
  const base = DESTINATIONS[to];
  const href = base ? `${base}${connect === "success" || connect === "refresh" ? `?connect=${connect}` : ""}` : null;

  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: "#F5F5F2" }}>
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm p-6 text-center">
        <p className="text-[18px] font-bold text-[#131936]">
          {connect === "refresh" ? "Let's try that again" : "All done"}
        </p>
        <p className="text-[13px] text-gray-500 mt-2">
          {href ? "Returning you to the Movo app…" : "You can close this page and go back to the Movo app."}
        </p>
        {href && <OpenApp href={href} />}
      </div>
    </main>
  );
}
