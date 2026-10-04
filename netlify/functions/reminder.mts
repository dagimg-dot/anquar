import type { Config } from "@netlify/functions";
import { blobStore } from "../../src/server/blob-store.ts";
import { handleReminder } from "../../src/server/reminders.ts";

export default (req: Request) => handleReminder(req, blobStore());

// A literal, because Netlify reads this without running the file and can't follow an imported constant. It is
// REMINDER_PATH in src/lib/reminder-schedule.ts, which the app calls.
export const config: Config = { path: "/api/reminder" };
