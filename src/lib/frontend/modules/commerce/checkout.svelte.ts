const STORAGE_KEY = 'shopix.checkout';

interface CheckoutSnapshot {
	addressId: string;
	shippingId: string;
	note: string;
}

function readSnapshot(): CheckoutSnapshot | null {
	if (typeof sessionStorage === 'undefined') return null;

	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<CheckoutSnapshot>;
		return {
			addressId: typeof parsed.addressId === 'string' ? parsed.addressId : '',
			shippingId: typeof parsed.shippingId === 'string' ? parsed.shippingId : '',
			note: typeof parsed.note === 'string' ? parsed.note : ''
		};
	} catch {
		return null;
	}
}

class CheckoutStore {
	addressId = $state('');
	shippingId = $state('');
	note = $state('');

	load(): void {
		const snapshot = readSnapshot();
		if (!snapshot) return;

		this.addressId = snapshot.addressId;
		this.shippingId = snapshot.shippingId;
		this.note = snapshot.note;
	}

	persist(): void {
		if (typeof sessionStorage === 'undefined') return;

		sessionStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				addressId: this.addressId,
				shippingId: this.shippingId,
				note: this.note
			})
		);
	}

	selectAddress(id: string): void {
		this.addressId = id;
		this.persist();
	}

	selectShipping(id: string): void {
		this.shippingId = id;
		this.persist();
	}

	clear(): void {
		this.addressId = '';
		this.shippingId = '';
		this.note = '';

		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.removeItem(STORAGE_KEY);
		}
	}
}

export const checkout = new CheckoutStore();
