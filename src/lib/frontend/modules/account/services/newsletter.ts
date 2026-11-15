import { api } from '#lib/frontend/modules/shared/http.ts';
import type {
	DataEnvelope,
	NewsletterSubscription
} from '#lib/frontend/modules/account/models/index.ts';

export async function getSubscription(): Promise<NewsletterSubscription | null> {
	const payload =
		await api.get<DataEnvelope<NewsletterSubscription | null>>('/api/account/newsletter');
	return payload.data;
}

export async function setSubscriptionStatus(
	status: NewsletterSubscription['status']
): Promise<NewsletterSubscription> {
	const payload = await api.patch<DataEnvelope<NewsletterSubscription>>('/api/account/newsletter', {
		status
	});
	return payload.data;
}

export async function subscribeNewsletter(email: string): Promise<void> {
	await api.post('/api/newsletter', { email });
}
