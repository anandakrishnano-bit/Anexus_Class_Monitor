import { describe, it, expect } from 'vitest';
import { normalizeGeminiModel, GEMINI_MODELS } from '../utils/googleGeminiAi';
import { processAiQuery, ACADEMIC_KNOWLEDGE_BASE, AiDataContext } from '../utils/aiAssistantEngine';
import { testFirebaseConnection } from '../utils/firebaseSync';

describe('Google Gemini AI Model Management', () => {
  it('should normalize deprecated 2.0-flash model to 3.6-flash', () => {
    expect(normalizeGeminiModel('gemini-2.0-flash')).toBe('gemini-3.6-flash');
    expect(normalizeGeminiModel('gemini-2.0-flash-exp')).toBe('gemini-3.6-flash');
    expect(normalizeGeminiModel('gemini-2.0-flash-preview')).toBe('gemini-3.6-flash');
  });

  it('should normalize deprecated 2.0-pro model to 3.8-flash', () => {
    expect(normalizeGeminiModel('gemini-2.0-pro')).toBe('gemini-3.8-flash');
  });

  it('should default empty model to gemini-3.6-flash', () => {
    expect(normalizeGeminiModel('')).toBe('gemini-3.6-flash');
    expect(normalizeGeminiModel(undefined)).toBe('gemini-3.6-flash');
  });

  it('should include modern 3.6-flash and 3.8-flash in GEMINI_MODELS', () => {
    const ids = GEMINI_MODELS.map(m => m.id);
    expect(ids).toContain('gemini-3.6-flash');
    expect(ids).toContain('gemini-3.8-flash');
  });
});

describe('Academic Knowledge Base & On-Device AI Engine', () => {
  it('should include cantilever mechanics with deflection and moment formulas', () => {
    const cantilever = ACADEMIC_KNOWLEDGE_BASE['cantilever'];
    expect(cantilever).toBeDefined();
    expect(cantilever.title).toContain('Cantilever');
    expect(cantilever.formulas.some(f => f.includes('Deflection'))).toBe(true);
    expect(cantilever.formulas.some(f => f.includes('Bending Moment'))).toBe(true);
  });

  it('should answer "what is cantilever" with textbook explanation', async () => {
    const dummyCtx: AiDataContext = {
      students: [],
      subjects: [],
      faculty: [],
      periodConfigs: [],
      schedules: [],
      sessions: [],
      tasks: [],
      currentTime: new Date()
    };

    const reply = await processAiQuery('what is cantilever', dummyCtx);
    expect(reply).toContain('Cantilever Beam Mechanics');
    expect(reply).toContain('Key Engineering Formulas');
  });

  it('should intelligently answer "what is that ?" using conversation history', async () => {
    const dummyCtx: AiDataContext = {
      students: [],
      subjects: [{ code: 'MEC207', name: 'Mechanics of Solids' }],
      faculty: [],
      periodConfigs: [],
      schedules: [],
      sessions: [],
      tasks: [
        {
          id: 1,
          title: 'Candiliever and simple force',
          subjectCode: 'MEC207',
          dueDate: '2026-09-07T09:30:00',
          type: 'test',
          priority: 'high',
          isCompleted: false,
          notes: 'Prepare unit 2 cantilever deflection formulas'
        }
      ],
      currentTime: new Date()
    };

    const history = [
      {
        sender: 'assistant' as const,
        text: '**Pending Tasks & Exams (1 total):**\n\n1. **[TEST]** Candiliever and simple force (MEC207)\n • Due: 2026-09-07 at 09:30'
      }
    ];

    const reply = await processAiQuery('What is that ?', dummyCtx, history);
    expect(reply).toContain('Candiliever and simple force');
    expect(reply).toContain('MEC207');
    expect(reply).toContain('Cantilever Beam');
  });
});

describe('Single Central Firebase Database Architecture', () => {
  it('should reject missing project ID or API key gracefully', async () => {
    const res = await testFirebaseConnection({
      apiKey: '',
      projectId: ''
    });
    expect(res.success).toBe(false);
    expect(res.message).toContain('required');
  });

  it('should format class sync codes cleanly', async () => {
    const { formatClassSyncCode } = await import('../utils/firebaseSync');
    expect(formatClassSyncCode('Class 5101', 'Section A')).toBe('CLASS-5101-SECTION-A');
    expect(formatClassSyncCode('CSE 4B', 'B')).toBe('CSE-4B-B');
    expect(formatClassSyncCode('', '')).toBe('CLASS-A');
  });

  it('should return central Firebase config when no custom override is set', async () => {
    const { getActiveFirebaseConfig } = await import('../utils/firebaseSync');
    const { CENTRAL_FIREBASE_CONFIG } = await import('../config/firebaseConfig');
    const active = getActiveFirebaseConfig({});
    expect(active.projectId).toBe(CENTRAL_FIREBASE_CONFIG.projectId);
    expect(active.apiKey).toBe(CENTRAL_FIREBASE_CONFIG.apiKey);
  });

  it('should allow custom override config if specified', async () => {
    const { getActiveFirebaseConfig } = await import('../utils/firebaseSync');
    const active = getActiveFirebaseConfig({
      firebaseProjectId: 'custom-proj-99',
      firebaseApiKey: 'custom-key-123'
    });
    expect(active.projectId).toBe('custom-proj-99');
    expect(active.apiKey).toBe('custom-key-123');
  });

  it('should verify admin access code without plaintext storage in codebase', async () => {
    const { verifyAdminAccessCode } = await import('../config/firebaseConfig');
    expect(await verifyAdminAccessCode('Ananda@2008')).toBe(true);
    expect(await verifyAdminAccessCode('ananda@2008')).toBe(true);
    expect(await verifyAdminAccessCode('ANANDA@2008')).toBe(true);
    expect(await verifyAdminAccessCode('wrong-password')).toBe(false);
    expect(await verifyAdminAccessCode('')).toBe(false);
  });
});

