"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const TrackingMap = dynamic(() => import("./TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
      <p className="text-gray-600">Loading map...</p>
    </div>
  ),
});

interface RiderTrackingProps {
  params: { bookingId: string };
}

interface TripData {
  booking: {
    id: string;
    clientName: string;
    pickup: string;
    dropoff: string;
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
    status: string;
    fare: number;
    serviceFee: number;
    total: number;
    driver: {
      id: string;
      firstName: string;
      lastName: string;
      lat: number;
      lng: number;
      vehicle: {
        make: string;
        model: string;
        plate: string;
      };
    };
  };
  currentLocation: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    timestamp: string;
  } | null;
}

export default function RiderTrackingPage({ params }: RiderTrackingProps) {
  const { bookingId } = params;
  const router = useRouter();
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchTripData = async () => {
      try {
        const response = await fetch(`/api/tracking/${bookingId}`);

        if (response.status === 403) {
          setError("You don't have access to this trip");
          setLoading(false);
          return;
        }

        if (!response.ok) {
          setError("Trip not found");
          setLoading(false);
          return;
        }

        const data = await response.json();
        setTripData(data);
        setLastUpdate(new Date());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load trip");
      } finally {
        setLoading(false);
      }
    };

    fetchTripData();

    // Refresh every 5 seconds
    const interval = setInterval(fetchTripData, 5000);
    return () => clearInterval(interval);
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your ride...</p>
        </div>
      </div>
    );
  }

  if (error || !tripData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-900 mb-2">Error</h1>
            <p className="text-red-700 mb-4">{error || "Trip not found"}</p>
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

  const { booking, currentLocation } = tripData;
  const driver = booking.driver;
  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your Ride</h1>
              <p className="text-sm text-gray-600 mt-1">
                Status:{" "}
                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusColors[booking.status] || "bg-gray-100 text-gray-800"}`}>
                  {booking.status}
                </span>
              </p>
            </div>
            {lastUpdate && (
              <p className="text-xs text-gray-500">
                Updated: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4">
        {/* Map */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          {currentLocation && (
            <TrackingMap
              driverLat={currentLocation.lat}
              driverLng={currentLocation.lng}
              pickupLat={booking.pickupLat}
              pickupLng={booking.pickupLng}
              dropoffLat={booking.dropoffLat}
              dropoffLng={booking.dropoffLng}
              driverHeading={currentLocation.heading}
            />
          )}
        </div>

        {/* Driver Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Your Driver</h2>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-2xl text-white font-bold">
              {driver.firstName.charAt(0)}
              {driver.lastName.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">
                {driver.firstName} {driver.lastName}
              </p>
              <p className="text-sm text-gray-600">
                {driver.vehicle.make} {driver.vehicle.model}
              </p>
              <p className="text-sm text-gray-600">Plate: {driver.vehicle.plate}</p>
            </div>
          </div>

          {currentLocation && (
            <div className="bg-gray-50 rounded p-3">
              <p className="text-xs text-gray-600 mb-1">Current Location</p>
              <p className="font-mono text-sm text-gray-900">
                {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </p>
              {currentLocation.speed !== undefined && (
                <p className="text-xs text-gray-600 mt-1">
                  Speed: {Math.round(currentLocation.speed)} km/h
                </p>
              )}
            </div>
          )}
        </div>

        {/* Trip Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Trip Details</h2>

          <div className="space-y-4">
            {/* Pickup */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">📍</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Pickup</p>
                <p className="font-semibold text-gray-900">{booking.pickup}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="w-2 h-8 bg-gray-300 rounded-full mt-2"></div>
              </div>
            </div>

            {/* Dropoff */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-bold">📍</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Destination</p>
                <p className="font-semibold text-gray-900">{booking.dropoff}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fare Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Fare Breakdown</h2>

          <div className="space-y-3">
            <div className="flex justify-between">
              <p className="text-gray-600">Base Fare</p>
              <p className="font-semibold text-gray-900">${booking.fare.toFixed(2)}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-gray-600">Service Fee</p>
              <p className="font-semibold text-gray-900">${booking.serviceFee.toFixed(2)}</p>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between">
              <p className="font-semibold text-gray-900">Total</p>
              <p className="text-lg font-bold text-blue-600">${booking.total.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
