import { assertActor, unwrap, type Actor } from '#shared';
import { getRuntime } from '#lib/server/runtime.server.ts';

export type DangerAction = 'purge_archived_products' | 'purge_old_audit_logs';

/**
 * Deletes archived products, except those that appear on an order: order
 * history keeps referring to them. Returns how many products were deleted.
 */
async function purgeArchivedProducts(actor: Actor | null): Promise<number> {
	const { catalog, orders } = getRuntime().services;
	const admin = assertActor(actor);
	const archived = unwrap(await catalog.products.listArchivedIds(admin));
	const referenced = new Set(unwrap(await orders.orders.getProductIdsWithItems(archived, admin)));
	const deletable = archived.filter((id) => !referenced.has(id));

	return unwrap(await catalog.products.deleteArchived(deletable, admin));
}

export async function runDangerAction(action: DangerAction, actor: Actor | null) {
	if (action === 'purge_archived_products') {
		return { action, deleted: await purgeArchivedProducts(actor) };
	}

	return { action, deleted: unwrap(await getRuntime().services.audit.audit.purgeOld(actor)) };
}
