import { Copy, DownloadSimple, Export, Quotes } from "phosphor-solid";
import { type JSX, onCleanup, Show } from "solid-js";
import toast from "solid-toast";

interface ShareSheetProps {
	/** The passage's image, as a JPEG (lib/share-card.ts). */
	image: Blob;
	name: string;
	onShared: () => void;
	text: string;
}

// The passage's image, shown before it goes anywhere: out through the phone's share sheet with its words, onto
// the clipboard for a chat on a computer, or saved. A browser that can't share a picture (Chrome on Linux,
// Firefox) gets the rest without the Share button.
export default function ShareSheet(props: ShareSheetProps) {
	const url = URL.createObjectURL(props.image);
	onCleanup(() => URL.revokeObjectURL(url));

	const file = new File([props.image], `${props.name}.jpg`, {
		type: "image/jpeg",
	});
	const canShare =
		navigator.canShare?.({ files: [file], text: props.text }) === true;

	async function shareOut() {
		try {
			await navigator.share({ files: [file], text: props.text });
			props.onShared();
		} catch {}
	}

	// The clipboard takes only PNG; handed over as a promise, it's made after the tap without losing it.
	async function copyImage() {
		try {
			await navigator.clipboard.write([
				new ClipboardItem({ "image/png": toPng(props.image) }),
			]);
			toast.success("Image copied");
		} catch {
			toast.error("Couldn't copy the image. Save it instead.");
		}
	}

	function saveImage() {
		const link = document.createElement("a");
		link.href = url;
		link.download = file.name;
		link.click();
	}

	async function copyText() {
		try {
			await navigator.clipboard.writeText(props.text);
			toast.success("Passage copied");
		} catch {
			toast.error("Couldn't copy the passage");
		}
	}

	return (
		<div class="pb-2">
			<img
				alt="The passage, set on the book's cover"
				class="mx-auto max-h-[42dvh] w-auto rounded-xl shadow-[0_12px_32px_-12px_rgba(0,0,0,0.45)]"
				src={url}
			/>
			<Show when={canShare}>
				<button
					class="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-3.5 font-semibold text-[15px] text-canvas transition-transform active:scale-[0.98]"
					onClick={() => void shareOut()}
					type="button"
				>
					<Export size={20} weight="bold" />
					Share
				</button>
			</Show>
			<div
				class="grid grid-cols-3 gap-2"
				classList={{ "mt-2.5": canShare, "mt-5": !canShare }}
			>
				<Action label="Copy image" onClick={() => void copyImage()}>
					<Copy size={22} />
				</Action>
				<Action label="Save image" onClick={saveImage}>
					<DownloadSimple size={22} />
				</Action>
				<Action label="Copy text" onClick={() => void copyText()}>
					<Quotes size={22} />
				</Action>
			</div>
		</div>
	);
}

function toPng(image: Blob): Promise<Blob> {
	return createImageBitmap(image).then(
		(bitmap) =>
			new Promise((resolve, reject) => {
				const canvas = document.createElement("canvas");
				canvas.width = bitmap.width;
				canvas.height = bitmap.height;
				canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
				canvas.toBlob(
					(png) => (png ? resolve(png) : reject(new Error("No image"))),
					"image/png",
				);
			}),
	);
}

function Action(props: {
	children: JSX.Element;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			class="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 font-medium text-[13px] text-ink transition-transform active:scale-95"
			onClick={props.onClick}
			type="button"
		>
			{props.children}
			{props.label}
		</button>
	);
}
