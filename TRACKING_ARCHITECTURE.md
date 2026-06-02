# MOVO Production Tracking Architecture Audit & Implementation Plan

**Date:** June 2, 2026  
**Status:** AUDIT COMPLETE - Ready for Production Architecture Design  
**Scope:** Chauffeur Live Tracking System for MOVO Premium Ride Service

---

## EXECUTIVE SUMMARY

### Current State
- ✅ **Simulator-only implementation** for testing location updates
- ✅ **Admin-facing tracking** with satellite map visualization
- ✅ **Polling-based architecture** (2-second refresh)
- ✅ **Basic TripLocation storage** with lat/lng/heading/speed
- ❌ **No real chauffeur tracking** (simulator data only)
- ❌ **No rider/client tracking** (admin-only)
- ❌ **No real-time transport** (polling only)
- ❌ **No trip lifecycle management** (4 states vs 7 required)
- ❌ **No ETA/route progress** calculations
- ❌ **No Google Maps integration** (directions, distance matrix)
- ❌ **No chauffeur app** to publish locations
- ❌ **No background tracking** strategy

### Production Gap
The current implementation is **simulator-only and admin-focused**. Production requires:
1. Real chauffeur location publishing (from mobile app)
2. Real-time bidirectional communication (WebSockets/Socket.io)
3. Rider live tracking (separate from admin)
4. Complete trip state machine
5. ETA & route progress calculations
6. Google Maps integration
7. Offline/reconnect handling
8. Location accuracy & validation

---

## PART 1: CURRENT IMPLEMENTATION AUDIT

### 1.1 What Currently Exists

#### Database Schema (Production-Ready Components)
```
✅ TripLocation Table
   - id (primary key)
   - bookingId (foreign key)
   - lat (float)
   - lng (float)
   - heading (float, nullable)
   - speed (float, nullable)
   - timestamp (auto-created)
   - Index: [bookingId, timestamp]

✅ Booking Table
   - status: BookingStatus (PENDING, CONFIRMED, COMPLETED, CANCELLED)
   - startedAt (DateTime, nullable)
   - completedAt (DateTime, nullable)
   - driverId (foreign key)
   - userId (foreign key)

✅ Driver Table
   - lat (float, nullable)
   - lng (float, nullable)
   - isOnline (boolean)
   - status: DriverStatus (PENDING, ACTIVE, SUSPENDED)
```

#### API Endpoints (Simulator-Only)
```
POST /api/trips/location
├─ Purpose: Receive location updates
├─ Auth: Bearer token OR X-Session-Token OR X-Simulation-Mode
├─ Body: { bookingId, lat, lng, heading?, speed? }
├─ Behavior:
│  ├─ Validates booking exists (PENDING or CONFIRMED)
│  ├─ Saves to TripLocation
│  ├─ Auto-sets booking.startedAt if null
│  ├─ Updates driver.lat/lng (non-simulation only)
│  └─ Returns { ok: true }
└─ Issues:
   ├─ Designed for simulator, not real drivers
   ├─ No accuracy validation
   ├─ No geofencing
   ├─ No offline queue
   └─ No rate limiting

GET /api/admin/tracking
├─ Purpose: Fetch all active trips for admin dashboard
├─ Returns: Vehicle[] with latest position & route trail
├─ Behavior:
│  ├─ Fetches CONFIRMED bookings
│  ├─ Aggregates last 150 TripLocation points per booking
│  ├─ Builds route polyline
│  └─ Returns latest position
├─ Refresh: Manual polling every 2 seconds (frontend)
└─ Issues:
   ├─ Admin-only (no rider access)
   ├─ No real-time updates (polling)
   ├─ No ETA calculations
   ├─ No route progress
   └─ Inefficient for many bookings
```

#### Frontend Components (Admin-Only)
```
✅ /admin/tracking/page.tsx
   ├─ Fetches /api/admin/tracking every 2 seconds
   ├─ Displays list of active trips
   ├─ Shows satellite map with route trail
   ├─ Displays waypoint markers
   ├─ Shows current position with car icon
   └─ Issues:
      ├─ No rider view
      ├─ No chauffeur app
      ├─ Polling architecture (inefficient)
      └─ No real-time updates

✅ /admin/tracking/simulator/page.tsx
   ├─ Simulates GPS updates every 3 seconds
   ├─ Sends to /api/trips/location
   ├─ Accepts session token or JWT
   ├─ Allows custom booking ID
   ├─ Enables X-Simulation-Mode header
   └─ Purpose: Testing only
```

