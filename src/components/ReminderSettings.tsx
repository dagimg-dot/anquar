import { createSignal, Show } from "solid-js";
import { listReading } from "../lib/db";
import { dayKey, pulseOf, readingGoal } from "../lib/reading";
import {
	blocked,
	DEFAULT_TIME,
	moveReminder,
	type Outcome,
	reminderTime,
	support,
	turnOffReminder,
	turnOnReminder,
} from "../lib/reminder";
import { SettingsRowInfo } from "./SettingsSection";

const NOTES: Record<Exclude<Outcome, "ok">, string> = {
	blocked:
		"Notifications are blocked for anquar. Allow them in your phone's settings, then try again.",
	unsupported: "This browser can't send reminders.",
	failed: "Couldn't set the reminder. Check your connection and try again.",
};

async function goalClosed() {
	return pulseOf(await listReading(), dayKey()).today >= readingGoal();
}

// The daily nudge to read, in Settings → Reading. It asks for notifications when it's switched on, and the goal
// above decides when it stays quiet.
export default function ReminderSettings() {
	const [busy, setBusy] = createSignal(false);
	const [note, setNote] = createSignal<string>();
	const level = support();

	const on = () => reminderTime() !== undefined;
	const desc = () => {
		if (level === "install")
			return "On iPhone, add anquar to your Home Screen first";
		if (level === "no") return NOTES.unsupported;
		return "A nudge to read, when today's goal is still open";
	};

	async function run(task: () => Promise<Outcome>) {
		setBusy(true);
		setNote(undefined);
		const outcome = await task();
		setBusy(false);
		if (outcome !== "ok") setNote(NOTES[outcome]);
	}

	async function toggle() {
		if (on()) {
			setNote(undefined);
			await turnOffReminder();
			return;
		}
		await run(async () => turnOnReminder(DEFAULT_TIME, await goalClosed()));
	}

	return (
		<>
			<div class="mt-[14px]">
				<SettingsRowInfo desc={desc()} label="Daily reminder">
					<button
						aria-checked={on()}
						aria-label="Daily reminder"
						class="relative h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-[colors,transform] duration-200 active:scale-95 disabled:cursor-default disabled:opacity-40"
						classList={{
							"border-brand-500 bg-brand-500": on(),
							"border-border bg-surface": !on(),
						}}
						disabled={busy() || level !== "ok"}
						onClick={() => void toggle()}
						role="switch"
						type="button"
					>
						<span
							class="absolute top-[3px] left-[3px] size-5 rounded-full transition-[translate,colors] duration-200"
							classList={{
								"translate-x-5 bg-canvas": on(),
								"bg-ink-muted": !on(),
							}}
						/>
					</button>
				</SettingsRowInfo>
			</div>
			<Show when={on()}>
				<SettingsRowInfo
					desc="The goal above decides when it stays quiet"
					label="Remind me at"
				>
					<input
						aria-label="Reminder time"
						class="min-w-[6.5rem] shrink-0 rounded-xl border border-border bg-surface px-3 py-2 text-center font-semibold text-sm"
						disabled={busy()}
						onChange={(e) => {
							const at = e.currentTarget.value;
							if (at)
								void run(async () => moveReminder(at, await goalClosed()));
						}}
						type="time"
						value={reminderTime()}
					/>
				</SettingsRowInfo>
				<Show when={blocked()}>
					<p class="mb-2.5 text-xs text-ink-muted">{NOTES.blocked}</p>
				</Show>
			</Show>
			<Show when={note()}>
				<p class="mb-2.5 text-xs text-ink-muted">{note()}</p>
			</Show>
		</>
	);
}
