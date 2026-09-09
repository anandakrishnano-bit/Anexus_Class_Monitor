export interface AiExportFilterResult {
  title: string;
  minPercentage?: number;
  maxPercentage?: number;
  subjectCode?: string;
  section?: string;
  statusFilter?: 'present' | 'absent' | 'od';
  sortBy?: 'percentage' | 'name' | 'rollNo';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  explanation: string;
}

export function parseLocalAiExportPrompt(prompt: string): AiExportFilterResult {
  const query = prompt.toLowerCase().trim();
  const result: AiExportFilterResult = {
    title: 'Custom AI Export Query',
    explanation: 'Filtered using prompt rule matching'
  };

  if (!query) {
    result.title = 'Full Class Roster Report';
    result.explanation = 'Exporting complete class attendance dataset';
    return result;
  }

  // Percentage threshold rules
  const belowMatch = query.match(/(below|less than|<|under)\s*(\d+)/);
  if (belowMatch) {
    result.maxPercentage = parseInt(belowMatch[2], 10);
  }

  const aboveMatch = query.match(/(above|greater than|>|more than|over)\s*(\d+)/);
  if (aboveMatch) {
    result.minPercentage = parseInt(aboveMatch[2], 10);
  }

  if (query.includes('75') && !result.maxPercentage && !result.minPercentage) {
    if (query.includes('low') || query.includes('shortage') || query.includes('detain') || query.includes('warning')) {
      result.maxPercentage = 75;
    }
  }

  // Status rules
  if (query.includes('absent')) {
    result.statusFilter = 'absent';
  } else if (query.includes('present')) {
    result.statusFilter = 'present';
  } else if (query.includes('od') || query.includes('duty')) {
    result.statusFilter = 'od';
  }

  // Subject Code matching
  const subjectMatch = query.match(/\b(mec\d+|cs\d+|ece\d+|\d+fis\d+)\b/);
  if (subjectMatch) {
    result.subjectCode = subjectMatch[1].toUpperCase();
  }

  // Section matching
  if (query.includes('section a') || query.includes('sec a')) {
    result.section = 'Section A';
  } else if (query.includes('section b') || query.includes('sec b')) {
    result.section = 'Section B';
  }

  // Sort rules
  if (query.includes('top') || query.includes('highest') || query.includes('best')) {
    result.sortBy = 'percentage';
    result.sortOrder = 'desc';
    const topNum = query.match(/(top|best)\s*(\d+)/);
    if (topNum) result.limit = parseInt(topNum[2], 10);
    else result.limit = 5;
  } else if (query.includes('bottom') || query.includes('lowest') || query.includes('worst')) {
    result.sortBy = 'percentage';
    result.sortOrder = 'asc';
    const btmNum = query.match(/(bottom|worst)\s*(\d+)/);
    if (btmNum) result.limit = parseInt(btmNum[2], 10);
    else result.limit = 5;
  }

  // Generate friendly explanation
  const parts: string[] = [];
  if (result.maxPercentage !== undefined) parts.push(`Attendance < ${result.maxPercentage}%`);
  if (result.minPercentage !== undefined) parts.push(`Attendance > ${result.minPercentage}%`);
  if (result.subjectCode) parts.push(`Subject: ${result.subjectCode}`);
  if (result.section) parts.push(`Section: ${result.section}`);
  if (result.statusFilter) parts.push(`Status: ${result.statusFilter.toUpperCase()}`);
  if (result.limit) parts.push(`Limit: Top ${result.limit}`);

  result.explanation = parts.length > 0 ? parts.join(' • ') : `Query matches "${prompt}"`;

  return result;
}
