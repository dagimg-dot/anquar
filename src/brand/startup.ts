// iPhone screens in portrait, as [width, height] in CSS px and the device pixel ratio. iOS takes one static
// startup image per screen, so each gets a plain canvas-coloured one and the splash builds the mark on it.
export const IOS_SCREENS = [
	[440, 956, 3],
	[420, 912, 3],
	[402, 874, 3],
	[430, 932, 3],
	[393, 852, 3],
	[428, 926, 3],
	[390, 844, 3],
	[375, 812, 3],
	[414, 896, 3],
	[414, 896, 2],
	[414, 736, 3],
	[375, 667, 2],
	[320, 568, 2],
] as const;

export type IosScreen = (typeof IOS_SCREENS)[number];

export const startupImage = ([w, h, r]: IosScreen) =>
	`icons/startup-${w * r}x${h * r}.png`;

export const startupMedia = ([w, h, r]: IosScreen) =>
	`(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`;
