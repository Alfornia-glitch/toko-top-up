import {
	ConflictError,
	NotFoundError,
	assertActor,
	assertPermission,
	err,
	newId,
	ok,
	systemClock,
	toAppError,
	type Actor,
	type AppError,
	type Clock,
	type Result
} from '#shared';
import {
	generateGiftCardCode,
	parseDate,
	toCustomerGiftCard,
	type Coupon,
	type CouponInput,
	type CouponUsageReader,
	type CustomerGiftCard,
	type GiftCard,
	type GiftCardDetail,
	type GiftCardInput,
	type GiftCardUpdateInput,
	type ListQuery,
	type MarketingRepository,
	type NewsletterStatus,
	type NewsletterSubscription,
	type PageResult
} from '../domain/marketing.ts';

type Outcome<T> = Promise<Result<T, AppError>>;

export interface MarketingService {
	listCoupons(query: ListQuery, actor: Actor | null): Outcome<PageResult<Coupon>>;
	createCoupon(input: CouponInput, actor: Actor | null): Outcome<string>;
	updateCoupon(id: string, input: CouponInput, actor: Actor | null): Outcome<Coupon>;
	deleteCoupon(id: string, actor: Actor | null): Outcome<string>;

	listGiftCards(query: ListQuery, actor: Actor | null): Outcome<PageResult<GiftCard>>;
	createGiftCard(input: GiftCardInput, actor: Actor | null): Outcome<string>;
	getGiftCard(id: string, actor: Actor | null): Outcome<GiftCardDetail>;
	updateGiftCard(
		id: string,
		input: GiftCardUpdateInput,
		actor: Actor | null
	): Outcome<GiftCardDetail>;
	/** Gift cards bought by, or addressed to, the calling customer. */
	listMyGiftCards(email: string | null, actor: Actor | null): Outcome<CustomerGiftCard[]>;

	listSubscriptions(
		query: ListQuery,
		actor: Actor | null
	): Outcome<PageResult<NewsletterSubscription>>;
	setSubscriptionStatus(
		id: string,
		status: NewsletterStatus,
		actor: Actor | null
	): Outcome<NewsletterSubscription>;
	getMySubscription(email: string, actor: Actor | null): Outcome<NewsletterSubscription | null>;
	setMySubscriptionStatus(
		status: NewsletterStatus,
		actor: Actor | null
	): Outcome<NewsletterSubscription>;
	/** Public sign-up (site footer). `userId` links the subscription when the visitor is signed in. */
	subscribe(email: string, userId: string | null, source: string): Outcome<NewsletterSubscription>;
}

