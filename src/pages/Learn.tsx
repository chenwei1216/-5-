import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Layout/Header';
import { BookOpen, CheckCircle, ChevronRight, MapPin, Info, Sparkles } from 'lucide-react';
import type { Organism } from '@/types';

export default function Learn() {
  const { user } = useAuthStore();
  const [organisms, setOrganisms] = useState<Organism[]>([]);
  const [learnedIds, setLearnedIds] = useState<string[]>([]);
  const [selectedOrganism, setSelectedOrganism] = useState<Organism | null>(null);

  useEffect(() => {
    fetchOrganisms();
    fetchLearningProgress();
  }, []);

  const fetchOrganisms = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/organisms');
      const data = await response.json();
      setOrganisms(data);
    } catch (error) {
      console.error('Failed to fetch organisms:', error);
    }
  };

  const fetchLearningProgress = async () => {
    if (!user) return;

    try {
      const response = await fetch(`http://localhost:3001/api/learning/progress?user_id=${user.id}`);
      const data = await response.json();
      setLearnedIds(data.filter((p: { learned: boolean }) => p.learned).map((p: { organism_id: string }) => p.organism_id));
    } catch (error) {
      console.error('Failed to fetch learning progress:', error);
    }
  };

  const handleMarkLearned = async (organismId: string) => {
    if (!user) return;

    try {
      await fetch('http://localhost:3001/api/learning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, organism_id: organismId }),
      });
      setLearnedIds([...learnedIds, organismId]);
    } catch (error) {
      console.error('Failed to mark learned:', error);
    }
  };

  const categories = [...new Set(organisms.map((o) => o.category))];
  const [activeCategory, setActiveCategory] = useState<string>('全部');

  const filteredOrganisms = activeCategory === '全部' 
    ? organisms 
    : organisms.filter((o) => o.category === activeCategory);

  const progress = organisms.length > 0 ? (learnedIds.length / organisms.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-800">今日学习</h1>
          </div>
          <p className="text-gray-500">像认识单词一样认识这些生物，每天学习一点，积累知识</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">学习进度</h3>
              <p className="text-sm text-gray-500">已学习 {learnedIds.length} / {organisms.length} 种生物</p>
            </div>
            <div className="text-2xl font-bold text-primary-600">{Math.round(progress)}%</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-primary-500 to-secondary-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveCategory('全部')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === '全部'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-primary-50'
            }`}
          >
            全部
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === category
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-primary-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrganisms.map((organism) => (
            <div
              key={organism.id}
              onClick={() => setSelectedOrganism(organism)}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="relative">
                <img
                  src={organism.image_url}
                  alt={organism.name}
                  className="w-full h-48 object-contain bg-gray-50 transition-transform duration-300"
                />
                {learnedIds.includes(organism.id) && (
                  <div className="absolute top-3 right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/50 text-white text-xs rounded-full">
                  {organism.category}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 mb-1">{organism.name}</h3>
                <p className="text-sm text-gray-500 italic mb-2">{organism.scientific_name}</p>
                <p className="text-sm text-gray-600 line-clamp-2">{organism.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    {organism.habitat}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedOrganism && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedOrganism(null)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <img
                  src={selectedOrganism.image_url}
                  alt={selectedOrganism.name}
                  className="w-full h-64 object-contain bg-gray-50"
                />
                <button
                  onClick={() => setSelectedOrganism(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <span className="text-xl">&times;</span>
                </button>
                <div className="absolute bottom-4 left-4 px-4 py-2 bg-black/50 text-white rounded-lg">
                  <span className="text-sm">{selectedOrganism.category}</span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedOrganism.name}</h2>
                    <p className="text-gray-500 italic">{selectedOrganism.scientific_name}</p>
                  </div>
                  {!learnedIds.includes(selectedOrganism.id) && (
                    <button
                      onClick={() => handleMarkLearned(selectedOrganism.id)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      标记已学习
                    </button>
                  )}
                </div>

                <div className="mb-6">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-2">
                    <Info className="w-5 h-5 text-primary-600" />
                    简介
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{selectedOrganism.description}</p>
                </div>

                <div className="mb-6">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-2">
                    <MapPin className="w-5 h-5 text-primary-600" />
                    栖息地
                  </h3>
                  <p className="text-gray-600">{selectedOrganism.habitat}</p>
                </div>

                <div>
                  <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-2">
                    <Sparkles className="w-5 h-5 text-primary-600" />
                    特征
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedOrganism.characteristics.map((char, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-sm"
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}