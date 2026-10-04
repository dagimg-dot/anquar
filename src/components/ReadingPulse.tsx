import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { db, listReading } from "../lib/db";
import {
	dayKey,
	type Pulse,
	pulseLine,
	pulseOf,
	readingGoal,
} from "../lib/reading";
import { syncReminder } from "../lib/reminder";
import MarkMeter from "./MarkMeter";
import SectionHeader from "./SectionHeader";
import StatCard from "./StatCard";

// The day the card last took its step for a closed goal, so it takes it once, the first time you see it.
const STEPPED_KEY = "anquar_pulse_stepped";

const weekday = (date: string) =>
	new Date(`${date}T12:00`).toLocaleDateString("en", { weekday: "narrow" });

function StreakChip(props: { pulse: Pulse }) {
	return (
		<span
			class="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-surface-elevated px-2.5 font-semibold text-[12.5px]"
			classList={{
				"text-ink": props.pulse.kept,
				"text-ink-soft": !props.pulse.kept,
			}}
		>
			<Show fallback="No streak yet" when={props.pulse.streak > 0}>
				<span aria-hidden="true">🔥</span>
				{props.pulse.streak}
				<Show when={props.pulse.rests > 0}>
					<span class="font-medium text-ice">· {props.pulse.rests} rest</span>
				</Show>
			</Show>
		</span>
	);
}

export default function ReadingPulse(props: { onOpen?: () => void }) {
	const goal = readingGoal();
	const [pulse, setPulse] = createSignal<Pulse>();
	const [hour, setHour] = createSignal(new Date().getHours());
	const [finished, setFinished] = createSignal(0);
	let meter: HTMLDivElement | undefined;

	const closed = () => (pulse()?.today ?? 0) >= goal;
	const line = () => {
		const p = pulse();
		return p ? pulseLine(p, goal, hour()) : undefined;
	};

	function step() {
		if (!meter || matchMedia("(prefers-reduced-motion: reduce)").matches)
			return;
		meter.animate(
			[
				{ transform: "none" },
				{ transform: "translateY(-7px)", offset: 0.38 },
				{ transform: "none" },
			],
			{ duration: 560, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
		);
	}

	async function load() {
		const today = dayKey();
		const p = pulseOf(await listReading(), today);
		const progress = await db.progress.toArray();
		setHour(new Date().getHours());
		setPulse(p);
		void syncReminder(p.today >= goal);
		setFinished(progress.filter((r) => r.progressPercent >= 100).length);
		if (p.today >= goal && localStorage.getItem(STEPPED_KEY) !== today) {
			localStorage.setItem(STEPPED_KEY, today);
			requestAnimationFrame(step);
		}
	}

	onMount(() => {
		void load();
		const onVisible = () => !document.hidden && void load();
		document.addEventListener("visibilitychange", onVisible);
		onCleanup(() =>
			document.removeEventListener("visibilitychange", onVisible),
		);
	});

	return (
		<div class="mb-2">
			<SectionHeader class="desktop:hidden" title="Your Reading Pulse" />
			<Show when={pulse()}>
				{(p) => (
					<>
						<button
							aria-label={`Continue reading. ${p().today} of ${goal} anquars today, ${p().streak}-day streak.`}
							class="mx-5 block w-[calc(100%-2.5rem)] cursor-pointer tablet:mx-0 tablet:w-full rounded-2xl border border-border bg-surface px-4 pt-4 pb-3.5 text-left transition-transform duration-200 active:scale-[0.985]"
							onClick={() => props.onOpen?.()}
							type="button"
						>
							<div class="flex items-center gap-4">
								<div
									class="grid size-[84px] shrink-0 place-items-center rounded-[20px] transition-colors duration-500"
									classList={{
										"bg-canvas": !closed(),
										"bg-brand-500/15": closed(),
									}}
									ref={meter}
								>
									<MarkMeter
										class="size-16"
										fill={Math.min(1, p().today / goal)}
									/>
								</div>
								<div class="min-w-0">
									<div class="font-extrabold text-[30px] text-ink tabular-nums leading-none tracking-[-0.03em]">
										{p().today}
										<span class="ml-1 font-semibold text-[15px] text-ink-soft tracking-normal">
											/ {goal}
										</span>
									</div>
									<div class="mt-1 mb-2 text-ink-soft text-xs">
										anquars today
									</div>
									<StreakChip pulse={p()} />
								</div>
							</div>

							<p class="mt-3 text-[13px] text-ink-soft leading-snug">
								<For each={line()?.parts}>
									{(part) =>
										part.strong ? (
											<strong
												class="font-semibold"
												classList={{
													"text-flame": line()?.risk,
													"text-ink": !line()?.risk,
												}}
											>
												{part.text}
											</strong>
										) : (
											part.text
										)
									}
								</For>
							</p>

							<div
								aria-hidden="true"
								class="mt-3.5 flex justify-between border-border border-t pt-3"
							>
								<For each={p().week}>
									{(d) => (
										<div
											class="flex w-[34px] flex-col items-center gap-1.5 text-[10px]"
											classList={{
												"text-ink": d.today,
												"text-ink-muted": !d.today,
											}}
										>
											<MarkMeter
												class="size-[26px]"
												fill={d.rest ? 1 : Math.min(1, d.anquars / goal)}
												rest={d.rest}
												stroke={6}
											/>
											{weekday(d.date)}
											<Show when={d.today}>
												<span class="-mt-1 size-1 rounded-full bg-brand-500" />
											</Show>
										</div>
									)}
								</For>
							</div>
						</button>

						<div class="mt-3 flex gap-2 px-5 tablet:px-0">
							<StatCard label="min this week" value={p().minutesThisWeek} />
							<StatCard label="best streak" value={p().best} />
							<StatCard label="books finished" value={finished()} />
						</div>
					</>
				)}
			</Show>
		</div>
	);
}
