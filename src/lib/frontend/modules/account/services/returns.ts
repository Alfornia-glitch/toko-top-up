import { api } from '#lib/frontend/modules/shared/http.ts';
import type {
	DataEnvelope,
	ReturnDetail,
	ReturnInput,
	ReturnSummary
} from '#lib/frontend/modules/account/models/index.ts';

export async function listReturns(): Promise<ReturnSummary[]> {
	const payload = await api.get<DataEnvelope<ReturnSummary[]>>('/api/returns');
	return payload.data;
}

export async function getReturn(id: string): Promise<ReturnDetail> {
	const payload = await api.get<DataEnvelope<ReturnDetail>>(
		`/api/returns/${encodeURIComponent(id)}`
	);
	return payload.data;
}

export async function createReturn(input: ReturnInput): Promise<ReturnDetail> {
	const payload = await api.post<DataEnvelope<ReturnDetail>>('/api/returns', input);
	return payload.data;
}
