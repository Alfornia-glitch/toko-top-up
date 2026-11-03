import { api, ApiError, unwrap } from './http.ts';
import type { Cart } from './models.ts';

type CartPayload = { data: Cart };

class CartStore {
	cart = $state<Cart | null>(null);
	loading = $state(false);
	error = $state('');

	readonly items = $derived(this.cart?.items ?? []);
	readonly count = $derived(this.cart?.itemCount ?? 0);
	readonly subtotalCents = $derived(this.cart?.subtotalCents ?? 0);
	readonly discountCents = $derived(this.cart?.discountCents ?? 0);
	readonly totalCents = $derived(this.cart?.totalCents ?? 0);
	readonly currency = $derived(this.cart?.currency ?? 'USD');

	async refresh(): Promise<void> {
		await this.run(async () => {
			this.cart = unwrap(await api.get<CartPayload>('/api/cart'));
		});
	}

	async add(variantId: string, quantity = 1): Promise<void> {
		await this.run(async () => {
			this.cart = unwrap(await api.post<CartPayload>('/api/cart/items', { variantId, quantity }));
		});
	}

	async update(itemId: string, quantity: number): Promise<void> {
		await this.run(async () => {
			this.cart = unwrap(await api.patch<CartPayload>(`/api/cart/items/${itemId}`, { quantity }));
		});
	}

	async remove(itemId: string): Promise<void> {
		await this.run(async () => {
			this.cart = unwrap(await api.delete<CartPayload>(`/api/cart/items/${itemId}`));
		});
	}

	async applyCoupon(code: string): Promise<void> {
		await this.run(async () => {
			this.cart = unwrap(await api.post<CartPayload>('/api/cart/coupon', { code }));
		});
	}

	async removeCoupon(): Promise<void> {
		await this.run(async () => {
			this.cart = unwrap(await api.delete<CartPayload>('/api/cart/coupon'));
		});
	}

	async clear(): Promise<void> {
		await this.run(async () => {
			this.cart = unwrap(await api.delete<CartPayload>('/api/cart'));
		});
	}

	private async run(fn: () => Promise<void>): Promise<void> {
		this.loading = true;
		this.error = '';

		try {
			await fn();
		} catch (cause) {
			this.error =
				cause instanceof ApiError
					? cause.message
					: cause instanceof Error
						? cause.message
						: 'Something went wrong';
		} finally {
			this.loading = false;
		}
	}
}

export const cart = new CartStore();
