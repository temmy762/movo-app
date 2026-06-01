"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type SimulatorStatus = "idle" | "running" | "paused";
type LogEntry = {
  id: string;
  time: string;
  message: string;
  type: "info" | "success" | "error";
};

// ── Constants ─────────────────────────────────────────────────────────────────
const SIMULATOR_CONFIG = {
  bookingId: "sim-001",
  driverId: "driver-sim-001",
  driverName: "Simulator Driver",
  vehicle: "Tesla Model 3",
  vehicleNumber: "SIM-123",
  // Route: Los Angeles area (downtown to Santa Monica)
  routePoints: [
    { lat: 34.0522, lng: -118.2437, name: "Downtown LA" },
    { lat: 34.0407, lng: -118.2468, name: "Staples Center" },
    { lat: 34.0294, lng: -118.2521, name: "USC Area" },
    { lat: 34.0189, lng: -118.2842, name: "Mid-City" },
    { lat: 34.0141, lng: -118.2879, name: "Culver City Start" },
    { lat: 34.0102, lng: -118.2956, name: "Culver City Center" },
    { lat: 34.0067, lng: -118.3089, name: "West LA" },
    { lat: 34.0041, lng: -118.3212, name: "Sawtelle" },
    { lat: 34.0018, lng: -118.3298, name: "Santa Monica Border" },
    { lat: 34.0194, lng: -118.4912, name: "Santa Monica Pier" },
  ],
  speedKmh: 35, // Average speed in km/h
  updateIntervalMs: 3000, // Send location every 3 seconds
};

// ── Helper Functions ──────────────────────────────────────────────────────────
function interpolatePosition(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  progress: number
): { lat: number; lng: number } {
  return {
    lat: start.lat + (end.lat - start.lat) * progress,
    lng: start.lng + (end.lng - start.lng) * progress,
  };
}

function calculateHeading(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): number {
  const dLng = end.lng - start.lng;
  const dLat = end.lat - start.lat;
  const angle = Math.atan2(dLng, dLat) * (180 / Math.PI);
  return (angle + 360) % 360;
}

