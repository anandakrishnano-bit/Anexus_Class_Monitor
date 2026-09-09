/**
 * Google Gemini API Client for Online AI Assistance
 * Connects to Google's official Gemini Generative Language API
 */

export const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Fast & Ultra Responsive)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (General Purpose)' },
  { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash Latest (Auto Updated)' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Deep Reasoning & Analysis)' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite (Cost Efficient)' },
];

let cachedModelsInfo: { apiKey: string; version: 'v1beta' | 'v1'; models: string[] } | null = null;

/**
 * Dynamically queries Google Generative Language API to find models available to this API key
 */
export async function listSupportedGeminiModels(
  apiKey: string
): Promise<{ version: 'v1beta' | 'v1'; models: string[] }> {
  const cleanKey = apiKey.trim();
  const versions: ('v1beta' | 'v1')[] = ['v1beta', 'v1'];

  for (const v of versions) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/${v}/models?key=${cleanKey}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.models)) {
          const supported = data.models
            .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
            .map((m: any) => String(m.name || '').replace(/^models\//, ''))
            .filter(Boolean);
          if (supported.length > 0) {
            cachedModelsInfo = { apiKey: cleanKey, version: v, models: supported };
            return { version: v, models: supported };
          }
        }
      }
    } catch {
      // Continue to next version
    }
  }

  return { version: 'v1beta', models: [] };
}

/**
 * Retrieves cached discovered models or queries Google Generative Language API
 */
export async function getOrDiscoverModels(apiKey: string): Promise<{ version: 'v1beta' | 'v1'; models: string[] }> {
  const cleanKey = apiKey.trim();
  if (cachedModelsInfo && cachedModelsInfo.apiKey === cleanKey && cachedModelsInfo.models.length > 0) {
    return { version: cachedModelsInfo.version, models: cachedModelsInfo.models };
  }
  return listSupportedGeminiModels(cleanKey);
}

/**
 * Normalizes model IDs to supported Google Gemini models
 */
export function normalizeGeminiModel(model?: string): string {
  if (!model) return 'gemini-2.0-flash';
  const clean = model.trim().replace(/^models\//, '');
  if (clean.includes('3.6') || clean.includes('3.8') || clean.includes('3.5')) {
    return 'gemini-2.0-flash';
  }
  return clean;
}

/**
 * Validates and tests connection to Google Gemini API with automatic model discovery
 */
export async function testGeminiApiKey(
  apiKey: string,
  model = 'gemini-2.0-flash'
): Promise<{ success: boolean; message: string; effectiveModel?: string; discoveredModels?: string[] }> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: 'API key is required.' };
  }

  const cleanKey = apiKey.trim();

  // 1. First dynamically discover all available models supported by this specific user's API key
  const { version: apiVersion, models: availableModels } = await getOrDiscoverModels(cleanKey);

  // Determine candidate models to test
  let candidateModels: string[] = [];
  if (availableModels.length > 0) {
    // If the requested model is in available models, test it first
    const requested = model.trim().replace(/^models\//, '');
    if (availableModels.includes(requested)) {
      candidateModels = [requested, ...availableModels.filter(m => m !== requested)];
    } else {
      // Prioritize flash models, then pro, then whatever is available
      const flash = availableModels.filter(m => m.toLowerCase().includes('flash'));
      const rest = availableModels.filter(m => !m.toLowerCase().includes('flash'));
      candidateModels = [...flash, ...rest];
    }
  } else {
    // Fallback if ListModels endpoint is restricted
    candidateModels = [
      model.trim().replace(/^models\//, ''),
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro'
    ].filter((v, i, a) => a.indexOf(v) === i);
  }

  const versionsToTry: ('v1beta' | 'v1')[] = apiVersion ? [apiVersion, apiVersion === 'v1beta' ? 'v1' : 'v1beta'] : ['v1beta', 'v1'];

  let lastError = '';

  for (const v of versionsToTry) {
    for (const targetModel of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/${v}/models/${targetModel}:generateContent?key=${cleanKey}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: 'Hello, reply with "OK".' }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 100,
              temperature: 0.2,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const parts = data?.candidates?.[0]?.content?.parts;
          let reply = '';
          if (Array.isArray(parts)) {
            reply = parts
              .map((p: any) => p.text || '')
              .filter(Boolean)
              .join(' ')
              .trim();
          }

          if (reply || data?.candidates?.[0]?.finishReason) {
            // Update cache so subsequent generateContent calls hit the verified model immediately
            cachedModelsInfo = {
              apiKey: cleanKey,
              version: v,
              models: [targetModel, ...candidateModels.filter(m => m !== targetModel)]
            };

            return {
              success: true,
              message: `Connected successfully via ${targetModel} (${v})! Response: "${reply || 'OK'}"`,
              effectiveModel: targetModel,
              discoveredModels: availableModels.length > 0 ? availableModels : undefined
            };
          }
        } else {
          const errJson = await res.json().catch(() => null);
          lastError = errJson?.error?.message || `HTTP ${res.status} ${res.statusText}`;
          if (res.status === 400 || res.status === 403) {
            // Key invalid or missing permission
            if (lastError.toLowerCase().includes('api_key_invalid') || lastError.toLowerCase().includes('api key not valid')) {
              return { success: false, message: `Invalid API Key: ${lastError}` };
            }
          }
        }
      } catch (err) {
        lastError = String(err);
      }
    }
  }

  return {
    success: false,
    message: lastError ? `Connection failed: ${lastError}` : 'Could not find a supported model for this API key.',
    discoveredModels: availableModels.length > 0 ? availableModels : undefined
  };
}

