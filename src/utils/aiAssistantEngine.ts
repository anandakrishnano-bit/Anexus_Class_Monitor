import { db } from '../db';
import {
  Student,
  Subject,
  Faculty,
  PeriodConfig,
  ScheduleItem,
  AttendanceSession,
  AttendanceRecord,
  HomeworkItem,
  AppSettings
} from '../types';
import { format, parseISO, isToday, isPast, addDays } from 'date-fns';
import { parseNaturalLanguageDate, generateSubjectStudyGuide, generateAiWhatsAppAbsenteeMessage } from './smartAi';
import { scheduleEventReminder } from './notifications';
import { formatAttendanceSummary, getOrdinalPeriodName } from './summaryFormatter';

export interface AiDataContext {
  students: Student[];
  subjects: Subject[];
  faculty: Faculty[];
  periodConfigs: PeriodConfig[];
  schedules: ScheduleItem[];
  sessions: AttendanceSession[];
  tasks: HomeworkItem[];
  settings?: AppSettings;
  currentTime: Date;
}

/**
 * Builds a structured, complete context snapshot of every data point in the app for the AI
 */
export function buildAiPromptContext(ctx: AiDataContext): string {
  const {
    students,
    subjects,
    faculty,
    periodConfigs,
    schedules,
    sessions,
    tasks,
    settings,
    currentTime
  } = ctx;

  const now = currentTime;
  const timeStr = format(now, 'HH:mm:ss');
  const dateStr = format(now, 'yyyy-MM-dd (EEEE)');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[now.getDay()];

  // 1. Current / Upcoming Period
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todaySchedules = schedules
    .filter(s => s.dayOfWeek === todayName)
    .sort((a, b) => a.periodNumber - b.periodNumber);

  let activePeriodInfo = 'No class currently in session.';
  let nextPeriodInfo = 'No more classes scheduled for today.';

  for (const item of todaySchedules) {
    const pc = periodConfigs.find(p => p.periodNumber === item.periodNumber);
    if (!pc || !pc.startTime || !pc.endTime) continue;

    const [sh, sm] = pc.startTime.split(':').map(Number);
    const [eh, em] = pc.endTime.split(':').map(Number);
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;

    if (nowMinutes >= startM && nowMinutes < endM) {
      activePeriodInfo = `ACTIVE NOW: Period ${item.periodNumber} (${item.subjectCode}) in Room ${item.classroom || 'General'} with ${item.facultyName || 'Faculty'}. Ends at ${pc.endTime} (${endM - nowMinutes} mins remaining).`;
    } else if (nowMinutes < startM && nextPeriodInfo.startsWith('No more')) {
      nextPeriodInfo = `NEXT UPCOMING: Period ${item.periodNumber} (${item.subjectCode}) at ${pc.startTime} in Room ${item.classroom || 'General'} (in ${startM - nowMinutes} mins).`;
    }
  }

  // 2. Attendance Summary
  const studentAttendanceStats = students.map(st => {
    let attended = 0;
    let total = 0;
    sessions.forEach(sess => {
      const rec = sess.records.find(r => r.studentId === st.id || r.registerNo === st.registerNo);
      if (rec) {
        total++;
        if (rec.status === 'present' || rec.status === 'od') attended++;
      }
    });
    const pct = total > 0 ? Math.round((attended / total) * 100) : 100;
    return { name: st.name, reg: st.registerNo, attended, total, pct };
  });

  const lowAttendance = studentAttendanceStats.filter(s => s.total > 0 && s.pct < 75);
  const pendingTasks = tasks.filter(t => !t.isCompleted);

  return `=== CLASS SNAPSHOT ===
• Time: ${timeStr} | Date: ${dateStr}
• Class: ${settings?.className || 'Class'} (${settings?.section || 'Section A'}) - Representative: ${settings?.classRepName || 'Class Rep'}
• Active Class: ${activePeriodInfo}
• Next Class: ${nextPeriodInfo}
• Total Students: ${students.length} (Defaulters <75%: ${lowAttendance.length})
• Attendance Sessions Logged: ${sessions.length}
• Pending Tasks: ${pendingTasks.length}

=== REGISTERED SUBJECTS ===
${subjects.map(s => `• ${s.code}: ${s.name}`).join('\n') || 'None'}

=== TODAY'S TIMETABLE (${todayName}) ===
${todaySchedules.map(s => `• Period ${s.periodNumber}: ${s.subjectCode} (Room ${s.classroom || 'General'}, Faculty: ${s.facultyName || 'Assigned'})`).join('\n') || 'No classes scheduled today'}`;
}

/**
 * Intelligent Action & Query Dispatcher: Accurately understands user intent and invokes
 * the required data tool/action without hallucinating or dumping unrelated tasks.
 */
export interface ChatHistoryItem {
  sender: 'user' | 'assistant';
  text: string;
}

