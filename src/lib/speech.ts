import { createSignal } from "solid-js";

// Only a voice that lives on the phone: a network voice would send the word away, and Explain is meant to be
// the one thing that carries what you read off it.
const synth =
	typeof speechSynthesis === "undefined" ? undefined : speechSynthesis;
const english = /^en([-_]|$)/i;

const tag = (lang: string) => lang.replace("_", "-").toLowerCase();

// Android marks no English voice as the default and lists Australia first, so the reader's own languages
// choose the accent.
const localVoice = () => {
	const voices = (synth?.getVoices() ?? []).filter(
		(v) => v.localService && english.test(v.lang),
	);
	for (const lang of [...navigator.languages, "en-US"]) {
		const match = voices.find((v) => tag(v.lang) === tag(lang));
		if (match) return match;
	}
	return voices.find((v) => v.default) ?? voices[0];
};

// Chrome fills the list after the page loads, so the speaker shows once a voice turns up.
const [voice, setVoice] = createSignal(localVoice());
synth?.addEventListener("voiceschanged", () => setVoice(localVoice()));

export const canSay = () => voice() !== undefined;

const [saying, setSaying] = createSignal<string | null>(null);

export { saying };

// A cancelled utterance ends after the next one is queued, so only the latest may end what is being said.
let latest: SpeechSynthesisUtterance | undefined;

// Lit from the tap, not the utterance's start, which waits a moment while Android wakes its engine. Says
// it again from the start when tapped mid-word, as a dictionary's speaker does.
export function say(text: string) {
	const v = voice();
	if (!synth || !v) return;
	synth.cancel();
	const u = new SpeechSynthesisUtterance(text);
	latest = u;
	setSaying(text);
	u.voice = v;
	u.lang = v.lang;
	u.rate = 0.9;
	u.onend = u.onerror = () => u === latest && setSaying(null);
	synth.speak(u);
}

export function hush() {
	latest = undefined;
	synth?.cancel();
	setSaying(null);
}
