
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Story } from './types';
import { PlusIcon, CopyIcon, UndoIcon, RedoIcon, SaveIcon, FolderIcon, XIcon, TrashIcon } from './components/Icon';
import StoryCard from './components/StoryCard';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const MAX_HISTORY = 50;

interface Project {
  id: string;
  name: string;
  timestamp: number;
  stories: Story[];
}

const App: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([
    { id: generateId(), text: '', visual: null, engagement: null }
  ]);
  const [past, setPast] = useState<Story[][]>([]);
  const [future, setFuture] = useState<Story[][]>([]);
  const [copied, setCopied] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  
  const textTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load state and projects from local storage
  useEffect(() => {
    const savedData = localStorage.getItem('storyboard_data');
    if (savedData) {
      try {
        setStories(JSON.parse(savedData));
      } catch (e) {
        console.error("Failed to parse saved stories", e);
      }
    }

    const savedProjectsData = localStorage.getItem('storyboard_projects');
    if (savedProjectsData) {
      try {
        setSavedProjects(JSON.parse(savedProjectsData));
      } catch (e) {
        console.error("Failed to parse saved projects", e);
      }
    }
  }, []);

  // Auto-save active stories
  useEffect(() => {
    localStorage.setItem('storyboard_data', JSON.stringify(stories));
  }, [stories]);

  // Save projects list
  useEffect(() => {
    localStorage.setItem('storyboard_projects', JSON.stringify(savedProjects));
  }, [savedProjects]);

  const pushToHistory = useCallback((newState: Story[]) => {
    setPast(prevPast => [...prevPast, stories].slice(-MAX_HISTORY));
    setFuture([]);
    setStories(newState);
  }, [stories]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    setFuture(prevFuture => [stories, ...prevFuture].slice(0, MAX_HISTORY));
    setPast(newPast);
    setStories(previous);
  }, [past, stories]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    setPast(prevPast => [...prevPast, stories].slice(-MAX_HISTORY));
    setFuture(newFuture);
    setStories(next);
  }, [future, stories]);

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

  const addStory = () => {
    pushToHistory([...stories, { id: generateId(), text: '', visual: null, engagement: null }]);
  };

  const deleteStory = (id: string) => {
    pushToHistory(stories.length === 1 
      ? [{ id: generateId(), text: '', visual: null, engagement: null }]
      : stories.filter(s => s.id !== id)
    );
  };

  const updateStory = (id: string, updates: Partial<Story>) => {
    const newState = stories.map(s => s.id === id ? { ...s, ...updates } : s);
    if (updates.text !== undefined) {
      setStories(newState);
      if (textTimeoutRef.current) clearTimeout(textTimeoutRef.current);
      textTimeoutRef.current = setTimeout(() => {
        setPast(prevPast => [...prevPast, stories].slice(-MAX_HISTORY));
        setFuture([]);
      }, 500);
    } else {
      pushToHistory(newState);
    }
  };

  const moveStory = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= stories.length) return;
    const newStories = [...stories];
    const [movedItem] = newStories.splice(fromIndex, 1);
    newStories.splice(toIndex, 0, movedItem);
    pushToHistory(newStories);
  };

  const copyToClipboard = async () => {
    const textToCopy = stories.map((s, idx) => {
      let content = `Сторіс ${idx + 1}\n${s.text || '(Текст відсутній)'}`;
      if (s.visual) content += `\nВізуал: ${s.visual}`;
      if (s.engagement) content += `\nІнтерактив: ${s.engagement}`;
      return content;
    }).join('\n\n---\n\n');
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error('Failed to copy!', err); }
  };

  const handleSaveProject = () => {
    if (!newProjectName.trim()) return;
    const newProject: Project = {
      id: generateId(),
      name: newProjectName.trim(),
      timestamp: Date.now(),
      stories: stories
    };
    setSavedProjects([newProject, ...savedProjects]);
    setNewProjectName('');
    setShowSaveDialog(false);
  };

  const loadProject = (project: Project) => {
    if (confirm(`Завантажити проєкт "${project.name}"? Поточні зміни будуть доступні через Undo.`)) {
      pushToHistory(project.stories);
      setShowProjects(false);
    }
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Видалити цей проєкт назавжди?')) {
      setSavedProjects(savedProjects.filter(p => p.id !== id));
    }
  };

  return (
    <div className="min-h-screen pb-20 px-4 md:px-8 lg:px-12">
      <header className="sticky top-0 z-40 bg-[#fbfbfd]/80 backdrop-blur-md py-6 mb-8 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
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
              title="Мої проєкти"
            >
              <FolderIcon />
              <span className="hidden sm:inline">Проєкти</span>
            </button>
            <button 
              onClick={() => setShowSaveDialog(true)}
              className="p-2.5 rounded-full bg-white text-gray-700 border border-gray-200 hover:border-gray-400 transition-all shadow-sm"
              title="Зберегти проєкт"
            >
              <SaveIcon />
            </button>
          </div>

          <button 
            onClick={copyToClipboard}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all ${
              copied ? 'bg-green-500 text-white' : 'bg-black text-white hover:bg-gray-800'
            } active:scale-95 shadow-lg shadow-black/10`}
          >
            {copied ? <><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Готово!</span></> : <><CopyIcon /><span>Копіювати</span></>}
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {stories.map((story, index) => (
            <div key={story.id} className="relative group/wrapper">
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover/wrapper:opacity-100 transition-opacity z-20">
                {index > 0 && <button onClick={() => moveStory(index, index - 1)} className="bg-white border border-gray-100 rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg></button>}
                {index < stories.length - 1 && <button onClick={() => moveStory(index, index + 1)} className="bg-white border border-gray-100 rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>}
              </div>
              <StoryCard story={story} index={index} onUpdate={updateStory} onDelete={deleteStory} />
            </div>
          ))}
          <button onClick={addStory} className="flex flex-col items-center justify-center gap-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[24px] p-6 hover:bg-gray-100 hover:border-gray-300 transition-all min-h-[400px]">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400"><PlusIcon /></div>
            <span className="text-gray-500 font-medium">Додати сторіс</span>
          </button>
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

      {/* Projects Modal */}
      {showProjects && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Мої проєкти</h2>
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
                  {savedProjects.map((p) => (
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
                            {p.stories.length} сторінок • {new Date(p.timestamp).toLocaleDateString()}
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button onClick={addStory} className="fixed bottom-8 right-8 w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform md:hidden z-30">
        <PlusIcon />
      </button>
    </div>
  );
};

export default App;
