import { DietType } from '../lib/types';

const STYLES: Record<DietType, string> = {
  vegetarian: 'bg-green-50/95 text-green-700 ring-1 ring-green-200',
  vegan: 'bg-emerald-50/95 text-emerald-700 ring-1 ring-emerald-200',
  'non-vegetarian': 'bg-red-50/95 text-red-700 ring-1 ring-red-200',
};

const DOT: Record<DietType, string> = {
  vegetarian: 'bg-green-500',
  vegan: 'bg-emerald-500',
  'non-vegetarian': 'bg-red-500',
};

const LABELS: Record<DietType, string> = {
  vegetarian: 'Veg',
  vegan: 'Vegan',
  'non-vegetarian': 'Non-veg',
};

export function DietBadge({ dietType }: { dietType: DietType | null | undefined }) {
  if (!dietType) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm backdrop-blur-sm ${STYLES[dietType]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[dietType]}`} />
      {LABELS[dietType]}
    </span>
  );
}
