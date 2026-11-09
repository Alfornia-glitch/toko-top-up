import { z } from 'zod';

export const brandStatusSchema = z.enum(['active', 'inactive']);

export const brandWriteSchema = z.object({
	name: z.string().trim().min(1).max(200),
	slug: z.string().trim().min(1).max(200).optional(),
	logoUrl: z.string().trim().max(2000).nullable().optional(),
	description: z.string().trim().max(5000).nullable().optional(),
	status: brandStatusSchema.default('active')
});

export type BrandStatus = z.infer<typeof brandStatusSchema>;
export type BrandWriteInput = z.infer<typeof brandWriteSchema>;

export interface Brand {
	id: string;
	name: string;
	slug: string;
	logoUrl: string | null;
	description: string | null;
	status: BrandStatus;
	createdAt: Date;
	updatedAt: Date;
}

export interface BrandSummary extends Omit<Brand, 'createdAt'> {
	productCount: number;
}

export interface BrandOption {
	id: string;
	name: string;
}

export function slugify(value: string): string {
	return value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 180);
}
