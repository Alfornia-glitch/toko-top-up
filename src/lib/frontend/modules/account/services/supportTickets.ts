import { api } from '#lib/frontend/modules/shared/http.ts';
import type {
	DataEnvelope,
	SupportTicketDetail,
	SupportTicketSummary,
	TicketInput
} from '#lib/frontend/modules/account/models/index.ts';

export async function listTickets(): Promise<SupportTicketSummary[]> {
	const payload = await api.get<DataEnvelope<SupportTicketSummary[]>>('/api/support-tickets');
	return payload.data;
}

export async function getTicket(id: string): Promise<SupportTicketDetail> {
	const payload = await api.get<DataEnvelope<SupportTicketDetail>>(
		`/api/support-tickets/${encodeURIComponent(id)}`
	);
	return payload.data;
}

export async function createTicket(input: TicketInput): Promise<SupportTicketDetail> {
	const payload = await api.post<DataEnvelope<SupportTicketDetail>>('/api/support-tickets', input);
	return payload.data;
}

export async function addTicketMessage(ticketId: string, body: string): Promise<void> {
	await api.post(`/api/support-tickets/${encodeURIComponent(ticketId)}/messages`, { body });
}
