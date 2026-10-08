/** Category -> single representative emoji, used on fallback cards and as a
 *  small icon accent next to the category label. */
export const CATEGORY_EMOJI: Record<string, string> = {
  Sauces: '🍅',
  Indian: '🍛',
  Bakery: '🍞',
  Pasta: '🍝',
  Marinades: '🧂',
  Asian: '🍜',
  Desserts: '🍰',
  Breakfast: '🥞',
  Sides: '🥗',
  Italian: '🍕',
  Rice: '🍚',
  'Main Course': '🍽️',
  Specialty: '✨',
  Meal: '🍲',
};

/** Category -> search tag for the food-photo source. */
export const CATEGORY_PHOTO_TAG: Record<string, string> = {
  Sauces: 'sauce,food',
  Indian: 'curry,indian-food',
  Bakery: 'bread,bakery',
  Pasta: 'pasta',
  Marinades: 'marinade,spices',
  Asian: 'asian-food,noodles',
  Desserts: 'dessert,cake',
  Breakfast: 'breakfast',
  Sides: 'salad,vegetables',
  Italian: 'italian-food,pizza',
  Rice: 'rice,food',
  'Main Course': 'dinner,food',
  Specialty: 'gourmet,food',
  Meal: 'meal,food',
};

const GRADIENTS = [
  'from-amber-200 via-orange-200 to-rose-200',
  'from-rose-200 via-red-200 to-orange-200',
  'from-emerald-200 via-teal-200 to-cyan-100',
  'from-yellow-200 via-amber-200 to-orange-200',
  'from-orange-200 via-amber-100 to-yellow-200',
];

/** Small, stable string hash — used to deterministically pick a gradient /
 *  photo lock per recipe so the same recipe always renders the same way. */
export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function categoryEmoji(category?: string | null): string {
  return CATEGORY_EMOJI[category ?? ''] ?? '🍽️';
}

export function gradientFor(id: string): string {
  return GRADIENTS[hashString(id) % GRADIENTS.length];
}

export function photoUrlFor(id: string, category?: string | null, w = 480, h = 320): string {
  const tag = CATEGORY_PHOTO_TAG[category ?? ''] ?? 'food';
  // LoremFlickr: free, keyless, tag-based food photos. `lock` pins a
  // specific photo per id so the same recipe doesn't reshuffle on reload.
  return `https://loremflickr.com/${w}/${h}/${encodeURIComponent(tag)}?lock=${hashString(id)}`;
}
