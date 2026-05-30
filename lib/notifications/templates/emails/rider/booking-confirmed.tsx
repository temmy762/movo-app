import { Button, Heading, Text, Hr, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function riderBookingConfirmedTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const booking = data as {
    bookingId: string;
    pickup: string;
    dropoff: string;
    carTier: string;
    fare: number;
    serviceFee: number;
    total: number;
    scheduledDate?: string;
  };

  const preview = `Your ${settings.appName} booking is confirmed!`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        Booking Confirmed!
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        Hi {recipient.firstName}, your ride has been confirmed.
      </Text>

      <Section
        style={{
          backgroundColor: "#f9f9f9",
          padding: "20px",
          borderRadius: "8px",
          marginTop: "24px",
        }}
      >
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "8px" }}>
          <strong>Booking ID:</strong> {booking.bookingId}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "8px" }}>
          <strong>Service:</strong> {booking.carTier}
        </Text>
        {booking.scheduledDate && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "8px" }}>
            <strong>Scheduled:</strong> {booking.scheduledDate}
          </Text>
        )}
      </Section>

      <Section style={{ marginTop: "24px" }}>
        <Text style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>
          Pickup Location
        </Text>
        <Text style={{ fontSize: "14px", color: "#333333" }}>{booking.pickup}</Text>

        <Text
          style={{ fontSize: "16px", fontWeight: "600", marginTop: "16px", marginBottom: "8px" }}
        >
          Dropoff Location
        </Text>
        <Text style={{ fontSize: "14px", color: "#333333" }}>{booking.dropoff}</Text>
      </Section>

      <Hr style={{ borderColor: "#e6e6e6", margin: "24px 0" }} />

      <Section>
        <Text style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>
          Fare Breakdown
        </Text>
        <Text style={{ fontSize: "14px", color: "#333333" }}>
          Ride fare: ${booking.fare.toFixed(2)}
        </Text>
        <Text style={{ fontSize: "14px", color: "#333333" }}>
          Service fee: ${booking.serviceFee.toFixed(2)}
        </Text>
        <Text
          style={{ fontSize: "16px", fontWeight: "700", color: "#2D0A53", marginTop: "8px" }}
        >
          Total: ${booking.total.toFixed(2)}
        </Text>
      </Section>

      <Button
        href={`${settings.baseUrl}/home/rides/${booking.bookingId}`}
        style={{
          backgroundColor: "#2D0A53",
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
        Track Your Ride
      </Button>
    </EmailLayout>
  );

  const text = `
Booking Confirmed!

Hi ${recipient.firstName}, your ride has been confirmed.

Booking ID: ${booking.bookingId}
Service: ${booking.carTier}
${booking.scheduledDate ? `Scheduled: ${booking.scheduledDate}` : ""}

Pickup Location: ${booking.pickup}
Dropoff Location: ${booking.dropoff}

Fare Breakdown:
Ride fare: $${booking.fare.toFixed(2)}
Service fee: $${booking.serviceFee.toFixed(2)}
Total: $${booking.total.toFixed(2)}

Track your ride: ${settings.baseUrl}/home/rides/${booking.bookingId}

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `Your ${settings.appName} ride is confirmed!`,
    html,
    text,
  };
}
