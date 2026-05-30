import { Button, Heading, Text, Hr, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function chauffeurBookingAssignedTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const booking = data as {
    bookingId: string;
    pickup: string;
    dropoff: string;
    carTier: string;
    fare: number;
    clientName: string;
    clientPhone?: string;
    scheduledTime?: string;
    estimatedDistance?: string;
  };

  const preview = `New booking assigned - ${settings.appName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        New Booking Assigned
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        Hi {recipient.firstName}, you have a new booking!
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
          <strong>Booking ID:</strong> {booking.bookingId}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Service:</strong> {booking.carTier}
        </Text>
        {booking.scheduledTime && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
            <strong>Pickup Time:</strong> {booking.scheduledTime}
          </Text>
        )}
        {booking.estimatedDistance && (
          <Text style={{ fontSize: "14px", color: "#666666" }}>
            <strong>Est. Distance:</strong> {booking.estimatedDistance}
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
          Client
        </Text>
        <Text style={{ fontSize: "14px", color: "#333333" }}>
          {booking.clientName}
        </Text>
        {booking.clientPhone && (
          <Text style={{ fontSize: "14px", color: "#666666", marginTop: "4px" }}>
            <strong>Phone:</strong> {booking.clientPhone}
          </Text>
        )}
      </Section>

      <Hr style={{ borderColor: "#e6e6e6", margin: "24px 0" }} />

      <Section>
        <Text style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>
          Fare Breakdown
        </Text>
        <Text style={{ fontSize: "14px", color: "#333333" }}>
          Ride fare: ${booking.fare.toFixed(2)}
        </Text>
        <Text
          style={{ fontSize: "16px", fontWeight: "700", color: "#2D0A53", marginTop: "8px" }}
        >
          Your Earnings: ${(booking.fare * 0.75).toFixed(2)}
        </Text>
      </Section>

      <Button
        href={`${settings.baseUrl}/driver/bookings/${booking.bookingId}`}
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
        View Booking Details
      </Button>
    </EmailLayout>
  );

  const text = `
New Booking Assigned

Hi ${recipient.firstName}, you have a new booking!

Booking ID: ${booking.bookingId}
Service: ${booking.carTier}
${booking.scheduledTime ? `Pickup Time: ${booking.scheduledTime}` : ""}
${booking.estimatedDistance ? `Est. Distance: ${booking.estimatedDistance}` : ""}

Pickup Location: ${booking.pickup}
Dropoff Location: ${booking.dropoff}

Client: ${booking.clientName}
${booking.clientPhone ? `Phone: ${booking.clientPhone}` : ""}

Fare Breakdown:
Ride fare: $${booking.fare.toFixed(2)}
Your Earnings: $${(booking.fare * 0.75).toFixed(2)}

View booking details: ${settings.baseUrl}/driver/bookings/${booking.bookingId}

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `New booking assigned - ${settings.appName}`,
    html,
    text,
  };
}
