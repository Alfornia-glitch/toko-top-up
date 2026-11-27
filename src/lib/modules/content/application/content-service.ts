import {
	NotFoundError,
	assertActor,
	assertPermission,
	err,
	newId,
	ok,
	systemClock,
	toAppError,
	type Actor,
	type AppError,
	type Clock,
	type Result
} from '#shared';
import {
	isInWindow,
	normaliseItemInput,
	type ContentItem,
	type ContentKind,
	type ContentRepository,
	type MediaAsset,
	type MediaListQuery,
	type MediaPage,
	type MediaStats,
	type NewMediaAsset,
	type PublicContent,
	type SiteSetting
} from '../domain/content.ts';

type Outcome<T> = Promise<Result<T, AppError>>;

export interface ContentService {
	listItems(kind: ContentKind, actor: Actor | null): Outcome<ContentItem[]>;
	createItem(
		kind: ContentKind,
		input: Record<string, unknown>,
		actor: Actor | null
	): Outcome<string>;
	updateItem(
		kind: ContentKind,
		id: string,
		input: Record<string, unknown>,
		actor: Actor | null
	): Outcome<ContentItem>;
	deleteItem(kind: ContentKind, id: string, actor: Actor | null): Outcome<string>;
	/** Storefront view: active items whose schedule window includes now. No actor required. */
	getPublicContent(): Outcome<PublicContent>;

	listMedia(query: MediaListQuery, actor: Actor | null): Outcome<MediaPage>;
	recordMedia(asset: NewMediaAsset, actor: Actor | null): Outcome<string>;
	findMedia(id: string, actor: Actor | null): Outcome<MediaAsset>;
	deleteMedia(id: string, actor: Actor | null): Outcome<MediaAsset>;
	getMediaStats(actor: Actor | null): Outcome<MediaStats>;

	/** Settings are read by the storefront without an actor. */
	listSettings(): Outcome<SiteSetting[]>;
	putSettings(values: Record<string, unknown>, actor: Actor | null): Outcome<SiteSetting[]>;
	deleteSetting(key: string, actor: Actor | null): Outcome<string>;
}

export function createContentService(
	repository: ContentRepository,
	clock: Clock = systemClock
): ContentService {
	async function run<T>(action: () => Promise<T>): Outcome<T> {
		try {
			return ok(await action());
		} catch (error) {
			return err(toAppError(error));
		}
	}

	return {
		listItems: (kind, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				return repository.listItems(kind);
			}),

		createItem: (kind, input, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const id = newId();
				const now = clock.now();
				await repository.insertItem(kind, {
					id,
					...normaliseItemInput(kind, input),
					createdAt: now,
					updatedAt: now
				});
				return id;
			}),

		updateItem: (kind, id, input, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const existing = await repository.findItem(kind, id);
				if (!existing)
					throw new NotFoundError('Content not found', { messageKey: 'content_not_found' });
				const values = normaliseItemInput(kind, input);
				await repository.updateItem(kind, id, { ...values, updatedAt: clock.now() });
				return { ...existing, ...values };
			}),

		deleteItem: (kind, id, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				if (!(await repository.findItem(kind, id)))
					throw new NotFoundError('Content not found', { messageKey: 'content_not_found' });
				await repository.deleteItem(kind, id);
				return id;
			}),

		getPublicContent: () =>
			run(async () => {
				const [banners, announcements, testimonials] = await Promise.all([
					repository.listActiveItems('banners'),
					repository.listActiveItems('announcements'),
					repository.listActiveItems('testimonials')
				]);
				const now = clock.now().getTime();
				return {
					banners: banners.filter((item) => isInWindow(item, now)),
					announcements: announcements.filter((item) => isInWindow(item, now)),
					testimonials
				};
			}),

		listMedia: (query, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const { data, total } = await repository.listMedia(query);
				return { data, page: query.page, pageSize: query.pageSize, total };
			}),

		recordMedia: (asset, actor) =>
			run(async () => {
				assertActor(actor);
				const id = newId();
				await repository.insertMedia({ ...asset, id, createdAt: clock.now() });
				return id;
			}),

		findMedia: (id, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const asset = await repository.findMedia(id);
				if (!asset)
					throw new NotFoundError('Media asset not found', { messageKey: 'media_not_found' });
				return asset;
			}),

		deleteMedia: (id, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const asset = await repository.findMedia(id);
				if (!asset)
					throw new NotFoundError('Media asset not found', { messageKey: 'media_not_found' });
				await repository.deleteMedia(id);
				return asset;
			}),

		getMediaStats: (actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				return repository.mediaStats();
			}),

		listSettings: () => run(() => repository.listSettings()),

		putSettings: (values, actor) =>
			run(async () => {
				const current = assertPermission(actor, 'super:access');
				const now = clock.now();
				for (const [key, valueJson] of Object.entries(values)) {
					await repository.upsertSetting({
						key,
						valueJson,
						updatedBy: current.id,
						updatedAt: now
					});
				}
				return repository.listSettings();
			}),

		deleteSetting: (key, actor) =>
			run(async () => {
				assertPermission(actor, 'super:access');
				if (!(await repository.deleteSetting(key)))
					throw new NotFoundError('Setting not found', { messageKey: 'setting_not_found' });
				return key;
			})
	};
}
