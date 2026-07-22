import ServiceDetailPage from "../components/ServiceDetailPage";

export default function ByTheHourPage() {
  return (
    <ServiceDetailPage
      title="By The Hour"
      bannerImg="/images/by-the-hour.png"
      mode="hourly"
      desc="Your personal chauffeur, available by the hour."
    />
  );
}
