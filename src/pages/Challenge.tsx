import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Layout/Header';
import { Trophy, CheckCircle, XCircle, RotateCcw, Clock, Target, Brain } from 'lucide-react';
import type { Organism } from '@/types';

interface QuestionOption {
  id: string;
  name: string;
  image_url: string;
}

interface Question {
  id: string;
  type: 'image_to_name' | 'name_to_image';
  organism: Organism;
  options: QuestionOption[];
  correct_answer: string;
}

// 图片加载失败时的占位图：显示生物名称首字，而不是问号
function fallbackImage(label: string, bg = '%2386efac') {
  const ch = (label || '?').charAt(0);
  return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="${bg}" width="100" height="100" rx="20"/><text x="50" y="60" font-size="40" text-anchor="middle" fill="white" font-weight="bold">${ch}</text></svg>`;
}

type GameState = 'idle' | 'playing' | 'result';

export default function Challenge() {
  const { user } = useAuthStore();
  const [gameState, setGameState] = useState<GameState>('idle');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; userAnswer: string }[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [mode, setMode] = useState<'image_to_name' | 'name_to_image'>('image_to_name');

  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleNextQuestion();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, currentIndex]);

  const generateQuestions = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/challenge/questions?count=5&mode=${mode}`);
      const data = await response.json();
      setQuestions(data);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    }
  }, [mode]);

  const startGame = async () => {
    setGameState('playing');
    setCurrentIndex(0);
    setAnswers([]);
    setScore(0);
    setTimeLeft(30);
    setSelectedOption(null);
    setShowResult(false);
    await generateQuestions();
  };

  const handleNextQuestion = () => {
    if (selectedOption) {
      setAnswers([...answers, { questionId: questions[currentIndex].id, userAnswer: selectedOption }]);
      if (selectedOption === questions[currentIndex].correct_answer) {
        setScore(score + 20);
      }
    }

    setSelectedOption(null);
    setTimeLeft(30);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      endGame();
    }
  };

  const endGame = async () => {
    setGameState('result');
    setShowResult(true);

    if (user) {
      try {
        await fetch('http://localhost:3001/api/challenge/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            answers: [...answers, { questionId: questions[currentIndex].id, userAnswer: selectedOption || '' }],
          }),
        });
      } catch (error) {
        console.error('Failed to submit challenge:', error);
      }
    }
  };

  const currentQuestion = questions[currentIndex];
  const correctCount = answers.filter((a, i) => a.userAnswer === questions[i]?.correct_answer).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-accent-600" />
            <h1 className="text-2xl font-bold text-gray-800">生物认识大挑战</h1>
          </div>
          <p className="text-gray-500">测试你的生物知识，看看你能认识多少种生物！</p>
        </div>

        {gameState === 'idle' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-accent-400 to-accent-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Brain className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">选择挑战模式</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setMode('image_to_name')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  mode === 'image_to_name'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <div className="text-2xl mb-2">🖼️</div>
                <h3 className="font-semibold text-gray-800">图片选名称</h3>
                <p className="text-sm text-gray-500 mt-1">看到图片后选择正确的生物名称</p>
              </button>
              <button
                onClick={() => setMode('name_to_image')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  mode === 'name_to_image'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <div className="text-2xl mb-2">📝</div>
                <h3 className="font-semibold text-gray-800">名称选图片</h3>
                <p className="text-sm text-gray-500 mt-1">看到名称后选择正确的生物图片</p>
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <h4 className="font-medium text-gray-800 mb-2">游戏规则</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 共 5 道题目，每题限时 30 秒</li>
                <li>• 每题答对得 20 分，满分 100 分</li>
                <li>• 图片选名称：根据图片选择正确的生物名称</li>
                <li>• 名称选图片：根据名称选择正确的生物图片</li>
              </ul>
            </div>

            <button
              onClick={startGame}
              className="px-8 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-semibold hover:from-primary-700 hover:to-accent-700 transition-all transform hover:scale-105"
            >
              开始挑战
            </button>
          </div>
        )}

        {gameState === 'playing' && currentQuestion && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-white">
                    <Target className="w-5 h-5" />
                    <span className="font-medium">题目 {currentIndex + 1} / {questions.length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <Trophy className="w-5 h-5" />
                    <span className="font-medium">得分: {score}</span>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                  timeLeft <= 10 ? 'bg-red-500' : 'bg-white/20'
                }`}>
                  <Clock className="w-5 h-5 text-white" />
                  <span className="text-white font-bold">{timeLeft}s</span>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 mt-3">
                <div
                  className="bg-white h-2 rounded-full transition-all"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="p-8">
              {mode === 'image_to_name' ? (
                <>
                  <div className="text-center mb-8">
                    <p className="text-lg text-gray-700 mb-4">这是什么生物？</p>
                    <div className="inline-block rounded-xl overflow-hidden shadow-lg">
                      <img
                        src={currentQuestion.organism.image_url}
                        alt={currentQuestion.organism.name}
                        className="w-64 h-64 object-contain bg-gray-100"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.fallback) {
                            target.dataset.fallback = '1';
                            target.src = fallbackImage(currentQuestion.organism.name);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {currentQuestion.options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSelectedOption(option.name)}
                        className={`p-4 rounded-xl border-2 text-lg font-medium transition-all ${
                          selectedOption === option.name
                            ? 'border-primary-600 bg-primary-50 text-primary-600'
                            : 'border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <p className="text-lg text-gray-700 mb-2">请选择以下生物的图片</p>
                    <h2 className="text-2xl font-bold text-primary-600">{currentQuestion.correct_answer}</h2>
                    <p className="text-sm text-gray-500 mt-1">{currentQuestion.organism.scientific_name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {currentQuestion.options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSelectedOption(option.name)}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all group ${
                          selectedOption === option.name
                            ? 'border-primary-600 ring-4 ring-primary-200'
                            : 'border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        <img
                          src={option.image_url}
                          alt="选项图片"
                          className="w-full aspect-square object-contain bg-gray-100"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.dataset.fallback) {
                              target.dataset.fallback = '1';
                              // 此模式名称即答案，失败占位不能显示首字，用中性图片图标
                              target.src =
                                "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23e5e7eb' width='100' height='100'/><path d='M30 38h40v24H30z' fill='none' stroke='%239ca3af' stroke-width='4'/><circle cx='40' cy='46' r='4' fill='%239ca3af'/><path d='M34 58l10-10 8 8 6-6 8 8' fill='none' stroke='%239ca3af' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/></svg>";
                            }
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleNextQuestion}
                  disabled={!selectedOption}
                  className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {currentIndex < questions.length - 1 ? '下一题' : '查看结果'}
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState === 'result' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
              score >= 80 ? 'bg-green-100' : score >= 60 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              {score >= 80 ? (
                <CheckCircle className="w-12 h-12 text-green-600" />
              ) : score >= 60 ? (
                <Trophy className="w-12 h-12 text-yellow-600" />
              ) : (
                <XCircle className="w-12 h-12 text-red-600" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {score >= 80 ? '太棒了！' : score >= 60 ? '不错哦！' : '继续加油！'}
            </h2>
            <p className="text-gray-500 mb-6">挑战完成</p>

            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-6 mb-6">
              <div className="text-5xl font-bold text-primary-600 mb-2">{score}</div>
              <div className="text-gray-600">总分</div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-gray-800">{questions.length}</div>
                <div className="text-sm text-gray-500">总题数</div>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-green-600">{correctCount}</div>
                <div className="text-sm text-green-600">答对</div>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-red-600">{questions.length - correctCount}</div>
                <div className="text-sm text-red-600">答错</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <h4 className="font-medium text-gray-800 mb-3">答题详情</h4>
              <div className="space-y-3">
                {questions.map((q, index) => {
                  const userAnswer = answers[index]?.userAnswer || '';
                  const isCorrect = userAnswer === q.correct_answer;
                  return (
                    <div key={q.id} className={`flex items-center gap-3 p-3 rounded-lg ${
                      isCorrect ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{q.correct_answer}</p>
                        {!isCorrect && (
                          <p className="text-sm text-red-600">你的答案: {userAnswer || '未作答'}</p>
                        )}
                      </div>
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setGameState('idle')}
                className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                返回首页
              </button>
              <button
                onClick={startGame}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                再来一次
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}