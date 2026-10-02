import "./landing.css";
import "./phone.css";
import { mountFeedPhone } from "./feed-phone.ts";
import { mountManuscript } from "./manuscript.ts";
import { setUpPage } from "./page.ts";
import { mountPulseDemo } from "./pulse-demo.ts";
import { mountReaderPhone } from "./reader-phone.ts";
import { renderShare } from "./share-card.ts";

const find = (selector: string) =>
	document.querySelector<HTMLElement>(selector);

const feed = find('[data-phone="feed"]');
if (feed) mountFeedPhone(feed);

const reader = find('[data-phone="reader"]');
const readerControls = find("[data-reader-controls]");
if (reader && readerControls) mountReaderPhone(reader, readerControls);

const pulse = find('[data-demo="pulse"]');
if (pulse) mountPulseDemo(pulse);

const share = find("[data-share-tile]");
if (share)
	renderShare(
		share,
		"moby",
		"Yes, as every one knows, meditation and water are wedded for ever.",
	);

const manuscript = find("[data-manuscript]");
const heroCopy = find(".hero-copy");
if (manuscript && heroCopy) mountManuscript(manuscript, heroCopy);

setUpPage();
