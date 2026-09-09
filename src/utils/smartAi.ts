import { ScheduleItem, HomeworkItem, AttendanceSession, Subject } from '../types';
import { format, addDays } from 'date-fns';

export interface AiDayPlanBlock {
  timeSlot: string;
  activity: string;
  type: 'class' | 'study' | 'break' | 'review';
  suggestion: string;
}

export interface AiDayPlanResponse {
  summary: string;
  focusGoal: string;
  blocks: AiDayPlanBlock[];
}

/**
 * Parses natural language date strings like "17th", "tomorrow", "August 17" into YYYY-MM-DD format
 */
export function parseNaturalLanguageDate(text: string): string {
  const lower = text.toLowerCase();
  const now = new Date();

  if (lower.includes('today')) {
    return format(now, 'yyyy-MM-dd');
  }

  if (lower.includes('tomorrow')) {
    return format(addDays(now, 1), 'yyyy-MM-dd');
  }

  // Check for day number like "17th", "17", "25th"
  const dayMatch = text.match(/\b(\d{1,2})(st|nd|rd|th)?\b/i);
  if (dayMatch) {
    const dayNum = parseInt(dayMatch[1], 10);
    if (dayNum >= 1 && dayNum <= 31) {
      let targetDate = new Date(now.getFullYear(), now.getMonth(), dayNum);
      // If date is in past this month, move to next month
      if (targetDate.getTime() < now.getTime() - 86400000) {
        targetDate = new Date(now.getFullYear(), now.getMonth() + 1, dayNum);
      }
      return format(targetDate, 'yyyy-MM-dd');
    }
  }

  // Default to 7 days from now
  return format(addDays(now, 7), 'yyyy-MM-dd');
}

/**
 * Generates an in-depth Study Guide & Revision Roadmap for a specific subject
 */
