'use client'

import { useEffect, useState, useRef } from 'react';
import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

interface FuriganaTextProps {
  text: string;
  showFurigana: boolean;
  className?: string;
}

export default function FuriganaText({ text, showFurigana, className = '' }: FuriganaTextProps) {
  const [convertedText, setConvertedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const kuroshiroRef = useRef<Kuroshiro | null>(null);

  useEffect(() => {
    const initKuroshiro = async () => {
      if (!kuroshiroRef.current) {
        try {
          const kuroshiro = new Kuroshiro();
          // 辞書ファイルのパスをpublicフォルダに指定
          await kuroshiro.init(new KuromojiAnalyzer({ dictPath: '/dict' }));
          kuroshiroRef.current = kuroshiro;
        } catch (error) {
          console.error('Kuroshiro初期化エラー:', error);
        }
      }
    };

    initKuroshiro();
  }, []);

  useEffect(() => {
    const convertText = async () => {
      if (!kuroshiroRef.current || !text) {
        setConvertedText(text);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        if (showFurigana) {
          // ふりがな表示: HTML rubyタグで出力
          const result = await kuroshiroRef.current.convert(text, {
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
