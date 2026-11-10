import { z } from 'zod';

export const categoryStatusSchema = z.enum(['active', 'inactive']);

export const categoryWriteSchema = z.object({
	name: z.string().trim().min(1).max(200),
	slug: z.string().trim().min(1).max(200).optional(),
	parentId: z.string().trim().max(100).nullable().optional(),
	description: z.string().trim().max(5000).nullable().optional(),
	imageUrl: z.string().trim().max(2000).nullable().optional(),
	position: z.number().int().min(0).default(0),
	status: categoryStatusSchema.default('active')
});

export type CategoryStatus = z.infer<typeof categoryStatusSchema>;
export type CategoryWriteInput = z.input<typeof categoryWriteSchema>;

export interface Category {
	id: string;
	name: string;
	slug: string;
	parentId: string | null;
	description: string | null;
	imageUrl: string | null;
	position: number;
	status: CategoryStatus;
	createdAt: Date;
	updatedAt: Date;
}

export interface CategorySummary extends Omit<Category, 'createdAt'> {
	parentName: string | null;
	productCount: number;
}

export interface CategoryOption {
	id: string;
	name: string;
}
