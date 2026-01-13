
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Vocabulary, TabType } from './types';
import { INITIAL_VOCAB, LESSON_TITLES } from './constants';
import { Button } from './components/Button';
import { Flashcard } from './components/Flashcard';
import { explainWord, suggestVocabDetails, generateVocabImage } from './services/geminiService';

type SubTabType = 'all' | 'kanji' | 'verb' | 'general';
type ScopeMode = 'single' | 'all';

const App: React.FC = () => {
  const [vocabData, setVocabData] = useState<Vocabulary[]>(() => {
    const saved = localStorage.getItem('n5_vocab_data');
    const parsedSaved = saved ? JSON.parse(saved) : [];
    return (parsedSaved.length === 0 && INITIAL_VOCAB.length > 0) ? INITIAL_VOCAB : parsedSaved;
  });

  const [activeTab, setActiveTab] = useState<TabType>('flashcard');
  const [listSubTab, setListSubTab] = useState<SubTabType>('all');
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [studyScope, setStudyScope] = useState<ScopeMode>('single');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [quizWord, setQuizWord] = useState<Vocabulary | null>(null);
  const [quizOptions, setQuizOptions] = useState<Vocabulary[]>([]);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState<{ correct: boolean, message: string } | null>(null);
  const [isQuizPlaying, setIsQuizPlaying] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [explainingVocab, setExplainingVocab] = useState<Vocabulary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [newKanji, setNewKanji] = useState('');
  const [newReading, setNewReading] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newCategory, setNewCategory] = useState<Vocabulary['category']>('general');
  const [newLesson, setNewLesson] = useState<number>(1);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [formFeedback, setFormFeedback] = useState('');

  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    localStorage.setItem('n5_vocab_data', JSON.stringify(vocabData));
  }, [vocabData]);

  const playAudio = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85;
    utterance.onstart = () => setIsQuizPlaying(true);
    utterance.onend = () => setIsQuizPlaying(false);
    utterance.onerror = () => setIsQuizPlaying(false);
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const availableLessons = useMemo(() => {
    const lessons = Array.from(new Set(vocabData.map(v => v.lesson))).sort((a: number, b: number) => a - b);
    return lessons.length > 0 ? lessons : Array.from({length: 25}, (_, i) => i + 1);
  }, [vocabData]);

  const filteredFlashcards = useMemo(() => {
    if (selectedLesson === null && studyScope === 'single') return [];
    return vocabData.filter(v => {
      const matchesLesson = studyScope === 'all' || v.lesson === selectedLesson;
      return matchesLesson;
    });
  }, [vocabData, selectedLesson, studyScope]);

  const generateQuiz = useCallback(() => {
    setQuizAnswered(false);
    setQuizFeedback(null);
    
    if (filteredFlashcards.length === 0) {
      setQuizWord(null);
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * filteredFlashcards.length);
    const correct = filteredFlashcards[randomIndex];
    setQuizWord(correct);

    let options = [correct];
    while (options.length < Math.min(4, filteredFlashcards.length)) {
      const distractor = filteredFlashcards[Math.floor(Math.random() * filteredFlashcards.length)];
      if (!options.find(o => o.id === distractor.id)) {
        options.push(distractor);
      }
    }
    setQuizOptions(options.sort(() => Math.random() - 0.5));
    
    // Tự động phát âm khi có câu hỏi mới
    setTimeout(() => playAudio(correct.reading), 500);
  }, [filteredFlashcards, playAudio]);

  useEffect(() => {
    setCurrentIndex(0);
    if (activeTab === 'quiz') {
      generateQuiz();
    } else {
      window.speechSynthesis.cancel();
    }
  }, [selectedLesson, studyScope, activeTab, generateQuiz]);

  const handleQuizAnswer = (option: Vocabulary) => {
    if (quizAnswered || !quizWord) return;
    setQuizAnswered(true);
    if (option.id === quizWord.id) {
      setScore(prev => prev + 10);
      setQuizFeedback({ correct: true, message: "CHÍNH XÁC! 殿" });
    } else {
      setQuizFeedback({ correct: false, message: `SAI RỒI! ĐÁP ÁN LÀ: ${quizWord.meaning.toUpperCase()}` });
    }
  };

  const handleAiSuggest = async () => {
    if (!newKanji) return;
    setIsSuggesting(true);
    try {
      const suggestion = await suggestVocabDetails(newKanji);
      if (suggestion) {
        setNewReading(suggestion.reading);
        setNewMeaning(suggestion.meaning);
        setNewCategory(suggestion.category);
        setNewLesson(suggestion.lesson);
      }
    } catch (e) {
      setFormFeedback('Không thể lấy gợi ý từ AI.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKanji || !newReading || !newMeaning) {
      setFormFeedback('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    const newVocab: Vocabulary = {
      id: Date.now().toString(),
      kanji: newKanji,
      reading: newReading,
      meaning: newMeaning,
      category: newCategory,
      lesson: newLesson
    };

    setVocabData(prev => [...prev, newVocab]);
    setNewKanji('');
    setNewReading('');
    setNewMeaning('');
    setFormFeedback('Đã thêm từ mới thành công!');
    setTimeout(() => setFormFeedback(''), 3000);
  };

  const handleClearAll = () => {
    if (window.confirm("Bạn có chắc chắn muốn khôi phục dữ liệu gốc?")) {
      setVocabData(INITIAL_VOCAB);
      localStorage.setItem('n5_vocab_data', JSON.stringify(INITIAL_VOCAB));
      handleGoHome();
    }
  };

  const handleExplain = async (vocab: Vocabulary) => {
    setExplaining(true);
    setAiExplanation(null);
    setAiImage(null);
    setExplainingVocab(vocab);
    
    try {
      const [textResult, imageResult] = await Promise.all([
        explainWord(vocab.kanji, vocab.reading, vocab.meaning),
        generateVocabImage(vocab.kanji, vocab.meaning)
      ]);
      setAiExplanation(textResult || "Không thể lấy lời giải thích lúc này.");
      setAiImage(imageResult || null);
    } catch (e) {
      setAiExplanation("Lỗi khi kết nối với AI.");
    } finally {
      setExplaining(false);
    }
  };

  const closeModal = () => {
    setAiExplanation(null);
    setAiImage(null);
    setExplainingVocab(null);
  };

  const selectLesson = (lesson: number | 'all') => {
    if (lesson === 'all') {
      setStudyScope('all');
      setSelectedLesson(null);
    } else {
      setStudyScope('single');
      setSelectedLesson(lesson);
    }
    setActiveTab('flashcard');
  };

  const handleGoHome = () => {
    setSelectedLesson(null);
    setStudyScope('single');
  };

  const filteredList = vocabData.filter(v => {
    const matchesSearch = v.kanji.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.meaning.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = listSubTab === 'all' || v.category === listSubTab;
    const matchesLesson = studyScope === 'all' || v.lesson === selectedLesson;
    return matchesSearch && matchesCategory && matchesLesson;
  });

  const currentLessonTitle = useMemo(() => {
    if (studyScope === 'all') return "TẤT CẢ BÀI HỌC";
    if (selectedLesson === null) return "HỌC TỪ VỰNG N5";
    return LESSON_TITLES[selectedLesson] || `BÀI HỌC ${selectedLesson}`;
  }, [selectedLesson, studyScope]);

  // Màn hình chọn bài
  if (selectedLesson === null && studyScope === 'single') {
    return (
      <div className="min-h-screen p-4 md:p-10 flex flex-col items-center animate-in fade-in duration-700">
        <div className="max-w-5xl w-full space-y-12 py-10">
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-[#B11116] mx-auto flex items-center justify-center border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
               <span className="text-white font-black text-4xl">N5</span>
            </div>
            <h1 className="text-5xl font-black text-black tracking-widest uppercase">Từ Vựng JLPT N5</h1>
            <p className="text-slate-600 font-bold tracking-widest uppercase text-sm">Chọn võ đường luyện tập của bạn</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {availableLessons.map(l => (
              <button 
                key={l} 
                onClick={() => selectLesson(l)}
                className="bg-white border-2 border-black p-6 flex flex-col items-center justify-center hover:bg-slate-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all h-44 group relative overflow-hidden"
              >
                <span className="text-[#B11116] text-xs font-black uppercase tracking-[0.2em] mb-1">BÀI</span>
                <span className="text-5xl font-black text-black mb-2">{l}</span>
                <span className="text-slate-700 text-[10px] font-bold leading-tight line-clamp-2 px-2 uppercase tracking-tighter text-center">
                  {LESSON_TITLES[l] || "Chủ đề"}
                </span>
              </button>
            ))}
          </div>

          <div className="pt-6">
            <button 
              onClick={() => selectLesson('all')}
              className="w-full py-8 bg-black text-white border-4 border-black shadow-[10px_10px_0px_0px_#B11116] hover:bg-[#1A1A1A] transition-all font-black text-2xl uppercase tracking-[0.3em] flex items-center justify-center gap-6"
            >
              <span>🔥 CHINH PHỤC TẤT CẢ ({vocabData.length})</span>
            </button>
          </div>

          <div className="text-center pt-8 border-t border-black/10">
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setActiveTab('add')}
                className="text-black/40 hover:text-[#B11116] font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-4 mx-auto"
              >
                <span>XÂY DỰNG TỪ ĐIỂN CÁ NHÂN</span>
                <span className="border border-black/20 px-4 py-1">➔</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      <header className="bg-white border-b-4 border-black sticky top-0 z-40 px-4 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleGoHome} 
              className="w-12 h-12 bg-[#B11116] border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              <span className="text-white font-black text-2xl">N5</span>
            </button>
            <div className="flex flex-col">
              <h1 className="text-lg font-black text-black leading-none uppercase tracking-widest truncate max-w-[150px] sm:max-w-none">
                {currentLessonTitle}
              </h1>
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Võ đường ngôn ngữ</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-[#B11116] border-2 border-black px-4 py-2 flex items-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-white font-black text-sm">{score}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-10">
        {activeTab === 'flashcard' && (
          <div className="space-y-12 animate-in slide-in-from-top-4 duration-500">
            <div className="text-center space-y-2 border-b-2 border-black/5 pb-6">
                <h2 className="text-3xl font-black text-black uppercase tracking-[0.2em]">Luyện tập</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">{currentLessonTitle}</p>
            </div>
            
            {filteredFlashcards.length > 0 ? (
              <>
                <Flashcard vocab={filteredFlashcards[currentIndex]} onExplain={handleExplain} />
                <div className="flex items-center justify-between max-w-md mx-auto pt-6">
                  <button onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0} className="w-14 h-14 border-2 border-black flex items-center justify-center font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-30">❮</button>
                  <div className="flex flex-col items-center">
                    <div className="text-xl font-black text-black tracking-widest">{currentIndex + 1} / {filteredFlashcards.length}</div>
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">TIẾN ĐỘ</div>
                  </div>
                  <button onClick={() => setCurrentIndex(prev => Math.min(filteredFlashcards.length - 1, prev + 1))} disabled={currentIndex === filteredFlashcards.length - 1} className="w-14 h-14 border-2 border-black flex items-center justify-center font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-30">❯</button>
                </div>
              </>
            ) : (
              <div className="bg-white p-20 border-4 border-dashed border-black/10 text-center text-slate-400 font-black uppercase tracking-widest">Hư không - Không có dữ liệu</div>
            )}
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-500">
            <div className="text-center space-y-2 border-b-2 border-black/5 pb-6">
              <h2 className="text-3xl font-black text-black uppercase tracking-[0.2em]">Thử thách</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">{currentLessonTitle}</p>
            </div>
            {quizWord ? (
              <div className="bg-white border-4 border-black p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] space-y-10 relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-slate-100">
                  <div className="h-full bg-[#B11116] transition-all" style={{ width: `${(Number(score) % 100)}%` }}></div>
                </div>
                <div className="text-center relative">
                   <div className="text-xs text-slate-400 font-black uppercase tracking-[0.4em] mb-4">MẶT CHỮ HÁN</div>
                   
                   <div className="flex items-center justify-center gap-4">
                    <div className="text-8xl font-black text-black">{quizWord?.kanji}</div>
                    <button 
                      onClick={() => playAudio(quizWord?.reading)}
                      className={`w-12 h-12 rounded-full border-2 border-black flex items-center justify-center transition-all ${isQuizPlaying ? 'bg-[#B11116] text-white' : 'bg-white hover:bg-slate-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'}`}
                    >
                      <span className="text-xl">🔊</span>
                    </button>
                   </div>

                   <div className="text-slate-400 font-bold italic h-8 tracking-widest uppercase mt-4">
                    {quizAnswered ? quizWord?.reading : '???'}
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {quizOptions.map((opt) => (
                    <button 
                      key={opt.id} 
                      disabled={quizAnswered} 
                      onClick={() => handleQuizAnswer(opt)} 
                      className={`p-6 border-2 font-black text-lg transition-all text-left flex items-center justify-between tracking-wide ${!quizAnswered ? 'border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#B11116] hover:text-white' : opt.id === quizWord?.id ? 'bg-green-600 text-white border-green-600' : 'border-black opacity-30 bg-slate-50'}`}
                    >
                      <span>{opt.meaning.toUpperCase()}</span>
                      {quizAnswered && opt.id === quizWord?.id && <span className="text-2xl font-black">✔</span>}
                    </button>
                  ))}
                </div>
                {quizFeedback && <div className={`text-center p-6 border-2 border-black font-black uppercase tracking-[0.2em] ${quizFeedback.correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-[#B11116]'}`}>{quizFeedback.message}</div>}
                <Button onClick={generateQuiz} disabled={!quizAnswered} className="w-full py-6 text-xl">TIẾP TỤC HÀNH TRÌNH ➔</Button>
              </div>
            ) : (
              <div className="text-center py-32 bg-white border-4 border-dashed border-black/10">
                <p className="text-slate-400 font-black uppercase tracking-[0.2em] mb-10">Hãy chọn bài học để bắt đầu thử thách</p>
                <Button onClick={handleGoHome}>VỀ TRANG CHỦ</Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'list' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-black pb-8">
              <div>
                <h2 className="text-4xl font-black text-black uppercase tracking-tighter">Sổ tay từ vựng</h2>
                <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] mt-2">{currentLessonTitle} | {filteredList.length} TỪ</p>
              </div>
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="TÌM KIẾM THEO HÁN TỰ..." 
                  className="px-6 py-4 border-2 border-black font-black placeholder:text-slate-300 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full md:w-80" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
            </div>
            
            <div className="space-y-4">
              {filteredList.map((word) => (
                <div key={word.id} className="bg-white border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div className="text-5xl font-black text-black">{word.kanji}</div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{word.reading}</span>
                      <span className="text-xl font-black text-[#B11116] uppercase">{word.meaning}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-black/5 pt-4 sm:pt-0 sm:pl-6">
                    <div className="text-xs font-black text-slate-300 mr-2 tracking-widest uppercase">BÀI {word.lesson}</div>
                    <button onClick={() => handleExplain(word)} className="w-12 h-12 border-2 border-black flex items-center justify-center text-xl hover:bg-black hover:text-white transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">✨</button>
                  </div>
                </div>
              ))}
              {filteredList.length === 0 && (
                <div className="py-20 text-center text-slate-400 font-black uppercase tracking-widest border-4 border-dashed border-black/5">Vắng lặng - Không tìm thấy</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'add' && (
          <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-500 max-w-xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-black uppercase tracking-[0.2em]">Thu nạp kiến thức</h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Thêm từ vựng mới vào kho tàng của bạn</p>
            </div>
            <form onSubmit={handleAddWord} className="bg-white border-4 border-black p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] space-y-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-black uppercase tracking-widest">HÁN TỰ / MẶT CHỮ</label>
                <div className="flex gap-4">
                  <input type="text" value={newKanji} onChange={(e) => setNewKanji(e.target.value)} placeholder="傘" className="flex-1 p-4 border-2 border-black text-2xl font-black focus:outline-none bg-slate-50" />
                  <button type="button" onClick={handleAiSuggest} disabled={!newKanji || isSuggesting} className="px-6 border-2 border-black bg-black text-white font-black hover:bg-slate-800 disabled:opacity-50 transition-all shadow-[4px_4px_0px_0px_#B11116]">
                    {isSuggesting ? '...' : '✨ AI'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-black uppercase tracking-widest">CÁCH ĐỌC (HIRAGANA)</label>
                <input type="text" value={newReading} onChange={(e) => setNewReading(e.target.value)} placeholder="かさ" className="w-full p-4 border-2 border-black focus:outline-none font-bold bg-slate-50" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-black uppercase tracking-widest">SỐ BÀI</label>
                  <input type="number" value={newLesson} onChange={(e) => setNewLesson(parseInt(e.target.value))} className="w-full p-4 border-2 border-black focus:outline-none font-black bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-black uppercase tracking-widest">PHÂN LOẠI</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as any)} className="w-full p-4 border-2 border-black focus:outline-none bg-white font-black">
                    <option value="verb">ĐỘNG TỪ</option>
                    <option value="kanji">HÁN TỰ</option>
                    <option value="general">CƠ BẢN</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-black uppercase tracking-widest">NGHĨA TIẾNG VIỆT</label>
                <input type="text" value={newMeaning} onChange={(e) => setNewMeaning(e.target.value)} placeholder="CÁI Ô" className="w-full p-4 border-2 border-black focus:outline-none font-black text-[#B11116] uppercase bg-slate-50" />
              </div>
              {formFeedback && <div className={`p-4 border-2 border-black font-black text-xs uppercase tracking-widest text-center ${formFeedback.includes('thành công') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-[#B11116]'}`}>{formFeedback}</div>}
              <Button type="submit" className="w-full py-6 text-xl">📥 LƯU VÀO TỪ ĐIỂN</Button>
              <div className="pt-6 border-t border-black/10">
                 <button type="button" className="w-full py-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-black transition-colors" onClick={handleClearAll}>Khôi phục dữ liệu sách</button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* AI Modal */}
      {(explaining || aiExplanation) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#F9F6F0] border-4 border-black w-full max-w-2xl overflow-hidden flex flex-col shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="p-6 border-b-4 border-black flex items-center justify-between bg-black">
              <h3 className="text-lg font-black text-white uppercase tracking-[0.3em]">
                PHÂN TÍCH AI 殿
              </h3>
              <button onClick={closeModal} className="text-white hover:text-[#B11116] transition-colors font-black text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-8">
              {aiImage && <div className="border-2 border-black p-2 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]"><img src={aiImage} alt="Visual" className="w-full aspect-video object-cover" /></div>}
              <div className="whitespace-pre-wrap leading-loose text-black text-lg font-medium serif-text">
                {explaining ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-6">
                    <div className="w-16 h-16 border-8 border-slate-200 border-t-[#B11116] animate-spin"></div>
                    <p className="text-black font-black uppercase tracking-widest text-xs animate-pulse">Đang thu thập tri thức...</p>
                  </div>
                ) : aiExplanation}
              </div>
            </div>
            {!explaining && <div className="p-8 border-t-2 border-black flex justify-end bg-white"><Button onClick={closeModal} className="px-12 font-black uppercase tracking-widest">HÀNH ĐẠO!</Button></div>}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t-4 border-black p-4 z-40">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-4">
          {[
            { id: 'flashcard', label: 'HỌC', icon: '🎴' }, 
            { id: 'quiz', label: 'TEST', icon: '⚔️' }, 
            { id: 'list', label: 'TRA', icon: '📜' }, 
            { id: 'add', label: 'THÊM', icon: '🖋️' }
          ].map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as TabType)} 
              className={`flex flex-col items-center gap-2 py-3 transition-all ${activeTab === tab.id ? 'bg-[#B11116] text-white font-black shadow-[4px_0px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-500 hover:text-white'}`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[10px] uppercase font-black tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default App;
