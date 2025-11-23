export const ALLOWED_CATEGORIES = ["개발", "비즈니스", "디자인", "금융", "기타"] as const;

export type Category = (typeof ALLOWED_CATEGORIES)[number];

const CATEGORY_ALIASES: Record<string, Category> = {
  "개발": "개발",
  "coding": "개발",
  "developer": "개발",
  "dev": "개발",
  "programming": "개발",
  "tech": "개발",
  "비즈니스": "비즈니스",
  "business": "비즈니스",
  "biz": "비즈니스",
  "marketing": "비즈니스",
  "디자인": "디자인",
  "design": "디자인",
  "ui": "디자인",
  "ux": "디자인",
  "graphic": "디자인",
  "creative": "디자인",
  "금융": "금융",
  "finance": "금융",
  "investment": "금융",
  "crypto": "금융",
  "blockchain": "금융",
  "economy": "금융",
  "기타": "기타",
  "general": "기타",
  "etc": "기타",
  "etc.": "기타",
  "other": "기타"
};

export function normalizeCategory(raw?: string | null): Category {
  if (!raw) return "기타";
  const key = raw.trim().toLowerCase();
  return CATEGORY_ALIASES[key] ?? "기타";
}

export function isValidCategory(raw: string): raw is Category {
  const key = raw.trim().toLowerCase();
  return Boolean(CATEGORY_ALIASES[key]);
}