### 1.2 What Is Production-Ready

| Component | Status | Notes |
|-----------|--------|-------|
| TripLocation schema | ✅ Ready | Has all required fields (lat, lng, heading, speed, timestamp) |
| Booking lifecycle | ⚠️ Partial | Only 4 states, needs 7 for production |
| Driver online status | ✅ Ready | `isOnline` field exists |
| Location API endpoint | ⚠️ Partial | Works for simulator, needs auth/validation for real drivers |
| Admin tracking UI | ✅ Ready | Satellite map, route trail, waypoints all working |
| Database indexes | ✅ Ready | `[bookingId, timestamp]` index exists |

### 1.3 What Is Simulator-Only

| Component | Status | Notes |
|-----------|--------|-------|
| Location publishing | ❌ Simulator | No real chauffeur app |
| Authentication | ⚠️ Weak | X-Simulation-Mode bypasses driver validation |
| Booking validation | ⚠️ Weak | Accepts PENDING or CONFIRMED (should be stricter) |
| Driver assignment | ❌ Simulator | Simulation mode skips driverId check |
| Location accuracy | ❌ Missing | No accuracy field, no validation |
| Offline handling | ❌ Missing | No queue, no reconnect logic |

### 1.4 What Must Be Rebuilt

| Feature | Current | Required |
|---------|---------|----------|
| Real-time transport | Polling (2s) | WebSockets / Socket.io |
| Rider tracking | ❌ None | Real-time rider view |
| Chauffeur app | ❌ None | Mobile app to publish locations |
| Trip state machine | 4 states | 7 states (see section 2.3) |
| ETA calculation | ❌ None | Google Maps Directions API |
| Route progress | ❌ None | Distance Matrix + polyline matching |
| Geofencing | ❌ None | Pickup/dropoff zone detection |
| Location validation | ❌ None | Accuracy checks, speed validation |
| Offline queue | ❌ None | Local storage + sync on reconnect |
| Rate limiting | ❌ None | Prevent location spam |

---

## PART 2: PRODUCTION TRACKING ARCHITECTURE

### 2.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOVO TRACKING SYSTEM                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      CLIENT APPLICATIONS                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │  Chauffeur App  │  │  Rider App       │  │  Admin Dashboard │ │
│  │  (iOS/Android)  │  │  (iOS/Android)   │  │  (Web)           │ │
│  │                 │  │                  │  │                  │ │
│  │ • Publish GPS   │  │ • View ETA       │  │ • View all trips │ │
│  │ • Show status   │  │ • Track driver   │  │ • Analytics      │ │
│  │ • Accept rides  │  │ • Chat driver    │  │ • Incidents      │ │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬─────────┘ │
│           │                    │                     │            │
└───────────┼────────────────────┼─────────────────────┼────────────┘
            │                    │                     │
            │ WebSocket/         │ WebSocket/          │ REST/
            │ Socket.io          │ Socket.io           │ WebSocket
            │                    │                     │
