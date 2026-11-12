import {
	assertPermission,
	err,
	ok,
	systemClock,
	toAppError,
	type Actor,
	type AppError,
	type Clock,
	type Result
} from '#shared';
import {
	buildInventoryReport,
	buildSalesReport,
	lowStockOf,
	reportRange,
	type CommerceReader,
	type DashboardStats,
	type InventoryReport,
	type SalesReport
} from '../domain/reporting.ts';

type Outcome<T> = Promise<Result<T, AppError>>;

const TOP_PRODUCT_LIMIT = 10;
const RECENT_ORDER_LIMIT = 5;
const LOW_STOCK_LIMIT = 5;

/** Back-office reports composed from the orders, catalog and customers modules. */
export interface CommerceReportsService {
	salesReport(range: { from?: string; to?: string }, actor: Actor | null): Outcome<SalesReport>;
	inventoryReport(actor: Actor | null): Outcome<InventoryReport>;
	dashboard(actor: Actor | null): Outcome<DashboardStats>;
}

export function createCommerceReportsService(
	reader: CommerceReader,
	clock: Clock = systemClock
): CommerceReportsService {
	async function run<T>(action: () => Promise<T>): Outcome<T> {
		try {
			return ok(await action());
		} catch (error) {
			return err(toAppError(error));
		}
	}

	return {
		salesReport: (range, actor) =>
			run(async () => {
				const admin = assertPermission(actor, 'admin:access');
				const window = reportRange(clock.now(), range.from, range.to);
				return buildSalesReport(window, await reader.salesData(window, TOP_PRODUCT_LIMIT, admin));
			}),

		inventoryReport: (actor) =>
			run(async () => {
				const admin = assertPermission(actor, 'admin:access');
				const { variants, recentMovements } = await reader.inventoryData(admin);
				return buildInventoryReport(variants, recentMovements);
			}),

		dashboard: (actor) =>
			run(async () => {
				const admin = assertPermission(actor, 'admin:access');
				const [products, customers, totals, recentOrders, inventory] = await Promise.all([
					reader.productCount(admin),
					reader.customerCount(admin),
					reader.orderTotals(admin),
					reader.recentOrders(RECENT_ORDER_LIMIT, admin),
					reader.inventoryData(admin)
				]);
				const low = lowStockOf(inventory.variants, LOW_STOCK_LIMIT);

				return {
					products,
					orders: totals.orderCount,
					customers,
					revenueCents: totals.revenueCents,
					pendingOrders: totals.pendingCount,
					lowStockVariants: low.total,
					recentOrders,
					lowStock: low.items
				};
			})
	};
}
