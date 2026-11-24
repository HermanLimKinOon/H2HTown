# Human To Human Ai — H2H Consumer Platform

## 1. Project Description
Human To Human Ai (H2H) is an AI-driven live commerce and membership growth platform for Southeast Asian young consumers. The website serves as a consumer-facing "Live + Shop + Courses + Membership + Shows" hub — not a traditional corporate website, but an app-like entry point where users watch live streams, shop products, enroll in courses, enjoy shows, and join the membership rewards program.

**Target Users:** Young consumers (18-35) in Malaysia and Southeast Asia
**Core Value:** Consolidate traffic from TikTok, Shopee, Instagram, YouTube, and Podcast into a self-owned CRM member platform

## 2. Page Structure
- `/` — Home (all-in-one landing with all sections)
- `/live` — Live streaming page
- `/shop` — Product marketplace
- `/courses` — Course catalog
- `/rewards` — Member rewards dashboard
- `/shows` — H2H Shows / YouTube / Podcast hub
- `/member` — Member registration & dashboard
- `*` — 404 Not Found

## 3. Core Features
- [x] Hero section with CTA buttons (Watch Live, Join Member, Explore Courses)
- [x] Live Now horizontal scroll with host cards
- [x] Today's Deals shop grid with member pricing
- [x] Featured Courses catalog
- [x] H2H Rewards membership tiers & points system
- [x] H2H Shows YouTube/Podcast showcase
- [x] Why H2H brand differentiators
- [x] Full-screen Member CTA conversion block
- [x] Footer with navigation, social links, newsletter form
- [ ] Live streaming detail page with chat, products, deals
- [x] Shop product detail page
- [x] Course detail & enrollment page
- [x] Member registration & dashboard
- [ ] AI Star character detail pages
- [ ] Show episode detail pages
- [x] CRM member data backend

## 4. Data Model Design
(To be implemented when Supabase is connected for CRM membership)

### Supabase Tables (connected)
- `products` — 商城商品（name, category, image, original_price, member_price, description, specs/jsonb, gallery/jsonb, active）
- `courses` — 课程目录（title, category, instructor, instructor_role, cover, original_price, member_price, duration, lessons, level, description, learning_points/jsonb, syllabus/jsonb, instructor_bio, instructor_avatar, reviews/jsonb, active），含 12 门完整课程详情
- `member_orders` — 会员订单（member_id, order_type, item_id, item_name, amount, status）
- `members` / `member_wallets` / `member_point_transactions` — 会员与积分体系

### Rewards / Points Backend
- `record_order(p_member_id, p_order_type, p_item_id, p_item_name, p_amount)` — SECURITY DEFINER RPC that atomically: inserts the order, awards points (4%/8%/9%/11% by tier), records donation (1%/2%/3%/4%), updates `total_spent_this_year`, and upgrades `members.tier` (Member → Silver → Gold → VIP at RM 1k/5k/10k).
- Unique index `member_orders_unique_completed_course` prevents double-enrolling a course and double-awarding points.
- `check_and_pay_referral_bonus` still pays the one-time referrer + welcome bonus (5 pts each) after the first completed order.

## 5. Backend / Third-party Integration Plan
- **Supabase:** Needed for CRM member database (future phase)
- **Shopify:** May connect for product management (future phase)
- **Stripe:** May connect for course/product payments (future phase)

## 6. Development Phase Plan

### Phase 1: Homepage — Complete Landing Page ✅ (Current)
- Goal: Build all homepage sections as a rich, mobile-first long-scroll landing page
- Deliverable: Fully designed homepage with Hero, Live Now, Shop, Courses, Rewards, Shows, Why H2H, CTA, Footer

### Phase 2: Sub-pages — Live, Shop, Courses Detail Pages
- Goal: Create dedicated pages for live streaming, product details, and course details
- Deliverable: `/live`, `/shop`, `/courses` pages with full functionality

### Phase 3: Member & Rewards System
- Goal: Member registration, login, rewards dashboard
- Deliverable: `/member`, `/rewards` pages with Supabase auth

### Phase 4: Shows Detail Pages
- Goal: Show episode pages
- Deliverable: `/shows/:id` pages

### Phase 5: Backend Integration & CRM
- Goal: Connect Supabase for CRM, member data, rewards tracking
- Deliverable: Full member database with RLS policies