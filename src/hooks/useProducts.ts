import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import { allProducts, productDetails } from '@/mocks/homeData';

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductFaq {
  question: string;
  answer: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  image: string;
  originalPrice: number;
  memberPrice: number;
  liveRecommended: boolean;
  bestSeller: boolean;
  badge: string | null;
  pointsRedemptionAllowed: boolean;
  description: string | null;
  descriptionTranslations: Partial<Record<'en' | 'zh' | 'ms', string>>;
  specs: ProductSpec[];
  gallery: string[];
  faqs: ProductFaq[];
}

interface MockProduct {
  id: number;
  name: string;
  category: string;
  image: string;
  originalPrice: number;
  memberPrice: number;
  liveRecommended: boolean;
  badge: string | null;
}

interface MockDetail {
  description: string;
  specs: ProductSpec[];
  gallery: string[];
  faqs?: ProductFaq[];
  descriptionTranslations?: Partial<Record<'en' | 'zh' | 'ms', string>>;
}

// Convert a mock product into the unified Product shape, merging detail data.
function toMockProduct(p: MockProduct): Product {
  const detail = (productDetails as Record<number, MockDetail>)[p.id];
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    image: p.image,
    originalPrice: p.originalPrice,
    memberPrice: p.memberPrice,
    liveRecommended: p.liveRecommended,
    bestSeller: false,
    badge: p.badge,
    pointsRedemptionAllowed: true,
    description: detail?.description ?? null,
    descriptionTranslations: detail?.descriptionTranslations ?? {},
    specs: detail?.specs ?? [],
    gallery: detail?.gallery ?? [],
    faqs: detail?.faqs ?? [],
  };
}

function mapFaqs(value: unknown): ProductFaq[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const item = entry as Record<string, unknown>;
    if (typeof item.question !== 'string' || typeof item.answer !== 'string') return [];
    const question = item.question.trim();
    const answer = item.answer.trim();
    return question && answer ? [{ question, answer }] : [];
  });
}

function mapDescriptionTranslations(value: unknown): Product['descriptionTranslations'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const translations = value as Record<string, unknown>;
  return {
    en: typeof translations.en === 'string' ? translations.en : undefined,
    zh: typeof translations.zh === 'string' ? translations.zh : undefined,
    ms: typeof translations.ms === 'string' ? translations.ms : undefined,
  };
}

// Map a database row (prices stored in cents) into the unified Product shape.
function mapDbRow(row: Record<string, unknown>): Product {
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    category: String(row.category ?? ''),
    image: typeof row.image === 'string' ? row.image : '',
    originalPrice: Math.round(Number(row.original_price)) / 100,
    memberPrice: Math.round(Number(row.member_price)) / 100,
    liveRecommended: Boolean(row.live_recommended),
    bestSeller: false,
    badge: typeof row.badge === 'string' ? row.badge : null,
    pointsRedemptionAllowed: row.points_redemption_allowed !== false,
    description: typeof row.description === 'string' ? row.description : null,
    descriptionTranslations: mapDescriptionTranslations(row.description_translations),
    specs: Array.isArray(row.specs) ? (row.specs as ProductSpec[]) : [],
    gallery: Array.isArray(row.gallery) ? (row.gallery as string[]) : [],
    faqs: mapFaqs(row.faqs),
  };
}

/**
 * Load the product catalog from the `products` table.
 * Falls back to mock data immediately (no loading flash) and on any error,
 * then swaps in real data once the fetch resolves.
 */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>(() =>
    (allProducts as MockProduct[]).map(toMockProduct),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [catalogResult, bestSellerResult] = await Promise.all([
          supabase
            .from('products')
            .select('*')
            .eq('active', true)
            .order('id', { ascending: true }),
          supabase.rpc('get_best_selling_product_ids'),
        ]);
        const { data, error: dbError } = catalogResult;

        if (dbError) throw dbError;

        if (active && data) {
          const bestSellerIds = new Set(
            (bestSellerResult.data ?? []).map((row: { product_id: number | string }) => Number(row.product_id)),
          );
          setProducts(data.map((row) => ({ ...mapDbRow(row), bestSeller: bestSellerIds.has(Number(row.id)) })));
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load products');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { products, loading, error };
}
