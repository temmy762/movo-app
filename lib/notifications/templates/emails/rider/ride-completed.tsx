import { Button, Heading, Text, Hr, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function riderRideCompletedTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const ride = data as {
    bookingId: string;
    pickup: string;
    dropoff: string;
    driverName: string;
    vehicleInfo: string;
    total: number;
    completedAt: string;
  };

  const preview = `Your ride is complete! Rate your experience.`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        Ride Completed
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        Thanks for riding with {settings.appName}, {recipient.firstName}!
      </Text>

      <Section
        style={{
          backgroundColor: "#f9f9f9",
          padding: "20px",
          borderRadius: "8px",
          marginTop: "24px",
        }}
      >
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Driver:</strong> {ride.driverName}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Vehicle:</strong> {ride.vehicleInfo}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>From:</strong> {ride.pickup}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666" }}>
          <strong>To:</strong> {ride.dropoff}
        </Text>
      </Section>

      <Hr style={{ borderColor: "#e6e6e6", margin: "24px 0" }} />

      <Section>
        <Text style={{ fontSize: "18px", fontWeight: "700", color: "#2D0A53" }}>
          Total Paid: ${ride.total.toFixed(2)}
        </Text>
      </Section>

      <Text style={{ fontSize: "16px", color: "#333333", marginTop: "24px" }}>
        How was your ride? Your feedback helps us improve.
      </Text>

      <Button
        href={`${settings.baseUrl}/home/rides/${ride.bookingId}`}
        style={{
          backgroundColor: "#2D0A53",
          color: "#ffffff",
          padding: "14px 32px",
          borderRadius: "6px",
          textDecoration: "none",
          display: "inline-block",
          marginTop: "16px",
          fontSize: "16px",
          fontWeight: "600",
        }}
      >
        Rate Your Ride
      </Button>
    </EmailLayout>
  );

  const text = `
Ride Completed

Thanks for riding with ${settings.appName}, ${recipient.firstName}!

Driver: ${ride.driverName}
Vehicle: ${ride.vehicleInfo}
From: ${ride.pickup}
To: ${ride.dropoff}

Total Paid: $${ride.total.toFixed(2)}

How was your ride? Your feedback helps us improve.
Rate your ride: ${settings.baseUrl}/home/rides/${ride.bookingId}

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `How was your ride with ${settings.appName}?`,
    html,
    text,
  };
}
