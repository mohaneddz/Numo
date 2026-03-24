import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, AlertTriangle, Lightbulb, Send, Loader2 } from 'lucide-react';
import { completeWithEcho } from '../../services/aiProvider';

interface Correction {
    original: string;
    corrected: string;
    type: 'grammar' | 'spelling' | 'correct' | 'style';
    explanation: string;
}

export default function WriteEditor() {
    const [text, setText] = useState(
        'Ayer fui al mercado con mi amigo Carlos. Yo soy cansado después del trabajo pero quería comprar frutas frescas. Me gusto la comida que preparamos juntos. Es un problema muy grande cuando no tenemos tiempo para cocinar.'
    );
    const [showCorrections, setShowCorrections] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [corrections, setCorrections] = useState<Correction[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleReview = async () => {
        setIsAnalyzing(true);
        setError(null);
        try {
            const prompt = `
                Analyze the following Spanish text for grammar, spelling, and style errors.
                Provide a list of corrections. For each correction, include:
                - original: the problematic part
                - corrected: the fixed part (if same as original, type is "correct")
                - type: "grammar", "spelling", "correct", or "style"
                - explanation: a short helpful tip in English.
                
                Text: "${text}"
                
                Format your response as a JSON array of objects: 
                [{"original": "...", "corrected": "...", "type": "...", "explanation": "..."}]
            `;

            const response = await completeWithEcho([
                { id: '1', role: 'user', content: prompt, createdAt: Date.now() }
            ], 'analyst');

            const jsonPart = response.match(/\[.*\]/s)?.[0] || response;
            const data = JSON.parse(jsonPart);
            setCorrections(data);
            setShowCorrections(true);
        } catch (err: any) {
            setError(err.message || "Failed to analyze text");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    return (
        <div style={{ maxWidth: 1100 }}>
            <Link to="/write" style={{ color: 'var(--color-dim)', textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
                <ArrowLeft size={14} /> Back to Write
            </Link>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ display: 'flex', gap: 20 }}>
                    {/* Editor */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="card" style={{ padding: 20, marginBottom: 12 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 14 }}>Writing Editor</h2>
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                style={{
                                    width: '100%', minHeight: 300, padding: 16,
                                    background: 'var(--color-slate)', borderRadius: 10,
                                    border: '1px solid var(--color-slate-light)',
                                    color: 'var(--color-mist)', fontSize: 14, lineHeight: 1.7,
                                    resize: 'vertical', outline: 'none', fontFamily: 'var(--font-sans)',
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                                    <span style={{ fontSize: 12, color: 'var(--color-dim)' }}>{wordCount} words</span>
                                    {error && <span style={{ fontSize: 12, color: '#F87171', marginLeft: 12 }}>{error}</span>}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={() => setShowCorrections(!showCorrections)}
                                        style={{
                                            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                                            background: showCorrections ? 'rgba(139, 92, 246, 0.15)' : 'var(--color-slate)',
                                            color: showCorrections ? '#8B5CF6' : 'var(--color-dim)',
                                            border: 'none', cursor: 'pointer',
                                        }}
                                    >
                                        {showCorrections ? 'Hide' : 'Show'} Corrections
                                    </button>
                                    <button 
                                        onClick={handleReview}
                                        disabled={isAnalyzing}
                                        style={{
                                            padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                            background: '#8B5CF6', color: '#fff',
                                            border: 'none', cursor: isAnalyzing ? 'wait' : 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            opacity: isAnalyzing ? 0.7 : 1
                                        }}
                                    >
                                        {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                        Analyze & Review
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Corrections Panel */}
                    {showCorrections && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            style={{ width: 320, flexShrink: 0 }}
                        >
                            <div className="card" style={{ padding: 16 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Corrections</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {corrections.map((c, i) => (
                                        <div key={i} style={{
                                            padding: 12, borderRadius: 8,
                                            background: c.type === 'correct' ? 'rgba(52, 211, 153, 0.06)' : 'rgba(248, 113, 113, 0.06)',
                                            border: `1px solid ${c.type === 'correct' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)'}`,
                                        }}>
                                            {c.type === 'correct' ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <Check size={14} style={{ color: '#34D399' }} />
                                                    <span style={{ fontSize: 13, color: '#34D399', fontWeight: 500 }}>Correct</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                                        <AlertTriangle size={13} style={{ color: '#F87171' }} />
                                                        <span style={{ fontSize: 12, color: '#F87171', fontWeight: 500 }}>{c.type}</span>
                                                    </div>
                                                    <p style={{ fontSize: 13, color: 'var(--color-dim)', textDecoration: 'line-through', marginBottom: 4 }}>{c.original}</p>
                                                    <p style={{ fontSize: 13, color: '#34D399', fontWeight: 500, marginBottom: 6 }}>{c.corrected}</p>
                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                                        <Lightbulb size={12} style={{ color: '#F59E0B', marginTop: 2, flexShrink: 0 }} />
                                                        <p style={{ fontSize: 12, color: 'var(--color-dim)', lineHeight: 1.4 }}>{c.explanation}</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
