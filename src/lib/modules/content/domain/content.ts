export const CONTENT_KINDS = ['banners', 'announcements', 'testimonials'] as const;

export type ContentKind = (typeof CONTENT_KINDS)[number];

export function isContentKind(value: string): value is ContentKind {
	return (CONTENT_KINDS as readonly string[]).includes(value);
}

/** A CMS row; the shape depends on the kind (banner, announcement or testimonial). */
export type ContentItem = { id: string } & Record<string, unknown>;

export interface PublicContent {
	banners: ContentItem[];
	announcements: ContentItem[];
	testimonials: ContentItem[];
}

export interface MediaAsset {
	id: string;
	path: string;
	url: string;
	contentType: string;
	sizeBytes: number;
	folder: string;
	uploadedBy: string | null;
	alt: string | null;
	createdAt: Date;
}

export interface NewMediaAsset {
	path: string;
	url: string;
	contentType: string;
	sizeBytes: number;
	folder: string;
	uploadedBy: string | null;
}

export interface MediaListQuery {
	q?: string | undefined;
	folder?: string | undefined;
	page: number;
	pageSize: number;
}

export interface MediaPage {
	data: MediaAsset[];
	page: number;
	pageSize: number;
	total: number;
}

export interface MediaFolderStats {
	folder: string;
	assets: number;
	bytes: number;
}

export interface MediaStats {
	assets: number;
	bytes: number;
	folders: MediaFolderStats[];
	recent: Pick<MediaAsset, 'id' | 'url' | 'path' | 'folder' | 'sizeBytes' | 'createdAt'>[];
}

export interface SiteSetting {
	key: string;
	valueJson: unknown;
	updatedBy: string | null;
	updatedAt: Date;
}

export interface ContentRepository {
	listItems(kind: ContentKind): Promise<ContentItem[]>;
	listActiveItems(kind: ContentKind): Promise<ContentItem[]>;
	findItem(kind: ContentKind, id: string): Promise<ContentItem | null>;
	insertItem(kind: ContentKind, values: ContentItem): Promise<void>;
	updateItem(kind: ContentKind, id: string, values: Record<string, unknown>): Promise<void>;
	deleteItem(kind: ContentKind, id: string): Promise<void>;

	listMedia(query: MediaListQuery): Promise<{ data: MediaAsset[]; total: number }>;
	insertMedia(asset: NewMediaAsset & { id: string; createdAt: Date }): Promise<void>;
	findMedia(id: string): Promise<MediaAsset | null>;
	deleteMedia(id: string): Promise<void>;
	mediaStats(): Promise<MediaStats>;

	listSettings(): Promise<SiteSetting[]>;
	upsertSetting(setting: SiteSetting): Promise<void>;
	deleteSetting(key: string): Promise<boolean>;
}

const NULLABLE_KEYS = ['subtitle', 'mobileImageUrl', 'ctaLabel', 'ctaUrl', 'link', 'caption'];

/** Coerces admin input into column values: ISO strings become dates, absent optionals become null. */
export function normaliseItemInput(
	kind: ContentKind,
	input: Record<string, unknown>
): Record<string, unknown> {
	const values: Record<string, unknown> = { ...input };

	if (kind !== 'testimonials') {
		for (const key of ['startsAt', 'endsAt']) {
			const value = input[key];
			values[key] = typeof value === 'string' && value ? new Date(value) : null;
		}
	}

	for (const key of NULLABLE_KEYS) {
		if (values[key] === undefined) values[key] = null;
	}

	return values;
}

export function isInWindow(item: Record<string, unknown>, now: number): boolean {
	return (
		(!item.startsAt || new Date(item.startsAt as string | Date).getTime() <= now) &&
		(!item.endsAt || new Date(item.endsAt as string | Date).getTime() >= now)
	);
}
