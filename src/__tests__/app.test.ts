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

  it('should reject built-in/default administrator passkeys', async () => {
    const { verifyAdminAccessCode } = await import('../config/firebaseConfig');
    expect(await verifyAdminAccessCode('admin123')).toBe(false);
    expect(await verifyAdminAccessCode('wrong-password')).toBe(false);
    expect(await verifyAdminAccessCode('')).toBe(false);
  });

  it('should validate Firebase config keys and reject invalid/placeholders', async () => {
    const { isFirebaseConfigValid } = await import('../utils/firebaseSync');
    expect(isFirebaseConfigValid({ apiKey: '', projectId: '' })).toBe(false);
    expect(isFirebaseConfigValid({ apiKey: 'YOUR_CENTRAL_API_KEY', projectId: 'valid-proj' })).toBe(false);
    expect(isFirebaseConfigValid({ apiKey: 'AIzaSyDemoValidKey123', projectId: 'my-class-proj' })).toBe(true);
  });

  it('should parse client offline errors with helpful actionable instructions', async () => {
    const { parseFirebaseError } = await import('../utils/firebaseSync');
    const offlineMsg = parseFirebaseError(new Error('Failed to get document because the client is offline.'), 'Restore');
    expect(offlineMsg).toContain('offline');
    expect(offlineMsg).toContain('internet');
  });
});

describe('Application Error Handling Logics', () => {
  it('should record runtime errors and maintain logs without crashing', async () => {
    const { logAppError, getAppErrorLogs, clearAppErrorLogs } = await import('../utils/errorHandler');
    clearAppErrorLogs();
    expect(getAppErrorLogs().length).toBe(0);

    const testErr = new Error('Test caught error');
    logAppError(testErr, 'AppTestContext');

    const logs = getAppErrorLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].message).toBe('Test caught error');
    expect(logs[0].source).toBe('AppTestContext');
    expect(logs[0].timestamp).toBeDefined();

    clearAppErrorLogs();
    expect(getAppErrorLogs().length).toBe(0);
  });
});

describe('Theme Palette Dual-Mode Architecture', () => {
  it('should resolve theme palettes with both light and dark tokens', async () => {
    const { resolveThemePalette, THEME_PALETTES } = await import('../context/ThemeContext');
    expect(THEME_PALETTES.length).toBeGreaterThanOrEqual(6);

    const pinkPalette = resolveThemePalette('pink');
    expect(pinkPalette.name).toBe('Blush Rose');
    // White mode: primary replaces black with deep rich tone
    expect(pinkPalette.light.primary).toBe('#882942');
    expect(pinkPalette.light.bg).toBe('#FFF5F7');
    // Dark mode: primary replaces white with luminous tone
    expect(pinkPalette.dark.primary).toBe('#F9CAD2');
    expect(pinkPalette.dark.primaryText).toBe('#881337');
  });

  it('should ensure all dark palettes have rich themed dark background tokens', async () => {
    const { THEME_PALETTES } = await import('../context/ThemeContext');
    THEME_PALETTES.forEach(palette => {
      expect(palette.dark.bg).toBeDefined();
      expect(palette.dark.bg.startsWith('#')).toBe(true);
    });
  });

  it('should compute complementary color for Material UI theme accurately', async () => {
    const { getComplementaryColor, buildDynamicMaterialYouPalette } = await import('../utils/materialYouTheme');
    // Complementary of Indigo (#6366f1) is warm amber/gold
    const comp = getComplementaryColor('#6366f1');
    expect(comp).toBeDefined();
    expect(comp.startsWith('#')).toBe(true);

    const dynPalette = buildDynamicMaterialYouPalette({
      primary: '#6366F1',
      tertiary: '#7C3AED',
      tertiaryLight: '#A78BFA'
    });
    expect(dynPalette.id).toBe('material_you');
    expect(dynPalette.dark.bg).toBeDefined();
    expect(dynPalette.light.surface).toBe('#FFFFFF');
    expect(dynPalette.light.accent).toBeDefined();
  });
});

