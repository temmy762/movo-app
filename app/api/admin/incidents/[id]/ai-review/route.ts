import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 503 });
  }

  const incident = await prisma.incidentReport.findUnique({
    where: { id },
    include: {
      booking: {
        select: {
          clientName: true, pickup: true, dropoff: true, carName: true,
          status: true, startedAt: true, completedAt: true, createdAt: true,
          driver: { select: { firstName: true, lastName: true } },
        },
      },
      user:   { select: { firstName: true, lastName: true } },
      driver: { select: { firstName: true, lastName: true } },
    },
  });

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  // Build trip context for AI
  const tripContext = incident.booking
    ? [
        `Booking ID: ${incident.bookingId}`,
        `Client: ${incident.booking.clientName}`,
        `Route: ${incident.booking.pickup} → ${incident.booking.dropoff}`,
        `Vehicle: ${incident.booking.carName}`,
        `Trip status: ${incident.booking.status}`,
        incident.booking.startedAt
          ? `Trip started at: ${incident.booking.startedAt.toISOString()}`
          : "Trip had not started when reported",
        incident.booking.completedAt
          ? `Trip completed at: ${incident.booking.completedAt.toISOString()}`
          : "Trip was not completed when reported",
        `Booking created: ${incident.booking.createdAt.toISOString()}`,
        incident.booking.driver
          ? `Driver: ${incident.booking.driver.firstName} ${incident.booking.driver.lastName}`
          : "No driver assigned",
      ].join("\n")
    : "No booking linked to this incident.";

  // Count location data points for context
  let locationCount = 0;
  if (incident.bookingId) {
    locationCount = await prisma.tripLocation.count({ where: { bookingId: incident.bookingId } });
  }

  const prompt = `You are an incident review assistant for a ride-hailing platform called MOVO.

A ${incident.reportedByRole} has submitted the following incident report:

Incident Type: ${incident.type}
Reported by: ${incident.reportedByRole === "RIDER"
    ? (incident.user ? `${incident.user.firstName} ${incident.user.lastName}` : "Rider")
    : (incident.driver ? `${incident.driver.firstName} ${incident.driver.lastName}` : "Driver")
  }
Description: ${incident.description}
Reported at: ${incident.createdAt.toISOString()}
GPS location points recorded during trip: ${locationCount}

Trip Context:
${tripContext}

Based on all available information, provide a structured analysis in valid JSON with these exact keys:
- "summary": a 2-3 sentence neutral summary of what happened
- "classification": the most accurate incident type from [ACCIDENT, UNSAFE_DRIVING, HARASSMENT, VEHICLE_ISSUE, ROUTE_DEVIATION, OTHER]
- "riskLevel": one of [LOW, MEDIUM, HIGH, CRITICAL]
- "suggestedAction": a concise recommended next step for the admin (1-2 sentences)

Respond with only the JSON object, no markdown.`;

  let aiResult: {
    summary: string;
    classification: string;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    suggestedAction: string;
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    aiResult = JSON.parse(raw);
  } catch (err) {
    console.error("OpenAI error:", err);
    return NextResponse.json({ error: "AI review failed" }, { status: 502 });
  }

  const validRiskLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const riskLevel = validRiskLevels.includes(aiResult.riskLevel) ? aiResult.riskLevel : "MEDIUM";

  const updated = await prisma.incidentReport.update({
    where: { id },
    data: {
      aiSummary:          aiResult.summary          ?? null,
      aiClassification:   aiResult.classification   ?? null,
      aiRiskLevel:        riskLevel as never,
      aiSuggestedAction:  aiResult.suggestedAction  ?? null,
      reviewStatus:       "AI_REVIEWED",
    },
  });

  return NextResponse.json({
    success: true,
    aiSummary:         updated.aiSummary,
    aiClassification:  updated.aiClassification,
    aiRiskLevel:       updated.aiRiskLevel,
    aiSuggestedAction: updated.aiSuggestedAction,
  });
}
