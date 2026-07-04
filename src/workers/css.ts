export function resolveCss(
	css: Array<{ id: string; href: string }>,
): Promise<Array<{ id: string; href: string }>> {
	return Promise.all(
		css.map(async (sheet) => ({
			id: sheet.id,
			href: await (async () => {
				try {
					const response = await fetch(sheet.href);
					return response.text();
				} catch {
					return "";
				}
			})(),
		})),
	);
}