export function generateSubjectStudyGuide(subjectCode: string, subjectName?: string): string {
  const code = subjectCode.toUpperCase();

  if (code.includes('MEC201') || code.includes('THERMO')) {
    return `STUDY GUIDE: MEC201 - Engineering Thermodynamics

KEY SYLLABUS UNITS & FORMULAS:
1. First Law of Thermodynamics: Open & Closed Systems, SFEE equation (Q - W = Delta U).
2. Second Law & Entropy: Carnot Efficiency = 1 - (TL/TH), Clausius Inequality, Entropy Generation.
3. Power Cycles: Otto, Diesel, Dual, and Rankine Cycle efficiency calculations & P-V / T-S diagrams.
4. Pure Substances & Steam Tables: Dryness fraction (x), Superheated steam enthalpy & entropy calculations.

3-PHASE REVISION ROADMAP:
• Phase 1 (Core Concepts): Master P-V & T-S diagrams for Rankine & Air Standard cycles. Practice 3 numericals.
• Phase 2 (Formula Drills): Derive Steady Flow Energy Equation (SFEE) for Nozzles, Turbines & Compressors.
• Phase 3 (Pre-Exam Polish): Review Steam Table interpolation and Carnot cycle limits.`;
  }

  if (code.includes('MEC207') || code.includes('STRENGTH') || code.includes('SOM')) {
    return `STUDY GUIDE: MEC207 - Strength of Materials

KEY SYLLABUS UNITS & FORMULAS:
1. Stress & Strain: Young's Modulus (E), Poisson Ratio (v), Thermal Stresses in Composite Bars.
2. Bending & Shear: Shear Force Diagram (SFD) & Bending Moment Diagram (BMD) for Cantilever & Simply Supported Beams.
3. Flexure & Torsion: Euler-Bernoulli Bending Equation (M/I = sigma/y = E/R), Torsion Equation (T/J = tau/r = G*theta/L).
4. Principal Stresses: Mohr Circle construction, Maximum Shear Stress Theory (Guest) & Von Mises Theory.

3-PHASE REVISION ROADMAP:
• Phase 1 (Core Concepts): Practice drawing SFD & BMD for UDL and Point Load combinations.
• Phase 2 (Formula Drills): Solve 4 numericals on Circular Shaft Torsion and Thin Cylindrical Shell pressures.
• Phase 3 (Pre-Exam Polish): Review Mohr Circle graphical construction steps and Euler Column Buckling loads.`;
  }

  if (code.includes('212FIS3131') || code.includes('FLUID') || code.includes('SAFETY')) {
    return `STUDY GUIDE: 212FIS3131 - Fluid Power Safety

KEY SYLLABUS UNITS & FORMULAS:
1. Hydraulic Systems: Pascal's Law, Hydraulic Pumps (Vane, Gear, Piston), Reservoir design & Filtration.
2. Pneumatic Systems: Air Compressors, FRL (Filter-Regulator-Lubricator) units, Directional Control Valves (3/2, 5/2).
3. Safety Standards & Control: Pressure Relief Valves, Sequence Valves, Anti-tie down safety circuits, Emergency stop logic.
4. System Troubleshooting: Cavitation, Fluid contamination, Leak prevention, Thermal expansion safety.

3-PHASE REVISION ROADMAP:
• Phase 1 (Core Concepts): Draw ISO Symbols for 5/2 DCV, Accumulator, and Relief Valves.
• Phase 2 (System Design): Trace fluid flow in regenerative hydraulic circuit and safety interlocks.
• Phase 3 (Pre-Exam Polish): Review OSHA safety compliance standards for high-pressure fluid power installations.`;
  }

  if (code.includes('MEC203') || code.includes('MATERIALS')) {
    return `STUDY GUIDE: MEC203 - Materials Science and Engineering

KEY SYLLABUS UNITS & FORMULAS:
1. Crystal Structures: BCC, FCC, HCP packing efficiency & Bragg's Law of X-Ray Diffraction.
2. Phase Diagrams: Fe-Fe3C Phase Diagram (Eutectic, Eutectoid, Peritectic reactions & phase percentages).
3. Heat Treatment: TTT & CCT Diagrams, Annealing, Normalizing, Quenching & Tempering heat treatment cycles.
4. Material Mechanical Testing: Tensile Test, Charpy/Izod Impact Test, Brinell & Rockwell Hardness scales.

3-PHASE REVISION ROADMAP:
• Phase 1 (Core Concepts): Draw and label Iron-Iron Carbide (Fe-Fe3C) phase diagram completely.
• Phase 2 (Diagram Drills): Practice lever rule calculations for Austenite to Ferrite/Cementite transformation.
• Phase 3 (Pre-Exam Polish): Compare Mechanical properties of Cast Iron, Mild Steel, and Titanium Alloys.`;
  }

  if (code.includes('ECE100') || code.includes('IOT') || code.includes('SENSORS')) {
    return `STUDY GUIDE: ECE100 - IoT Sensors and Devices

KEY SYLLABUS UNITS & FORMULAS:
1. Transducers & Sensors: RTD, Thermocouple, Strain Gauge, Ultrasonic, Hall Effect, and Piezoelectric Sensors.
2. Signal Conditioning: Operational Amplifiers (Inverting, Non-Inverting, Instrumentation Amplifier gain equations).
3. Microcontrollers & Protocols: ESP32/Arduino Architecture, I2C, SPI, UART, MQTT & CoAP IoT protocols.
4. Edge Computing & Actuation: PWM motor drivers, Relay interfacing, Low-power wireless nodes.

3-PHASE REVISION ROADMAP:
• Phase 1 (Core Concepts): Study Instrumentation Amplifier circuit diagram & derivation.
• Phase 2 (Protocol Drills): Compare I2C vs SPI vs UART pin configurations & data packet frames.
• Phase 3 (Pre-Exam Polish): Review MQTT Publish/Subscribe architecture for remote sensor monitoring.`;
  }

  if (code.includes('MEC310') || code.includes('AUTOMATION')) {
    return `STUDY GUIDE: MEC310 - Industrial Automation and Control

KEY SYLLABUS UNITS & FORMULAS:
1. PLC Programming: Relay Logic vs Ladder Logic (NO/NC contacts, Timers TON/TOF, Counters CTU/CTD).
2. Control Systems: PID Controller tuning (Proportional, Integral, Derivative action), Transfer functions.
3. SCADA & HMI: Distributed Control Systems (DCS), Industrial Fieldbus protocols (Modbus, Profibus).
4. Industrial Robotics: Forward & Inverse Kinematics, End effectors, Robotic Work Cell Safety.

3-PHASE REVISION ROADMAP:
• Phase 1 (Core Concepts): Practice writing Ladder Logic programs for Motor Start/Stop & Conveyor Sequencing.
• Phase 2 (Control Drills): Analyze PID Step Response curves and Ziegler-Nichols tuning method.
• Phase 3 (Pre-Exam Polish): Review SCADA architecture and Modbus RS485 communication setup.`;
  }

  return `STUDY GUIDE: ${code} - ${subjectName || 'Course Revision Roadmap'}

KEY SYLLABUS UNITS:
1. Foundational Theory & Principles: Core definitions, governing equations, assumptions.
2. Applied Engineering Analysis: Problem solving methodologies & practical derivations.
3. System Design & Applications: Real-world engineering applications & industrial standards.

3-PHASE REVISION ROADMAP:
• Phase 1 (Core Concepts): Review key textbook chapters and lecture slides.
• Phase 2 (Problem Drills): Solve past exam question papers & numerical problems.
• Phase 3 (Pre-Exam Polish): Quick formula review and diagram practice.`;
}

