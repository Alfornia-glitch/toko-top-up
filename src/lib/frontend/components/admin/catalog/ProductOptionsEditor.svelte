<script lang="ts" module>
	export type ProductOptionValueRow = {
		clientId: string;
		id?: string;
		value: string;
		colorHex: string;
		position: number;
	};

	export type ProductOptionRow = {
		clientId: string;
		id?: string;
		name: string;
		position: number;
		values: ProductOptionValueRow[];
	};
</script>

<script lang="ts">
	import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';

	let { options = $bindable() }: { options: ProductOptionRow[] } = $props();

	function addOption() {
		options.push({
			clientId: crypto.randomUUID(),
			name: '',
			position: options.length,
			values: []
		});
	}

	function moveOption(index: number, offset: number) {
		const target = index + offset;
		if (target < 0 || target >= options.length) return;

		const [row] = options.splice(index, 1);
		options.splice(target, 0, row);

		options.forEach((option, position) => {
			option.position = position;
		});
	}

	function removeOption(index: number) {
		options.splice(index, 1);

		options.forEach((option, position) => {
			option.position = position;
		});
	}

	function addValue(option: ProductOptionRow) {
		option.values.push({
			clientId: crypto.randomUUID(),
			value: '',
			colorHex: '',
			position: option.values.length
		});
	}

	function moveValue(option: ProductOptionRow, index: number, offset: number) {
		const target = index + offset;
		if (target < 0 || target >= option.values.length) return;

		const [row] = option.values.splice(index, 1);
		option.values.splice(target, 0, row);

		option.values.forEach((value, position) => {
			value.position = position;
		});
	}

	function removeValue(option: ProductOptionRow, index: number) {
		option.values.splice(index, 1);

		option.values.forEach((value, position) => {
			value.position = position;
		});
	}
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-start justify-between gap-2">
		<div>
			<h3 class="font-medium">Options</h3>
			<p class="text-sm text-muted-foreground">
				Define option groups such as Size or Color and the values customers can pick.
			</p>
		</div>
		<Button type="button" variant="outline" onclick={addOption}>
			<Plus class="size-4" />
			Add option
		</Button>
	</div>

	{#if options.length === 0}
		<div class="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
			No options yet. Add an option group to start building variants.
		</div>
	{:else}
		<div class="space-y-4">
			{#each options as option, optionIndex (option.clientId)}
				<div class="space-y-3 rounded-lg border p-4">
					<div class="flex items-start gap-2">
						<Input
							class="flex-1"
							bind:value={option.name}
							placeholder="Option name (e.g. Size)"
							aria-label="Option name"
						/>

						<div class="flex gap-1">
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								disabled={optionIndex === 0}
								aria-label="Move option up"
								onclick={() => moveOption(optionIndex, -1)}
							>
								<ArrowUp class="size-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								disabled={optionIndex === options.length - 1}
								aria-label="Move option down"
								onclick={() => moveOption(optionIndex, 1)}
							>
								<ArrowDown class="size-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								class="text-destructive hover:bg-destructive/10"
								aria-label="Remove option"
								onclick={() => removeOption(optionIndex)}
							>
								<Trash2 class="size-4" />
							</Button>
						</div>
					</div>

					{#if option.values.length === 0}
						<p class="text-sm text-muted-foreground">
							No values yet. Add one value for each choice.
						</p>
					{:else}
						<div class="space-y-2">
							{#each option.values as value, valueIndex (value.clientId)}
								<div class="flex flex-wrap items-center gap-2">
									{#if value.colorHex.trim()}
										<span
											class="size-7 shrink-0 rounded-md border"
											style={`background-color: ${value.colorHex.trim()}`}
											aria-hidden="true"
										></span>
									{/if}
									<Input
										class="min-w-40 flex-1"
										bind:value={value.value}
										placeholder="Value (e.g. Medium)"
										aria-label="Option value"
									/>
									<Input
										class="w-36"
										bind:value={value.colorHex}
										placeholder="#000000"
										aria-label="Color hex"
									/>
									<div class="flex gap-1">
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											disabled={valueIndex === 0}
											aria-label="Move value up"
											onclick={() => moveValue(option, valueIndex, -1)}
										>
											<ArrowUp class="size-4" />
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											disabled={valueIndex === option.values.length - 1}
											aria-label="Move value down"
											onclick={() => moveValue(option, valueIndex, 1)}
										>
											<ArrowDown class="size-4" />
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											class="text-destructive hover:bg-destructive/10"
											aria-label="Remove value"
											onclick={() => removeValue(option, valueIndex)}
										>
											<Trash2 class="size-4" />
										</Button>
									</div>
								</div>
							{/each}
						</div>
					{/if}

					<Button type="button" variant="outline" size="sm" onclick={() => addValue(option)}>
						<Plus class="size-4" />
						Add value
					</Button>
				</div>
			{/each}
		</div>
	{/if}
</div>
