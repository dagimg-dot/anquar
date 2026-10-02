// The app is served under /app/ and the landing page at /. Home keeps its trailing slash: /app is outside the
// installed app's scope, where Android would show it under a browser bar.
export const HOME = "/app/";
export const BOOK_ROUTE = "/app/book/:id";

export const bookPath = (id: string) => `/app/book/${id}`;
export const isBookPath = (path: string) => path.startsWith("/app/book/");
