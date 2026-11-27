<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import UserAvatar from '#lib/frontend/components/UserAvatar.svelte';
	import { Separator } from '#lib/frontend/components/ui/separator/index.ts';
	import { authClient, signOutUser } from '#frontend/modules/auth/index.ts';

	const session = authClient.useSession();
	const user = $derived($session.data?.user);

	const imgIcon = '/assets/f0c09.svg';
	const imgIcon1 = '/assets/95ca5.svg';
	const imgIcon2 = '/assets/9bb2e.svg';
	const imgIcon3 = '/assets/0f28d.svg';
	const imgIcon4 = '/assets/0a5ac.svg';
	const imgIcon5 = '/assets/5c98f.svg';
	const imgIcon6 = '/assets/29081.svg';
	const imgIcon7 = '/assets/6f477.svg';
	const imgIcon8 = '/assets/d573d.svg';
	const imgIcon9 = '/assets/c366e.svg';
	const imgIcon10 = '/assets/5f833.svg';
	const imgIcon11 = '/assets/82316.svg';

	let { class: className = undefined }: { class?: string } = $props();
	let mobileExpanded = $state(false);
</script>

<div
	class={className ||
		'relative flex w-full shrink-0 flex-col content-stretch items-start lg:w-[299px]'}
	data-name="User Profile Sidebar"
