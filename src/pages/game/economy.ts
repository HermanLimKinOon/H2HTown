export const SHOP_PRICES = {
  carrotSell: 5,
  woodSell: 1,
  petFoodBuy: 10,
} as const;

export type ShopInventory = {
  carrots: number;
  coins: number;
  petFood: number;
  wood: number;
};

export type ShopResult =
  | { ok: true; state: ShopInventory }
  | { ok: false; reason: string; state: ShopInventory };

export function sellCarrots(state: ShopInventory, quantity = 1): ShopResult {
  if (!Number.isInteger(quantity) || quantity < 1 || state.carrots < quantity) {
    return { ok: false, reason: 'Not enough carrots', state };
  }
  return {
    ok: true,
    state: {
      ...state,
      carrots: state.carrots - quantity,
      coins: state.coins + quantity * SHOP_PRICES.carrotSell,
    },
  };
}

export function buyPetFood(state: ShopInventory): ShopResult {
  if (state.coins < SHOP_PRICES.petFoodBuy) {
    return { ok: false, reason: 'Not enough coins', state };
  }
  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins - SHOP_PRICES.petFoodBuy,
      petFood: state.petFood + 1,
    },
  };
}

export function sellWood(state: ShopInventory, quantity = 1): ShopResult {
  if (!Number.isInteger(quantity) || quantity < 1 || state.wood < quantity) {
    return { ok: false, reason: 'Not enough wood', state };
  }
  return {
    ok: true,
    state: {
      ...state,
      wood: state.wood - quantity,
      coins: state.coins + quantity * SHOP_PRICES.woodSell,
    },
  };
}
