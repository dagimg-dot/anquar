import { createEffect, createSignal, on, onCleanup } from "solid-js";
import toast from "solid-toast";
import { deleteBook, updateBook } from "../lib/db";
import { libraryChanged } from "../lib/imports";
import BookCover from "./BookCover";
import BottomSheet from "./BottomSheet";

export interface EditableBook {
	author: string;
	coverImage?: string;
	id: string;
	title: string;
}

// A new cover is as likely to be a photo as a scan, so it is scaled down to what a cover ever shows.
const COVER_MAX_PX = 900;
const CONFIRM_MS = 3000;

async function shrink(file: File): Promise<Blob> {
	const image = await createImageBitmap(file);
	const scale = Math.min(1, COVER_MAX_PX / Math.max(image.width, image.height));
	const canvas = document.createElement("canvas");
	canvas.width = Math.round(image.width * scale);
	canvas.height = Math.round(image.height * scale);
	canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
	image.close();
	return new Promise((resolve) =>
		canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.88),
	);
}

const field =
	"h-12 w-full rounded-xl border border-border bg-surface px-4 text-[15px] text-ink outline-none transition-colors focus:border-brand-500";

// Holding a book in the Library opens this: its title, author and cover to change, or the book to delete,
// which asks for a second tap.
export default function BookEditor(props: {
	book?: EditableBook;
	onClose: () => void;
}) {
	// Kept after closing, so the sheet slides away showing the book rather than an empty form.
	const [book, setBook] = createSignal<EditableBook>();
	const [title, setTitle] = createSignal("");
	const [author, setAuthor] = createSignal("");
	const [cover, setCover] = createSignal<Blob>();
	const [preview, setPreview] = createSignal<string>();
	const [confirming, setConfirming] = createSignal(false);
	let picker: HTMLInputElement | undefined;
	let unconfirm: ReturnType<typeof setTimeout> | undefined;

	createEffect(
		on(
			() => props.book,
			(next) => {
				if (!next) return;
				setBook(next);
				setTitle(next.title);
				setAuthor(next.author);
				setCover(undefined);
				setPreview(undefined);
				setConfirming(false);
			},
		),
	);
	createEffect(
		on(preview, (url) => {
			if (url) onCleanup(() => URL.revokeObjectURL(url));
		}),
	);
	onCleanup(() => clearTimeout(unconfirm));

	const changed = () => {
		const b = book();
		if (!b || title().trim() === "") return false;
		return (
			cover() !== undefined ||
			title().trim() !== b.title ||
			author().trim() !== b.author
		);
	};

	async function pickCover(file: File | undefined) {
		if (!file) return;
		const blob = await shrink(file);
		setCover(blob);
		setPreview(URL.createObjectURL(blob));
	}

	async function save() {
		const b = book();
		const image = cover();
		if (!b || !changed()) return;
		await updateBook(b.id, {
			title: title().trim(),
			author: author().trim(),
			...(image ? { coverImage: image } : {}),
		});
		libraryChanged();
		toast.success("Saved");
		props.onClose();
	}

	async function remove() {
		const b = book();
		if (!b) return;
		if (!confirming()) {
			setConfirming(true);
			unconfirm = setTimeout(() => setConfirming(false), CONFIRM_MS);
			return;
		}
		clearTimeout(unconfirm);
		await deleteBook(b.id);
		libraryChanged();
		toast.success(`Deleted ${b.title}`);
		props.onClose();
	}

	return (
		<BottomSheet
			dim
			onClose={props.onClose}
			open={props.book !== undefined}
			title="Edit book"
		>
			<input
				accept="image/*"
				class="hidden"
				onChange={(e) => {
					void pickCover(e.currentTarget.files?.[0]);
					e.currentTarget.value = "";
				}}
				ref={picker}
				type="file"
			/>
			<div class="flex flex-col gap-4 pb-2">
				<div class="flex items-end gap-4">
					<BookCover
						class="w-20 shrink-0"
						src={preview() ?? book()?.coverImage}
					/>
					<button
						class="h-10 rounded-full border border-border px-4 font-medium text-[14px] text-ink transition-transform active:scale-95"
						onClick={() => picker?.click()}
						type="button"
					>
						Change cover
					</button>
				</div>
				<label class="flex flex-col gap-1.5">
					<span class="text-ink-soft text-xs">Title</span>
					<input
						autocomplete="off"
						class={field}
						enterkeyhint="next"
						onInput={(e) => setTitle(e.currentTarget.value)}
						value={title()}
					/>
				</label>
				<label class="flex flex-col gap-1.5">
					<span class="text-ink-soft text-xs">Author</span>
					<input
						autocomplete="off"
						class={field}
						enterkeyhint="done"
						onInput={(e) => setAuthor(e.currentTarget.value)}
						onKeyDown={(e) => e.key === "Enter" && void save()}
						value={author()}
					/>
				</label>
				<button
					class="mt-1 h-12 w-full rounded-2xl bg-brand-500 font-semibold text-[15px] text-canvas transition-[transform,opacity] active:scale-[0.98] disabled:opacity-40"
					disabled={!changed()}
					onClick={() => void save()}
					type="button"
				>
					Save
				</button>
				<button
					class="h-12 w-full rounded-2xl font-semibold text-[15px] text-flame transition-[transform,background-color] active:scale-[0.98]"
					classList={{ "bg-flame/15": confirming() }}
					onClick={() => void remove()}
					type="button"
				>
					{confirming() ? "Tap again to delete" : "Delete book"}
				</button>
			</div>
		</BottomSheet>
	);
}