┌───────────┼────────────────────┼─────────────────────┼────────────┐
│           │                    │                     │            │
│  ┌────────▼────────────────────▼─────────────────────▼────────┐  │
│  │         REAL-TIME COMMUNICATION LAYER                       │  │
│  │  (Socket.io / Pusher / Ably / Supabase Realtime)           │  │
│  │                                                              │  │
│  │  • Chauffeur location stream (high frequency)              │  │
│  │  • Rider tracking updates (medium frequency)               │  │
│  │  • Admin monitoring (low frequency)                        │  │
│  │  • Presence tracking (online/offline)                      │  │
│  │  • Reconnect handling                                      │  │
│  └────────┬─────────────────────────────────────────────────┘  │
│           │                                                      │
│  ┌────────▼─────────────────────────────────────────────────┐  │
│  │         TRACKING API LAYER                                │  │
│  │  (Node.js / Next.js API Routes)                           │  │
│  │                                                            │  │
│  │  POST /api/tracking/location                             │  │
│  │  ├─ Validate location (accuracy, speed)                  │  │
│  │  ├─ Save to TripLocation                                 │  │
│  │  ├─ Update trip state machine                            │  │
│  │  ├─ Calculate ETA (Google Maps)                          │  │
│  │  ├─ Broadcast to subscribers                             │  │
│  │  └─ Handle offline queue                                 │  │
│  │                                                            │  │
│  │  GET /api/tracking/[bookingId]                           │  │
│  │  ├─ Return current trip state                            │  │
│  │  ├─ Return ETA & route progress                          │  │
│  │  ├─ Return driver location                               │  │
│  │  └─ Return route polyline                                │  │
│  │                                                            │  │
│  │  GET /api/tracking/[bookingId]/stream                    │  │
│  │  └─ WebSocket endpoint for live updates                  │  │
│  │                                                            │  │
│  │  POST /api/tracking/[bookingId]/state                    │  │
│  │  └─ Update trip state (ARRIVED, ONBOARD, etc)            │  │
│  └────────┬─────────────────────────────────────────────────┘  │
│           │                                                      │
│  ┌────────▼─────────────────────────────────────────────────┐  │
│  │         EXTERNAL SERVICES                                 │  │
│  │                                                            │  │
│  │  • Google Maps Directions API (ETA, polyline)            │  │
│  │  • Google Maps Distance Matrix API (route progress)      │  │
│  │  • Google Maps Geofencing API (pickup/dropoff zones)     │  │
│  │  • Redis (caching, presence, offline queue)              │  │
│  │  • PostgreSQL (persistent storage)                       │  │
│  │  • Sentry (error tracking)                               │  │
│  └────────┬─────────────────────────────────────────────────┘  │
│           │                                                      │
│  ┌────────▼─────────────────────────────────────────────────┐  │
│  │         DATA LAYER                                        │  │
│  │                                                            │  │
│  │  Tables:                                                  │  │
│  │  • TripLocation (location history)                       │  │
│  │  • TripState (current state + metadata)                  │  │
│  │  • TripRoute (planned route from Google Maps)            │  │
│  │  • TripETA (cached ETA calculations)                     │  │
│  │  • DriverPresence (online/offline status)                │  │
│  │  • LocationAccuracy (quality metrics)                    │  │
│  │                                                            │  │
│  │  Caches (Redis):                                          │  │
│  │  • Active trips (hot data)                               │  │
│  │  • Driver presence (real-time)                           │  │
│  │  • Location queue (offline sync)                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Trip State Machine (Production)

```
BOOKING CREATED
    ↓
[PENDING] ← Waiting for driver assignment
    ↓
[DRIVER_ASSIGNED] ← Driver accepted ride
    ├─ Driver location: Chauffeur's current location
    ├─ ETA to pickup: Google Maps Directions API
    ├─ Status: "Driver is on the way"
    └─ Rider can: Track driver, message, cancel
    ↓
[DRIVER_EN_ROUTE] ← Driver started moving toward pickup
    ├─ Tracking: Real-time location updates
    ├─ ETA: Updated every 30 seconds
    ├─ Route: Polyline from Google Maps
    └─ Geofence: Detect when driver arrives at pickup
    ↓
[ARRIVED] ← Driver within 100m of pickup location
    ├─ Notification: "Driver has arrived"
    ├─ Rider action: Confirm pickup
    └─ Chauffeur action: Wait for passenger
    ↓
[PASSENGER_ONBOARD] ← Rider confirmed pickup
    ├─ Tracking: Real-time location to dropoff
    ├─ ETA: Time to destination
    ├─ Route: Polyline to dropoff
    └─ Geofence: Detect when driver arrives at dropoff
    ↓
[IN_PROGRESS] ← Trip started, en route to destination
    ├─ Tracking: Continuous location updates
    ├─ Route progress: % of route completed
    ├─ ETA: Updated every 30 seconds
    └─ Incidents: Detect route deviations
    ↓
[COMPLETED] ← Driver arrived at dropoff
    ├─ Final location: Saved
    ├─ Trip duration: Calculated
    ├─ Distance: Calculated from polyline
    ├─ Fare: Finalized
    └─ Rating: Requested from rider
    ↓
[CANCELLED] ← Trip cancelled by rider/driver/admin
    ├─ Reason: Stored
    ├─ Refund: Processed
    └─ Final location: Saved
```

### 2.3 Real-Time Transport Layer Comparison

