import { z } from 'zod';

export { slugify } from '#shared';

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
