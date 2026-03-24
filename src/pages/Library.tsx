import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Check, Search, Package, HardDrive, Star } from 'lucide-react';
import { contentPacks } from '../data/library';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { recentlySaved } from '../data/learner';

const categories = ['All', 'Installed', 'Available'] as const;
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

export default function LibraryPage() {
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [search, setSearch] = useState('');

    const filtered = contentPacks.filter(p => {
        if (activeCategory === 'Installed' && !p.installed) return false;
        if (activeCategory === 'Available' && p.installed) return false;
        if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const installedCount = contentPacks.filter(p => p.installed).length;
    const totalSize = contentPacks.filter(p => p.installed).reduce((sum, p) => sum + parseInt(p.size), 0);

    return (
        <div style={{ maxWidth: 1000 }}>
            <motion.div {...fadeUp}>
                <p style={{ color: 'var(--color-dim)', fontSize: 14, marginBottom: 24 }}>
                    Manage your content packs, imported files, and downloadable resources.
                </p>
            </motion.div>

            {/* Stats */}
            <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                    {[
                        { icon: Package, value: installedCount, label: 'Installed Packs', color: '#8B5CF6' },
                        { icon: HardDrive, value: `${totalSize} MB`, label: 'Total Size', color: '#22D3EE' },
                        { icon: Download, value: contentPacks.length - installedCount, label: 'Available', color: '#34D399' },
                    ].map(stat => (
                        <SpotlightCard key={stat.label} style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <stat.icon size={20} style={{ color: stat.color }} />
                            <div>
                                <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>{stat.value}</p>
                                <p style={{ fontSize: 12, color: 'var(--color-dim)', fontWeight: 500 }}>{stat.label}</p>
                            </div>
                        </SpotlightCard>
                    ))}
                </div>
            </motion.div>

            {/* Filter & Search */}
            <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{
                        display: 'flex', gap: 4, padding: 4, borderRadius: 10,
                        background: 'var(--color-graphite)', border: '1px solid var(--color-slate)',
                    }}>
                        {categories.map(c => (
                            <motion.button
                                key={c}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setActiveCategory(c)}
                                style={{
                                    padding: '6px 14px', borderRadius: 7, border: 'none',
                                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                                    background: activeCategory === c ? '#8B5CF6' : 'transparent',
                                    color: activeCategory === c ? '#fff' : 'var(--color-dim)',
                                    transition: 'background 0.2s, color 0.2s',
                                }}
                            >{c}</motion.button>
                        ))}
                    </div>
                    <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                        padding: '0 12px', borderRadius: 10,
                        background: 'var(--color-graphite)', border: '1px solid var(--color-slate)',
                    }}>
                        <Search size={14} style={{ color: 'var(--color-dim)' }} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search packs..."
                            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-mist)', fontSize: 13, flex: 1 }}
                        />
                    </div>
                </div>
            </motion.div>

            {/* Packs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {filtered.map((pack, i) => (
                    <motion.div key={pack.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.04 }}>
                        <SpotlightCard style={{ padding: 18 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700 }}>{pack.title}</h3>
                                {pack.installed ? (
                                    <span style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        fontSize: 11, color: '#34D399', fontWeight: 600,
                                    }}>
                                        <Check size={12} /> Installed
                                    </span>
                                ) : (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                            background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6',
                                            border: 'none', cursor: 'pointer',
                                        }}
                                    >
                                        <Download size={11} /> Install
                                    </motion.button>
                                )}
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--color-dim)', lineHeight: 1.5, marginBottom: 10 }}>{pack.description}</p>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <span className="pill" style={{ background: 'var(--color-slate)', color: 'var(--color-dim)' }}>{pack.category}</span>
                                <span className="pill" style={{ background: 'var(--color-slate)', color: 'var(--color-dim)' }}>{pack.itemCount} items</span>
                                <span className="pill" style={{ background: 'var(--color-slate)', color: 'var(--color-dim)' }}>{pack.size}</span>
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--color-dim-dark)', marginTop: 8, fontWeight: 500 }}>by {pack.author}</p>
                        </SpotlightCard>
                    </motion.div>
                ))}
            </div>

        </div>
    );
}
