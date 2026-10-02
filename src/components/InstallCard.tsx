import { Show } from "solid-js";
import { install, installLater, suggestInstall } from "../lib/install.ts";

// Opened in Chrome rather than installed: one card at the top of the Feed tab says what installing gives you.
export default function InstallCard() {
	return (
		<Show when={suggestInstall()}>
			<div class="mb-5 px-4">
				<div class="flex items-center gap-3.5 rounded-2xl border border-border bg-surface py-3.5 pr-3.5 pl-4">
					<img
						alt=""
						class="h-12 w-12 shrink-0 rounded-[14px]"
						height="48"
						src="/icons/pwa-192x192.png"
						width="48"
					/>
					<div class="min-w-0 flex-1">
						<div class="font-semibold text-[15px] text-ink">Install anquar</div>
						<div class="mt-0.5 text-[13px] text-ink-soft leading-snug">
							Opens full screen, reads offline, and takes EPUBs from your share
							sheet.
						</div>
					</div>
					<div class="flex shrink-0 flex-col items-stretch gap-1">
						<button
							class="rounded-full bg-brand-500 px-4 py-2 font-semibold text-[13.5px] text-canvas transition-transform active:scale-95"
							onClick={() => void install()}
							type="button"
						>
							Install
						</button>
						<button
							class="py-1 font-medium text-[12.5px] text-ink-muted"
							onClick={installLater}
							type="button"
						>
							Not now
						</button>
					</div>
				</div>
			</div>
		</Show>
	);
}
