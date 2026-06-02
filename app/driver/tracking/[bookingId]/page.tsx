"use client";

import { useEffect, useState, useRef } from "react";
import { startLocationTracking } from "@/lib/location-service";
import { useRouter } from "next/navigation";

interface DriverTrackingProps {
  params: { bookingId: string };
}

export default function DriverTrackingPage({ params }: DriverTrackingProps) {
  const { bookingId } = params;
  const router = useRouter();
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const stopTrackingRef = useRef<(() => void) | null>(null);
  const tokenRef = useRef<string>("");

  // Fetch booking and driver info
  useEffect(() => {
    const fetchBookingAndAuth = async () => {
      try {
        // Get current session/auth
        const authResponse = await fetch("/api/auth/me");
        if (!authResponse.ok) {
          setError("Authentication required. Please log in.");
          setLoading(false);
          return;
        }

        const authData = await authResponse.json();
        tokenRef.current = authData.token;

        // Fetch booking details
        const bookingResponse = await fetch(`/api/bookings/${bookingId}`);
        if (!bookingResponse.ok) {
          setError("Booking not found");
          setLoading(false);
          return;
        }

        const bookingData = await bookingResponse.json();
        setBooking(bookingData);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load booking");
        setLoading(false);
      }
    };

    fetchBookingAndAuth();
  }, [bookingId]);

  // Start tracking when component mounts (if not already tracking)
  useEffect(() => {
    if (!isTracking && !loading && tokenRef.current && bookingId) {
      handleStartTracking();
    }

    return () => {
      if (stopTrackingRef.current) {
        stopTrackingRef.current();
      }
    };
  }, [loading, bookingId]);

  const handleStartTracking = async () => {
    try {
      setError(null);

      if (!tokenRef.current) {
        setError("Authentication token not found");
        return;
      }

      // Start location tracking
      const stopTracking = await startLocationTracking(
        bookingId,
        tokenRef.current,
        (location) => {
          setLocation({ lat: location.lat, lng: location.lng });
          setUpdateCount((prev) => prev + 1);
        },
        (error) => {
          setError(error);
        }
      );

      stopTrackingRef.current = stopTracking;
      setIsTracking(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start tracking");
    }
  };

  const handleStopTracking = () => {
    if (stopTrackingRef.current) {
      stopTrackingRef.current();
      setIsTracking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trip information...</p>
        </div>
      </div>
    );
  }

  if (error && !isTracking) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-900 mb-2">Error</h1>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => router.back()}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Trip Tracking</h1>
          <p className="text-sm text-gray-600 mt-1">Booking ID: {bookingId}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tracking Status</p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isTracking ? "bg-green-500" : "bg-gray-400"
                  }`}
                ></div>
                <p className="text-lg font-semibold text-gray-900">
                  {isTracking ? "🟢 Tracking Active" : "🔴 Tracking Stopped"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Updates Sent</p>
              <p className="text-2xl font-bold text-blue-600">{updateCount}</p>
            </div>
          </div>

          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <p className="text-sm text-yellow-800">{error}</p>
            </div>
          )}

          {location && (
            <div className="bg-gray-50 rounded p-4 mb-4">
              <p className="text-sm text-gray-600 mb-2">Current Location</p>
              <p className="font-mono text-sm text-gray-900">
                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex gap-3">
            {!isTracking ? (
              <button
                onClick={handleStartTracking}
                className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
              >
                Start Tracking
              </button>
            ) : (
              <button
                onClick={handleStopTracking}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
              >
                Stop Tracking
              </button>
            )}
          </div>
        </div>

        {/* Trip Details */}
        {booking && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Trip Details</h2>

            <div className="space-y-4">
              {/* Passenger Info */}
              <div>
                <p className="text-sm text-gray-600 mb-1">Passenger</p>
                <p className="font-semibold text-gray-900">{booking.clientName}</p>
              </div>

              {/* Pickup */}
              <div>
                <p className="text-sm text-gray-600 mb-1">Pickup Location</p>
                <p className="font-semibold text-gray-900">{booking.pickup}</p>
                {booking.pickupLat && booking.pickupLng && (
                  <p className="text-xs text-gray-500 mt-1">
                    {booking.pickupLat.toFixed(4)}, {booking.pickupLng.toFixed(4)}
                  </p>
                )}
              </div>

              {/* Dropoff */}
              <div>
                <p className="text-sm text-gray-600 mb-1">Destination</p>
                <p className="font-semibold text-gray-900">{booking.dropoff}</p>
                {booking.dropoffLat && booking.dropoffLng && (
                  <p className="text-xs text-gray-500 mt-1">
                    {booking.dropoffLat.toFixed(4)}, {booking.dropoffLng.toFixed(4)}
                  </p>
                )}
              </div>

              {/* Fare */}
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Fare</p>
                  <p className="font-semibold text-gray-900">${booking.fare.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Service Fee</p>
                  <p className="font-semibold text-gray-900">${booking.serviceFee.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total</p>
                  <p className="font-semibold text-gray-900">${booking.total.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Location updates:</strong> Your location is sent to the server every 5 seconds while tracking is active. The passenger can see your real-time location on their app.
          </p>
        </div>
      </div>
    </div>
  );
}