#### Option 1: Socket.io (RECOMMENDED FOR MOVO)
```
Pros:
✅ Bidirectional real-time communication
✅ Automatic reconnection with offline queue
✅ Room-based broadcasting (trip-specific)
✅ Event-based architecture (clean)
✅ Works with Next.js (socket.io adapter)
✅ Fallback to polling if WebSocket fails
✅ Built-in presence tracking
✅ Scalable with Redis adapter

Cons:
⚠️ Requires additional server (or use Next.js API routes)
⚠️ More complex than REST
⚠️ Need to manage connections

Architecture:
Server: Socket.io on Node.js / Next.js
Client: socket.io-client on mobile & web
Events:
  • driver:location → Chauffeur publishes GPS
  • trip:update → Server broadcasts to subscribers
  • trip:state → State machine transitions
  • presence:online → Driver comes online
  • presence:offline → Driver goes offline

Recommended Setup:
├─ Socket.io server (separate or integrated)
├─ Redis adapter (for scaling)
├─ Rooms per booking (trip:bookingId)
└─ Namespaces:
   ├─ /driver (chauffeur app)
   ├─ /rider (rider app)
   └─ /admin (admin dashboard)
```

#### Option 2: Pusher
```
Pros:
✅ Fully managed (no server setup)
✅ Excellent documentation
✅ Built-in presence
✅ Scalable to millions of connections
✅ Good for mobile apps

Cons:
⚠️ Monthly cost ($49-499)
⚠️ Vendor lock-in
⚠️ Latency (external service)
⚠️ Less control

Recommended for: Enterprise deployments
```

#### Option 3: Supabase Realtime
```
Pros:
✅ Open source
✅ PostgreSQL-native
✅ Free tier available
✅ Good for smaller scale

Cons:
⚠️ Less mature than Socket.io
⚠️ Limited mobile support
⚠️ Smaller community

Recommended for: Startups, MVP
```

#### Option 4: Ably
```
Pros:
✅ Managed service
✅ Excellent reliability
✅ Good for IoT/tracking

Cons:
⚠️ Cost ($50-500/month)
⚠️ Overkill for MOVO scale

Recommended for: Large scale operations
```

**RECOMMENDATION FOR MOVO:** Socket.io with Redis adapter
- Self-hosted (full control)
- Cost-effective
- Scales with Redis
- Perfect for ride-sharing

---

## PART 3: DATABASE SCHEMA IMPROVEMENTS

### 3.1 New Tables Required

