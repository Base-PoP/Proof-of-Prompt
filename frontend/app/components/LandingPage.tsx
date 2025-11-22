'use client';

import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Search, Filter, TrendingUp, Clock, Users } from 'lucide-react';

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  votes: number;
  createdAt: string;
}

interface LandingPageProps {
  onSelectProblem: (problem: Problem) => void;
}

export function LandingPage({ onSelectProblem }: LandingPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

  // 하드코딩된 문제 데이터
  const problems: Problem[] = [
    {
      id: '1',
      title: '안성맞춤의 반댓말은?',
      description: '안성맞춤의 반댓말을 찾아보세요. 로직을 도입해야 할까요?',
      difficulty: 'medium',
      category: '언어',
      votes: 342,
      createdAt: '2024-01-20'
    },
    {
      id: '2',
      title: '양자 컴퓨팅 설명하기',
      description: '양자 컴퓨팅의 기본 원리와 활용 분야를 설명해주세요.',
      difficulty: 'hard',
      category: '과학',
      votes: 128,
      createdAt: '2024-01-19'
    },
    {
      id: '3',
      title: 'AI에 대한 하이쿠 작성',
      description: '인공지능에 대한 하이쿠를 작성해보세요.',
      difficulty: 'easy',
      category: '문학',
      votes: 89,
      createdAt: '2024-01-18'
    },
    {
      id: '4',
      title: '최적의 정렬 알고리즘',
      description: '대용량 데이터를 정렬할 때 가장 효율적인 알고리즘은 무엇일까요?',
      difficulty: 'hard',
      category: '프로그래밍',
      votes: 256,
      createdAt: '2024-01-17'
    },
    {
      id: '5',
      title: '친구에게 생일 축하 메시지',
      description: '친구의 생일을 축하하는 따뜻한 메시지를 작성해주세요.',
      difficulty: 'easy',
      category: '일상',
      votes: 512,
      createdAt: '2024-01-16'
    },
    {
      id: '6',
      title: '블록체인 기술의 미래',
      description: '블록체인 기술이 향후 10년간 어떻게 발전할지 예측해보세요.',
      difficulty: 'medium',
      category: '기술',
      votes: 198,
      createdAt: '2024-01-15'
    },
    {
      id: '7',
      title: '요리 레시피 추천',
      description: '초보자도 쉽게 만들 수 있는 맛있는 요리 레시피를 알려주세요.',
      difficulty: 'easy',
      category: '요리',
      votes: 445,
      createdAt: '2024-01-14'
    },
    {
      id: '8',
      title: '기후 변화 해결 방안',
      description: '기후 변화를 해결하기 위한 실질적인 방안을 제시해주세요.',
      difficulty: 'hard',
      category: '환경',
      votes: 312,
      createdAt: '2024-01-13'
    },
    {
      id: '9',
      title: '효과적인 학습 방법',
      description: '새로운 지식을 빠르고 효과적으로 학습하는 방법은?',
      difficulty: 'medium',
      category: '교육',
      votes: 278,
      createdAt: '2024-01-12'
    },
    {
      id: '10',
      title: '창의적인 스토리텔링',
      description: '흥미진진한 단편 소설의 시작 부분을 작성해주세요.',
      difficulty: 'medium',
      category: '문학',
      votes: 167,
      createdAt: '2024-01-11'
    },
    {
      id: '11',
      title: '비즈니스 전략 수립',
      description: '신규 스타트업을 위한 초기 마케팅 전략을 제안해주세요.',
      difficulty: 'hard',
      category: '비즈니스',
      votes: 234,
      createdAt: '2024-01-10'
    },
    {
      id: '12',
      title: '건강한 생활 습관',
      description: '일상에서 실천할 수 있는 건강한 생활 습관을 알려주세요.',
      difficulty: 'easy',
      category: '건강',
      votes: 389,
      createdAt: '2024-01-09'
    }
  ];

  const categories = Array.from(new Set(problems.map(p => p.category)));
  const difficulties = ['easy', 'medium', 'hard'];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'hard':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '쉬움';
      case 'medium':
        return '보통';
      case 'hard':
        return '어려움';
      default:
        return difficulty;
    }
  };

  const filteredProblems = problems.filter(problem => {
    const matchesSearch = problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         problem.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || problem.category === selectedCategory;
    const matchesDifficulty = !selectedDifficulty || problem.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-3" style={{ color: '#0052FF' }}>
          문제 선택하기
        </h1>
        <p className="text-gray-600 text-lg">
          AI 모델들의 응답을 비교하고 투표해보세요
        </p>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="문제 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: '#0052FF20' }}
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 font-medium">카테고리:</span>
          </div>
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={selectedCategory === null ? '' : ''}
            style={selectedCategory === null ? { backgroundColor: '#0052FF' } : {}}
          >
            전체
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              style={selectedCategory === category ? { backgroundColor: '#0052FF' } : {}}
            >
              {category}
            </Button>
          ))}

          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm text-gray-600 font-medium">난이도:</span>
          </div>
          <Button
            variant={selectedDifficulty === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDifficulty(null)}
            style={selectedDifficulty === null ? { backgroundColor: '#0052FF' } : {}}
          >
            전체
          </Button>
          {difficulties.map(difficulty => (
            <Button
              key={difficulty}
              variant={selectedDifficulty === difficulty ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDifficulty(difficulty)}
              className={selectedDifficulty === difficulty ? getDifficultyColor(difficulty) : ''}
              style={selectedDifficulty === difficulty ? {} : {}}
            >
              {getDifficultyLabel(difficulty)}
            </Button>
          ))}
        </div>
      </div>

      {/* Problems Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProblems.map((problem) => (
          <Card
            key={problem.id}
            className="p-6 border-2 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group"
            style={{ borderColor: '#0052FF20' }}
            onClick={() => onSelectProblem(problem)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                  {problem.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {problem.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(problem.difficulty)}`}>
                {getDifficultyLabel(problem.difficulty)}
              </span>
              <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                {problem.category}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{problem.votes.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{problem.createdAt}</span>
                </div>
              </div>
              <Button
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: '#0052FF' }}
              >
                선택하기
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredProblems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">검색 결과가 없습니다.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory(null);
              setSelectedDifficulty(null);
            }}
          >
            필터 초기화
          </Button>
        </div>
      )}

      {/* Stats Section */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 text-center border-2" style={{ borderColor: '#0052FF20' }}>
          <div className="text-3xl font-bold mb-2" style={{ color: '#0052FF' }}>
            {problems.length}
          </div>
          <div className="text-sm text-gray-600">전체 문제</div>
        </Card>
        <Card className="p-6 text-center border-2" style={{ borderColor: '#0052FF20' }}>
          <div className="text-3xl font-bold mb-2" style={{ color: '#0052FF' }}>
            {problems.reduce((sum, p) => sum + p.votes, 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">총 투표 수</div>
        </Card>
        <Card className="p-6 text-center border-2" style={{ borderColor: '#0052FF20' }}>
          <div className="text-3xl font-bold mb-2" style={{ color: '#0052FF' }}>
            {categories.length}
          </div>
          <div className="text-sm text-gray-600">카테고리</div>
        </Card>
      </div>
    </div>
  );
}