export function generateDailySchedulePlan(
  todaySchedules: ScheduleItem[],
  pendingTasks: HomeworkItem[],
  streakCount: number
): AiDayPlanResponse {
  const todayStr = format(new Date(), 'EEEE, dd MMMM');
  const blocks: AiDayPlanBlock[] = [];

  // Morning Prep
  blocks.push({
    timeSlot: '08:30 AM - 09:00 AM',
    activity: 'Morning Class Prep & Attendance Roster Sync',
    type: 'break',
    suggestion: 'Review student register roster and ensure period slot timings are verified.'
  });

  // Class Sessions Blocks
  todaySchedules.forEach(item => {
    blocks.push({
      timeSlot: `Period ${item.periodNumber} (${item.subjectCode})`,
      activity: `Lecture: ${item.subjectCode}`,
      type: 'class',
      suggestion: item.classroom ? `Classroom ${item.classroom} • Faculty: ${item.facultyName || 'Instructor'}` : 'Live Class Session'
    });
  });

  // 2. Process Pending Urgent Homework / Exam Revisions
  const urgentExams = pendingTasks.filter(t => t.type === 'exam');
  const urgentAssignments = pendingTasks.filter(t => t.type === 'assignment' || t.type === 'project');

  if (urgentExams.length > 0) {
    blocks.push({
      timeSlot: 'Evening (18:00 - 19:30)',
      activity: `Exam Revision: ${urgentExams[0].title}`,
      type: 'study',
      suggestion: `Focus on high-yield formulas and numerical problem sets for ${urgentExams[0].subjectCode}.`
    });
  }

  if (urgentAssignments.length > 0) {
    blocks.push({
      timeSlot: 'Night (20:00 - 21:00)',
      activity: `Assignment Prep: ${urgentAssignments[0].title}`,
      type: 'study',
      suggestion: `Complete submissions due on ${urgentAssignments[0].dueDate}.`
    });
  }

  blocks.push({
    timeSlot: 'Daily Wrap-up (21:30)',
    activity: 'Daily Review & Activity Streak Sync',
    type: 'review',
    suggestion: `Awesome job maintaining your ${streakCount}-Day Activity Streak! Keep logging attendance sessions daily.`
  });

  const focusGoal = urgentExams.length > 0
    ? `Tip: Prioritize revision for ${urgentExams[0].subjectCode} while keeping period attendance logs synced.`
    : todaySchedules.length > 0
    ? `Tip: Track today's ${todaySchedules.length} scheduled periods and maintain 100% attendance accuracy.`
    : `Tip: Configure your weekly timetable and subjects in the Schedule tab.`;

  return {
    summary: `Daily Schedule Plan for ${todayStr}. You have ${todaySchedules.length} class period(s) and ${pendingTasks.length} pending task(s).`,
    focusGoal,
    blocks
  };
}

export function generateAiWhatsAppAbsenteeMessage(
  sessionDate: string,
  periodNumber: number,
  subjectCode: string,
  absentList: { name: string; registerNo: string }[]
): string {
  if (absentList.length === 0) {
    return `* ABSENTEE  - ${sessionDate}*\n*Period ${periodNumber} (${subjectCode})*\n\n\n100% Attendance recorded (NIL Absentees).`;
  }

  const listStr = absentList
    .map((st, i) => `${i + 1}. *${st.name.toUpperCase()}* (${st.registerNo})`)
    .join('\n');

  return `* ABSENTEE  - ${sessionDate}*\n*Period ${periodNumber} (${subjectCode})*\n\n\n${listStr}`;
}

/**
 * Generates a concise focus note for upcoming class alerts
 */
export function generateAiUpcomingClassNotification(
  periodNumber: number,
  subjectCode: string,
  subjectName?: string,
  facultyName?: string,
  classroom?: string,
  startTime?: string
): { title: string; subtitle: string; aiNote: string } {
  const code = (subjectCode || '').toUpperCase();
  const name = subjectName || code;

  let aiNote = `Note: Prepare attendance roster for ${name}${facultyName ? ` with ${facultyName}` : ''}. Review previous lecture notes.`;

  return {
    title: `Period ${periodNumber} • ${code}`,
    subtitle: `${name}${startTime ? ` • Starts at ${startTime}` : ''}${classroom ? ` • Room ${classroom}` : ''}`,
    aiNote
  };
}