```sql
-- Trip State Machine
CREATE TABLE TripState (
  id STRING PRIMARY KEY,
  bookingId STRING UNIQUE REFERENCES Booking(id),
  
  -- Current state
  state ENUM('PENDING', 'DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 
             'ARRIVED', 'PASSENGER_ONBOARD', 'IN_PROGRESS', 
             'COMPLETED', 'CANCELLED'),
  
  -- State timestamps
  assignedAt DATETIME,
  enRouteAt DATETIME,
  arrivedAt DATETIME,
  onboardAt DATETIME,
  startedAt DATETIME,
  completedAt DATETIME,
  cancelledAt DATETIME,
  
  -- ETA & Progress
  estimatedArrivalTime DATETIME,
  estimatedCompletionTime DATETIME,
  routeProgressPercent FLOAT,
  
  -- Cancellation
  cancelledBy ENUM('RIDER', 'DRIVER', 'ADMIN'),
  cancellationReason STRING,
  
  createdAt DATETIME DEFAULT NOW(),
  updatedAt DATETIME DEFAULT NOW(),
  
  INDEX idx_booking (bookingId),
  INDEX idx_state (state),
  INDEX idx_updated (updatedAt)
);

-- Planned route from Google Maps
CREATE TABLE TripRoute (
  id STRING PRIMARY KEY,
  bookingId STRING UNIQUE REFERENCES Booking(id),
  
  -- Google Maps data
  googleMapsRouteId STRING,
  polyline STRING, -- Encoded polyline
  distance FLOAT, -- meters
  duration INT, -- seconds
  
  -- Waypoints
  pickupLat FLOAT,
  pickupLng FLOAT,
  dropoffLat FLOAT,
  dropoffLng FLOAT,
  
  -- Route details
  steps JSON, -- Google Maps steps
  
  createdAt DATETIME DEFAULT NOW(),
  updatedAt DATETIME DEFAULT NOW(),
  
  INDEX idx_booking (bookingId)
);

-- Location accuracy & quality metrics
CREATE TABLE LocationAccuracy (
  id STRING PRIMARY KEY,
  tripLocationId STRING REFERENCES TripLocation(id),
  bookingId STRING REFERENCES Booking(id),
  
  -- Accuracy metrics
  accuracy FLOAT, -- meters (from GPS)
  altitude FLOAT, -- meters
  altitudeAccuracy FLOAT,
  
  -- Quality checks
  speedValid BOOLEAN, -- speed within reasonable range
  locationValid BOOLEAN, -- not too far from route
  accuracyValid BOOLEAN, -- accuracy < 50m
  
  -- Validation results
  distanceFromRoute FLOAT, -- meters
  speedKmh FLOAT,
  
  createdAt DATETIME DEFAULT NOW(),
  
  INDEX idx_booking (bookingId),
  INDEX idx_valid (locationValid)
);

-- Driver presence (online/offline status)
CREATE TABLE DriverPresence (
  id STRING PRIMARY KEY,
  driverId STRING UNIQUE REFERENCES Driver(id),
  
  -- Status
  isOnline BOOLEAN,
  lastSeenAt DATETIME,
  
  -- Current activity
  currentBookingId STRING REFERENCES Booking(id),
  
  -- Metrics
  totalTripsToday INT DEFAULT 0,
  totalEarningsToday FLOAT DEFAULT 0,
  
  createdAt DATETIME DEFAULT NOW(),
  updatedAt DATETIME DEFAULT NOW(),
  
  INDEX idx_online (isOnline),
  INDEX idx_driver (driverId)
);

-- Offline location queue (for mobile app)
CREATE TABLE LocationQueue (
  id STRING PRIMARY KEY,
  driverId STRING REFERENCES Driver(id),
  bookingId STRING REFERENCES Booking(id),
  
  -- Location data
  lat FLOAT,
  lng FLOAT,
  heading FLOAT,
  speed FLOAT,
  accuracy FLOAT,
  
  -- Queue metadata
  queuedAt DATETIME DEFAULT NOW(),
  syncedAt DATETIME,
  
  INDEX idx_driver (driverId),
  INDEX idx_synced (syncedAt)
);

-- ETA cache (to avoid repeated Google Maps calls)
CREATE TABLE TripETA (
  id STRING PRIMARY KEY,
  bookingId STRING REFERENCES Booking(id),
  
  -- ETA data
  estimatedArrivalTime DATETIME,
  estimatedCompletionTime DATETIME,
  
  -- Route data
  distanceRemaining FLOAT, -- meters
  durationRemaining INT, -- seconds
  
  -- Calculation metadata
  calculatedAt DATETIME DEFAULT NOW(),
  driverLat FLOAT,
  driverLng FLOAT,
  
  -- Cache expiry
  expiresAt DATETIME,
  
  INDEX idx_booking (bookingId),
  INDEX idx_expires (expiresAt)
);
```

### 3.2 Schema Modifications

```sql
-- Extend TripLocation with accuracy
ALTER TABLE TripLocation ADD COLUMN (
  accuracy FLOAT, -- GPS accuracy in meters
  altitude FLOAT,
  altitudeAccuracy FLOAT
);

-- Extend Booking with trip state
ALTER TABLE Booking ADD COLUMN (
  tripStateId STRING REFERENCES TripState(id),
  routeId STRING REFERENCES TripRoute(id)
);

-- Extend Driver with presence
ALTER TABLE Driver ADD COLUMN (
  presenceId STRING REFERENCES DriverPresence(id),
  lastLocationAt DATETIME
);
```

---

## PART 4: API ENDPOINTS (PRODUCTION)

### 4.1 Chauffeur Location Publishing