function calculateDistance(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── Components ─────────────────────────────────────────────────────────────────
export default function SimulatorPage() {
  const [status, setStatus] = useState<SimulatorStatus>("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [progress, setProgress] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [authToken, setAuthToken] = useState("");
  const [bookingId, setBookingId] = useState(SIMULATOR_CONFIG.bookingId);
  const [showTokenInput, setShowTokenInput] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        time: new Date().toLocaleTimeString(),
        message,
        type,
      },
    ]);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Calculate total route distance
  useEffect(() => {
    let distance = 0;
    for (let i = 0; i < SIMULATOR_CONFIG.routePoints.length - 1; i++) {
      distance += calculateDistance(
        SIMULATOR_CONFIG.routePoints[i],
        SIMULATOR_CONFIG.routePoints[i + 1]
      );
    }
    setTotalDistance(distance);
  }, []);

  const sendLocationUpdate = useCallback(
    async (position: { lat: number; lng: number }, heading: number, speed: number) => {
      try {
        // Detect if token is JWT (starts with eyJ) or session cookie (hex string)
        const isJWT = authToken.startsWith("eyJ");
        
        const response = await fetch("/api/trips/location", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(isJWT 
              ? { Authorization: `Bearer ${authToken}` }  // JWT: Bearer header
              : { "X-Session-Token": authToken }          // Session: custom header
            ),
          },
          credentials: "include", // Always include cookies
          body: JSON.stringify({
            bookingId,
            lat: position.lat,
            lng: position.lng,
            heading,
            speed,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`HTTP ${response.status}: ${error}`);
        }

        addLog(
          `Sent: ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)} (seg ${currentSegment + 1}/${
            SIMULATOR_CONFIG.routePoints.length - 1
          })`,
          "success"
        );
      } catch (error) {
        addLog(
          `Failed to send: ${error instanceof Error ? error.message : "Unknown error"}`,
          "error"
        );
      }
    },
    [authToken, currentSegment, addLog]
  );

  const startSimulation = useCallback(() => {
    if (!authToken) {
      addLog("Error: Auth token required", "error");
      return;
    }

    setStatus("running");
    setCurrentSegment(0);
    setProgress(0);
    setCurrentPosition(SIMULATOR_CONFIG.routePoints[0]);
    addLog("Simulation started", "info");

    // Send initial position
    sendLocationUpdate(SIMULATOR_CONFIG.routePoints[0], 0, 0);
  }, [authToken, addLog, sendLocationUpdate]);

  const pauseSimulation = useCallback(() => {
    setStatus("paused");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    addLog("Simulation paused", "info");
  }, [addLog]);

  const resumeSimulation = useCallback(() => {
    setStatus("running");
    addLog("Simulation resumed", "info");
  }, [addLog]);

  const stopSimulation = useCallback(() => {
    setStatus("idle");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentSegment(0);
    setProgress(0);
    setCurrentPosition(null);
    addLog("Simulation stopped", "info");
  }, [addLog]);

  // Simulation loop - runs when status is "running"
  useEffect(() => {
    if (status !== "running") {
      // Clean up interval when paused or stopped
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setProgress((prevProgress) => {
        const segmentStart = SIMULATOR_CONFIG.routePoints[currentSegment];
        const segmentEnd = SIMULATOR_CONFIG.routePoints[currentSegment + 1];

        if (!segmentEnd) {
          // Reached end of route
          addLog("Route completed!", "success");
          // Use setTimeout to avoid state update during render
          setTimeout(() => stopSimulation(), 0);
          return 0;
        }

        // Calculate distance for this segment
        const segmentDistance = calculateDistance(segmentStart, segmentEnd);
        // Calculate progress increment based on speed
        const progressIncrement =
          (SIMULATOR_CONFIG.speedKmh * (SIMULATOR_CONFIG.updateIntervalMs / 1000 / 3600)) /
          segmentDistance;

        const newProgress = prevProgress + progressIncrement;

        if (newProgress >= 1) {
          // Move to next segment
          setCurrentSegment((prev) => prev + 1);
          const nextPoint = SIMULATOR_CONFIG.routePoints[currentSegment + 2];
          const newPosition = interpolatePosition(segmentEnd, nextPoint || segmentEnd, 0);
          setCurrentPosition(newPosition);

          const heading = calculateHeading(segmentEnd, nextPoint || segmentEnd);
          // Read latest values from refs for the callback
          sendLocationUpdate(newPosition, heading, SIMULATOR_CONFIG.speedKmh);

          return 0;
        } else {
          // Continue on current segment
          const newPosition = interpolatePosition(segmentStart, segmentEnd, newProgress);
          setCurrentPosition(newPosition);

          const heading = calculateHeading(segmentStart, segmentEnd);
          sendLocationUpdate(newPosition, heading, SIMULATOR_CONFIG.speedKmh);

          return newProgress;
        }
      });
    }, SIMULATOR_CONFIG.updateIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, currentSegment, addLog, stopSimulation, sendLocationUpdate]);

  return (
    <div className="p-6 max-w-4xl mx-auto h-full overflow-y-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">🚗 Driver Location Simulator</h1>

      {/* Auth Token Input */}
      {showTokenInput && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Authentication Required</h3>
          <p className="text-sm text-yellow-700 mb-3">
            Enter either a <strong>JWT token</strong> (starts with eyJ...) or <strong>session cookie</strong> (hex string) from a logged-in driver session.
          </p>
          <div className="text-xs text-yellow-600 mb-3 bg-yellow-100 p-2 rounded">
            <strong>JWT:</strong> From localStorage after driver login<br/>
            <strong>Session:</strong> From DevTools → Application → Cookies → movo_session
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Paste JWT or session token..."
              className="flex-1 px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
            <button
              onClick={() => setShowTokenInput(false)}
              disabled={!authToken}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 disabled:opacity-50"
            >
              Save Token
            </button>
          </div>
        </div>
      )}

      {/* Booking ID Input */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">Booking ID</h3>
        <p className="text-sm text-blue-700 mb-3">
          Enter the booking ID for the trip you want to simulate.
        </p>
        <input
          type="text"
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          placeholder="e.g., cmpmpaius0000osvfcakjoxmq"
          className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Simulation Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Simulation Control</h2>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                status === "running"
                  ? "bg-green-500 animate-pulse"
                  : status === "paused"
                  ? "bg-yellow-500"
                  : "bg-gray-400"
              }`}
            />
            <span className="text-sm font-medium text-gray-700 capitalize">{status}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Driver</p>
            <p className="font-medium text-gray-900">{SIMULATOR_CONFIG.driverName}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Vehicle</p>
            <p className="font-medium text-gray-900">{SIMULATOR_CONFIG.vehicle}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Booking ID</p>
            <p className="font-medium text-gray-900 text-sm truncate">{SIMULATOR_CONFIG.bookingId}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Route Distance</p>
            <p className="font-medium text-gray-900">{totalDistance.toFixed(1)} km</p>
          </div>
        </div>

        {currentPosition && (
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-600 mb-1">Current Position</p>
            <p className="font-mono text-sm text-blue-900">
              {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
            </p>
            <p className="text-xs text-blue-500 mt-1">
              Segment {currentSegment + 1} of {SIMULATOR_CONFIG.routePoints.length - 1} • Progress: {(progress * 100).toFixed(1)}%
            </p>
          </div>
        )}

        <div className="flex gap-3">
          {status === "idle" && (
            <button
              onClick={startSimulation}
              disabled={!authToken}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ▶ Start Simulation
            </button>
          )}
          {status === "running" && (
            <button
              onClick={pauseSimulation}
              className="flex-1 py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors"
            >
              ⏸ Pause
            </button>
          )}
          {status === "paused" && (
            <button
              onClick={resumeSimulation}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              ▶ Resume
            </button>
          )}
          {(status === "running" || status === "paused") && (
            <button
              onClick={stopSimulation}
              className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              ⏹ Stop
            </button>
          )}
        </div>
      </div>

      {/* Route Info */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Route Details</h2>
        <div className="space-y-2">
          {SIMULATOR_CONFIG.routePoints.map((point, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                index === currentSegment
                  ? "bg-blue-100 border border-blue-300"
                  : index < currentSegment
                  ? "bg-green-50"
                  : "bg-gray-50"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === currentSegment
                    ? "bg-blue-500 text-white"
                    : index < currentSegment
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">{point.name}</p>
                <p className="text-xs text-gray-500">
                  {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                </p>
              </div>
              {index === currentSegment && (
                <span className="text-xs font-medium text-blue-600">Current</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Activity Log</h2>
          <button
            onClick={() => setLogs([])}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-gray-500">No activity yet. Start simulation to see logs...</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="mb-1">
                <span className="text-gray-500">[{log.time}]</span>{" "}
                <span
                  className={
                    log.type === "success"
                      ? "text-green-400"
                      : log.type === "error"
                      ? "text-red-400"
                      : "text-blue-400"
                  }
                >
                  {log.type === "success" ? "✓" : log.type === "error" ? "✗" : "ℹ"}
                </span>{" "}
                <span
                  className={
                    log.type === "success"
                      ? "text-green-300"
                      : log.type === "error"
                      ? "text-red-300"
                      : "text-gray-300"
                  }
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-2">How to use:</h3>
        <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
          <li>Open the tracking page in another tab: <a href="/admin/tracking" target="_blank" className="text-blue-600 hover:underline">/admin/tracking</a></li>
          <li>Get a valid driver auth token (login as a driver and copy from browser DevTools → Application → Cookies or localStorage)</li>
          <li>Enter the token above and click "Start Simulation"</li>
          <li>Watch the driver move along the route on the tracking map in real-time</li>
          <li>Location updates are sent every 3 seconds</li>
        </ol>
      </div>
    </div>
  );
}
