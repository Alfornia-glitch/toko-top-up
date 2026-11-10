// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { createModuleRegistry } from '#lib/server/registry.server.ts';

function register(
	registry: ReturnType<typeof createModuleRegistry>,
	order: string[],
	name: string,
	dependencies: string[] = []
): void {
	registry.register({
		name,
		dependencies,
		initialize: () => order.push(name)
	});
}

describe('module registry', () => {
	test('initializes children before their parent', () => {
		const order: string[] = [];
		const registry = createModuleRegistry();

		register(registry, order, 'catalog', ['catalog.products', 'catalog.inventory']);
		register(registry, order, 'catalog.products');
		register(registry, order, 'catalog.inventory');

		registry.initialize();

		expect(order.indexOf('catalog.products')).toBeLessThan(order.indexOf('catalog'));
		expect(order.indexOf('catalog.inventory')).toBeLessThan(order.indexOf('catalog'));
	});

	test('initializes dependencies before dependents', () => {
		const order: string[] = [];
		const registry = createModuleRegistry();

		register(registry, order, 'checkout', ['cart', 'orders']);
		register(registry, order, 'cart', ['catalog']);
		register(registry, order, 'orders', ['catalog']);
		register(registry, order, 'catalog');

		registry.initialize();

		expect(order.indexOf('catalog')).toBeLessThan(order.indexOf('cart'));
		expect(order.indexOf('catalog')).toBeLessThan(order.indexOf('orders'));
		expect(order.indexOf('cart')).toBeLessThan(order.indexOf('checkout'));
		expect(order.indexOf('orders')).toBeLessThan(order.indexOf('checkout'));
	});

	test('rejects duplicate registrations', () => {
		const registry = createModuleRegistry();
		register(registry, [], 'catalog');

		expect(() => register(registry, [], 'catalog')).toThrow(
			'Module "catalog" is already registered'
		);
	});

	test('rejects unknown dependencies', () => {
		const registry = createModuleRegistry();
		register(registry, [], 'checkout', ['missing']);

		expect(() => registry.initialize()).toThrow('Unknown module dependency "missing"');
	});

	test('detects dependency cycles', () => {
		const registry = createModuleRegistry();
		register(registry, [], 'a', ['b']);
		register(registry, [], 'b', ['a']);

		expect(() => registry.initialize()).toThrow('Module dependency cycle detected at "a"');
	});

	test('does not initialize twice', () => {
		const registry = createModuleRegistry();
		register(registry, [], 'catalog');
		registry.initialize();

		expect(() => registry.initialize()).toThrow('Module registry is already initialized');
	});
});