```
POST /api/tracking/location
├─ Auth: Bearer <driver_token>
├─ Rate limit: 1 request per 3 seconds
├─ Body: {
│   bookingId: string,
│   lat: float,
│   lng: float,
│   heading: float (0-360),
│   speed: float (km/h),
│   accuracy: float (meters),
│   altitude: float (meters),
│   timestamp: ISO8601
│ }
├─ Validation:
│   ├─ Driver is authenticated
│   ├─ Booking exists and is in valid state
│   ├─ Location accuracy < 100m
│   ├─ Speed < 200 km/h
│   ├─ Location not too far from route
│   └─ Timestamp is recent (< 30 seconds old)
├─ Processing:
│   ├─ Save to TripLocation
│   ├─ Save to LocationAccuracy
│   ├─ Update TripState.routeProgressPercent
│   ├─ Check geofences (ARRIVED, IN_PROGRESS)
│   ├─ Calculate ETA (if needed)
│   ├─ Broadcast to subscribers (Socket.io)
│   └─ Queue for offline sync if needed
└─ Response: { ok: true, state: TripState }

Error Responses:
├─ 401: Unauthorized (invalid token)
├─ 404: Booking not found
├─ 400: Invalid location data
├─ 429: Rate limited
└─ 500: Server error
```

### 4.2 Rider Tracking

```
GET /api/tracking/[bookingId]
├─ Auth: Bearer <rider_token>
├─ Query: { includeRoute: boolean }
├─ Response: {
│   bookingId: string,
│   state: TripState,
│   driver: {
│     id: string,
│     name: string,
│     phone: string,
│     rating: float,
│     vehicle: { make, model, plate, photo }
│   },
│   location: {
│     lat: float,
│     lng: float,
│     heading: float,
│     accuracy: float,
│     timestamp: ISO8601
│   },
│   eta: {
│     estimatedArrivalTime: ISO8601,
│     estimatedCompletionTime: ISO8601,
│     distanceRemaining: float,
│     durationRemaining: int
│   },
│   route: {
│     polyline: string,
│     distance: float,
│     duration: int,
│     progressPercent: float
│   },
│   trip: {
│     pickupAddress: string,
│     dropoffAddress: string,
│     fare: float,
│     distance: float,
│     duration: int
│   }
│ }
└─ Refresh: Every 5 seconds (client-side)

WebSocket Endpoint:
GET /api/tracking/[bookingId]/stream
├─ Auth: Bearer <rider_token>
├─ Connection: WebSocket
├─ Events received:
│   ├─ trip:state → Trip state changed
│   ├─ trip:location → Driver location updated
│   ├─ trip:eta → ETA recalculated
│   ├─ trip:progress → Route progress updated
│   └─ trip:completed → Trip finished
└─ Auto-disconnect: When trip completes
```

### 4.3 Admin Monitoring

```
GET /api/admin/tracking
├─ Auth: Bearer <admin_token>
├─ Query: { status: TripState, limit: 50 }
├─ Response: Vehicle[] (same as current)
├─ Refresh: Every 2 seconds (client-side)

GET /api/admin/tracking/[bookingId]/details
├─ Auth: Bearer <admin_token>
├─ Response: {
│   booking: Booking,
│   state: TripState,
│   driver: Driver,
│   rider: User,
│   route: TripRoute,
│   locations: TripLocation[],
│   accuracy: LocationAccuracy[],
│   incidents: IncidentReport[]
│ }

GET /api/admin/tracking/analytics
├─ Auth: Bearer <admin_token>
├─ Query: { from: ISO8601, to: ISO8601 }
├─ Response: {
│   totalTrips: int,
│   completedTrips: int,
│   cancelledTrips: int,
│   averageETA: float,
│   averageAccuracy: float,
│   averageSpeed: float,
│   incidents: int
│ }
```

### 4.4 Trip State Transitions

```
POST /api/tracking/[bookingId]/state
├─ Auth: Bearer <driver_token> or <admin_token>
├─ Body: {
│   state: TripState,
│   reason: string (optional)
│ }
├─ Valid transitions:
│   ├─ PENDING → DRIVER_ASSIGNED (driver accepts)
│   ├─ DRIVER_ASSIGNED → DRIVER_EN_ROUTE (driver starts moving)
│   ├─ DRIVER_EN_ROUTE → ARRIVED (geofence trigger)
│   ├─ ARRIVED → PASSENGER_ONBOARD (rider confirms)
│   ├─ PASSENGER_ONBOARD → IN_PROGRESS (driver starts moving)
│   ├─ IN_PROGRESS → COMPLETED (geofence trigger)
│   └─ Any → CANCELLED (cancellation)
├─ Validation:
│   ├─ Current state allows transition
│   ├─ User has permission
│   └─ Required conditions met
├─ Processing:
│   ├─ Update TripState
│   ├─ Set timestamp
│   ├─ Broadcast to subscribers
│   └─ Trigger notifications
└─ Response: { ok: true, state: TripState }
```