export interface ChatHistoryMessage {
  sender: 'user' | 'assistant';
  text: string;
}

/**
 * Queries Google Gemini with the complete real-time classroom context snapshot
 */
export async function generateGeminiResponse(
  userQuery: string,
  systemContext: string,
  apiKey: string,
  model = 'gemini-2.0-flash',
  history?: ChatHistoryMessage[]
): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Google Gemini API key is missing.');
  }

  const cleanKey = apiKey.trim();

  // 1. Discover or use cached models
  const { version: apiVersion, models: availableModels } = await getOrDiscoverModels(cleanKey);

  const cleanRequested = normalizeGeminiModel(model);
  let candidateModels: string[] = [];

  if (availableModels.length > 0) {
    if (availableModels.includes(cleanRequested)) {
      candidateModels = [cleanRequested, ...availableModels.filter(m => m !== cleanRequested)];
    } else {
      const flash = availableModels.filter(m => m.toLowerCase().includes('flash'));
      const rest = availableModels.filter(m => !m.toLowerCase().includes('flash'));
      candidateModels = [...flash, ...rest];
    }
  } else {
    candidateModels = [
      cleanRequested,
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ].filter((v, i, a) => a.indexOf(v) === i);
  }

  const versionsToTry: ('v1beta' | 'v1')[] = apiVersion ? [apiVersion, apiVersion === 'v1beta' ? 'v1' : 'v1beta'] : ['v1beta', 'v1'];

  // Build conversational prompt with context
  const recentHistory = (history || [])
    .slice(-4)
    .map(h => `${h.sender === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
    .join('\n');

  const fullPrompt = `You are the intelligent Academic Assistant for the Anexus Class Manager app.
You have real-time access to the user's classroom database (student roster, attendance records, period timetable, faculty, assignments, and exam deadlines).
Answer questions thoroughly, accurately, and politely in GitHub markdown.
Use bullet points, bold text, and formatting where appropriate.
Base all facts and stats strictly on the provided classroom context snapshot.

--- CLASSROOM CONTEXT SNAPSHOT ---
${systemContext}
--- END SNAPSHOT ---

${recentHistory ? `--- RECENT CONVERSATION ---\n${recentHistory}\n--- END CONVERSATION ---\n` : ''}
User Question:
${userQuery}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: fullPrompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  };

  let response: Response | null = null;
  let lastErrText = '';

  for (const v of versionsToTry) {
    for (const targetModel of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/${v}/models/${targetModel}:generateContent?key=${cleanKey}`;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          // Success! Save working targetModel in cache
          cachedModelsInfo = {
            apiKey: cleanKey,
            version: v,
            models: [targetModel, ...candidateModels.filter(m => m !== targetModel)]
          };
          break;
        } else {
          const errJson = await response.clone().json().catch(() => null);
          lastErrText = errJson?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        }
      } catch (err) {
        lastErrText = String(err);
      }
    }
    if (response && response.ok) break;
  }

  if (!response || !response.ok) {
    throw new Error(lastErrText || 'Failed to connect to Google Gemini models.');
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  let candidateText = '';
  if (Array.isArray(parts)) {
    candidateText = parts
      .map((p: any) => p.text || '')
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  if (!candidateText) {
    throw new Error('Google Gemini returned an empty response.');
  }

  return candidateText;
}

