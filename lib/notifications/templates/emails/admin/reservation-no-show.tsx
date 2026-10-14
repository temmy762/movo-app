import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function adminReservationNoShowTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { data, settings } = context;
  const info = data as {
    bookingId: string;
    bookingRef?: string;
    pickupTime?: string;
    pickup?: string;
    clientName?: string;
    riderPhone?: string;
    driverName?: string;
    driverPhone?: string;
  };
  const ref = info.bookingRef ?? info.bookingId;

  const preview = `Reserved ride ${ref}: chauffeur hasn't set off`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#b91c1c", fontSize: "24px", marginBottom: "16px" }}>
        Reserved ride — chauffeur hasn&apos;t set off
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        The pickup time for this reservation has passed and the assigned chauffeur hasn&apos;t
        tapped &ldquo;Heading to pickup&rdquo;. Please contact the chauffeur, or reassign or cancel the ride.
      </Text>

      <Section
        style={{
          backgroundColor: "#fff1f2",
          padding: "20px",
          borderRadius: "8px",
          marginTop: "24px",
          borderLeft: "4px solid #ef4444",
        }}
      >
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}><strong>Booking:</strong> {ref}</Text>
        {info.pickupTime && <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}><strong>Pickup time:</strong> {info.pickupTime}</Text>}
        {info.pickup && <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}><strong>Pickup:</strong> {info.pickup}</Text>}
        {info.clientName && <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}><strong>Rider:</strong> {info.clientName}{info.riderPhone ? ` · ${info.riderPhone}` : ""}</Text>}
        {info.driverName && <Text style={{ fontSize: "14px", color: "#666666" }}><strong>Chauffeur:</strong> {info.driverName}{info.driverPhone ? ` · ${info.driverPhone}` : ""}</Text>}
      </Section>

      <Button
        href={`${settings.baseUrl}/admin/bookings`}
        style={{
          backgroundColor: "#131936",
          color: "#ffffff",
          padding: "14px 32px",
          borderRadius: "6px",
          textDecoration: "none",
          display: "inline-block",
          marginTop: "24px",
          fontSize: "16px",
          fontWeight: "600",
        }}
      >
        Review Booking
      </Button>
    </EmailLayout>
  );

  const text = `
Reserved ride — chauffeur hasn't set off

The pickup time for this reservation has passed and the assigned chauffeur hasn't tapped "Heading to pickup". Please contact the chauffeur, or reassign or cancel the ride.

Booking: ${ref}
${info.pickupTime ? `Pickup time: ${info.pickupTime}` : ""}
${info.pickup ? `Pickup: ${info.pickup}` : ""}
${info.clientName ? `Rider: ${info.clientName}${info.riderPhone ? ` · ${info.riderPhone}` : ""}` : ""}
${info.driverName ? `Chauffeur: ${info.driverName}${info.driverPhone ? ` · ${info.driverPhone}` : ""}` : ""}

Review booking: ${settings.baseUrl}/admin/bookings

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `⚠️ Reserved ride ${ref}: chauffeur hasn't set off - ${settings.appName}`,
    html,
    text,
  };
}