export function createMarketingService(
	repository: MarketingRepository,
	usage: CouponUsageReader,
	clock: Clock = systemClock
): MarketingService {
	async function run<T>(action: () => Promise<T>): Outcome<T> {
		try {
			return ok(await action());
		} catch (error) {
			return err(toAppError(error));
		}
	}

	function couponValues(input: CouponInput, code: string): Partial<Coupon> {
		return {
			code,
			type: input.type,
			value: input.value,
			minSubtotalCents: input.minSubtotalCents,
			maxUses: input.maxUses ?? null,
			startsAt: parseDate(input.startsAt),
			endsAt: parseDate(input.endsAt),
			status: input.status,
			appliesToJson: input.appliesToJson ?? null
		};
	}

	async function giftCardDetail(id: string): Promise<GiftCardDetail> {
		const card = await repository.findGiftCard(id);
		if (!card) throw new NotFoundError('Gift card not found');
		return { ...card, transactions: await repository.listGiftCardTransactions(id) };
	}

	return {
		listCoupons: (query, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const { data, total } = await repository.listCoupons(query);
				return { data, page: query.page, pageSize: query.pageSize, total };
			}),

		createCoupon: (input, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const code = input.code.toUpperCase();
				if (await repository.findCouponByCode(code)) {
					throw new ConflictError(`Coupon code "${code}" already exists`);
				}
				const now = clock.now();
				const id = newId();
				await repository.insertCoupon({
					id,
					...couponValues(input, code),
					usedCount: 0,
					createdAt: now,
					updatedAt: now
				} as Coupon);
				return id;
			}),

		updateCoupon: (id, input, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const existing = await repository.findCoupon(id);
				if (!existing) throw new NotFoundError('Coupon not found');

				const code = input.code.toUpperCase();
				const clash = await repository.findCouponByCode(code);
				if (clash && clash.id !== id) {
					throw new ConflictError(`Coupon code "${code}" already exists`);
				}

				const values = couponValues(input, code);
				await repository.updateCoupon(id, { ...values, updatedAt: clock.now() });
				return { ...existing, ...values } as Coupon;
			}),

		deleteCoupon: (id, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				if (!(await repository.findCoupon(id))) throw new NotFoundError('Coupon not found');
				if ((await usage.countRedemptions(id)) > 0) {
					throw new ConflictError('Coupon has redemptions; disable it instead');
				}
				await repository.deleteCoupon(id);
				return id;
			}),

		listGiftCards: (query, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const { data, total } = await repository.listGiftCards(query);
				return { data, page: query.page, pageSize: query.pageSize, total };
			}),

		createGiftCard: (input, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const id = newId();
				let code = (input.code ?? generateGiftCardCode(newId())).toUpperCase();

				for (let attempt = 0; attempt < 5; attempt += 1) {
					if (!(await repository.findGiftCardByCode(code))) break;
					if (input.code) throw new ConflictError(`Gift card code "${code}" already exists`);
					code = generateGiftCardCode(newId());
				}

				const now = clock.now();
				await repository.insertGiftCard(
					{
						id,
						code,
						initialAmountCents: input.initialAmountCents,
						balanceCents: input.initialAmountCents,
						currency: input.currency,
						status: 'active',
						recipientName: input.recipientName ?? null,
						recipientEmail: input.recipientEmail ?? null,
						purchaserUserId: null,
						orderId: null,
						message: input.message ?? null,
						deliveredAt: null,
						expiresAt: parseDate(input.expiresAt),
						createdAt: now,
						updatedAt: now
					},
					{
						id: newId(),
						giftCardId: id,
						orderId: null,
						amountCents: input.initialAmountCents,
						type: 'issue',
						createdAt: now
					}
				);
				return id;
			}),

		getGiftCard: (id, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				return giftCardDetail(id);
			}),

		updateGiftCard: (id, input, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				if (!(await repository.findGiftCard(id))) throw new NotFoundError('Gift card not found');

				await repository.updateGiftCard(id, {
					...(input.status ? { status: input.status } : {}),
					...(input.balanceCents !== undefined ? { balanceCents: input.balanceCents } : {}),
					...(input.recipientName !== undefined ? { recipientName: input.recipientName } : {}),
					...(input.recipientEmail !== undefined ? { recipientEmail: input.recipientEmail } : {}),
					...(input.message !== undefined ? { message: input.message } : {}),
					...(input.expiresAt !== undefined ? { expiresAt: parseDate(input.expiresAt) } : {}),
					updatedAt: clock.now()
				});
				return giftCardDetail(id);
			}),

		listMyGiftCards: (email, actor) =>
			run(async () => {
				const userId = assertActor(actor).id;
				const cards = await repository.listGiftCardsFor(userId, email);
				return cards.map(toCustomerGiftCard);
			}),

		listSubscriptions: (query, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const { data, total } = await repository.listSubscriptions(query);
				return { data, page: query.page, pageSize: query.pageSize, total };
			}),

		setSubscriptionStatus: (id, status, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const existing = await repository.findSubscriptionById(id);
				if (!existing) throw new NotFoundError('Subscription not found');
				await repository.updateSubscription(id, { status, updatedAt: clock.now() });
				return { ...existing, status };
			}),

		getMySubscription: (email, actor) =>
			run(async () => repository.findSubscriptionFor(assertActor(actor).id, email)),

		setMySubscriptionStatus: (status, actor) =>
			run(async () => {
				const existing = await repository.findSubscriptionByUser(assertActor(actor).id);
				if (!existing) throw new NotFoundError('Newsletter subscription not found');
				const now = clock.now();
				await repository.updateSubscription(existing.id, { status, updatedAt: now });
				return { ...existing, status, updatedAt: now };
			}),

		subscribe: (email, userId, source) =>
			run(async () => {
				const now = clock.now();
				const existing = await repository.findSubscriptionByEmail(email);

				if (existing) {
					const patch = {
						status: 'subscribed' as const,
						userId: userId ?? existing.userId ?? null,
						updatedAt: now
					};
					await repository.updateSubscription(existing.id, patch);
					return { ...existing, ...patch };
				}

				const created: NewsletterSubscription = {
					id: newId(),
					userId,
					email,
					preferencesJson: null,
					status: 'subscribed',
					source,
					createdAt: now,
					updatedAt: now
				};
				await repository.insertSubscription(created);
				return created;
			})
	};
}
