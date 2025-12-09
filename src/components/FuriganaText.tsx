'use client'

import { useEffect, useState } from 'react';
import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

interface FuriganaTextProps {
  text: string;
  showFurigana: boolean;
  className?: string;
}

// グローバルなkuroshiroインスタンス（全コンポーネントで共有）
let globalKuroshiro: Kuroshiro | null = null;
let initPromise: Promise<void> | null = null;

// kuroshiroを初期化（一度だけ実行）
const initKuroshiro = async () => {
  if (globalKuroshiro) return;

  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    try {
      console.log('🔤 Kuroshiro初期化開始...');
      const kuroshiro = new Kuroshiro();
      await kuroshiro.init(new KuromojiAnalyzer({ dictPath: '/dict' }));
      globalKuroshiro = kuroshiro;
      console.log('✅ Kuroshiro初期化完了');
    } catch (error) {
      console.error('❌ Kuroshiro初期化エラー:', error);
      initPromise = null;
    }
  })();

  await initPromise;
};

export default function FuriganaText({ text, showFurigana, className = '' }: FuriganaTextProps) {
  const [convertedText, setConvertedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initKuroshiro();
  }, []);

  useEffect(() => {
    const convertText = async () => {
      // kuroshiroが初期化されるまで待つ
      await initKuroshiro();

      if (!globalKuroshiro || !text) {
        setConvertedText(text);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        if (showFurigana) {
          // ふりがな表示: HTML rubyタグで出力
          const result = await globalKuroshiro.convert(text, {
            to: 'hiragana',
            mode: 'furigana',
            romajiSystem: 'passport'
          });
          setConvertedText(result);
        } else {
          // ふりがな非表示: 元のテキスト
          setConvertedText(text);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('テキスト変換エラー:', error);
        setConvertedText(text);
        setIsLoading(false);
      }
    };

    convertText();
  }, [text, showFurigana]);

  if (isLoading && !convertedText) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: convertedText }}
      style={{
        // rubyタグのスタイリング
        lineHeight: showFurigana ? '2' : 'inherit'
      }}
    />
  );
}
