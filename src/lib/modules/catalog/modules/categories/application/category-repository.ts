import type { Category, CategoryStatus, CategorySummary } from '../domain/category.ts';

export interface CategoryUpdate {
	name: string;
	slug: string;
	parentId: string | null;
	description: string | null;
	imageUrl: string | null;
	position: number;
	status: CategoryStatus;
	updatedAt: Date;
}

export interface CategoryRepository {
	listWithProductCounts(): Promise<CategorySummary[]>;
	findById(id: string): Promise<Category | null>;
	findBySlug(slug: string, excludeId?: string): Promise<Category | null>;
	countChildren(id: string): Promise<number>;
	countProducts(id: string): Promise<number>;
	create(category: Category): Promise<void>;
	update(id: string, input: CategoryUpdate): Promise<Category | null>;
	delete(id: string): Promise<void>;
}
