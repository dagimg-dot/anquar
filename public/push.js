// The daily reminder, as it reaches the phone: src/server/reminders.ts sends { title, body }. Chrome wants
// every push shown, except when the app is open in front of you, where a reminder to read would only get in the way.
self.addEventListener("push", (event) => {
	let message = {};
	try {
		message = event.data ? event.data.json() : {};
	} catch {}
	event.waitUntil(
		(async () => {
			const windows = await self.clients.matchAll({
				type: "window",
				includeUncontrolled: true,
			});
			if (windows.some((w) => w.visibilityState === "visible")) return;
			await self.registration.showNotification(message.title || "anquar", {
				body: message.body || "Your book is where you left it.",
				icon: "/icons/pwa-192x192.png",
				badge: "/icons/badge-96x96.png",
				tag: "anquar-reminder",
			});
		})(),
	);
});

// Opens the app where you were, or straight into the book read last when it isn't open.
self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	event.waitUntil(
		(async () => {
			const windows = await self.clients.matchAll({
				type: "window",
				includeUncontrolled: true,
			});
			if (windows.length > 0) await windows[0].focus();
			else await self.clients.openWindow("/app/?continue");
		})(),
	);
});
