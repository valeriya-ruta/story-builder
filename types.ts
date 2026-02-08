
export type VisualType = "Кольоровий фон" | "Говоряща голова" | "Відео в тему" | "Гарне фото" | null;
export type EngagementType = "Стікер" | "Тягнулка" | "Опитування" | "Заклик в дірект" | null;

export interface Story {
  id: string;
  text: string;
  visual: VisualType;
  engagement: EngagementType;
}

export interface Storytelling {
  id: string;
  name: string;
  stories: Story[];
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

export interface CriteriaBreakdown {
  narrativeFlow: {
    score: number; // 0-10
    critique: string;
  };
  engagement: {
    score: number; // 0-10
    critique: string;
  };
  visualPacing: {
    score: number; // 0-10
    critique: string;
  };
}

export interface ColumnAnalysis {
  storytellingId: string;
  overallScore: number; // 0-10
  criteriaBreakdown: CriteriaBreakdown;
  top3Improvements: string[];
}
