import { createMemo, createSignal, For, onMount } from "solid-js";
import { db } from "../lib/db";
import type { ReadingStats } from "../lib/types";
import SectionHeader from "./SectionHeader";
import StatCard from "./StatCard";

const DAILY_GOAL = 30;

export default function ReadingPulse() {
	const [stats, setStats] = createSignal<ReadingStats | null>(null);

	onMount(async () => {
		const readingStats = await db.getReadingStats(30);
		setStats(readingStats);
	});

	const todayCount = createMemo(() => {
		const weekly = stats()?.weekly;
		if (!weekly?.length) return 0;
		return weekly[weekly.length - 1]?.count ?? 0;
	});

	return (
		<div class="mb-2">
			<SectionHeader title="Your Reading Pulse" />
			<div class="bg-surface border border-border rounded-2xl py-4 px-5 mx-5">
				<div class="flex items-center gap-2 mb-4">
					<span class="text-xl">🔥</span>
					<span class="text-lg font-semibold text-ink">
						{stats()?.streak || 0} day streak
					</span>
				</div>
				<div class="mb-4">
					<div class="flex items-baseline justify-between mb-1.5">
						<div class="text-sm text-ink-soft">Today's buktoks</div>
						<div class="text-xs font-semibold tabular-nums text-ink-soft">
							{todayCount()} / {DAILY_GOAL}
						</div>
					</div>
					<div class="h-1.5 rounded-[3px] bg-[oklch(0_0_0_/_0.08)] overflow-hidden">
						<div
							class="h-full rounded-[3px] bg-brand-500 transition-[width] duration-300 ease-in-out"
							style={{
								width: `${Math.min(100, (todayCount() / DAILY_GOAL) * 100)}%`,
							}}
						/>
					</div>
				</div>
				{/* Weekly heatmap — single loop so dots and labels stay aligned */}
				<div class="flex items-end justify-between mb-4">
					<For each={stats()?.weekly || []}>
						{(day) => (
							<div class="flex flex-col items-center gap-1">
								<div
									class="w-7 h-7 rounded-full bg-brand-500"
									style={{
										opacity:
											day.count > 0
												? String(Math.min(1, day.count / 10))
												: "0.15",
									}}
								/>
								<span class="text-[10px] text-ink-soft text-center">
									{day.day}
								</span>
							</div>
						)}
					</For>
				</div>
			</div>
			<div class="flex gap-2 px-5 mt-3">
				<StatCard value={stats()?.total || 0} label="total buktoks" />
				<StatCard value={stats()?.avgPerDay || 0} label="avg / day" />
				<StatCard value={stats()?.sessions || 0} label="sessions" />
			</div>
		</div>
	);
}
