
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Story, Storytelling, ColumnAnalysis } from './types';
import { PlusIcon, CopyIcon, UndoIcon, RedoIcon, SaveIcon, FolderIcon, XIcon, TrashIcon, EditIcon, CheckIcon, AIIcon, LoadingSpinner, ChevronDownIcon, ChevronUpIcon, SparklesIcon } from './components/Icon';
import StoryCard from './components/StoryCard';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const MAX_HISTORY = 50;

interface Project {
  id: string;
  name: string;
  timestamp: number;
  storytellings: Storytelling[];
}

const App: React.FC = () => {
  const [storytellings, setStorytellings] = useState<Storytelling[]>([
    { id: generateId(), name: 'Storytelling 1', stories: [{ id: generateId(), text: '', visual: null, engagement: null }] }
  ]);
  const [past, setPast] = useState<Storytelling[][]>([]);
  const [future, setFuture] = useState<Storytelling[][]>([]);
  const [copied, setCopied] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [editingColumnName, setEditingColumnName] = useState<string | null>(null);
  const [tempColumnName, setTempColumnName] = useState('');
  const [copiedColumnId, setCopiedColumnId] = useState<string | null>(null);
  const [analyzingColumnId, setAnalyzingColumnId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Map<string, ColumnAnalysis>>(new Map());
  const [expandedAnalysisPanels, setExpandedAnalysisPanels] = useState<Set<string>>(new Set());
  const [showAIFeatureModal, setShowAIFeatureModal] = useState(false);
  // Check localStorage synchronously for initial state
  const getInitialEmail = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user_email');
    }
    return null;
  };

  const [showEmailGate, setShowEmailGate] = useState(() => !getInitialEmail());
  const [userEmail, setUserEmail] = useState<string | null>(() => getInitialEmail());
  const [emailInput, setEmailInput] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  
  const textTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load state and projects from local storage (only after email is provided)
  useEffect(() => {
    // Only load if user has provided email
    if (!userEmail) return;
    
    const savedData = localStorage.getItem('storyboard_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Handle migration from old format (stories array) to new format (storytellings array)
        if (Array.isArray(parsed) && parsed.length > 0) {
          if ('stories' in parsed[0]) {
            // Already in new format
            setStorytellings(parsed);
          } else if ('text' in parsed[0] || parsed[0].id) {
            // Old format - migrate to new format
            setStorytellings([{
              id: generateId(),
              name: 'Storytelling 1',
              stories: parsed
            }]);
          }
        }
      } catch (e) {
        console.error("Failed to parse saved storytellings", e);
      }
    }

    const savedProjectsData = localStorage.getItem('storyboard_projects');
    if (savedProjectsData) {
      try {
        const parsed = JSON.parse(savedProjectsData);
        // Migrate old projects format
        const migrated = parsed.map((p: any) => {
          if (p.storytellings) {
            return p;
          } else if (p.stories) {
            return {
              ...p,
              storytellings: [{
                id: generateId(),
                name: 'Storytelling 1',
                stories: p.stories
              }]
            };
          }
          return p;
        });
        setSavedProjects(migrated);
      } catch (e) {
        console.error("Failed to parse saved projects", e);
      }
    }
  }, [userEmail]);

  // Ensure email gate shows if no email is present
  useEffect(() => {
    const savedEmail = localStorage.getItem('user_email');
    if (!savedEmail && !userEmail) {
      setShowEmailGate(true);
    } else if (savedEmail && !userEmail) {
      setUserEmail(savedEmail);
      setShowEmailGate(false);
    }
  }, []);

  // Auto-save active storytellings (only if user has provided email)
  useEffect(() => {
    if (userEmail) {
      localStorage.setItem('storyboard_data', JSON.stringify(storytellings));
    }
  }, [storytellings, userEmail]);

  // Save projects list
  useEffect(() => {
    localStorage.setItem('storyboard_projects', JSON.stringify(savedProjects));
  }, [savedProjects]);

  const pushToHistory = useCallback((newState: Storytelling[]) => {
    setPast(prevPast => [...prevPast, storytellings].slice(-MAX_HISTORY));
    setFuture([]);
    setStorytellings(newState);
  }, [storytellings]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    setFuture(prevFuture => [storytellings, ...prevFuture].slice(0, MAX_HISTORY));
    setPast(newPast);
    setStorytellings(previous);
  }, [past, storytellings]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    setPast(prevPast => [...prevPast, storytellings].slice(-MAX_HISTORY));
    setFuture(newFuture);
    setStorytellings(next);
  }, [future, storytellings]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isZ = e.key.toLowerCase() === 'z';
      const isMod = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      if (isMod && isZ && isShift) { redo(); } 
      else if (isMod && isZ) { undo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const addStorytelling = () => {
    const newStorytelling: Storytelling = {
      id: generateId(),
      name: `Storytelling ${storytellings.length + 1}`,
      stories: [{ id: generateId(), text: '', visual: null, engagement: null }]
    };
    pushToHistory([...storytellings, newStorytelling]);
  };

  // Show AI feature interest modal
  const handleAIClick = () => {
    setShowAIFeatureModal(true);
  };

  // Track interest in AI feature
  const handleAIInterest = async () => {
    console.log('User interested in AI feature');
    
    const userEmail = localStorage.getItem('user_email');
    
    try {
      const webhookUrl = 'https://hook.eu1.make.com/bpiwxj2xsvo5lvf13ua52dacj32vcbqf';
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail || 'unknown',
          website: 'StoryBuilder',
          timestamp: new Date().toISOString(),
        }),
      });
      
      setShowAIFeatureModal(false);
      alert('Дякую за твою підтримку! Я обов\'язково додам цю функцію! ♥️');
    } catch (error) {
      console.error('Failed to send AI interest to webhook:', error);
      // Still close the modal and show alert even if webhook fails
      setShowAIFeatureModal(false);
      alert('Дякую за твою підтримку! Я обов\'язково додам цю функцію! ♥️');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSubmitting(true);
    
    if (!emailInput.trim() || !/\S+@\S+\.\S+/.test(emailInput)) {
      setEmailSubmitting(false);
      return;
    }

    try {
      const webhookUrl = 'https://hook.eu1.make.com/re6rn5qbtrdr92nqiop24lks0qxgzehj';
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput,
          website: 'StoryBuilder',
          path: '/storytelling',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer,
        }),
      });

      localStorage.setItem('user_email', emailInput);
      setUserEmail(emailInput);
      setShowEmailGate(false);
    } catch (error) {
      console.error('Failed to send email to webhook:', error);
    } finally {
      setEmailSubmitting(false);
    }
  };

  // Gemini AI Analysis function (disabled - shows interest modal instead)
  const analyzeStorytelling = async (id: string) => {
    // Show the interest modal instead of analyzing
    handleAIClick();
    return;
    
    /* DISABLED - Uncomment when ready to enable AI
    const storytelling = storytellings.find(s => s.id === id);
    if (!storytelling) return;
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert('Будь ласка, додайте VITE_GEMINI_API_KEY до файлу .env.local');
      return;
    }
    
    setAnalyzingColumnId(id);
    
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Format stories for the prompt
      const storiesText = storytelling.stories.map((story, idx) => {
        let storyText = `Frame ${idx + 1}:\n`;
        storyText += `Text: ${story.text || '(empty)'}\n`;
        if (story.visual) storyText += `Visual Format: ${story.visual}\n`;
        if (story.engagement) storyText += `Engagement: ${story.engagement}\n`;
        return storyText;
      }).join('\n---\n\n');
      
      const prompt = `Role: You are an expert Content Strategist and Instagram Storytelling Specialist. Your task is to analyze a storytelling draft and provide a professional evaluation based on three specific high-performance criteria.

Instructions: Analyze the provided series of stories. Each "Story" or "Frame" represents a single slide. Evaluate the content on a scale of 1 to 10 for each criterion and provide actionable feedback.

Evaluation Criteria:

Narrative Flow & Logic: 
* Check for a clear arc: Hook -> Context -> Climax -> Resolution.
* Apply the "One Story, One Thought" rule.
* Identify any logical leaps or confusing topic shifts.

Hook & Engagement:
* Analyze the first 3 frames. Do they grab attention and provoke a reaction?
* Evaluate the "Call to Action" (CTA). Is there a clear next step (buy, reply, join, vote)?
* Is the tone appropriate for driving audience interaction?

Visual Pacing & Dynamics:
* Analyze the variety of formats (e.g., talking head, text on background, lifestyle video, static photo).
* Flag any "monotony" (e.g., three text-heavy slides in a row).
* Check if the text volume per slide is digestible.

Output Format: Please provide the response in the following structure:

Overall Score: [Average / 10]

Criteria Breakdown: 
* Narrative Flow: [Score/10] + [Short Critique]
* Engagement: [Score/10] + [Short Critique]
* Visual Pacing: [Score/10] + [Short Critique]

Top 3 Improvements: [Bullet points with specific, actionable changes]

Storytelling to Evaluate:
${storiesText}

IMPORTANT: Return ONLY valid JSON in this exact format (no markdown, no additional text):
{
  "overallScore": number,
  "criteriaBreakdown": {
    "narrativeFlow": {
      "score": number,
      "critique": "string"
    },
    "engagement": {
      "score": number,
      "critique": "string"
    },
    "visualPacing": {
      "score": number,
      "critique": "string"
    }
  },
  "top3Improvements": [
    "string",
    "string",
    "string"
  ]
}`;

      // Try models in order - starting with newer free-tier models
      const modelNames = [
        'gemini-2.0-flash-exp',  // Latest experimental model (often available on free tier)
        'gemini-2.0-flash',      // Latest stable flash model
        'gemini-1.5-flash',      // Previous generation flash
        'gemini-pro',            // Classic model
        'models/gemini-pro'      // Alternative format
      ];
      
      let result;
      let lastError: any = null;
      
      // Try each model until one works
      for (const modelName of modelNames) {
        try {
          console.log(`Trying model: ${modelName}`);
          const model = genAI.getGenerativeModel({ model: modelName });
          result = await model.generateContent(prompt);
          console.log(`Successfully used model: ${modelName}`);
          break;
        } catch (err: any) {
          console.log(`Model ${modelName} failed:`, err?.message);
          lastError = err;
          // If it's not a 404, don't try other models (it's a different error)
          if (err?.message && !err.message.includes('404') && !err.message.includes('not found')) {
            throw err;
          }
          continue;
        }
      }
      
      if (!result) {
        throw new Error(`Could not use any available model. Tried: ${modelNames.join(', ')}. Last error: ${lastError?.message || 'Unknown error'}`);
      }
      const response = await result.response;
      const text = response.text();
      
      console.log('Gemini raw response:', text);
      
      // Extract JSON from response (handle markdown code blocks if present)
      let jsonText = text.trim();
      
      // Remove markdown code blocks
      if (jsonText.includes('```')) {
        const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim();
        } else {
          // Try to extract JSON object from text
          const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonObjectMatch) {
            jsonText = jsonObjectMatch[0];
          }
        }
      }
      
      // Try to find JSON object if not already extracted
      if (!jsonText.startsWith('{')) {
        const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          jsonText = jsonObjectMatch[0];
        }
      }
      
      console.log('Extracted JSON:', jsonText);
      
      const analysisData = JSON.parse(jsonText);
      
      // Map the response to our ColumnAnalysis format
      const analysis: ColumnAnalysis = {
        storytellingId: id,
        overallScore: analysisData.overallScore || 0,
        criteriaBreakdown: {
          narrativeFlow: {
            score: analysisData.criteriaBreakdown?.narrativeFlow?.score || 0,
            critique: analysisData.criteriaBreakdown?.narrativeFlow?.critique || 'Оцінка недоступна'
          },
          engagement: {
            score: analysisData.criteriaBreakdown?.engagement?.score || 0,
            critique: analysisData.criteriaBreakdown?.engagement?.critique || 'Оцінка недоступна'
          },
          visualPacing: {
            score: analysisData.criteriaBreakdown?.visualPacing?.score || 0,
            critique: analysisData.criteriaBreakdown?.visualPacing?.critique || 'Оцінка недоступна'
          }
        },
        top3Improvements: analysisData.top3Improvements || []
      };
      
      setAnalysisResults(prev => {
        const newMap = new Map(prev);
        newMap.set(id, analysis);
        return newMap;
      });
      
      // Auto-expand the panel when analysis completes
      setExpandedAnalysisPanels(prev => new Set(prev).add(id));
      
    } catch (error: any) {
      console.error('Помилка аналізу:', error);
      let errorMessage = 'Помилка при аналізі. ';
      
      if (error?.message) {
        const errorMsg = error.message.toLowerCase();
        
        // Check for specific error types
        if (errorMsg.includes('404') || errorMsg.includes('not found')) {
          errorMessage += 'Модель не знайдена. Можливо, ваш API ключ не має доступу до цієї моделі. ';
        } else if (errorMsg.includes('403') || errorMsg.includes('permission')) {
          errorMessage += 'Немає доступу. Перевірте, чи ваш API ключ активний та має необхідні дозволи. ';
        } else if (errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
          errorMessage += 'Невірний API ключ. Перевірте правильність ключа в .env.local файлі. ';
        } else if (errorMsg.includes('quota') || errorMsg.includes('limit')) {
          errorMessage += 'Досягнуто ліміту запитів. Спробуйте пізніше. ';
        }
        
        errorMessage += `Деталі: ${error.message}`;
      } else if (typeof error === 'string') {
        errorMessage += error;
      } else {
        errorMessage += 'Перевірте API ключ та спробуйте ще раз.';
      }
      
      alert(errorMessage);
    } finally {
      setAnalyzingColumnId(null);
    }
    */
  };

  const toggleAnalysisPanel = (id: string) => {
    setExpandedAnalysisPanels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyStorytellingContent = async (id: string) => {
    const storytelling = storytellings.find(s => s.id === id);
    if (!storytelling) return;
    
    const textToCopy = storytelling.stories.map((story, idx) => {
      let content = `Сторіс ${idx + 1}\n${story.text || '(Текст відсутній)'}`;
      if (story.visual) content += `\nВізуал: ${story.visual}`;
      if (story.engagement) content += `\nІнтерактив: ${story.engagement}`;
      return content;
    }).join('\n\n------\n\n');
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedColumnId(id);
      setTimeout(() => setCopiedColumnId(null), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const duplicateStorytelling = (id: string) => {
    const storytellingToCopy = storytellings.find(s => s.id === id);
    if (!storytellingToCopy) return;
    
    const copiedStorytelling: Storytelling = {
      id: generateId(),
      name: `${storytellingToCopy.name} (копія)`,
      stories: storytellingToCopy.stories.map(story => ({
        ...story,
        id: generateId()
      }))
    };
    
    const index = storytellings.findIndex(s => s.id === id);
    const newStorytellings = [...storytellings];
    newStorytellings.splice(index + 1, 0, copiedStorytelling);
    pushToHistory(newStorytellings);
  };

  const deleteStorytelling = (id: string) => {
    if (storytellings.length === 1) return; // Don't allow deleting the last column
    pushToHistory(storytellings.filter(s => s.id !== id));
  };

  const updateStorytellingName = (id: string, name: string) => {
    pushToHistory(storytellings.map(s => s.id === id ? { ...s, name } : s));
  };

  const startEditingColumnName = (id: string, currentName: string) => {
    setEditingColumnName(id);
    setTempColumnName(currentName);
  };

  const finishEditingColumnName = (id: string) => {
    if (tempColumnName.trim()) {
      updateStorytellingName(id, tempColumnName.trim());
    }
    setEditingColumnName(null);
    setTempColumnName('');
  };

  const addStory = (storytellingId: string) => {
    const newState = storytellings.map(s => 
      s.id === storytellingId 
        ? { ...s, stories: [...s.stories, { id: generateId(), text: '', visual: null, engagement: null }] }
        : s
    );
    pushToHistory(newState);
  };

  const deleteStory = (storytellingId: string, storyId: string) => {
    const newState = storytellings.map(s => 
      s.id === storytellingId 
        ? { 
            ...s, 
            stories: s.stories.length === 1 
      ? [{ id: generateId(), text: '', visual: null, engagement: null }]
              : s.stories.filter(st => st.id !== storyId)
          }
        : s
    );
    pushToHistory(newState);
  };

  const updateStory = (storytellingId: string, storyId: string, updates: Partial<Story>) => {
    const newState = storytellings.map(s => 
      s.id === storytellingId 
        ? { ...s, stories: s.stories.map(st => st.id === storyId ? { ...st, ...updates } : st) }
        : s
    );
    if (updates.text !== undefined) {
      setStorytellings(newState);
      if (textTimeoutRef.current) clearTimeout(textTimeoutRef.current);
      textTimeoutRef.current = setTimeout(() => {
        setPast(prevPast => [...prevPast, storytellings].slice(-MAX_HISTORY));
        setFuture([]);
      }, 500);
    } else {
      pushToHistory(newState);
    }
  };

  const moveStory = (storytellingId: string, fromIndex: number, toIndex: number) => {
    const storytelling = storytellings.find(s => s.id === storytellingId);
    if (!storytelling || toIndex < 0 || toIndex >= storytelling.stories.length) return;
    
    const newState = storytellings.map(s => {
      if (s.id !== storytellingId) return s;
      const newStories = [...s.stories];
    const [movedItem] = newStories.splice(fromIndex, 1);
    newStories.splice(toIndex, 0, movedItem);
      return { ...s, stories: newStories };
    });
    pushToHistory(newState);
  };

  const copyToClipboard = async () => {
    const textToCopy = storytellings.map((storytelling, colIdx) => {
      const columnHeader = `\n${'='.repeat(50)}\n${storytelling.name}\n${'='.repeat(50)}\n\n`;
      const storiesText = storytelling.stories.map((s, idx) => {
      let content = `Сторіс ${idx + 1}\n${s.text || '(Текст відсутній)'}`;
      if (s.visual) content += `\nВізуал: ${s.visual}`;
      if (s.engagement) content += `\nІнтерактив: ${s.engagement}`;
      return content;
    }).join('\n\n---\n\n');
      return columnHeader + storiesText;
    }).join('\n\n\n');
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error('Failed to copy!', err); }
  };

  const handleSaveProject = () => {
    if (!newProjectName.trim()) return;
    // Save ALL current columns (storytellings) as a project
    const newProject: Project = {
      id: generateId(),
      name: newProjectName.trim(),
      timestamp: Date.now(),
      storytellings: [...storytellings] // Save all columns
    };
    setSavedProjects([newProject, ...savedProjects]);
    setNewProjectName('');
    setShowSaveDialog(false);
  };

  const loadProject = (project: Project) => {
    pushToHistory(project.storytellings);
      setShowProjects(false);
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Видалити цей проєкт назавжди?')) {
      setSavedProjects(savedProjects.filter(p => p.id !== id));
    }
  };

  const totalStories = storytellings.reduce((sum, s) => sum + s.stories.length, 0);

  // Render the app (will be blurred if email gate is showing)
  const appContent = (
    <div className={`min-h-screen pb-20 ${showEmailGate ? 'blur-sm pointer-events-none' : ''}`}>
      <header className="sticky top-0 z-40 bg-[#fbfbfd]/80 backdrop-blur-md py-6 mb-8 border-b border-gray-100 px-4 md:px-8 lg:px-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">StoryBoard</h1>
          <p className="text-sm text-gray-500">Плануйте свої історії легко та швидко</p>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          {/* History */}
          <div className="flex items-center bg-white border border-gray-200 rounded-full p-1 shadow-sm mr-1">
            <button onClick={undo} disabled={past.length === 0} className="p-2 rounded-full hover:bg-gray-50 disabled:opacity-20 transition-colors"><UndoIcon /></button>
            <div className="w-[1px] h-4 bg-gray-100 mx-1" />
            <button onClick={redo} disabled={future.length === 0} className="p-2 rounded-full hover:bg-gray-50 disabled:opacity-20 transition-colors"><RedoIcon /></button>
          </div>

          {/* Project Controls */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowProjects(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full font-medium bg-white text-gray-700 border border-gray-200 hover:border-gray-400 transition-all shadow-sm"
                title="Мої сторітели"
            >
              <FolderIcon />
                <span className="hidden sm:inline">Мої сторітели</span>
            </button>
            <button 
              onClick={() => setShowSaveDialog(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full font-medium bg-white text-gray-700 border border-gray-200 hover:border-gray-400 transition-all shadow-sm"
              title="Зберегти проєкт"
            >
              <SaveIcon />
                <span className="hidden sm:inline">Зберегти сторітелінг</span>
            </button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 md:px-8 lg:px-12">
        <div className="flex gap-6 overflow-x-auto pb-6 scroll-smooth pl-4 md:pl-8" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
          {storytellings.map((storytelling) => (
            <div key={storytelling.id} className="flex-shrink-0 w-full md:w-[calc(33.333vw-32px)]">
              {/* Column Header */}
              <div className="mb-6 px-4">
                <div className="flex items-center justify-between gap-3">
                  {editingColumnName === storytelling.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={tempColumnName}
                        onChange={(e) => setTempColumnName(e.target.value)}
                        onBlur={() => finishEditingColumnName(storytelling.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') finishEditingColumnName(storytelling.id);
                          if (e.key === 'Escape') {
                            setEditingColumnName(null);
                            setTempColumnName('');
                          }
                        }}
                        className="flex-1 px-2 py-1 border-b-2 border-gray-300 focus:outline-none focus:border-gray-900 bg-transparent text-lg font-semibold"
                      />
                      <button
                        onClick={() => finishEditingColumnName(storytelling.id)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                        title="Зберегти"
                      >
                        <CheckIcon />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center gap-2 group">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {storytelling.name}
                      </h2>
                      <button
                        onClick={() => startEditingColumnName(storytelling.id, storytelling.name)}
                        className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Редагувати назву"
                      >
                        <EditIcon />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => analyzeStorytelling(storytelling.id)}
                      disabled={analyzingColumnId === storytelling.id}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-xs font-medium ${
                        analyzingColumnId === storytelling.id
                          ? 'text-blue-500'
                          : 'text-gray-400 hover:text-gray-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title="Перевірити з AI"
                    >
                      {analyzingColumnId === storytelling.id ? <LoadingSpinner /> : <SparklesIcon />}
                      <span>Скоро!</span>
                    </button>
                    <button
                      onClick={() => copyStorytellingContent(storytelling.id)}
                      className={`p-2 rounded-lg transition-all ${
                        copiedColumnId === storytelling.id
                          ? 'text-green-500'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title={copiedColumnId === storytelling.id ? 'Скопійовано!' : 'Копіювати вміст колонки'}
                    >
                      {copiedColumnId === storytelling.id ? <CheckIcon /> : <CopyIcon />}
                    </button>
                    {storytellings.length > 1 && (
                      <button
                        onClick={() => deleteStorytelling(storytelling.id)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                        title="Видалити колонку"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{storytelling.stories.length} сторіс</p>
              </div>

              {/* AI Analysis Panel */}
              {analysisResults.has(storytelling.id) && (
                <div className="mb-6 px-4">
                  <button
                    onClick={() => toggleAnalysisPanel(storytelling.id)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">AI Аналіз</span>
                      <span className="text-xs text-gray-500">
                        Загальна оцінка: {analysisResults.get(storytelling.id)?.overallScore.toFixed(1)}/10
                      </span>
                    </div>
                    {expandedAnalysisPanels.has(storytelling.id) ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  </button>
                  
                  {expandedAnalysisPanels.has(storytelling.id) && (
                    <div className="mt-2 p-4 bg-white border border-gray-200 rounded-xl space-y-4">
                      {/* Overall Score */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Загальна оцінка</h4>
                        <div className="text-2xl font-bold text-gray-900">
                          {analysisResults.get(storytelling.id)?.overallScore.toFixed(1)}/10
                        </div>
                      </div>
                      
                      {/* Criteria Breakdown */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Оцінка за критеріями:</h4>
                        <div className="space-y-3">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700">Narrative Flow & Logic</span>
                              <span className="text-xs font-semibold text-gray-900">
                                {analysisResults.get(storytelling.id)?.criteriaBreakdown.narrativeFlow.score.toFixed(1)}/10
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              {analysisResults.get(storytelling.id)?.criteriaBreakdown.narrativeFlow.critique}
                            </p>
                          </div>
                          
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700">Hook & Engagement</span>
                              <span className="text-xs font-semibold text-gray-900">
                                {analysisResults.get(storytelling.id)?.criteriaBreakdown.engagement.score.toFixed(1)}/10
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              {analysisResults.get(storytelling.id)?.criteriaBreakdown.engagement.critique}
                            </p>
                          </div>
                          
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700">Visual Pacing & Dynamics</span>
                              <span className="text-xs font-semibold text-gray-900">
                                {analysisResults.get(storytelling.id)?.criteriaBreakdown.visualPacing.score.toFixed(1)}/10
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              {analysisResults.get(storytelling.id)?.criteriaBreakdown.visualPacing.critique}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Top 3 Improvements */}
                      {analysisResults.get(storytelling.id)?.top3Improvements && analysisResults.get(storytelling.id)!.top3Improvements.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Top 3 Покращення:</h4>
                          <ul className="space-y-2">
                            {analysisResults.get(storytelling.id)?.top3Improvements.map((improvement, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                                <span className="text-gray-400 mt-0.5">•</span>
                                <span>{improvement}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Stories in this column */}
        <div className="grid grid-cols-1 gap-6">
                {storytelling.stories.map((story, index) => (
            <div key={story.id} className="relative group/wrapper">
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 transition-opacity z-20">
                      {index > 0 && (
                        <button 
                          onClick={() => moveStory(storytelling.id, index, index - 1)} 
                          className="bg-white border border-gray-200 rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                        </button>
                      )}
                      {index < storytelling.stories.length - 1 && (
                        <button 
                          onClick={() => moveStory(storytelling.id, index, index + 1)} 
                          className="bg-white border border-gray-200 rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                      )}
                    </div>
                    <StoryCard 
                      story={story} 
                      index={index} 
                      onUpdate={(id, updates) => updateStory(storytelling.id, id, updates)} 
                      onDelete={(id) => deleteStory(storytelling.id, id)} 
                    />
                  </div>
                ))}
                <button 
                  onClick={() => addStory(storytelling.id)} 
                  className="flex flex-col items-center justify-center gap-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[24px] p-6 hover:bg-gray-100 hover:border-gray-300 transition-all min-h-[200px]"
                >
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400"><PlusIcon /></div>
                  <span className="text-gray-500 font-medium">Додати сторіс</span>
                </button>
              </div>
            </div>
          ))}
          
          {/* Add Column Button */}
          <div className="flex-shrink-0 w-full md:w-[calc(33.333vw-32px)]">
            <div className="mb-6 px-4">
              <button 
                onClick={addStorytelling} 
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 hover:border-gray-300 focus:outline-none transition-all"
                title="Додати storytelling"
              >
                <PlusIcon />
                <span>Додати сторітел</span>
          </button>
            </div>
          </div>
        </div>
      </main>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-semibold mb-2">Зберегти як проєкт</h2>
            <p className="text-gray-500 text-sm mb-6">Введіть назву, щоб легко знайти цей проєкт пізніше.</p>
            <input 
              autoFocus
              type="text" 
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Наприклад: Мій запуск осінь"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 mb-6 text-lg"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveProject()}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowSaveDialog(false)} className="flex-1 py-3 rounded-xl font-medium text-gray-500 hover:bg-gray-50 transition-colors">Скасувати</button>
              <button onClick={handleSaveProject} className="flex-1 py-3 rounded-xl font-medium bg-black text-white hover:bg-gray-800 transition-colors">Зберегти</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Feature Interest Modal */}
      {showAIFeatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] w-full max-w-md flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">ШІ-аналіз</h2>
              </div>
              <button onClick={() => setShowAIFeatureModal(false)} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><XIcon /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Тут може бути ШІ-аналіз твого сторітелінгу, яка буде оцінювати його за драматургічністю, гачком та динамікою та давати рекомендації.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Якщо ти хочеш цю функцію - натисни на кнопку нижче. Таким чином я зрозумію, чи варто мені додавати цю функцію!
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Дякую за твою підтримку♥️
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-50">
              <button 
                onClick={handleAIInterest} 
                className="w-full py-3 rounded-xl font-medium bg-black text-white hover:bg-gray-800 transition-colors"
              >
                Так, хочу цю функцію!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects Modal */}
      {showProjects && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Мої сторітели</h2>
                <p className="text-xs text-gray-400 mt-0.5">Виберіть проєкт для завантаження</p>
              </div>
              <button onClick={() => setShowProjects(false)} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><XIcon /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              {savedProjects.length === 0 ? (
                <div className="text-center py-20">
                  <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300"><FolderIcon /></div>
                  <p className="text-gray-400">У вас ще немає збережених проєктів</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {savedProjects.map((p) => {
                    const totalStories = p.storytellings?.reduce((sum, s) => sum + s.stories.length, 0) || 0;
                    return (
                    <div 
                      key={p.id} 
                      onClick={() => loadProject(p)}
                      className="group flex items-center justify-between p-5 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-gray-400 group-hover:text-black transition-colors">
                          <FolderIcon />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{p.name}</h4>
                          <p className="text-xs text-gray-400">
                              {p.storytellings?.length || 0} колонок • {totalStories} сторіс • {new Date(p.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => deleteProject(p.id, e)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {appContent}
      
      {/* Email Gate Modal - shows on top of blurred app */}
      {showEmailGate && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Отримай доступ безкоштовно!</h2>
              <p className="text-gray-600 mb-6">
                Введи свою пошту, щоб почати писати сторітели - обіцяю не спамити!
              </p>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Твій email"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 text-lg"
                  disabled={emailSubmitting}
                />
                <button
                  type="submit"
                  disabled={emailSubmitting || !emailInput.trim()}
                  className="w-full py-3 rounded-xl font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#004BA8' }}
                  onMouseEnter={(e) => {
                    if (!emailSubmitting && emailInput.trim()) {
                      e.currentTarget.style.backgroundColor = '#003d8f';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!emailSubmitting && emailInput.trim()) {
                      e.currentTarget.style.backgroundColor = '#004BA8';
                    }
                  }}
                >
                  {emailSubmitting ? 'Відправка...' : 'Отримати доступ'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