---

## PART 5: IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Set up real-time infrastructure and database

- [ ] Deploy Socket.io server (or integrate with Next.js)
- [ ] Set up Redis for caching & presence
- [ ] Create new database tables (TripState, TripRoute, etc.)
- [ ] Implement location validation logic
- [ ] Add Google Maps API integration
- [ ] Create location accuracy metrics

**Deliverables:**
- Socket.io server running
- Database migrations applied
- Google Maps API keys configured
- Location validation working

### Phase 2: Chauffeur App (Weeks 3-4)
**Goal:** Real chauffeur location publishing

- [ ] Create mobile app location service
- [ ] Implement location publishing to Socket.io
- [ ] Add offline queue (local storage)
- [ ] Implement reconnect logic
- [ ] Add background location tracking
- [ ] Create trip acceptance flow

**Deliverables:**
- Chauffeur app publishes locations
- Offline queue works
- Reconnect handling works
- Trip state transitions work

### Phase 3: Rider Tracking (Weeks 5-6)
**Goal:** Real-time rider tracking

- [ ] Create rider tracking UI
- [ ] Implement WebSocket connection
- [ ] Display driver location in real-time
- [ ] Show ETA & route progress
- [ ] Add notifications
- [ ] Create trip chat

**Deliverables:**
- Rider can track driver in real-time
- ETA updates every 30 seconds
- Route progress visible
- Notifications working

### Phase 4: Admin Dashboard (Weeks 7-8)
**Goal:** Production-grade admin monitoring

- [ ] Update admin tracking UI
- [ ] Add trip state machine visualization
- [ ] Implement analytics dashboard
- [ ] Add incident detection
- [ ] Create driver performance metrics
- [ ] Add trip replay functionality

**Deliverables:**
- Admin can monitor all trips
- Analytics dashboard working
- Incident detection working
- Trip replay working

### Phase 5: Optimization & Scaling (Weeks 9-10)
**Goal:** Performance & reliability

- [ ] Load testing
- [ ] Database optimization
- [ ] Caching strategy
- [ ] Error handling & recovery
- [ ] Monitoring & alerting
- [ ] Documentation

**Deliverables:**
- System handles 1000+ concurrent trips
- 99.9% uptime
- < 100ms latency
- Complete documentation

---

## PART 6: EXTERNAL SERVICES REQUIRED

### 6.1 Google Maps APIs

```
Services needed:
├─ Directions API
│  ├─ Purpose: Get route polyline & ETA
│  ├─ Cost: $5 per 1000 requests
│  ├─ Usage: Called when trip starts
│  └─ Caching: Cache for 1 hour
│
├─ Distance Matrix API
│  ├─ Purpose: Calculate route progress
│  ├─ Cost: $5 per 1000 elements
│  ├─ Usage: Called every 30 seconds
│  └─ Caching: Cache for 5 minutes
│
└─ Geofencing API (or custom implementation)
   ├─ Purpose: Detect arrival at pickup/dropoff
   ├─ Cost: Free (custom implementation)
   ├─ Usage: Real-time location check
   └─ Threshold: 100m radius

Estimated monthly cost:
├─ 10,000 trips/month
├─ 1 Directions API call per trip = $50
├─ 10 Distance Matrix calls per trip = $500
└─ Total: ~$550/month
```

### 6.2 Real-Time Service

```
Option 1: Socket.io (RECOMMENDED)
├─ Cost: Free (self-hosted)
├─ Infrastructure: 1 server + Redis
├─ Scalability: Unlimited with Redis
└─ Maintenance: Self-managed

Option 2: Pusher
├─ Cost: $49-499/month
├─ Infrastructure: Managed
├─ Scalability: Unlimited
└─ Maintenance: Pusher-managed

Option 3: Supabase Realtime
├─ Cost: Free tier + $25/month
├─ Infrastructure: Managed
├─ Scalability: Limited
└─ Maintenance: Supabase-managed
```

### 6.3 Infrastructure