export const ACADEMIC_KNOWLEDGE_BASE: Record<string, { title: string; summary: string; formulas: string[]; tips: string }> = {
  cantilever: {
    title: 'Cantilever Beam Mechanics',
    summary: 'A cantilever is a structural beam rigidly anchored at only one support end while the other end extends freely into open space. In statics and mechanics of solids, transverse loads cause internal bending moments and shear stresses, with the greatest moment concentrated at the fixed wall.',
    formulas: [
      'Point load (P) at free end: Maximum Deflection δ = (P·L³) / (3·E·I)',
      'Point load (P) at free end: Maximum Bending Moment M_max = -P · L (at fixed wall)',
      'Uniformly Distributed Load (w): Maximum Deflection δ = (w·L⁴) / (8·E·I)',
      'Uniformly Distributed Load (w): Maximum Moment M_max = -(w·L²) / 2',
      'Boundary conditions at fixed wall: Deflection y = 0 and Slope dy/dx = 0'
    ],
    tips: 'In exams, always draw the Free Body Diagram (FBD) first. The fixed wall exerts both a vertical reaction force and a resisting reaction moment.'
  },
  force: {
    title: 'Simple Force & Mechanical Equilibrium',
    summary: 'A force is any interaction that changes or tends to change the motion or deformation of a body. In mechanical engineering, forces are resolved into axial components (tension/compression), transverse components (shear), and rotational forces (bending moment and torque).',
    formulas: [
      'Newton’s Second Law: ΣF = m · a',
      'Static Equilibrium Equations: ΣFx = 0, ΣFy = 0, ΣM = 0',
      'Axial Stress: σ = P / A',
      'Shear Stress: τ = V / A'
    ],
    tips: 'Remember Newton’s third law: every action force has an equal and opposite reaction force at the supports.'
  },
  bending: {
    title: 'Bending Moment & Beam Theory',
    summary: 'Bending moment measures the internal rotational force that induces curvature in a beam. It generates compressive stresses on one side of the neutral axis and tensile stresses on the opposite side.',
    formulas: [
      'Flexure Formula: σ/y = M/I = E/R',
      'Differential relations: dV/dx = -w(x) and dM/dx = V(x)',
      'Maximum bending stress: σ_max = M_max / Z (where Z = I / y_max)'
    ],
    tips: 'Points of zero shear force (V = 0) correspond to local maximum or minimum bending moments.'
  }
};

/**
 * Intelligent Action & Query Dispatcher: Accurately understands user intent,
 * leverages conversational history, and answers academic/classroom queries.
 */
