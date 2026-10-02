// Books shared to anquar from another app (Telegram, Files, Drive) arrive as a form post. They wait in a
// cache until the page picks them up after the redirect; see importShared in src/lib/imports.ts.
self.addEventListener("fetch", (event) => {
	const url = new URL(event.request.url);
	if (event.request.method !== "POST" || url.pathname !== "/share-target")
		return;
	event.respondWith(
		(async () => {
			const form = await event.request.formData();
			const cache = await caches.open("anquar-shared");
			let n = 0;
			for (const file of form.getAll("books")) {
				if (typeof file === "string") continue;
				await cache.put(
					`/shared/${Date.now()}-${n++}`,
					new Response(file, {
						headers: {
							"content-type": file.type || "application/epub+zip",
							"x-file-name": encodeURIComponent(file.name),
						},
					}),
				);
			}
			return Response.redirect("/?shared", 303);
		})(),
	);
});
