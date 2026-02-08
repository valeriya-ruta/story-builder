
import React, { useState } from 'react';
import { Story, VISUAL_OPTIONS, ENGAGEMENT_OPTIONS, VisualType, EngagementType } from '../types';
import { TrashIcon, PaintIcon, InteractionIcon, GripIcon, CopyIcon, CheckIcon } from './Icon';

interface StoryCardProps {
  story: Story;
  index: number;
  onUpdate: (id: string, updates: Partial<Story>) => void;
  onDelete: (id: string) => void;
  dragProps?: any; // For dnd-kit or framer-motion if integrated
}

const StoryCard: React.FC<StoryCardProps> = ({ story, index, onUpdate, onDelete }) => {
  const [copied, setCopied] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(story.id, { text: e.target.value });
  };

  const copyText = async () => {
    if (!story.text.trim()) return;
    try {
      await navigator.clipboard.writeText(story.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text!', err);
    }
  };

  const toggleVisual = (option: VisualType) => {
    onUpdate(story.id, { visual: story.visual === option ? null : option });
  };

  const toggleEngagement = (option: EngagementType) => {
    onUpdate(story.id, { engagement: story.engagement === option ? null : option });
  };

  return (
    <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-4 flex flex-col gap-4 group transition-all hover:shadow-md h-full min-h-[200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Сторіс {index + 1}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={copyText}
            disabled={!story.text.trim()}
            className={`transition-colors p-1 ${
              copied 
                ? 'text-green-500' 
                : 'text-gray-300 hover:text-gray-600'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            title={copied ? 'Скопійовано!' : 'Копіювати текст'}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
          <button
            onClick={() => onDelete(story.id)}
            className="text-gray-300 hover:text-red-500 transition-colors p-1"
            title="Видалити"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <textarea
          value={story.text}
          onChange={handleTextChange}
          placeholder="Про що буде ця сторіс? Напишіть текст тут..."
          className="w-full h-full resize-none bg-transparent text-lg text-gray-800 focus:outline-none placeholder-gray-300 leading-relaxed no-scrollbar"
        />
      </div>

      {/* Footer / Tags */}
      <div className="flex flex-col gap-4 pt-4 border-t border-gray-50">
        {/* Visual Options */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
            <PaintIcon />
            <span>Візуал</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {VISUAL_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => toggleVisual(opt)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  story.visual === opt
                    ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Engagement Options */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
            <InteractionIcon />
            <span>Інтерактив</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ENGAGEMENT_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => toggleEngagement(opt)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  story.engagement === opt
                    ? 'bg-purple-50 text-purple-600 ring-1 ring-purple-200'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryCard;
