import type { Config } from "@netlify/functions";
import { REMINDER_PATH } from "../../src/lib/reminder-schedule.ts";
import { blobStore } from "../../src/server/blob-store.ts";
import { handleReminder } from "../../src/server/reminders.ts";

export default (req: Request) => handleReminder(req, blobStore());

export const config: Config = { path: REMINDER_PATH };
