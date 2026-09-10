import { type JSX, mergeProps, Show, splitProps } from "solid-js";

interface BookCoverProps {
	src?: string;
	progress?: number;
	class?: string;
	children?: JSX.Element;
}

const bookCoverAfterStyle = `.book-cover::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 50%, oklch(0 0 0 / 0.4)); pointer-events: none; }`;

export default function BookCover(rawProps: BookCoverProps) {
	const props = mergeProps({ progress: 0 }, rawProps);
	const [local, others] = splitProps(props, [
		"src",
		"progress",
		"class",
		"children",
	]);

	return (
		<>
			<style>{bookCoverAfterStyle}</style>
			<div
				class={[
					"book-cover",
					"relative aspect-[3/4] overflow-hidden rounded-xl bg-[oklch(0.22_0.02_163)]",
					local.class,
				]
					.filter(Boolean)
					.join(" ")}
				{...others}
			>
				<Show when={local.src}>
					<img
						src={local.src}
						alt=""
						class="w-full h-full object-cover"
						loading="lazy"
					/>
				</Show>
				<Show when={!local.src}>
					<div class="w-full h-full bg-[linear-gradient(135deg,oklch(0.34_0.06_158),oklch(0.24_0.04_168))]" />
				</Show>
				<Show when={local.progress > 0}>
					<div class="absolute bottom-[6px] left-[6px] right-[6px] h-[3px] rounded-sm bg-[oklch(0_0_0/0.25)] overflow-hidden z-10">
						<div
							class="h-full rounded-sm bg-brand-500 transition-[width] duration-300"
							style={{ width: `${local.progress}%` }}
						/>
					</div>
				</Show>
				{local.children}
			</div>
		</>
	);
}
