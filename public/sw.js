/* MOVO Service Worker — handles Web Push notifications */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "MOVO", body: event.data.text() };
  }

  const title   = payload.title  || "MOVO";
  const options = {
    body:    payload.body    || "",
    icon:    payload.icon    || "/images/logo/logo-icon-navy.png",
    badge:   "/images/logo/logo-icon-navy.png",
    tag:     payload.tag     || "movo-notification",
    data:    payload.data    || {},
    vibrate: [200, 100, 200],
    requireInteraction: payload.data?.requireInteraction === "true",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = "/";

  if (data.url) {
    url = data.url;
  } else if (data.type === "new_booking") {
    url = "/driver/home";
  } else if (data.type === "new_message_driver") {
    url = data.bookingId ? `/driver/home/finish/chat?bookingId=${data.bookingId}` : "/driver/home";
  } else if (data.type === "new_message_rider") {
    url = data.bookingId ? `/home/ride/tracking?id=${data.bookingId}` : "/home";
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(url.split("?")[0]) && "focus" in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
