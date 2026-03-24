import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, CheckCircle, X, Eye, EyeOff } from 'lucide-react';
import { dueReviewItems } from '../../data/learner';

export default function ReviewSession() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [answered, setAnswered] = useState<Record<string, 'correct' | 'incorrect'>>({});

    const currentItem = dueReviewItems[currentIndex];
    const total = dueReviewItems.length;
    const correctCount = Object.values(answered).filter(v => v === 'correct').length;
    const progress = ((currentIndex) / total) * 100;

    const handleAnswer = (result: 'correct' | 'incorrect') => {
        setAnswered(prev => ({ ...prev, [currentItem.id]: result }));
        setShowAnswer(false);
        if (currentIndex < total - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const isSessionComplete = currentIndex === total - 1 && answered[currentItem.id];

    return (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <Link to="/review" style={{ color: 'var(--color-dim)', textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
                <ArrowLeft size={14} /> End Session
            </Link>

            {/* Progress */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--color-dim)' }}>Card {currentIndex + 1} of {total}</span>
                    <span style={{ fontSize: 13, color: '#34D399' }}>{correctCount} correct</span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: 'var(--color-slate)', overflow: 'hidden' }}>
                    <motion.div
                        animate={{ width: `${progress}%` }}
                        style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #8B5CF6, #22D3EE)' }}
                    />
                </div>
            </div>

            {isSessionComplete ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                        <CheckCircle size={48} style={{ color: '#34D399', marginBottom: 16 }} />
                        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Session Complete!</h2>
                        <p style={{ color: 'var(--color-dim)', fontSize: 15, marginBottom: 20 }}>
                            You reviewed {total} items with {correctCount} correct answers ({Math.round((correctCount / total) * 100)}% accuracy)
                        </p>
                        <Link to="/review" style={{ textDecoration: 'none' }}>
                            <button style={{
                                padding: '10px 24px', borderRadius: 10, background: '#8B5CF6',
                                color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                            }}>Back to Review</button>
                        </Link>
                    </div>
                </motion.div>
            ) : (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentItem.id}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className="card" style={{ padding: 40, textAlign: 'center', minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="pill" style={{ marginBottom: 16, background: 'var(--color-slate)', color: 'var(--color-dim)' }}>
                                {currentItem.type}
                            </span>
                            <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>{currentItem.term}</h2>

                            {showAnswer ? (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                    <p style={{ fontSize: 20, color: '#22D3EE', fontWeight: 500, marginBottom: 24 }}>{currentItem.translation}</p>
                                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                        <button
                                            onClick={() => handleAnswer('incorrect')}
                                            style={{
                                                padding: '10px 28px', borderRadius: 10,
                                                background: 'rgba(248, 113, 113, 0.15)', color: '#F87171',
                                                border: '1px solid rgba(248, 113, 113, 0.3)',
                                                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: 6,
                                            }}
                                        >
                                            <X size={15} /> Incorrect
                                        </button>
                                        <button
                                            onClick={() => handleAnswer('correct')}
                                            style={{
                                                padding: '10px 28px', borderRadius: 10,
                                                background: 'rgba(52, 211, 153, 0.15)', color: '#34D399',
                                                border: '1px solid rgba(52, 211, 153, 0.3)',
                                                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: 6,
                                            }}
                                        >
                                            <CheckCircle size={15} /> Correct
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <button
                                    onClick={() => setShowAnswer(true)}
                                    style={{
                                        padding: '10px 28px', borderRadius: 10,
                                        background: 'var(--color-slate)', color: 'var(--color-mist)',
                                        border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                    }}
                                >
                                    <Eye size={15} /> Show Answer
                                </button>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
}
