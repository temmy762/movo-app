import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function riderDriverAssignedTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const driver = data as {
    driverName: string;
    driverPhone?: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleColor: string;
    vehiclePlate: string;
    bookingId: string;
    eta?: string;
  };

  const preview = `Your driver ${driver.driverName} is on the way!`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        Driver Assigned
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        Good news, {recipient.firstName}! Your driver is on the way.
      </Text>

      <Section
        style={{
          backgroundColor: "#f9f9f9",
          padding: "24px",
          borderRadius: "8px",
          marginTop: "24px",
        }}
      >
        <Text style={{ fontSize: "18px", fontWeight: "600", marginBottom: "4px" }}>
          {driver.driverName}
        </Text>
        {driver.eta && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "12px" }}>
            ETA: {driver.eta}
          </Text>
        )}

        <Text
          style={{
            fontSize: "14px",
            color: "#333333",
            marginTop: "16px",
            marginBottom: "4px",
          }}
        >
          Vehicle
        </Text>
        <Text style={{ fontSize: "16px", fontWeight: "500" }}>
          {driver.vehicleColor} {driver.vehicleMake} {driver.vehicleModel}
        </Text>
        <Text
          style={{
            fontSize: "20px",
            fontWeight: "700",
            letterSpacing: "2px",
            marginTop: "8px",
            padding: "8px 16px",
            backgroundColor: "#2D0A53",
            color: "#ffffff",
            borderRadius: "4px",
            display: "inline-block",
          }}
        >
          {driver.vehiclePlate}
        </Text>
      </Section>

      {driver.driverPhone && (
        <Text style={{ fontSize: "14px", color: "#666666", marginTop: "16px" }}>
          Need to contact your driver? Call: {driver.driverPhone}
        </Text>
      )}

      <Button
        href={`${settings.baseUrl}/home/rides/${driver.bookingId}`}
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
        Track Your Driver
      </Button>
    </EmailLayout>
  );

  const text = `
Driver Assigned

Good news, ${recipient.firstName}! Your driver is on the way.

Driver: ${driver.driverName}
${driver.eta ? `ETA: ${driver.eta}` : ""}

Vehicle: ${driver.vehicleColor} ${driver.vehicleMake} ${driver.vehicleModel}
License Plate: ${driver.vehiclePlate}

${driver.driverPhone ? `Contact: ${driver.driverPhone}` : ""}

Track your driver: ${settings.baseUrl}/home/rides/${driver.bookingId}

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `Your driver is on the way!`,
    html,
    text,
  };
}