export async function processAiQuery(
  query: string,
  ctx: AiDataContext,
  history?: ChatHistoryItem[]
): Promise<string> {
  const rawQ = query.trim();
  const q = rawQ.toLowerCase();
  const {
    students,
    subjects,
    faculty,
    periodConfigs,
    schedules,
    sessions,
    tasks,
    settings,
    currentTime
  } = ctx;

  const now = currentTime;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[now.getDay()];
  const repName = settings?.classRepName || 'Class Rep';

  // =========================================================================
  // 0. CONTEXTUAL FOLLOW-UP RESOLVER (e.g. "What is that?", "Tell me about that")
  // =========================================================================
  const isFollowUp =
    /^(what is (that|this|it)|tell me (more|about that|about it)|explain (that|this|it)|what was that|more details|what does that mean|what (test|exam|task) is that)\b/i.test(q) ||
    q === 'what is that ?' ||
    q === 'what is that?' ||
    q === 'what is this?' ||
    q === 'what is that' ||
    q === 'explain that' ||
    q === 'tell me more';

  if (isFollowUp && history && history.length > 0) {
    // Look backward for the last message from assistant
    const lastAssistantMsg = [...history].reverse().find(m => m.sender === 'assistant')?.text || '';

    // Check if the assistant recently mentioned any pending tasks or tests
    const pendingTasks = tasks.filter(t => !t.isCompleted);
    let matchedTask = pendingTasks.find(t =>
      lastAssistantMsg.toLowerCase().includes(t.title.toLowerCase())
    );

    if (!matchedTask) {
      // Fallback: search task titles in the last message
      matchedTask = tasks.find(t => lastAssistantMsg.toLowerCase().includes(t.title.toLowerCase()));
    }

    if (matchedTask) {
      const subject = subjects.find(s => s.code.toLowerCase() === matchedTask?.subjectCode?.toLowerCase());
      const isMechTopic = /candiliever|cantilever|force|beam|bending|mechanics/i.test(matchedTask.title);

      let conceptDetail = '';
      if (isMechTopic) {
        conceptDetail = `
---

### Academic Topic Explanation:
• **Cantilever Beam**: A rigid horizontal beam anchored at only one support wall, with the other end extending freely.
• **Behavior under load**: When downward forces act on it, maximum bending moment and maximum shear force develop at the **fixed wall support** ($M_{\\max} = -P \\cdot L$), while maximum downward deflection happens at the **free tip** ($\\delta = \\frac{P L^3}{3 E I}$).
• **Simple Force**: External concentrated load or distributed force acting on the beam ($F = m \\cdot a$). Resolving vertical support reactions ($R_A = \\Sigma F_y$) and resisting moments ($M_A = \\Sigma M$) is critical.

**Quick Test Advice:**
1. Practice sketching the **Shear Force Diagram (SFD)** and **Bending Moment Diagram (BMD)**.
2. Remember boundary conditions: Slope $\\theta = 0$ and Deflection $y = 0$ at the fixed support wall.
3. Check units carefully ($kN$ vs $N$, $m$ vs $mm$).`;
      }

      return `### Task Details: ${matchedTask.title}

• **Type**: **${matchedTask.type.toUpperCase()}**
• **Subject**: ${matchedTask.subjectCode} (${subject?.name || 'Class Subject'})
• **Due Date**: ${format(parseISO(matchedTask.dueDate), 'EEEE, dd MMMM yyyy at HH:mm')}
• **Priority**: ${(matchedTask.priority || 'medium').toUpperCase()}
• **Notes / Details**: ${matchedTask.notes || 'No additional notes provided.'}
${conceptDetail}`;
    }
  }

  // =========================================================================
  // 1. GREETINGS & CASUAL INTENTS
  // =========================================================================
  const isGreeting =
    /^(hi|hello|hey|hola|greetings|good\s+(morning|afternoon|evening|day)|yo|sup)\b/i.test(q) ||
    q === 'hi' ||
    q === 'hello' ||
    q === 'hey';

  if (isGreeting) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const todaySchedules = schedules.filter(s => s.dayOfWeek === todayName);
    let currentStatus = 'No classes currently in session.';

    for (const item of todaySchedules) {
      const pc = periodConfigs.find(p => p.periodNumber === item.periodNumber);
      if (pc && pc.startTime && pc.endTime) {
        const [sh, sm] = pc.startTime.split(':').map(Number);
        const [eh, em] = pc.endTime.split(':').map(Number);
        if (nowMinutes >= sh * 60 + sm && nowMinutes < eh * 60 + em) {
          currentStatus = `Current class: Period ${item.periodNumber} (${item.subjectCode}) with ${item.facultyName || 'Faculty'}.`;
          break;
        }
      }
    }

    return `Hello ${repName}! I'm your Class Assistant.

${currentStatus}

Here are some things you can ask me:
• "What's my schedule today?" or "Next class"
• "Who has low attendance?" or "Attendance of Person 1"
• "Absentees 9925009003, 9925009018" to log attendance
• "Show pending tasks" or "Schedule exam on 15th"
• "Study guide for MEC201"`;
  }

  // Identity / Help
  if (
    q.includes('who are you') ||
    q.includes('what can you do') ||
    q.includes('help me') ||
    q === 'help' ||
    q.includes('how to use')
  ) {
    return `I am your Class Assistant for ${settings?.className || 'your class'} (${settings?.section || 'Section A'}).

I can help you with:
1. **Attendance Management**: Mark absentees (e.g. "absentees 9003, 9018"), check defaulters (<75%), or lookup student records.
2. **Timetable & Schedule**: View active class, timetable, room numbers, and faculty details.
3. **Tasks & Exams**: Add homework or exam deadlines with reminders, and review pending tasks.
4. **Study Guides**: Generate revision notes and formula sheets for your subjects.`;
  }

  // Gratitude
  if (/^(thank\s*you|thanks|thx|awesome|great|cool|perfect)\b/i.test(q)) {
    return `You're very welcome, ${repName}! Let me know whenever you need anything else for your class.`;
  }

  // =========================================================================
  // 2. ACTION INTENT: Log Absentees / Attendance (e.g. "absentees 9003, 9018")
  // =========================================================================
  const isAbsenteeIntent =
    q.startsWith('absentees') ||
    q.startsWith('absent') ||
    q.includes('absentees:') ||
    q.includes('mark absent') ||
    (q.includes('absent') && /\d{3,}/.test(q) && !q.includes('who') && !q.includes('how many') && !q.includes('check'));

  if (isAbsenteeIntent) {
    // 1. Determine target period
    let targetPeriod = 1;
    const periodMatch = q.match(/\bperiod\s*(\d+)\b/) || q.match(/\bp(\d+)\b/);
    if (periodMatch) {
      targetPeriod = parseInt(periodMatch[1], 10);
    } else {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const todayScheds = schedules.filter(s => s.dayOfWeek === todayName);
      for (const item of todayScheds) {
        const pc = periodConfigs.find(p => p.periodNumber === item.periodNumber);
        if (pc && pc.startTime && pc.endTime) {
          const [sh, sm] = pc.startTime.split(':').map(Number);
          const [eh, em] = pc.endTime.split(':').map(Number);
          if (nowMinutes >= sh * 60 + sm && nowMinutes <= eh * 60 + em) {
            targetPeriod = item.periodNumber;
            break;
          }
        }
      }
    }

    // 2. Determine session date
    let sessionDate = format(now, 'yyyy-MM-dd');
    if (q.includes('yesterday')) {
      const yDate = new Date(now.getTime() - 86400000);
      sessionDate = format(yDate, 'yyyy-MM-dd');
    }

    // 3. Determine subject and faculty
    const todaySchedMatch = schedules.find(
      s => s.dayOfWeek === todayName && s.periodNumber === targetPeriod
    );
    let subjectCode = todaySchedMatch?.subjectCode || subjects[0]?.code || 'SUB101';
    let subjectName = subjects.find(s => s.code === subjectCode)?.name || subjectCode;
    let facultyName = todaySchedMatch?.facultyName || faculty[0]?.name || 'Faculty';
    let classroom = todaySchedMatch?.classroom || settings?.defaultClassroom || '101';

    // 4. Extract tokens (register numbers or names)
    const numberTokens = q.match(/\b\d+\b/g) || [];
    const filteredTokens = numberTokens.filter(tok => {
      if (periodMatch && tok === periodMatch[1]) return false;
      return true;
    });

    // 5. Match absentees against student roster
    const absentStudentIds = new Set<number>();
    const absentRecordsList: { name: string; registerNo: string }[] = [];

    let roster = [...students];
    if (roster.length === 0 && filteredTokens.length > 0) {
      for (const tok of filteredTokens) {
        const newSt: Student = {
          registerNo: tok,
          name: `Student ${tok}`,
          batchSection: settings?.section || 'Section A'
        };
        const id = await db.students.add(newSt);
        newSt.id = Number(id);
        roster.push(newSt);
      }
    }

    roster.forEach(st => {
      const reg = st.registerNo.toLowerCase();
      const sName = st.name.toLowerCase();

      // Check if number token or name matches
      const isMatched =
        filteredTokens.some(tok => reg === tok || reg.endsWith(tok) || sName.includes(tok)) ||
        (q.includes(sName) && sName.length > 2);

      if (isMatched) {
        absentStudentIds.add(st.id || 0);
        absentRecordsList.push({ name: st.name, registerNo: st.registerNo });
      }
    });

    // 6. Build Attendance Records
    const attendanceRecords: AttendanceRecord[] = roster.map(st => {
      const isAb = absentStudentIds.has(st.id || 0);
      return {
        studentId: st.id || 0,
        registerNo: st.registerNo,
        name: st.name,
        batchSection: st.batchSection || 'Section A',
        status: isAb ? 'absent' : 'present',
        remarks: isAb ? 'Marked absent via AI' : undefined
      };
    });

    // 7. Save to Database
    const existingSession = await db.attendanceSessions
      .where({ date: sessionDate, periodNumber: targetPeriod })
      .first();

    if (existingSession && existingSession.id) {
      await db.attendanceSessions.update(existingSession.id, {
        records: attendanceRecords,
        subjectCode,
        subjectName,
        facultyName,
        classroom
      });
    } else {
      await db.attendanceSessions.add({
        date: sessionDate,
        periodNumber: targetPeriod,
        subjectCode,
        subjectName,
        facultyName,
        classroom,
        records: attendanceRecords,
        createdAt: new Date().toISOString()
      });
    }

    const whatsappMessage = generateAiWhatsAppAbsenteeMessage(
      sessionDate,
      targetPeriod,
      subjectCode,
      absentRecordsList
    );

    return `**Attendance Recorded Successfully**
• **Period**: ${getOrdinalPeriodName(targetPeriod)} (${subjectCode})
• **Date**: ${sessionDate}
• **Absentees**: ${absentRecordsList.length} student(s) (${absentRecordsList.map(a => a.name).join(', ') || 'None - 100% Present'})

**WhatsApp Broadcast Format**:
\`\`\`
${whatsappMessage}
\`\`\``;
  }

  // =========================================================================
  // 3. ACTION INTENT: Clear / Delete Tasks & Reminders
  // =========================================================================
  if (
    (q.includes('clear') || q.includes('delete') || q.includes('remove') || q.includes('wipe')) &&
    (q.includes('reminder') || q.includes('task') || q.includes('exam') || q.includes('homework') || q.includes('todo')) &&
    (q.includes('all') || q.includes('everything'))
  ) {
    const count = tasks.length;
    await db.homeworkItems.clear();
    return `Cleared all ${count} task and exam reminder(s) from your Task Viewer.`;
  }

  // =========================================================================
  // 4. ACTION INTENT: Mark Task As Completed
  // =========================================================================
  if (
    (q.includes('mark') || q.includes('complete') || q.includes('done') || q.includes('finished')) &&
    (q.includes('task') || q.includes('exam') || q.includes('homework') || q.includes('assignment'))
  ) {
    const pending = tasks.filter(t => !t.isCompleted);
    if (pending.length === 0) {
      return `You have no pending tasks to complete!`;
    }

    // Check for number e.g. "task 1" or "task 2"
    const numMatch = q.match(/\b(?:task|item|number)\s*(\d+)\b/i) || q.match(/\b(\d+)(?:st|nd|rd|th)?\s+task\b/i);
    if (numMatch) {
      const idx = parseInt(numMatch[1], 10) - 1;
      if (idx >= 0 && idx < pending.length) {
        const targetTask = pending[idx];
        if (targetTask.id) {
          await db.homeworkItems.update(targetTask.id, { isCompleted: true });
          return `Marked task "${targetTask.title}" as completed.`;
        }
      }
    }

    // Check if subject or title is mentioned
    const matchedTask = pending.find(t =>
      q.includes(t.title.toLowerCase()) ||
      q.includes(t.subjectCode.toLowerCase())
    );

    if (matchedTask && matchedTask.id) {
      await db.homeworkItems.update(matchedTask.id, { isCompleted: true });
      return `Marked "${matchedTask.title}" (${matchedTask.subjectCode}) as completed.`;
    }
  }

  // =========================================================================
  // 5. ACTION INTENT: Add / Schedule Task, Exam, Homework
  // =========================================================================
  const isExplicitAddTask =
    q.startsWith('add') ||
    q.startsWith('schedule') ||
    q.startsWith('create') ||
    q.startsWith('remind me to') ||
    q.startsWith('set reminder') ||
    q.includes('have an exam on') ||
    q.includes('have a test on') ||
    q.includes('have homework on');

  if (isExplicitAddTask && (q.includes('task') || q.includes('exam') || q.includes('test') || q.includes('homework') || q.includes('assignment') || q.includes('remind') || q.includes('due') || q.includes('project'))) {
    const isExam = q.includes('exam') || q.includes('test') || q.includes('quiz');
    const dueDate = parseNaturalLanguageDate(q);

    const matchedSub = subjects.find(s =>
      q.includes(s.code.toLowerCase()) ||
      q.includes(s.name.toLowerCase())
    ) || subjects[0] || { code: 'GENERAL', name: 'Course Subject' };

    const subCode = matchedSub.code;
    const subName = matchedSub.name;

    let dueTime = '09:30';
    const timeMatch = q.match(/\b(\d{1,2}):(\d{2})\b/) || q.match(/\b(\d{1,2})\s*(am|pm)\b/i);
    if (timeMatch) {
      if (timeMatch[2] && (timeMatch[2].toLowerCase() === 'pm' || timeMatch[2].toLowerCase() === 'am')) {
        let h = parseInt(timeMatch[1], 10);
        if (timeMatch[2].toLowerCase() === 'pm' && h < 12) h += 12;
        if (timeMatch[2].toLowerCase() === 'am' && h === 12) h = 0;
        dueTime = `${h.toString().padStart(2, '0')}:00`;
      } else if (timeMatch[1] && timeMatch[2]) {
        dueTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
      }
    }

    let reminderOffset = 1440;
    if (q.includes('10 min') || q.includes('10m')) reminderOffset = 10;
    else if (q.includes('30 min') || q.includes('30m')) reminderOffset = 30;
    else if (q.includes('1 hour') || q.includes('1h')) reminderOffset = 60;
    else if (q.includes('2 hour') || q.includes('2h')) reminderOffset = 120;
    else if (q.includes('2 day')) reminderOffset = 2880;
    else if (q.includes('1 week')) reminderOffset = 10080;

    const taskType = isExam
      ? 'exam'
      : q.includes('assignment')
        ? 'assignment'
        : q.includes('project')
          ? 'project'
          : 'task';

    let taskTitle = query
      .replace(/^add\s+(task|exam|assignment|homework|reminder)?/i, '')
      .replace(/^schedule\s+(task|exam|assignment|homework|reminder)?/i, '')
      .replace(/^create\s+(task|exam|assignment|homework|reminder)?/i, '')
      .replace(/^remind\s+me\s+to/i, '')
      .trim();

    if (!taskTitle || taskTitle.length < 3) {
      taskTitle = `${taskType.toUpperCase()}: ${subCode} (${subName})`;
    }

    const studyGuide = generateSubjectStudyGuide(subCode, subName);

    const newTask: HomeworkItem = {
      title: taskTitle,
      dueDate,
      dueTime,
      reminderOffsetMinutes: reminderOffset,
      type: taskType,
      priority: 'high',
      isCompleted: false,
      subjectCode: subCode,
      notes: studyGuide
    };

    const newId = await db.homeworkItems.add(newTask);
    await scheduleEventReminder({ ...newTask, id: Number(newId) });

    let offsetText = '1 day before';
    if (reminderOffset === 10) offsetText = '10 mins before';
    else if (reminderOffset === 30) offsetText = '30 mins before';
    else if (reminderOffset === 60) offsetText = '1 hour before';
    else if (reminderOffset === 120) offsetText = '2 hours before';
    else if (reminderOffset === 2880) offsetText = '2 days before';
    else if (reminderOffset === 10080) offsetText = '1 week before';

    return `**Saved!** Scheduled ${taskType.toUpperCase()}: "${taskTitle}"
• **Subject**: ${subCode}
• **Due Date**: ${dueDate}${dueTime ? ` at ${dueTime}` : ''}
• **Reminder**: ${offsetText} alert configured.`;
  }

  // =========================================================================
  // 6. QUERY: Pending Tasks / Exams / Homework (ONLY WHEN EXPLICITLY ASKED)
  // =========================================================================
  const isAskingForTasks =
    (q.includes('pending task') ||
      q.includes('my task') ||
      q.includes('any task') ||
      q.includes('show task') ||
      q.includes('list task') ||
      q.includes('view task') ||
      q.includes('upcoming exam') ||
      q.includes('any exam') ||
      q.includes('show exam') ||
      q.includes('list exam') ||
      q.includes('homework due') ||
      q.includes('any homework') ||
      q.includes('show homework') ||
      q.includes('my reminders') ||
      q.includes('show reminders') ||
      q.includes('show todo') ||
      q === 'tasks' ||
      q === 'exams' ||
      q === 'homework' ||
      q === 'todo') &&
    !isAbsenteeIntent;

  if (isAskingForTasks) {
    const pending = tasks.filter(t => !t.isCompleted);
    if (pending.length === 0) {
      return `You have **0 pending tasks or exam reminders** right now. All caught up!`;
    }

    const list = pending
      .map((t, idx) => {
        const past = isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate));
        return `${idx + 1}. **[${t.type.toUpperCase()}]** ${t.title} (${t.subjectCode})\n   • Due: ${t.dueDate}${t.dueTime ? ` at ${t.dueTime}` : ''} ${past ? '**(OVERDUE)**' : ''}`;
      })
      .join('\n\n');

    return `**Pending Tasks & Exams (${pending.length} total):**\n\n${list}`;
  }

  // =========================================================================
  // 7. QUERY: Current Class / Active Period / Next Period / Time
  // =========================================================================
  if (
    q.includes('next class') ||
    q.includes('next period') ||
    q.includes('current class') ||
    q.includes('active class') ||
    q.includes('what is active') ||
    q.includes('what class is now') ||
    q.includes('current period') ||
    q.includes('am i free') ||
    q.includes('is there class') ||
    q.includes('right now') ||
    q === 'time'
  ) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const todaySchedules = schedules
      .filter(s => s.dayOfWeek === todayName)
      .sort((a, b) => a.periodNumber - b.periodNumber);

    if (todaySchedules.length === 0) {
      return `It's currently **${format(now, 'hh:mm a')}** on ${todayName}. There are no classes scheduled for today.`;
    }

    let activeItem: ScheduleItem | null = null;
    let upcomingItem: ScheduleItem | null = null;
    let minsLeftInActive = 0;
    let minsUntilNext = 0;

    for (const item of todaySchedules) {
      const pc = periodConfigs.find(p => p.periodNumber === item.periodNumber);
      if (!pc || !pc.startTime || !pc.endTime) continue;

      const [sh, sm] = pc.startTime.split(':').map(Number);
      const [eh, em] = pc.endTime.split(':').map(Number);
      const startM = sh * 60 + sm;
      const endM = eh * 60 + em;

      if (nowMinutes >= startM && nowMinutes < endM) {
        activeItem = item;
        minsLeftInActive = endM - nowMinutes;
      } else if (nowMinutes < startM && !upcomingItem) {
        upcomingItem = item;
        minsUntilNext = startM - nowMinutes;
      }
    }

    if (activeItem) {
      const pc = periodConfigs.find(p => p.periodNumber === activeItem!.periodNumber);
      let res = `**Active Class Right Now:**\n• **Period ${activeItem.periodNumber}**: ${activeItem.subjectCode}\n• **Faculty**: ${activeItem.facultyName || 'Faculty'}\n• **Room**: ${activeItem.classroom || 'General'}\n• **Time**: ${pc?.startTime} - ${pc?.endTime} (${minsLeftInActive} mins remaining)`;

      if (upcomingItem) {
        const nextPc = periodConfigs.find(p => p.periodNumber === upcomingItem!.periodNumber);
        res += `\n\n**Next Class:** Period ${upcomingItem.periodNumber} (${upcomingItem.subjectCode}) at ${nextPc?.startTime} in Room ${upcomingItem.classroom || 'General'}.`;
      }
      return res;
    }

    if (upcomingItem) {
      const pc = periodConfigs.find(p => p.periodNumber === upcomingItem!.periodNumber);
      return `**Next Upcoming Class:**\n• **Period ${upcomingItem.periodNumber}**: ${upcomingItem.subjectCode}\n• **Starts at**: ${pc?.startTime} (in ${minsUntilNext} mins)\n• **Faculty**: ${upcomingItem.facultyName || 'Faculty'}\n• **Room**: ${upcomingItem.classroom || 'General'}`;
    }

    return `All scheduled classes for today (${todayName}) have finished. You're done for the day!`;
  }

  // =========================================================================
  // 8. QUERY: Specific Period Inquiry (e.g. "what is period 2", "who teaches period 1")
  // =========================================================================
  const periodSpecificMatch = q.match(/\b(?:period|p)\s*(\d+)\b/i);
  if (periodSpecificMatch && (q.includes('what') || q.includes('who') || q.includes('which') || q.includes('is') || q.includes('subject') || q.includes('time'))) {
    const pNum = parseInt(periodSpecificMatch[1], 10);
    const targetSched = schedules.find(s => s.dayOfWeek === todayName && s.periodNumber === pNum);
    const pc = periodConfigs.find(p => p.periodNumber === pNum);

    if (targetSched) {
      return `**Period ${pNum} on ${todayName}:**
• **Subject**: ${targetSched.subjectCode}
• **Faculty**: ${targetSched.facultyName || 'Assigned'}
• **Room**: ${targetSched.classroom || 'General'}
• **Slot Timing**: ${pc ? `${pc.startTime} - ${pc.endTime}` : 'Configured in Schedule'}`;
    } else if (pc) {
      return `Period ${pNum} is configured from ${pc.startTime} to ${pc.endTime}, but no subject is assigned for today (${todayName}).`;
    }
  }

  // =========================================================================
  // 9. QUERY: Timetable / Day Schedule
  // =========================================================================
  const matchedDay = days.find(d => q.includes(d.toLowerCase()));
  if (
    q.includes('schedule') ||
    q.includes('timetable') ||
    q.includes('classes today') ||
    q.includes('classes tomorrow') ||
    q.includes('today classes') ||
    (matchedDay && (q.includes('class') || q.includes('timetable') || q.includes('show')))
  ) {
    let targetDay = todayName;
    if (q.includes('tomorrow')) {
      const tomorrowDate = addDays(now, 1);
      targetDay = days[tomorrowDate.getDay()];
    } else if (matchedDay) {
      targetDay = matchedDay;
    }

    const daySchedules = schedules
      .filter(s => s.dayOfWeek.toLowerCase() === targetDay.toLowerCase())
      .sort((a, b) => a.periodNumber - b.periodNumber);

    if (daySchedules.length === 0) {
      return `There are no classes configured for **${targetDay}**.`;
    }

    const list = daySchedules
      .map(s => {
        const pc = periodConfigs.find(p => p.periodNumber === s.periodNumber);
        const timeRange = pc ? `(${pc.startTime} - ${pc.endTime})` : '';
        return `• **Period ${s.periodNumber}** ${timeRange}: ${s.subjectCode} in Room ${s.classroom || 'General'} (Faculty: ${s.facultyName || 'Staff'})`;
      })
      .join('\n');

    return `**Timetable for ${targetDay}:**\n\n${list}`;
  }

  // =========================================================================
  // 10. QUERY: Subjects & Faculty Directory
  // =========================================================================
  if (
    q.includes('who is teaching') ||
    q.includes('who teaches') ||
    q.includes('faculty for') ||
    q.includes('teacher for') ||
    q.includes('list subjects') ||
    q.includes('all subjects') ||
    q.includes('what subjects') ||
    q.includes('faculty list') ||
    q.includes('list faculty')
  ) {
    // Check if a specific subject is queried
    const matchedSubject = subjects.find(
      s => q.includes(s.code.toLowerCase()) || q.includes(s.name.toLowerCase())
    );

    if (matchedSubject) {
      const matchedSched = schedules.find(s => s.subjectCode === matchedSubject.code);
      const matchedFac = faculty.find(f => matchedSched?.facultyName ? f.name === matchedSched.facultyName : false);
      return `**Subject Details:**
• **Code**: ${matchedSubject.code}
• **Name**: ${matchedSubject.name}
• **Faculty**: ${matchedSched?.facultyName || matchedFac?.name || 'Assigned in Schedule'}
• **Room**: ${matchedSched?.classroom || 'General'}`;
    }

    // List all subjects
    if (subjects.length > 0) {
      const list = subjects
        .map(s => {
          const sched = schedules.find(sc => sc.subjectCode === s.code);
          return `• **${s.code}**: ${s.name}${sched?.facultyName ? ` (Faculty: ${sched.facultyName})` : ''}`;
        })
        .join('\n');
      return `**Registered Class Subjects (${subjects.length}):**\n\n${list}`;
    }
  }

  // =========================================================================
  // 11. QUERY: Low Attendance (<75%) / Shortage / Defaulters
  // =========================================================================
  if (
    q.includes('low attendance') ||
    q.includes('less than 75') ||
    q.includes('below 75') ||
    q.includes('shortage') ||
    q.includes('defaulters') ||
    q.includes('who is lagging')
  ) {
    if (sessions.length === 0) {
      return `No attendance sessions have been logged yet. Take attendance in the Attendance tab or tell me absentees to log sessions.`;
    }

    const stats = students.map(st => {
      let attended = 0;
      let total = 0;
      sessions.forEach(sess => {
        const rec = sess.records.find(r => r.studentId === st.id || r.registerNo === st.registerNo);
        if (rec) {
          total++;
          if (rec.status === 'present' || rec.status === 'od') attended++;
        }
      });
      const pct = total > 0 ? Math.round((attended / total) * 100) : 100;
      return { name: st.name, reg: st.registerNo, attended, total, pct };
    });

    const lowList = stats.filter(s => s.total > 0 && s.pct < 75);
    if (lowList.length === 0) {
      return `All ${students.length} students have 75% or higher attendance across all ${sessions.length} logged sessions.`;
    }

    const listStr = lowList
      .sort((a, b) => a.pct - b.pct)
      .map((s, i) => `${i + 1}. **${s.name}** (${s.reg}): **${s.pct}%** (${s.attended}/${s.total} sessions)`)
      .join('\n');

    return `**Students with Attendance Below 75% (${lowList.length} total):**\n\n${listStr}`;
  }

  // =========================================================================
  // 12. QUERY: Specific Student Attendance & Status Lookup
  // =========================================================================
  const matchedStudent = students.find(st => {
    const sName = st.name.toLowerCase();
    const sReg = st.registerNo.toLowerCase();
    return q.includes(sReg) || (sName.length > 2 && q.includes(sName));
  });

  if (
    matchedStudent &&
    (q.includes('attendance') ||
      q.includes('status') ||
      q.includes('how many') ||
      q.includes('record') ||
      q.includes('absent') ||
      q.includes('present') ||
      q.includes('percentage') ||
      q.includes('find') ||
      q.includes('who is'))
  ) {
    let attended = 0;
    let absent = 0;
    let od = 0;
    let total = 0;

    sessions.forEach(sess => {
      const rec = sess.records.find(
        r => r.studentId === matchedStudent.id || r.registerNo === matchedStudent.registerNo
      );
      if (rec) {
        total++;
        if (rec.status === 'present') attended++;
        else if (rec.status === 'absent') absent++;
        else if (rec.status === 'od') od++;
      }
    });

    const pct = total > 0 ? Math.round(((attended + od) / total) * 100) : 100;

    return `**Student Attendance Record:**
• **Name**: ${matchedStudent.name}
• **Register No**: ${matchedStudent.registerNo}
• **Batch / Section**: ${matchedStudent.batchSection || settings?.section || 'Section A'}
• **Overall Attendance**: **${pct}%** ${pct < 75 ? '*(Shortage Warning <75%)*' : '*(Eligible)*'}
• **Total Sessions**: ${total} (Present: ${attended}, OD: ${od}, Absent: ${absent})`;
  }

  // =========================================================================
  // 13. QUERY: Today's Absentees or Recent Session Absentees
  // =========================================================================
  if (
    (q.includes('absent today') || q.includes('today absentees') || q.includes('who was absent') || q.includes('who is absent')) &&
    !isAbsenteeIntent
  ) {
    const todayStr = format(now, 'yyyy-MM-dd');
    const todaySessions = sessions.filter(s => s.date === todayStr);

    if (todaySessions.length === 0) {
      return `No attendance sessions have been logged for today (${todayStr}) yet.`;
    }

    const report = todaySessions
      .map(sess => {
        const abs = sess.records.filter(r => r.status === 'absent');
        const absNames = abs.map(a => `${a.name} (${a.registerNo})`).join(', ');
        return `• **Period ${sess.periodNumber} (${sess.subjectCode})**: ${abs.length} absent (${absNames || 'None - 100% Present'})`;
      })
      .join('\n');

    return `**Attendance Records for Today (${todayStr}):**\n\n${report}`;
  }

  // =========================================================================
  // 14. QUERY: Class Representative & Settings Details
  // =========================================================================
  if (
    q.includes('class rep') ||
    q.includes('who is the rep') ||
    q.includes('class name') ||
    q.includes('my section')
  ) {
    return `**Class Information:**
• **Class**: ${settings?.className || 'Engineering Class'}
• **Section**: ${settings?.section || 'Section A'}
• **Class Representative**: ${settings?.classRepName || 'Class Rep'}
• **Total Students**: ${students.length} students enrolled
• **Default Classroom**: ${settings?.defaultClassroom || 'Room 101'}`;
  }

  // =========================================================================
  // 15. QUERY: Generate Study Guide / Syllabus Roadmaps
  // =========================================================================
  if (
    q.includes('study guide') ||
    q.includes('revision plan') ||
    q.includes('study plan') ||
    q.includes('formula sheet') ||
    q.includes('syllabus') ||
    q.includes('revision roadmap')
  ) {
    const matchedSub = subjects.find(
      s =>
        q.includes(s.code.toLowerCase()) ||
        q.includes(s.name.toLowerCase())
    ) || subjects[0] || { code: 'GENERAL', name: 'Course Subject' };

    return generateSubjectStudyGuide(matchedSub.code, matchedSub.name);
  }

  // =========================================================================
  // 16. QUERY: Academic Concepts & Engineering Topics (Cantilever, Force, etc.)
  // =========================================================================
  for (const [key, topic] of Object.entries(ACADEMIC_KNOWLEDGE_BASE)) {
    if (q.includes(key) || (key === 'cantilever' && q.includes('candiliever'))) {
      return `### Academic Concept: ${topic.title}

${topic.summary}

---

**Key Engineering Formulas:**
${topic.formulas.map(f => `• ${f}`).join('\n')}

---

**Practical Tip:**
${topic.tips}`;
    }
  }

  // =========================================================================
  // 17. QUERY: Specific Task / Exam Lookup
  // =========================================================================
  const matchedTask = tasks.find(t =>
    q.includes(t.title.toLowerCase()) ||
    t.title.toLowerCase().split(/\s+/).some(word => word.length > 4 && q.includes(word))
  );

  if (matchedTask) {
    const sub = subjects.find(s => s.code.toLowerCase() === matchedTask.subjectCode.toLowerCase());
    return `### Task Lookup: ${matchedTask.title}

• **Subject**: ${matchedTask.subjectCode} (${sub?.name || 'Class Subject'})
• **Type**: **${matchedTask.type.toUpperCase()}**
• **Due Date**: ${format(parseISO(matchedTask.dueDate), 'EEEE, dd MMMM yyyy at HH:mm')}
• **Priority**: ${(matchedTask.priority || 'medium').toUpperCase()}
• **Status**: ${matchedTask.isCompleted ? 'Completed' : 'Pending'}
• **Notes**: ${matchedTask.notes || 'No additional notes provided.'}`;
  }

  // =========================================================================
  // 18. QUERY: Subject Lookup
  // =========================================================================
  const matchedSubject = subjects.find(
    s => q.includes(s.code.toLowerCase()) || q.includes(s.name.toLowerCase())
  );

  if (matchedSubject) {
    const subScheds = schedules.filter(s => s.subjectCode === matchedSubject.code);
    return `### Subject Details: ${matchedSubject.code}

• **Course Name**: ${matchedSubject.name}
• **Weekly Slots**: ${subScheds.length} periods scheduled
${subScheds.map(sc => `  - ${sc.dayOfWeek}, Period ${sc.periodNumber} (${sc.facultyName || 'Faculty'}, Room ${sc.classroom || 'General'})`).join('\n') || '  - No timetable slots assigned yet.'}

*Tip: Type "Study guide for ${matchedSubject.code}" to generate revision notes!*`;
  }

  // =========================================================================
  // 19. Intelligent Fallback: Return empty string to let caller know no deterministic match
  // =========================================================================
  return '';
}
