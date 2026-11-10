export interface ModuleDefinition {
	readonly name: string;
	readonly dependencies?: readonly string[];
	initialize(): void;
}

export interface ModuleRegistry {
	register(definition: ModuleDefinition): void;
	initialize(): void;
	order(): string[];
}

export function createModuleRegistry(): ModuleRegistry {
	const definitions = new Map<string, ModuleDefinition>();
	const initialized: string[] = [];

	function register(definition: ModuleDefinition): void {
		if (definitions.has(definition.name)) {
			throw new Error(`Module "${definition.name}" is already registered`);
		}

		definitions.set(definition.name, definition);
	}

	function initialize(): void {
		if (initialized.length) throw new Error('Module registry is already initialized');

		const ordered: ModuleDefinition[] = [];
		const visiting = new Set<string>();
		const visited = new Set<string>();

		function visit(name: string): void {
			if (visited.has(name)) return;
			if (visiting.has(name)) {
				throw new Error(`Module dependency cycle detected at "${name}"`);
			}

			const definition = definitions.get(name);
			if (!definition) throw new Error(`Unknown module dependency "${name}"`);

			visiting.add(name);

			for (const dependency of definition.dependencies ?? []) {
				visit(dependency);
			}

			visiting.delete(name);
			visited.add(name);
			ordered.push(definition);
		}

		for (const name of definitions.keys()) visit(name);

		for (const definition of ordered) definition.initialize();
		initialized.push(...ordered.map((definition) => definition.name));
	}

	return {
		register,
		initialize,
		order: () => [...initialized]
	};
}
