# FavoriteKinoBot - Go-to-Market Plan

## Launch Position

FavoriteKinoBot is a Telegram-first movie and series access service for Uzbek and Russian-speaking users. The first paid promise is simple: discover a title, enter a short code, pass subscription and channel checks, and receive the protected video in Telegram.

The launch should sell one clear outcome: fast access to a curated catalog inside Telegram. Do not advertise unfinished viewing history, advertising, Click, or Uzum features as available products.

## Initial Audience

1. Telegram users who already consume movie recommendations in channels and groups.
2. Uzbek-speaking viewers reached through Instagram Reels and Stories.
3. Small Telegram content channels that need a paid catalog workflow.

Start with one narrow audience and one acquisition source per experiment. Record every campaign with the existing `ig` deeplink source tracking.

## Offer Structure

Create and test three active plans in the dashboard:

| Plan     | Duration | Purpose                                                        |
| -------- | -------: | -------------------------------------------------------------- |
| Trial    |   7 days | Low-friction first purchase; limited launch quantity if needed |
| Standard |  30 days | Primary offer and default CTA                                  |
| Value    |  90 days | Best-value plan for retained users                             |

Keep prices in UZS and make the 30-day plan the default selected option. Exact prices should be chosen from unit economics after payment fees and content costs are known; do not publish prices in code or marketing copy.

## Funnel

1. Instagram or Telegram post exposes one title and a trackable bot link.
2. User opens `t.me/FavoriteKinoBot?start=ig_<CODE>`.
3. Bot registers the source and presents the title or catalog.
4. User sees the subscription requirement before video delivery.
5. User selects a plan and completes the configured payment-provider checkout.
6. The configured provider webhook activates the subscription.
7. Bot delivers the protected video and records the view.
8. Bot asks for a short referral or satisfaction response after the first successful delivery.

The launch funnel is considered healthy only when a user can complete steps 2-7 without admin intervention.

## Acquisition Experiments

Run three seven-day experiments before scaling spend:

- Title-led Reels: one recognizable title, one code, one deeplink.
- Collection-led posts: “weekend collection” with three titles and one bot CTA.
- Telegram partner placement: fixed-fee placement in a relevant movie channel.

Use a unique `ig_<CODE>` or campaign parameter per experiment. Record impressions, bot starts, plan views, checkout starts, successful payments, first video deliveries, and refunds or complaints.

## KPI Gates

Do not increase paid acquisition until the previous week meets these minimum signals:

- Bot start to catalog/title view: at least 35%.
- Catalog/title view to checkout start: at least 8%.
- Checkout start to successful payment: at least 60%.
- Successful payment to first video delivery: at least 95%.
- Payment-related support complaints: below 5% of paid users.
- Refund or manual-correction rate: below 3%.

These are starting thresholds, not guarantees. Review them after the first 100 paid users.

## Operations Before Public Sales

- Verify P2P production credentials, checkout URL, webhook contract, signature rules, and reachability after the provider specialist supplies them. Keep P2P disabled until then.
- Publish refund, support, and content policy text in Uzbek and Russian.
- Prepare an admin rotation for payment reconciliation and blocked-user appeals.
- Create a daily dashboard review: payments, active subscriptions, failed webhooks, top codes, and audit log anomalies.
- Complete a real cloud backup restore test and retain its log.
- Run the production smoke test after every release: health, login, plan list, payment callback test, catalog search, and protected video-code access.

## 30-Day Sequence

### Days 1-7: Controlled beta

Invite 20-30 users, use the Trial plan, observe payment and delivery failures, and fix every manual intervention found in the funnel.

### Days 8-14: Paid validation

Open Standard and Value plans, run the three acquisition experiments, and collect the first 100 paid-user events.

### Days 15-21: Retention

Promote collections and new releases to existing users. Measure renewal intent, repeat sessions, and support load before increasing acquisition spend.

### Days 22-30: Scale decision

Scale only the best-performing source. Pause sources with weak payment conversion or high support cost. Revisit plan pricing using payment conversion and retention data.

## Go / No-Go Rule

Go public only when the public launch gates are complete, the selected production payment-provider flow is verified, backup restore proof is stored, and the first end-to-end paid-user path works without manual database changes.
