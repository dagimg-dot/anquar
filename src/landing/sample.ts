// What the phones show. Public-domain books only, so every cover and line on the page can be shown freely.

export type CoverStyle = "a" | "b" | "c" | "d";

export interface SampleBook {
	title: string;
	author: string;
	bg: string;
	ink: string;
	style: CoverStyle;
}

export const BOOKS = {
	moby: {
		title: "Moby-Dick",
		author: "Herman Melville",
		bg: "#163049",
		ink: "#EDE3CF",
		style: "a",
	},
	meditations: {
		title: "Meditations",
		author: "Marcus Aurelius",
		bg: "#8B4630",
		ink: "#F6E9DA",
		style: "b",
	},
	pride: {
		title: "Pride and Prejudice",
		author: "Jane Austen",
		bg: "#E8DED0",
		ink: "#4A2638",
		style: "c",
	},
	karamazov: {
		title: "The Brothers Karamazov",
		author: "Fyodor Dostoevsky",
		bg: "#2B1316",
		ink: "#D8B56A",
		style: "b",
	},
	walden: {
		title: "Walden",
		author: "Henry David Thoreau",
		bg: "#C8962B",
		ink: "#1F2B1E",
		style: "d",
	},
	frankenstein: {
		title: "Frankenstein",
		author: "Mary Shelley",
		bg: "#1E2B2C",
		ink: "#CFE0DA",
		style: "a",
	},
	odyssey: {
		title: "The Odyssey",
		author: "Homer",
		bg: "#22345F",
		ink: "#E8D9B5",
		style: "d",
	},
} satisfies Record<string, SampleBook>;

export type BookId = keyof typeof BOOKS;

export const MOBY_DICK = {
	heading: "CHAPTER 1. Loomings.",
	paragraphs: [
		"Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation. Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, and bringing up the rear of every funeral I meet; and especially whenever my hypos get such an upper hand of me, that it requires a strong moral principle to prevent me from deliberately stepping into the street, and methodically knocking people's hats off—then, I account it high time to get to sea as soon as I can. This is my substitute for pistol and ball. With a philosophical flourish Cato throws himself upon his sword; I quietly take to the ship. There is nothing surprising in this. If they but knew it, almost all men in their degree, some time or other, cherish very nearly the same feelings towards the ocean with me.",
		"There now is your insular city of the Manhattoes, belted round by wharves as Indian isles by coral reefs—commerce surrounds it with her surf. Right and left, the streets take you waterward. Its extreme downtown is the battery, where that noble mole is washed by waves, and cooled by breezes, which a few hours previous were out of sight of land. Look at the crowds of water-gazers there.",
		"Circumambulate the city of a dreamy Sabbath afternoon. Go from Corlears Hook to Coenties Slip, and from thence, by Whitehall, northward. What do you see?—Posted like silent sentinels all around the town, stand thousands upon thousands of mortal men fixed in ocean reveries. Some leaning against the spiles; some seated upon the pier-heads; some looking over the bulwarks of ships from China; some high aloft in the rigging, as if striving to get a still better seaward peep. But these are all landsmen; of week days pent up in lath and plaster—tied to counters, nailed to benches, clinched to desks. How then is this? Are the green fields gone? What do they here?",
		"But look! here come more crowds, pacing straight for the water, and seemingly bound for a dive. Strange! Nothing will content them but the extremest limit of the land; loitering under the shady lee of yonder warehouses will not suffice. No. They must get just as nigh the water as they possibly can without falling in. And there they stand—miles of them—leagues. Inlanders all, they come from lanes and alleys, streets and avenues—north, east, south, and west. Yet here they all unite. Tell me, does the magnetic virtue of the needles of the compasses of all those ships attract them thither?",
		"Once more. Say you are in the country; in some high land of lakes. Take almost any path you please, and ten to one it carries you down in a dale, and leaves you there by a pool in the stream. There is magic in it. Let the most absent-minded of men be plunged in his deepest reveries—stand that man on his legs, set his feet a-going, and he will infallibly lead you to water, if water there be in all that region. Should you ever be athirst in the great American desert, try this experiment, if your caravan happen to be supplied with a metaphysical professor. Yes, as every one knows, meditation and water are wedded for ever.",
		"But here is an artist. He desires to paint you the dreamiest, shadiest, quietest, most enchanting bit of romantic landscape in all the valley of the Saco. What is the chief element he employs? There stand his trees, each with a hollow trunk, as if a hermit and a crucifix were within; and here sleeps his meadow, and there sleep his cattle; and up from yonder cottage goes a sleepy smoke. Deep into distant woodlands winds a mazy way, reaching to overlapping spurs of mountains bathed in their hill-side blue. But though the picture lies thus tranced, and though this pine-tree shakes down its sighs like leaves upon this shepherd's head, yet all were vain, unless the shepherd's eye were fixed upon the magic stream before him. Go visit the Prairies in June, when for scores on scores of miles you wade knee-deep among Tiger-lilies—what is the one charm wanting?—Water—there is not a drop of water there! Were Niagara but a cataract of sand, would you travel your thousand miles to see it? Why did the poor poet of Tennessee, upon suddenly receiving two handfuls of silver, deliberate whether to buy him a coat, which he sadly needed, or invest his money in a pedestrian trip to Rockaway Beach? Why is almost every robust healthy boy with a robust healthy soul in him, at some time or other crazy to go to sea? Why upon your first voyage as a passenger, did you yourself feel such a mystical vibration, when first told that you and your ship were now out of sight of land? Why did the old Persians hold the sea holy? Why did the Greeks give it a separate deity, and own brother of Jove? Surely all this is not without meaning. And still deeper the meaning of that story of Narcissus, who because he could not grasp the tormenting, mild image he saw in the fountain, plunged into it and was drowned. But that same image, we ourselves see in all rivers and oceans. It is the image of the ungraspable phantom of life; and this is the key to it all.",
	],
};

// The Feed tab's library: the place in each book, as the app shows it.
export const CONTINUE: { book: BookId; percent: number } = {
	book: "moby",
	percent: 62,
};

export const IN_PROGRESS: { book: BookId; percent: number }[] = [
	{ book: "meditations", percent: 38 },
	{ book: "pride", percent: 81 },
	{ book: "karamazov", percent: 27 },
	{ book: "walden", percent: 12 },
];

export const FINISHED: BookId[] = ["frankenstein", "odyssey"];
export const BOOKS_FINISHED = 7;

// anquars read each day, oldest first and ending today, as reading rows. The one missed day is spent from a
// banked rest day, so the Pulse shows a long streak, a rest in its week and another still banked.
const HISTORY = [
	30, 32, 31, 30, 18, 30, 33, 31, 34, 30, 12, 30, 41, 30, 26, 0, 33, 30, 28, 35,
	30, 24,
];
const PACE_SECONDS = 38;

export const historyRows = (
	today: string,
	shift: (d: string, n: number) => string,
) =>
	HISTORY.map((anquars, i) => ({
		date: shift(today, i - (HISTORY.length - 1)),
		anquars,
		seconds: anquars * PACE_SECONDS,
	}));
