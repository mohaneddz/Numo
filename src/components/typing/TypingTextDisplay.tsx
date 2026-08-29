import { useEffect, useRef } from 'react';
import type { TypedWord } from '../../services/typing/typingService';

interface TypingTextDisplayProps {
  words: string[];
  typedWords: TypedWord[];
  activeIndex: number;
  activeInput: string;
  direction: 'ltr' | 'rtl';
  /** Rendered larger for logographic scripts, which are unreadable at body size. */
  largeGlyphs: boolean;
  focused: boolean;
  /** Text still being composed in an IME, not yet committed. */
  composing: string;
}

/**
 * The test text, coloured per character as the learner types.
 *
 * Characters typed past the end of a word are shown as "extra" rather than
 * silently dropped, and characters skipped by an early space stay visible as
 * missed — both are real errors and hiding them makes the accuracy figure look
 * unexplainable.
 */
export function TypingTextDisplay({
  words,
  typedWords,
  activeIndex,
  activeInput,
  direction,
  largeGlyphs,
  focused,
  composing,
}: TypingTextDisplayProps) {
  const activeWordRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    activeWordRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <div
      dir={direction}
      className={`relative select-none font-mono leading-relaxed tracking-wide transition-[filter,opacity] duration-200 ${
        largeGlyphs ? 'text-3xl' : 'text-2xl'
      } ${focused ? '' : 'blur-[3px] opacity-60'}`}
      style={{ maxHeight: largeGlyphs ? '11rem' : '9.5rem', overflow: 'hidden' }}
    >
      <div className="flex flex-wrap gap-x-[0.6em] gap-y-2">
        {words.map((word, wordIndex) => {
          const isActive = wordIndex === activeIndex;
          const record = typedWords[wordIndex];
          const typed = isActive ? activeInput : record?.typed ?? '';
          const settled = record?.settled ?? false;

          const characters = word.split('');
          const extras = typed.slice(word.length).split('');
          const hasError = settled && typed !== word;

          return (
            <span
              key={`${word}-${wordIndex}`}
              ref={isActive ? activeWordRef : undefined}
              className={`whitespace-nowrap ${
                hasError ? 'underline decoration-coral/70 decoration-2 underline-offset-8' : ''
              }`}
            >
              {characters.map((character, characterIndex) => {
                const typedCharacter = typed[characterIndex];
                const isCaret = isActive && characterIndex === typed.length;

                let tone = 'text-dim/45';
                if (typedCharacter !== undefined) {
                  tone = typedCharacter === character ? 'text-mist' : 'text-coral';
                } else if (settled) {
                  tone = 'text-dim/30';
                }

                return (
                  <span key={characterIndex} className="relative">
                    {isCaret && <Caret />}
                    <span className={tone}>{character}</span>
                  </span>
                );
              })}

              {extras.map((character, extraIndex) => (
                <span key={`extra-${extraIndex}`} className="text-coral/60">
                  {character}
                </span>
              ))}

              {isActive && typed.length >= word.length && (
                <span className="relative">
                  <Caret />
                </span>
              )}

              {isActive && composing && (
                <span className="text-cyan underline decoration-cyan/60 underline-offset-4">
                  {composing}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Caret() {
  return (
    <span
      aria-hidden
      className="absolute -left-[0.06em] top-[0.1em] h-[1.1em] w-[2px] animate-pulse rounded-full bg-violet"
    />
  );
}
