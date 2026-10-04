import { useNavigate } from "@solidjs/router";
import { For } from "solid-js";
import { bookPath } from "../lib/routes";
import { openBook } from "../lib/transitions";
import BookCover from "./BookCover";
import CarouselRow from "./CarouselRow";
import SectionHeader from "./SectionHeader";

interface Book {
	id: string;
	title: string;
	author: string;
	coverImage?: string;
	progress: number;
}

interface InProgressRowProps {
	books: Book[];
}

export default function InProgressRow(props: InProgressRowProps) {
	const navigate = useNavigate();

	return (
		<div>
			<SectionHeader title="In Progress" />
			<CarouselRow>
				<For each={props.books}>
					{(book) => (
						<button
							type="button"
							class="w-[120px] cursor-pointer bg-transparent border-none p-0 text-left [font:inherit] [color:inherit] active:scale-95 hover:-translate-y-1 transition-transform duration-300 tablet:w-[140px]"
							onClick={(e) =>
								openBook(
									() => navigate(bookPath(book.id)),
									book.id,
									e.currentTarget,
								)
							}
						>
							<BookCover
								data-cover={book.id}
								src={book.coverImage}
								progress={book.progress}
								class="w-full"
							/>
							<div class="text-xs font-semibold text-ink mt-1.5 leading-[1.3] line-clamp-2">
								{book.title}
							</div>
							<div class="text-[11px] text-ink-soft mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
								{book.author}
							</div>
						</button>
					)}
				</For>
			</CarouselRow>
		</div>
	);
}
