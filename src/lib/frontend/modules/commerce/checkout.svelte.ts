const STORAGE_KEY = 'shopix.checkout';

interface CheckoutSnapshot {
	addressId: string;
	shippingId: string;
	note: string;
	accountDetails: Record<string, string>;
}

function readDetails(value: unknown): Record<string, string> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
	return Object.fromEntries(
		Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
	);
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
			note: typeof parsed.note === 'string' ? parsed.note : '',
			accountDetails: readDetails(parsed.accountDetails)
		};
	} catch {
		return null;
	}
}

class CheckoutStore {
	addressId = $state('');
	shippingId = $state('');
	note = $state('');
	/** Top-up flow: values of the admin-configured account form, keyed by field id. */
	accountDetails = $state<Record<string, string>>({});

	load(): void {
		const snapshot = readSnapshot();
		if (!snapshot) return;

		this.addressId = snapshot.addressId;
		this.shippingId = snapshot.shippingId;
		this.note = snapshot.note;
		this.accountDetails = snapshot.accountDetails;
	}

	persist(): void {
		if (typeof sessionStorage === 'undefined') return;

		sessionStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				addressId: this.addressId,
				shippingId: this.shippingId,
				note: this.note,
				accountDetails: this.accountDetails
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

	setAccountDetails(values: Record<string, string>): void {
		this.accountDetails = { ...values };
		this.persist();
	}

	clear(): void {
		this.addressId = '';
		this.shippingId = '';
		this.note = '';
		this.accountDetails = {};

		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.removeItem(STORAGE_KEY);
		}
	}
}

export const checkout = new CheckoutStore();
