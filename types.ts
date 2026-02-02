
export type VisualType = "Кольоровий фон" | "Говоряща голова" | "Відео в тему" | "Гарне фото" | null;
export type EngagementType = "Стікер" | "Тягнулка" | "Опитування" | "Заклик в дірект" | null;

export interface Story {
  id: string;
  text: string;
  visual: VisualType;
  engagement: EngagementType;
}

export const VISUAL_OPTIONS: VisualType[] = [
  "Кольоровий фон",
  "Говоряща голова",
  "Відео в тему",
  "Гарне фото"
];

export const ENGAGEMENT_OPTIONS: EngagementType[] = [
  "Стікер",
  "Тягнулка",
  "Опитування",
  "Заклик в дірект"
];
