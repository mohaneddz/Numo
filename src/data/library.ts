import type { SpeakingSession, WritingPrompt, WritingDraft, ContentPack } from './types';

export const speakingSessions: SpeakingSession[] = [
    { id: 'sp-1', title: 'Repeat After Me: Restaurant Phrases', type: 'pronunciation', description: 'Practice key restaurant phrases with native audio models', duration: '5 min', difficulty: 'Beginner', fluencyScore: 72, confidenceScore: 68 },
    { id: 'sp-2', title: 'Shadowing: News Broadcast', type: 'shadowing', description: 'Shadow a Spanish news anchor to improve rhythm and intonation', duration: '8 min', difficulty: 'Intermediate', fluencyScore: 65, confidenceScore: 60 },
    { id: 'sp-3', title: 'Job Interview Roleplay', type: 'roleplay', description: 'Practice answering common job interview questions in Spanish', duration: '12 min', difficulty: 'Advanced', fluencyScore: 55, confidenceScore: 50 },
    { id: 'sp-4', title: 'Oral Exam: A2 Mock', type: 'oral-exam', description: 'Simulated DELE A2 oral exam with timed responses', duration: '15 min', difficulty: 'Intermediate' },
    { id: 'sp-5', title: 'Free Talk: My Weekend', type: 'free-talk', description: 'Speak freely about your weekend plans for 3 minutes', duration: '3 min', difficulty: 'Intermediate' },
    { id: 'sp-6', title: 'Minimal Pairs: B/V', type: 'pronunciation', description: 'Distinguish and produce the B and V sounds in Spanish', duration: '4 min', difficulty: 'Beginner', fluencyScore: 80, confidenceScore: 75 },
    { id: 'sp-7', title: 'Roleplay: At the Doctor', type: 'roleplay', description: 'Describe symptoms and understand medical instructions', duration: '10 min', difficulty: 'Intermediate' },
    { id: 'sp-8', title: 'Shadowing: Podcast Clip', type: 'shadowing', description: 'Shadow a conversational podcast about travel in Colombia', duration: '6 min', difficulty: 'Intermediate', fluencyScore: 70, confidenceScore: 65 },
];

export const writingPrompts: WritingPrompt[] = [
    { id: 'wp-1', title: 'Email: Cancel a Reservation', description: 'Write a polite email to cancel a hotel reservation and request a refund', type: 'email', difficulty: 'Intermediate', wordTarget: 80 },
    { id: 'wp-2', title: 'Journal: My Best Day', description: 'Describe your best day this month using past tenses', type: 'journal', difficulty: 'Intermediate', wordTarget: 120 },
    { id: 'wp-3', title: 'Message: Making Plans', description: 'Text a friend to make plans for this weekend', type: 'message', difficulty: 'Beginner', wordTarget: 40 },
    { id: 'wp-4', title: 'Formal Letter: Job Application', description: 'Write a formal cover letter for a marketing position', type: 'formal', difficulty: 'Advanced', wordTarget: 150 },
    { id: 'wp-5', title: 'Creative: Continue the Story', description: 'Read the opening paragraph and continue the short story', type: 'creative', difficulty: 'Intermediate', wordTarget: 100 },
    { id: 'wp-6', title: 'Essay: Technology in Education', description: 'Write a short opinion essay about technology in schools', type: 'essay', difficulty: 'Advanced', wordTarget: 200 },
];

export const writingDrafts: WritingDraft[] = [
    { id: 'wd-1', promptId: 'wp-2', title: 'Mi mejor día este mes', content: 'El sábado pasado fue mi mejor día. Me desperté temprano y fui al mercado con mi amigo Carlos...', corrections: 3, createdAt: '2026-03-21', updatedAt: '2026-03-21', wordCount: 95 },
    { id: 'wd-2', promptId: 'wp-3', title: 'Planes del fin de semana', content: '¡Hola María! ¿Quieres ir al cine este sábado? Hay una película nueva que se ve increíble...', corrections: 1, createdAt: '2026-03-19', updatedAt: '2026-03-20', wordCount: 38 },
    { id: 'wd-3', title: 'Reflexión semanal', content: 'Esta semana aprendí mucho sobre los verbos reflexivos. Al principio me confundía...', corrections: 5, createdAt: '2026-03-17', updatedAt: '2026-03-18', wordCount: 72 },
];

export const contentPacks: ContentPack[] = [
    { id: 'cp-1', title: 'Spanish Core 1000', description: 'The 1000 most frequent Spanish words with examples and audio', category: 'Vocabulary', itemCount: 1000, installed: true, size: '12 MB', author: 'Numo Team' },
    { id: 'cp-2', title: 'Travel Spanish', description: 'Essential phrases and dialogues for traveling in Spanish-speaking countries', category: 'Conversation', itemCount: 250, installed: true, size: '8 MB', author: 'Numo Team' },
    { id: 'cp-3', title: 'DELE A2 Prep', description: 'Complete preparation pack for the DELE A2 exam', category: 'Exam', itemCount: 500, installed: true, size: '22 MB', author: 'Numo Team' },
    { id: 'cp-4', title: 'Spanish Short Stories', description: '20 graded short stories from beginner to intermediate level', category: 'Reading', itemCount: 20, installed: false, size: '15 MB', author: 'Numo Team' },
    { id: 'cp-5', title: 'Business Spanish', description: 'Professional vocabulary, emails, and workplace scenarios', category: 'Professional', itemCount: 350, installed: false, size: '11 MB', author: 'Numo Team' },
    { id: 'cp-6', title: 'Latin American Podcast Pack', description: 'Curated podcast episodes from across Latin America with transcripts', category: 'Listening', itemCount: 30, installed: false, size: '45 MB', author: 'Community' },
    { id: 'cp-7', title: 'Grammar Essentials', description: 'Core Spanish grammar concepts with exercises and explanations', category: 'Grammar', itemCount: 150, installed: true, size: '6 MB', author: 'Numo Team' },
    { id: 'cp-8', title: 'Pronunciation Drills', description: 'Focused drills for the trickiest Spanish sounds for English speakers', category: 'Speaking', itemCount: 80, installed: false, size: '18 MB', author: 'Numo Team' },
];
