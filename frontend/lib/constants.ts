export const CATEGORIES = ['개발', '비즈니스', '디자인', '금융', '기타'] as const;

export type Category = typeof CATEGORIES[number];

export const CATEGORY_COLORS: Record<Category, string> = {
  개발: 'bg-blue-50 text-blue-700 border-blue-200',
  비즈니스: 'bg-amber-50 text-amber-700 border-amber-200',
  디자인: 'bg-pink-50 text-pink-700 border-pink-200',
  금융: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  기타: 'bg-gray-50 text-gray-700 border-gray-200',
};