```
Required services:
├─ PostgreSQL (database)
│  └─ Cost: $15-100/month (managed)
│
├─ Redis (caching & presence)
│  └─ Cost: $10-50/month (managed)
│
├─ Socket.io Server (real-time)
│  └─ Cost: $10-50/month (1 server)
│
├─ Google Maps APIs
│  └─ Cost: $500-1000/month (estimated)
│
├─ Sentry (error tracking)
│  └─ Cost: Free-$99/month
│
└─ CDN (static assets)
   └─ Cost: $10-50/month

Total estimated infrastructure: $600-1300/month
```

---

## PART 7: MIGRATION STRATEGY

### 7.1 Backward Compatibility

```
Phase 1: Parallel systems
├─ Keep current polling-based tracking
├─ Add Socket.io alongside
├─ Gradual migration of clients
└─ Fallback to polling if Socket.io fails

Phase 2: Deprecation
├─ Encourage Socket.io adoption
├─ Keep polling for legacy clients
├─ Monitor usage metrics
└─ Set deprecation date

Phase 3: Sunset
├─ Remove polling endpoints
├─ Migrate remaining clients
├─ Archive old code
└─ Update documentation
```

### 7.2 Data Migration

```
Current TripLocation data:
├─ Migrate all existing records
├─ Backfill TripRoute data (from Google Maps)
├─ Backfill TripState data (infer from timestamps)
├─ Backfill LocationAccuracy (estimate from data)
└─ Validate data integrity

Timeline:
├─ Week 1: Export current data
├─ Week 2: Transform & validate
├─ Week 3: Load into new tables
└─ Week 4: Verify & cleanup
```

---

## PART 8: RISK ASSESSMENT & MITIGATION

### 8.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Location accuracy issues | High | High | Implement validation, accuracy metrics |
| Real-time latency | Medium | High | Use Socket.io with Redis, CDN |
| Database scalability | Medium | High | Sharding, read replicas, caching |
| Google Maps API costs | High | Medium | Caching, rate limiting, optimization |
| Offline handling | Medium | High | Local queue, sync on reconnect |
| Geofencing accuracy | Medium | Medium | Multiple geofence checks, hysteresis |

### 8.2 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Service downtime | Low | Critical | Redundancy, monitoring, alerting |
| Data loss | Low | Critical | Backups, replication, transactions |
| Security breach | Low | Critical | Auth, encryption, audit logs |
| Performance degradation | Medium | High | Load testing, monitoring, scaling |

---

## PART 9: SUCCESS METRICS

### 9.1 Performance Metrics

```
Target metrics:
├─ Location update latency: < 100ms (p95)
├─ ETA accuracy: ± 2 minutes
├─ Route progress accuracy: ± 5%
├─ System uptime: 99.9%
├─ Location accuracy: < 50m (95% of time)
└─ Reconnect time: < 5 seconds
```

### 9.2 Business Metrics

```
Target metrics:
├─ Rider satisfaction: > 4.5/5
├─ Driver satisfaction: > 4.5/5
├─ Cancellation rate: < 5%
├─ On-time arrival: > 95%
├─ Cost per trip: < $2
└─ System cost: < 5% of trip value
```

---

## PART 10: CONCLUSION & RECOMMENDATIONS

### Current State Summary
- ✅ Simulator works well for testing
- ✅ Admin dashboard is functional
- ✅ Database schema is sound
- ❌ Not production-ready for real chauffeurs
- ❌ Missing real-time transport
- ❌ Missing rider tracking
- ❌ Missing trip state machine

### Immediate Actions
1. **Audit complete** - This document
2. **Design Socket.io architecture** - Next step
3. **Plan database migrations** - Week 1
4. **Set up Google Maps integration** - Week 1
5. **Build chauffeur app location service** - Week 2

### Long-term Vision
MOVO's tracking system should be:
- **Real-time:** WebSockets, not polling
- **Accurate:** GPS validation, accuracy metrics
- **Scalable:** Redis, database sharding
- **Reliable:** 99.9% uptime, offline handling
- **User-centric:** Rider & driver views
- **Data-driven:** Analytics, incident detection

### Next Steps
1. Review this architecture document
2. Approve Socket.io as real-time transport
3. Plan Phase 1 (foundation)
4. Allocate resources
5. Begin implementation

---

**Document prepared by:** Cascade AI  
**Date:** June 2, 2026  
**Status:** Ready for Architecture Review & Approval
