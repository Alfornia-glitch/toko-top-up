import {
	ConflictError,
	NotFoundError,
	UnprocessableError,
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
	isCouponApplicable,
	parseDate,
	toCustomerGiftCard,
	type Coupon,
	type CouponInput,
	type CustomerGiftCard,
	type GiftCard,
	type GiftCardDetail,
	type GiftCardInput,
	type GiftCardUpdateInput,
	type ListQuery,
	type MarketingRepository,
	type NewsletterStatus,
	type NewsletterSubscription,
	type PageResult,
	type RedeemCouponInput
} from '../domain/marketing.ts';

type Outcome<T> = Promise<Result<T, AppError>>;

export interface MarketingService {
	listCoupons(query: ListQuery, actor: Actor | null): Outcome<PageResult<Coupon>>;
	createCoupon(input: CouponInput, actor: Actor | null): Outcome<string>;
	updateCoupon(id: string, input: CouponInput, actor: Actor | null): Outcome<Coupon>;
	deleteCoupon(id: string, actor: Actor | null): Outcome<string>;
	/** Service-to-service reads and writes used by cart and checkout; no actor required. */
	getCouponById(id: string): Outcome<Coupon | null>;
	getCouponByCode(code: string): Outcome<Coupon | null>;
	/** Resolves a code to a coupon that may be applied to a cart of this subtotal, or fails with the reason. */
	validateCouponForCart(code: string, subtotal: number): Outcome<Coupon>;
	/** Idempotent per (coupon, order). Fails with 409 when the usage limit is already reached. */
	redeemCoupon(input: RedeemCouponInput): Outcome<void>;

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
			minSubtotal: input.minSubtotal,
			maxUses: input.maxUses ?? null,
			startsAt: parseDate(input.startsAt),
			endsAt: parseDate(input.endsAt),
			status: input.status,
			appliesToJson: input.appliesToJson ?? null
		};
	}

	async function giftCardDetail(id: string): Promise<GiftCardDetail> {
		const card = await repository.findGiftCard(id);
		if (!card)
			throw new NotFoundError('Gift card not found', { messageKey: 'gift_card_not_found' });
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
					throw new ConflictError(`Coupon code "${code}" already exists`, {
						messageKey: 'coupon_code_exists',
						params: { code }
					});
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
				if (!existing)
					throw new NotFoundError('Coupon not found', { messageKey: 'coupon_not_found' });

				const code = input.code.toUpperCase();
				const clash = await repository.findCouponByCode(code);
				if (clash && clash.id !== id) {
					throw new ConflictError(`Coupon code "${code}" already exists`, {
						messageKey: 'coupon_code_exists',
						params: { code }
					});
				}

				const values = couponValues(input, code);
				await repository.updateCoupon(id, { ...values, updatedAt: clock.now() });
				return { ...existing, ...values } as Coupon;
			}),

		deleteCoupon: (id, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				if (!(await repository.findCoupon(id)))
					throw new NotFoundError('Coupon not found', { messageKey: 'coupon_not_found' });
				if ((await repository.countRedemptions(id)) > 0) {
					throw new ConflictError('Coupon has redemptions; disable it instead', {
						messageKey: 'coupon_has_redemptions'
					});
				}
				await repository.deleteCoupon(id);
				return id;
			}),

		getCouponById: (id) => run(() => repository.findCoupon(id)),

		getCouponByCode: (code) => run(() => repository.findCouponByCode(code.trim().toUpperCase())),

		validateCouponForCart: (code, subtotal) =>
			run(async () => {
				const coupon = await repository.findCouponByCode(code.trim().toUpperCase());
				if (!coupon)
					throw new NotFoundError('Coupon not found', { messageKey: 'coupon_not_found' });
				if (coupon.status !== 'active')
					throw new UnprocessableError('Coupon is not active', { messageKey: 'coupon_inactive' });

				const now = clock.now().getTime();
				if (coupon.startsAt && now < coupon.startsAt.getTime()) {
					throw new UnprocessableError('Coupon is not yet active', {
						messageKey: 'coupon_not_started'
					});
				}
				if (coupon.endsAt && now > coupon.endsAt.getTime()) {
					throw new UnprocessableError('Coupon has expired', { messageKey: 'coupon_expired' });
				}
				if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
					throw new UnprocessableError('Coupon usage limit reached', {
						messageKey: 'coupon_exhausted'
					});
				}
				if (!isCouponApplicable(coupon, subtotal, now)) {
					throw new UnprocessableError('Cart subtotal is below the coupon minimum', {
						messageKey: 'coupon_min_subtotal'
					});
				}
				return coupon;
			}),

		redeemCoupon: (input) =>
			run(async () => {
				const now = clock.now();
				const outcome = await repository.redeemCoupon(
					{ id: newId(), ...input, createdAt: now },
					now
				);
				if (outcome === 'exhausted')
					throw new ConflictError('Coupon usage limit reached', { messageKey: 'coupon_exhausted' });
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
					if (input.code)
						throw new ConflictError(`Gift card code "${code}" already exists`, {
							messageKey: 'gift_card_code_exists',
							params: { code }
						});
					code = generateGiftCardCode(newId());
				}

				const now = clock.now();
				await repository.insertGiftCard(
					{
						id,
						code,
						initialAmount: input.initialAmount,
						balance: input.initialAmount,
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
						amount: input.initialAmount,
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
				if (!(await repository.findGiftCard(id)))
					throw new NotFoundError('Gift card not found', { messageKey: 'gift_card_not_found' });

				await repository.updateGiftCard(id, {
					...(input.status ? { status: input.status } : {}),
					...(input.balance !== undefined ? { balance: input.balance } : {}),
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
				if (!existing)
					throw new NotFoundError('Subscription not found', {
						messageKey: 'subscription_not_found'
					});
				await repository.updateSubscription(id, { status, updatedAt: clock.now() });
				return { ...existing, status };
			}),

		getMySubscription: (email, actor) =>
			run(async () => repository.findSubscriptionFor(assertActor(actor).id, email)),

		setMySubscriptionStatus: (status, actor) =>
			run(async () => {
				const existing = await repository.findSubscriptionByUser(assertActor(actor).id);
				if (!existing)
					throw new NotFoundError('Newsletter subscription not found', {
						messageKey: 'subscription_not_found'
					});
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
