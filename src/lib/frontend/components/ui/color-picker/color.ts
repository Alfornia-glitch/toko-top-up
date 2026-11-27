import { converter, formatHex, formatHex8, parse, type Color } from 'culori';

export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'oklch';

export const COLOR_FORMATS: readonly ColorFormat[] = ['hex', 'rgb', 'hsl', 'oklch'];

/** The picker's working colour: hue in degrees, everything else 0-1. */
export type Hsva = { h: number; s: number; v: number; a: number };

const toHsv = converter('hsv');
const toRgb = converter('rgb');
const toHsl = converter('hsl');
const toOklch = converter('oklch');

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits: number) => Number(value.toFixed(digits));

export function detectFormat(value: string): ColorFormat {
	const text = value.trim().toLowerCase();
	if (text.startsWith('oklch')) return 'oklch';
	if (text.startsWith('hsl')) return 'hsl';
	if (text.startsWith('rgb')) return 'rgb';
	return 'hex';
}

/** Falls back to `previous` for the hue of greys, which have none. */
export function toHsva(color: Color | string, previous?: Hsva): Hsva {
	const parsed = typeof color === 'string' ? parse(color) : color;
	if (!parsed) return previous ?? { h: 0, s: 0, v: 0, a: 1 };

	const hsv = toHsv(parsed);
	return {
		h: hsv.h ?? previous?.h ?? 0,
		s: clamp(hsv.s, 0, 1),
		v: clamp(hsv.v, 0, 1),
		a: clamp(hsv.alpha ?? 1, 0, 1)
	};
}

export function toRgbChannels({ h, s, v, a }: Hsva) {
	const rgb = toRgb({ mode: 'hsv', h, s, v, alpha: a });
	return {
		r: Math.round(clamp(rgb.r, 0, 1) * 255),
		g: Math.round(clamp(rgb.g, 0, 1) * 255),
		b: Math.round(clamp(rgb.b, 0, 1) * 255),
		a
	};
}

export function toHslChannels(color: Hsva) {
	const hsl = toHsl({ mode: 'hsv', ...color, alpha: color.a });
	return { h: hsl.h ?? color.h, s: clamp(hsl.s, 0, 1) * 100, l: clamp(hsl.l, 0, 1) * 100 };
}

export function toOklchChannels(color: Hsva) {
	const oklch = toOklch({ mode: 'hsv', ...color, alpha: color.a });
	return { l: clamp(oklch.l, 0, 1), c: Math.max(0, oklch.c), h: oklch.h ?? 0 };
}

const alphaSuffix = (a: number) => (a < 1 ? ` / ${round(a, 2)}` : '');

/** Composes a CSS colour string that `isThemeColor` accepts. */
export function formatColor(color: Hsva, format: ColorFormat): string {
	const source = { mode: 'hsv' as const, ...color, alpha: color.a };

	switch (format) {
		case 'hex':
			return (color.a < 1 ? formatHex8(source) : formatHex(source)) ?? '#000000';
		case 'rgb': {
			const { r, g, b } = toRgbChannels(color);
			return `rgb(${r} ${g} ${b}${alphaSuffix(color.a)})`;
		}
		case 'hsl': {
			const { h, s, l } = toHslChannels(color);
			return `hsl(${round(h, 1)} ${round(s, 1)}% ${round(l, 1)}%${alphaSuffix(color.a)})`;
		}
		case 'oklch': {
			const { l, c, h } = toOklchChannels(color);
			return `oklch(${round(l, 3)} ${round(c, 3)} ${round(h, 1)}${alphaSuffix(color.a)})`;
		}
	}
}