>
	<div
		class="relative flex h-auto w-full shrink-0 flex-col content-stretch items-start gap-[12px] overflow-clip rounded-[14px] bg-card py-[16px] shadow-[0px_0px_0px_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)] lg:h-[922px]"
		data-name="Card"
	>
		<div
			class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[12px] px-[16px]"
			data-name="card-body"
		>
			<div
				class="relative flex w-full shrink-0 content-stretch items-center justify-between gap-[16px] lg:flex-col lg:items-start"
				data-name="Flex Vertical"
			>
				<div class="flex items-center gap-3">
					<UserAvatar
						image={user?.image}
						name={user?.name}
						email={user?.email}
						class="size-[48px]"
						labelClass="text-[16px]"
					/>
					<div
						class="relative flex flex-col content-stretch items-start gap-[2px] [word-break:break-word]"
						data-name="Flex Vertical"
					>
						<p
							class="relative shrink-0 font-['Geist:SemiBold'] text-[16px] leading-[24px] font-semibold text-foreground lg:text-[18px] lg:leading-[28px]"
						>
							{user?.name ?? ''}
						</p>
						<p
							class="relative shrink-0 font-['Geist:Light'] text-[14px] leading-[20px] font-light whitespace-nowrap text-muted-foreground lg:text-[16px] lg:leading-[24px]"
						>
							{user?.email ?? ''}
						</p>
					</div>
				</div>

				<button
					onclick={() => (mobileExpanded = !mobileExpanded)}
					class="rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-foreground lg:hidden"
				>
					{mobileExpanded
						? m.components_account_sidebar_hide_menu()
						: m.components_account_sidebar_show_menu()}
				</button>
			</div>

			<Separator class="hidden lg:block" />

			<div
				class={`${mobileExpanded ? 'flex' : 'hidden lg:flex'} relative w-full shrink-0 flex-col content-stretch items-center`}
				data-name="Flex Vertical"
			>
				<div
					class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[2px]"
					data-name="Flex Vertical"
				>
					<a
						href="/account"
						class="relative flex w-full shrink-0 content-stretch items-center gap-[8px] rounded-[6px] bg-muted px-[12px] py-[10px] hover:bg-muted"
						data-name="Flex Horizontal"
					>
						<div class="relative size-[20px] shrink-0" data-name="Icon">
							<span
								aria-hidden="true"
								class="absolute inset-0 block size-full max-w-none bg-foreground mask-no-repeat"
								style="mask-image: url('{imgIcon}')"
							></span>
						</div>
						<p
							class="relative h-full min-w-px flex-[1_0_0] font-['Geist:Medium'] text-[16px] leading-[24px] font-medium [word-break:break-word] text-foreground"
						>
							{m.components_site_header_my_account()}
						</p>
					</a>
					<a
						href="/account/wishlist"
						class="relative flex w-full shrink-0 content-stretch items-center gap-[8px] rounded-[6px] px-[12px] py-[10px] hover:bg-muted"
						data-name="Flex Horizontal"
					>
						<div class="relative size-[20px] shrink-0" data-name="Icon">
							<span
								aria-hidden="true"
								class="absolute inset-0 block size-full max-w-none bg-foreground mask-no-repeat"
								style="mask-image: url('{imgIcon1}')"
							></span>
						</div>
						<p
							class="relative h-full min-w-px flex-[1_0_0] font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-foreground"
						>
							{m.components_account_sidebar_wishlist()}
						</p>
					</a>
					<a
						href="/account/orders"
						class="relative flex w-full shrink-0 content-stretch items-center gap-[8px] rounded-[6px] px-[12px] py-[10px] hover:bg-muted"
						data-name="Flex Horizontal"
					>
						<div class="relative size-[20px] shrink-0" data-name="Icon">
							<span
								aria-hidden="true"
								class="absolute inset-0 block size-full max-w-none bg-foreground mask-no-repeat"
								style="mask-image: url('{imgIcon2}')"
							></span>
						</div>
						<p
							class="relative h-full min-w-px flex-[1_0_0] font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-foreground"
						>
							{m.components_site_header_my_orders()}
						</p>
					</a>
					<a
						href="/account/orders/latest"
						class="relative flex w-full shrink-0 content-stretch items-center gap-[8px] rounded-[6px] px-[12px] py-[10px] hover:bg-muted"
						data-name="Flex Horizontal"
					>
						<div class="relative size-[20px] shrink-0" data-name="Icon">
							<span
								aria-hidden="true"
								class="absolute inset-0 block size-full max-w-none bg-foreground mask-no-repeat"
								style="mask-image: url('{imgIcon3}')"
							></span>
						</div>
						<p
							class="relative h-full min-w-px flex-[1_0_0] font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-foreground"
						>
							{m.components_account_sidebar_order_details()}
						</p>
					</a>
					<a
						href="/account/addresses"
						class="relative flex w-full shrink-0 content-stretch items-center gap-[8px] rounded-[6px] px-[12px] py-[10px] hover:bg-muted"
						data-name="Flex Horizontal"
					>
						<div class="relative size-[20px] shrink-0" data-name="Icon">
							<span
								aria-hidden="true"
								class="absolute inset-0 block size-full max-w-none bg-foreground mask-no-repeat"
								style="mask-image: url('{imgIcon4}')"
							></span>
						</div>
						<p
							class="relative min-w-px flex-[1_0_0] font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-foreground"
						>
							{m.components_account_sidebar_addresses()}
						</p>
					</a>
					<a
						href="/account/payment"
						class="relative flex w-full shrink-0 content-stretch items-center gap-[8px] rounded-[6px] px-[12px] py-[10px] hover:bg-muted"
						data-name="Flex Horizontal"
					>
						<div class="relative size-[20px] shrink-0" data-name="Icon">
							<span
								aria-hidden="true"
								class="absolute inset-0 block size-full max-w-none bg-foreground mask-no-repeat"
								style="mask-image: url('{imgIcon5}')"
							></span>
						</div>
						<p
							class="relative h-full min-w-px flex-[1_0_0] font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-foreground"
						>
							{m.components_account_sidebar_wallet()}
						</p>
					</a>
					<Separator />
					<a
						href="/account/payment"
						class="relative flex w-full shrink-0 content-stretch items-center gap-[8px] rounded-[6px] px-[12px] py-[10px] hover:bg-muted"
						data-name="Flex Horizontal"
					>
						<div class="relative size-[20px] shrink-0" data-name="Icon">
							<span
								aria-hidden="true"
								class="absolute inset-0 block size-full max-w-none bg-foreground mask-no-repeat"
								style="mask-image: url('{imgIcon6}')"
							></span>
						</div>
						<p
							class="relative h-full min-w-px flex-[1_0_0] font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-foreground"
						>
							{m.common_payment()}
						</p>
					</a>
					<a
						href="/account/gift-cards"
						class="relative flex w-full shrink-0 content-stretch items-center gap-[8px] rounded-[6px] px-[12px] py-[10px] hover:bg-muted"
						data-name="Flex Horizontal"
					>
						<div class="relative size-[20px] shrink-0" data-name="Icon">
							<span
								aria-hidden="true"
								class="absolute inset-0 block size-full max-w-none bg-foreground mask-no-repeat"
								style="mask-image: url('{imgIcon7}')"
							></span>
						</div>
						<p
							class="relative h-full min-w-px flex-[1_0_0] font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-foreground"
						>
							{m.components_account_sidebar_gift_cards()}
						</p>
					</a>
					<a
						href="/account/returns-refunds"
						class="relative flex w-full shrink-0 content-stretch items-center gap-[8px] rounded-[6px] px-[12px] py-[10px] hover:bg-muted"
						data-name="Flex Horizontal"
					>
						<div class="relative size-[20px] shrink-0" data-name="Icon">
							<span
								aria-hidden="true"
								class="absolute inset-0 block size-full max-w-none bg-foreground mask-no-repeat"
								style="mask-image: url('{imgIcon8}')"
							></span>
						</div>
						<p
							class="relative h-full min-w-px flex-[1_0_0] font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-foreground"
						>
							{m.components_account_sidebar_returns()}
						</p>
					</a>
					<a
						href="/account/newsletter"
						class="relative flex w-full shrink-0 content-stretch items-center gap-[8px] rounded-[6px] px-[12px] py-[10px] hover:bg-muted"
						data-name="Flex Horizontal"
					>
						<div class="relative size-[20px] shrink-0" data-name="Icon">
							<span
								aria-hidden="true"
								class="absolute inset-0 block size-full max-w-none bg-foreground mask-no-repeat"
								style="mask-image: url('{imgIcon9}')"
							></span>
						</div>
						<p
							class="relative h-full min-w-px flex-[1_0_0] font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-foreground"
						>
							{m.components_account_sidebar_newsletter()}
						</p>
					</a>
					<a
						href="/account/support-tickets"
						class="relative flex w-full shrink-0 content-stretch items-center gap-[8px] rounded-[6px] px-[12px] py-[10px] hover:bg-muted"
						data-name="Flex Horizontal"
					>
						<div class="relative size-[20px] shrink-0" data-name="Icon">
							<span
								aria-hidden="true"
								class="absolute inset-0 block size-full max-w-none bg-foreground mask-no-repeat"
								style="mask-image: url('{imgIcon10}')"
							></span>
						</div>
						<p
							class="relative h-full min-w-px flex-[1_0_0] font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-foreground"
						>
							{m.components_account_sidebar_support_tickets()}
						</p>
					</a>
					<Separator />
					<button
						type="button"
						class="relative flex w-full shrink-0 cursor-pointer content-stretch items-center gap-[8px] rounded-[6px] px-[12px] py-[10px] text-left text-destructive hover:bg-muted"
						data-name="Flex Horizontal"
						onclick={() => signOutUser()}
					>
						<div class="relative size-[20px] shrink-0" data-name="Icon">
							<span
								aria-hidden="true"
								class="absolute inset-0 block size-full max-w-none bg-foreground mask-no-repeat"
								style="mask-image: url('{imgIcon11}')"
							></span>
						</div>
						<p
							class="relative h-full shrink-0 font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word]"
						>
							{m.common_logout()}
						</p>
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
