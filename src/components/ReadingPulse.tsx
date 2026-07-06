import { createSignal, For, onMount } from "solid-js";
import { db } from "../lib/db";
import type { ReadingStats } from "../lib/types";
import SectionHeader from "./SectionHeader";
import StatCard from "./StatCard";

export default function ReadingPulse() {
	const [stats, setStats] = createSignal<ReadingStats | null>(null);

	onMount(async () => {
		const readingStats = await db.getReadingStats(30);
		setStats(readingStats);
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
					<div class="text-sm text-ink-soft mb-1.5">Today's buktoks</div>
					<div class="h-1.5 rounded-[3px] bg-[oklch(0_0_0_/_0.08)] overflow-hidden">
						<div
							class="h-full rounded-[3px] bg-brand-500 transition-[width] duration-300 ease-in-out"
							style={{
								width: `${Math.min(100, ((stats()?.avgPerDay || 0) / 30) * 100)}%`,
							}}
						/>
					</div>
				</div>
				<div class="mb-4">
					<For each={stats()?.weekly || []}>
						{(day) => (
							<div
								class="w-7 h-7 rounded-full bg-brand-500 inline-block mr-1"
								style={{
									opacity: day.count > 0 ? Math.min(1, day.count / 50) : 0.15,
								}}
							/>
						)}
					</For>
					<div class="flex gap-1 mt-1">
						<For each={stats()?.weekly || []}>
							{(day) => (
								<span class="w-7 text-[10px] text-ink-soft text-center">
									{day.day}
								</span>
							)}
						</For>
					</div>
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
