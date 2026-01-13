
import React, { useState, useEffect } from 'react';
import { Vocabulary } from '../types';
import { Button } from './Button';

interface FlashcardProps {
  vocab: Vocabulary;
  onExplain: (vocab: Vocabulary) => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({ vocab, onExplain }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Reset trạng thái khi đổi từ vựng
  useEffect(() => {
    setIsFlipped(false);
    // Hủy mọi âm thanh đang phát khi chuyển thẻ
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, [vocab]);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!('speechSynthesis' in window)) {
      alert("Trình duyệt của bạn không hỗ trợ phát âm.");
      return;
    }

    // Hủy các yêu cầu phát âm trước đó
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(vocab.kanji);
    utterance.lang = 'ja-JP'; // Đặt ngôn ngữ là tiếng Nhật
    utterance.rate = 0.9;      // Tốc độ đọc vừa phải để dễ nghe

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
      <div 
        className="relative w-full aspect-[4/3] perspective-1000 cursor-pointer group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`relative w-full h-full transition-transform duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          {/* Front */}
          <div className="absolute inset-0 backface-hidden bg-white flex flex-col items-center justify-center p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute inset-2 border border-black/10 pointer-events-none"></div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-[0.3em] mb-4">HÁN TỰ</span>
            <h2 className="text-8xl font-black text-black tracking-tighter">{vocab.kanji}</h2>
            <div className="mt-12 text-slate-400 group-hover:text-[#B11116] transition-colors flex items-center gap-2 font-bold text-xs tracking-widest text-center">
              <span>NHẤN ĐỂ LẬT THẺ</span>
            </div>
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden bg-[#1A1A1A] rotate-y-180 flex flex-col items-center justify-center p-8 text-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute inset-2 border border-white/10 pointer-events-none"></div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-[0.3em] mb-2">Ý NGHĨA</span>
            <h3 className="text-4xl font-bold mb-2 text-[#F9F6F0]">{vocab.reading}</h3>
            <p className="text-3xl text-[#B11116] font-black text-center">{vocab.meaning}</p>
            
            <div className="mt-8 flex items-center gap-3">
              <button 
                onClick={handleSpeak}
                className={`px-8 py-3 border-2 border-white text-white transition-all font-black text-sm uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-0.5 active:translate-y-0.5 ${isPlaying ? 'bg-[#B11116] border-[#B11116]' : 'hover:bg-white hover:text-black'}`}
              >
                {isPlaying ? ' đang đọc...' : '🔊 PHÁT ÂM'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Button onClick={() => onExplain(vocab)} variant="secondary" className="w-full">
        GIẢI THÍCH CHI TIẾT (AI)
      </Button>
    </div>
  );
};
