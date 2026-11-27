<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	let { endsAt }: { endsAt: string | Date | null | undefined } = $props();

	let days = $state('00');
	let hours = $state('00');
	let minutes = $state('00');
	let seconds = $state('00');
	let visible = $state(false);

	const blocks = $derived([
		{ label: m.components_countdown_days(), value: days },
		{ label: m.components_countdown_hours(), value: hours },
		{ label: m.components_countdown_minutes(), value: minutes },
		{ label: m.components_countdown_seconds(), value: seconds }
	]);

	function endTime(value: string | Date | null | undefined): number | null {
		if (!value) return null;
		const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
		return Number.isFinite(time) ? time : null;
	}

	$effect(() => {
		const end = endTime(endsAt);

		if (end === null) {
			visible = false;
			days = '00';
			hours = '00';
			minutes = '00';
			seconds = '00';
			return;
		}

		const tick = () => {
			const remaining = end - Date.now();

			if (remaining <= 0) {
				visible = false;
				days = '00';
				hours = '00';
				minutes = '00';
				seconds = '00';
				return false;
			}

			visible = true;
			days = String(Math.floor(remaining / 86400000)).padStart(2, '0');
			hours = String(Math.floor((remaining % 86400000) / 3600000)).padStart(2, '0');
			minutes = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0');
			seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
			return true;
		};

		if (!tick()) return;

		const interval = setInterval(() => {
			if (!tick()) clearInterval(interval);
		}, 1000);

		return () => clearInterval(interval);
	});
</script>

{#if visible}
	<div
		class="relative flex w-full shrink-0 content-stretch items-center gap-[8px]"
		data-name="Flex Horizontal"
	>
		{#each blocks as block (block.label)}
			<div
				class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-center gap-[4.921px] max-[480px]:min-w-[60px]"
				data-name="Timer Blocks"
			>
				<div
					class="relative flex h-[55px] w-full shrink-0 flex-col content-stretch items-center justify-center rounded-[6px] bg-card p-[6px]"
					data-name="Timer/Number/Cell"
				>
					<p
						class="relative shrink-0 text-center font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold [word-break:break-word] whitespace-nowrap text-foreground"
					>
						{block.value}
					</p>
				</div>
				<p
					class="relative w-full shrink-0 text-center font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] text-white"
				>
					{block.label}
				</p>
			</div>
		{/each}
	</div>
{/if}
