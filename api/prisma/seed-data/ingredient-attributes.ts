/**
 * Approximate per-base-unit cost and calorie reference values, plus
 * vegetarian/vegan classification, for every ingredient in the provided
 * dataset. Keyed by the dataset's `ing_*` id.
 *
 * These are illustrative demo figures (typical Indian-market pricing in
 * generic currency units, standard nutrition-database calorie density per
 * gram/ml/piece) — the provided dataset has no pricing or nutrition data,
 * so this exists purely to exercise the recursive cost/nutrition rollup
 * feature end-to-end on real data, not as an accurate price list.
 *
 * costPerUnit / kcalPerUnit are "per ingredient.defaultUnitCode" (per gram,
 * per ml, or per piece, matching how that ingredient is actually measured
 * in the dataset's recipes).
 */
export interface IngredientAttributes {
  costPerUnit: number;
  kcalPerUnit: number;
  isVegetarian: boolean;
  isVegan: boolean;
}

const NON_VEG = { isVegetarian: false, isVegan: false };
const VEGETARIAN_ONLY = { isVegetarian: true, isVegan: false };
const VEGAN = { isVegetarian: true, isVegan: true };

export const INGREDIENT_ATTRIBUTES: Record<string, IngredientAttributes> = {
  ing_flour: { costPerUnit: 0.05, kcalPerUnit: 3.64, ...VEGAN },
  ing_bread_flour: { costPerUnit: 0.06, kcalPerUnit: 3.6, ...VEGAN },
  ing_sugar: { costPerUnit: 0.045, kcalPerUnit: 3.87, ...VEGAN },
  ing_brown_sugar: { costPerUnit: 0.08, kcalPerUnit: 3.8, ...VEGAN },
  ing_salt: { costPerUnit: 0.02, kcalPerUnit: 0, ...VEGAN },
  ing_butter: { costPerUnit: 0.5, kcalPerUnit: 7.17, ...VEGETARIAN_ONLY },
  ing_water: { costPerUnit: 0, kcalPerUnit: 0, ...VEGAN },
  ing_milk: { costPerUnit: 0.06, kcalPerUnit: 0.6, ...VEGETARIAN_ONLY },
  ing_cream: { costPerUnit: 0.35, kcalPerUnit: 3.4, ...VEGETARIAN_ONLY },
  ing_egg: { costPerUnit: 8, kcalPerUnit: 70, ...VEGETARIAN_ONLY },
  ing_olive_oil: { costPerUnit: 1.2, kcalPerUnit: 8.84, ...VEGAN },
  ing_sunflower_oil: { costPerUnit: 0.15, kcalPerUnit: 8.84, ...VEGAN },
  ing_oil: { costPerUnit: 0.15, kcalPerUnit: 8.84, ...VEGAN },
  ing_soy_sauce: { costPerUnit: 0.3, kcalPerUnit: 0.6, ...VEGAN },
  ing_sesame_oil: { costPerUnit: 1.5, kcalPerUnit: 8.84, ...VEGAN },
  ing_vinegar: { costPerUnit: 0.1, kcalPerUnit: 0.2, ...VEGAN },
  ing_honey: { costPerUnit: 0.8, kcalPerUnit: 3.04, ...VEGETARIAN_ONLY }, // not vegan
  ing_cheese: { costPerUnit: 0.9, kcalPerUnit: 4.0, ...VEGETARIAN_ONLY },
  ing_mozzarella: { costPerUnit: 0.8, kcalPerUnit: 2.8, ...VEGETARIAN_ONLY },
  ing_parmesan: { costPerUnit: 1.5, kcalPerUnit: 4.3, ...VEGETARIAN_ONLY },
  ing_yogurt: { costPerUnit: 0.15, kcalPerUnit: 0.6, ...VEGETARIAN_ONLY },
  ing_tomato: { costPerUnit: 0.04, kcalPerUnit: 0.18, ...VEGAN },
  ing_tomato_paste: { costPerUnit: 0.3, kcalPerUnit: 0.82, ...VEGAN },
  ing_onion: { costPerUnit: 0.025, kcalPerUnit: 0.4, ...VEGAN },
  ing_red_onion: { costPerUnit: 0.03, kcalPerUnit: 0.4, ...VEGAN },
  ing_garlic: { costPerUnit: 0.6, kcalPerUnit: 1.49, ...VEGAN },
  ing_ginger: { costPerUnit: 0.5, kcalPerUnit: 0.8, ...VEGAN },
  ing_potato: { costPerUnit: 0.025, kcalPerUnit: 0.77, ...VEGAN },
  ing_carrot: { costPerUnit: 0.04, kcalPerUnit: 0.41, ...VEGAN },
  ing_capsicum: { costPerUnit: 0.08, kcalPerUnit: 0.31, ...VEGAN },
  ing_mushroom: { costPerUnit: 0.3, kcalPerUnit: 0.22, ...VEGAN },
  ing_spinach: { costPerUnit: 0.08, kcalPerUnit: 0.23, ...VEGAN },
  ing_broccoli: { costPerUnit: 0.15, kcalPerUnit: 0.34, ...VEGAN },
  ing_corn: { costPerUnit: 0.05, kcalPerUnit: 0.86, ...VEGAN },
  ing_peas: { costPerUnit: 0.08, kcalPerUnit: 0.81, ...VEGAN },
  ing_chilli: { costPerUnit: 0.3, kcalPerUnit: 0.4, ...VEGAN },
  ing_red_chilli: { costPerUnit: 0.3, kcalPerUnit: 0.4, ...VEGAN },
  ing_chicken: { costPerUnit: 0.3, kcalPerUnit: 2.39, ...NON_VEG },
  ing_chicken_breast: { costPerUnit: 0.4, kcalPerUnit: 1.65, ...NON_VEG },
  ing_beef: { costPerUnit: 0.6, kcalPerUnit: 2.5, ...NON_VEG },
  ing_mince: { costPerUnit: 0.45, kcalPerUnit: 2.5, ...NON_VEG },
  ing_coriander: { costPerUnit: 0.4, kcalPerUnit: 0.23, ...VEGAN },
  ing_parsley: { costPerUnit: 0.5, kcalPerUnit: 0.36, ...VEGAN },
  ing_basil: { costPerUnit: 0.8, kcalPerUnit: 0.23, ...VEGAN },
  ing_mint: { costPerUnit: 0.4, kcalPerUnit: 0.7, ...VEGAN },
  ing_oregano: { costPerUnit: 2.0, kcalPerUnit: 2.65, ...VEGAN },
  ing_cumin: { costPerUnit: 1.2, kcalPerUnit: 3.75, ...VEGAN },
  ing_coriander_seed: { costPerUnit: 1.0, kcalPerUnit: 2.98, ...VEGAN },
  ing_turmeric: { costPerUnit: 0.8, kcalPerUnit: 3.12, ...VEGAN },
  ing_paprika: { costPerUnit: 1.5, kcalPerUnit: 2.82, ...VEGAN },
  ing_chilli_powder: { costPerUnit: 1.0, kcalPerUnit: 2.82, ...VEGAN },
  ing_garam_masala: { costPerUnit: 1.5, kcalPerUnit: 3.0, ...VEGAN },
  ing_black_pepper: { costPerUnit: 3.0, kcalPerUnit: 2.51, ...VEGAN },
  ing_cinnamon: { costPerUnit: 2.0, kcalPerUnit: 6, ...VEGAN },
  ing_cardamom: { costPerUnit: 3.0, kcalPerUnit: 3, ...VEGAN },
  ing_clove: { costPerUnit: 1.0, kcalPerUnit: 1, ...VEGAN },
  ing_bay_leaf: { costPerUnit: 0.5, kcalPerUnit: 2, ...VEGAN },
  ing_rice: { costPerUnit: 0.06, kcalPerUnit: 3.6, ...VEGAN },
  ing_basmati_rice: { costPerUnit: 0.12, kcalPerUnit: 3.6, ...VEGAN },
  ing_pasta: { costPerUnit: 0.1, kcalPerUnit: 3.71, ...VEGAN },
  ing_noodles: { costPerUnit: 0.1, kcalPerUnit: 3.71, ...VEGAN },
  ing_lime: { costPerUnit: 0.3, kcalPerUnit: 0.25, ...VEGAN },
  ing_lemon: { costPerUnit: 0.25, kcalPerUnit: 0.22, ...VEGAN },
  ing_coconut: { costPerUnit: 0.5, kcalPerUnit: 6.6, ...VEGAN },
  ing_coconut_milk: { costPerUnit: 0.2, kcalPerUnit: 2.3, ...VEGAN },
  ing_cocoa: { costPerUnit: 1.2, kcalPerUnit: 2.28, ...VEGAN },
  ing_chocolate: { costPerUnit: 1.5, kcalPerUnit: 5.46, ...VEGETARIAN_ONLY }, // typically contains milk
  ing_vanilla: { costPerUnit: 5.0, kcalPerUnit: 2.88, ...VEGAN },
  ing_cornstarch: { costPerUnit: 0.1, kcalPerUnit: 3.81, ...VEGAN },
  ing_strawberry: { costPerUnit: 0.4, kcalPerUnit: 0.32, ...VEGAN },
  ing_bread: { costPerUnit: 5.0, kcalPerUnit: 80, ...VEGETARIAN_ONLY }, // commonly made with dairy/butter
};

/** Fallback for any ingredient id not explicitly listed above. */
export const DEFAULT_ATTRIBUTES: IngredientAttributes = {
  costPerUnit: 0.1,
  kcalPerUnit: 1,
  isVegetarian: true,
  isVegan: true,
};
