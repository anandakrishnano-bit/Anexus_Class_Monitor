import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { HomeworkItem, TaskType, TaskPriority } from '../../types';
import { useNotification } from '../../context/NotificationContext';
import { scheduleEventReminder } from '../../utils/notifications';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import {
  Field,
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldLabel,
  FieldDescription,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Calendar as UICalendar } from '@/components/ui/calendar';
import {
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  ListTodo,
  BellRing,
  Clock
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

interface TasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TasksModal: React.FC<TasksModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useNotification();

  const tasks = useLiveQuery(() => db.homeworkItems.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];

  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState<boolean>(false);

  // Add Task Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [dueTime, setDueTime] = useState<string>('09:30');
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState<number>(1440);
  const [taskType, setTaskType] = useState<TaskType>('exam');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [subjectCode, setSubjectCode] = useState<string>('MEC203');
  const [notes, setNotes] = useState<string>('');

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => {
        const matchType = typeFilter === 'all' || t.type === typeFilter;
        const matchComp = showCompleted ? true : !t.isCompleted;
        return matchType && matchComp;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks, typeFilter, showCompleted]);

  // Handle Add Task
  const handleSaveTask = async () => {
    if (!title.trim()) {
      showToast('Validation Error', 'Title is required', 'error');
      return;
    }

    try {
      const newTask: HomeworkItem = {
        title: title.trim(),
        dueDate,
        dueTime,
        reminderOffsetMinutes,
        type: taskType,
        priority,
        isCompleted: false,
        subjectCode,
        notes: notes.trim()
      };

      const newId = await db.homeworkItems.add(newTask);
      await scheduleEventReminder({ ...newTask, id: Number(newId) });

      let offsetLabel = '1 Day Before';
      if (reminderOffsetMinutes === 10) offsetLabel = '10 Mins Before';
      else if (reminderOffsetMinutes === 30) offsetLabel = '30 Mins Before';
      else if (reminderOffsetMinutes === 60) offsetLabel = '1 Hour Before';
      else if (reminderOffsetMinutes === 120) offsetLabel = '2 Hours Before';
      else if (reminderOffsetMinutes === 2880) offsetLabel = '2 Days Before';
      else if (reminderOffsetMinutes === 10080) offsetLabel = '1 Week Before';

      showToast('Reminder Scheduled', `${taskType.toUpperCase()} alert set (${offsetLabel})`, 'success');
      setTitle('');
      setNotes('');
      setIsAddModalOpen(false);
    } catch (err) {
      showToast('Error', String(err), 'error');
    }
  };

  // Toggle Completed
  const toggleCompleted = async (item: HomeworkItem) => {
    if (item.id) {
      await db.homeworkItems.update(item.id, {
        isCompleted: !item.isCompleted
      });
      showToast(item.isCompleted ? 'Marked Active' : 'Marked Completed', undefined, 'info');
    }
  };

  // Delete Task
  const handleDeleteTask = async (id: number) => {
    await db.homeworkItems.delete(id);
    showToast('Reminder Deleted', undefined, 'info');
  };

  // Clear All Tasks Confirm State
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);

  // Clear All Tasks
  const handleClearAllTasks = async () => {
    await db.homeworkItems.clear();
    showToast('All Reminders Cleared', 'All tasks, assignments, and exam reminders have been removed', 'info');
    setIsClearConfirmOpen(false);
  };

  // Clear Completed Tasks
  const handleClearCompleted = async () => {
    const completedIds = tasks.filter(t => t.isCompleted).map(t => t.id!).filter(Boolean);
    if (completedIds.length > 0) {
      await db.homeworkItems.bulkDelete(completedIds);
      showToast('Completed Cleared', `Removed ${completedIds.length} completed tasks`, 'info');
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Tasks, Assignments & Exam Reminders" maxWidth="lg">
        <div className="space-y-5">
          {/* Header & Add Button */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-neutral-900 dark:text-white" />
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                Total {tasks.filter(t => !t.isCompleted).length} Pending Reminders
              </span>
            </div>

            <div className="flex items-center gap-2">
              {tasks.length > 0 && (
                <button
                  onClick={() => setIsClearConfirmOpen(true)}
                  className="flex items-center gap-1 px-3 py-2 rounded-full border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 font-bold text-xs transition-colors shadow-sm"
                  title="Clear all tasks and exam reminders"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
              )}

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Reminder
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5 shrink-0">
              {['all', 'exam', 'assignment', 'project', 'test', 'task'].map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
                    typeFilter === t
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm'
                      : 'bg-neutral-100 dark:bg-[#262626] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-[#333333]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <Field orientation="horizontal" className="gap-2 shrink-0">
              <FieldLabel htmlFor="switch-show-completed" className="text-xs font-bold text-neutral-500 cursor-pointer">
                Show Completed
              </FieldLabel>
              <Switch
                id="switch-show-completed"
                checked={showCompleted}
                onCheckedChange={checked => setShowCompleted(checked)}
              />
            </Field>
          </div>

          <Separator />

          {/* Tasks List */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-400 italic bg-neutral-50 dark:bg-[#262626] rounded-2xl border border-neutral-200/60 dark:border-neutral-800">
                No reminders found matching filter criteria.
              </div>
            ) : (
              filteredTasks.map(item => {
                const dueObj = new Date(item.dueDate);
                const past = isPast(dueObj) && !isToday(dueObj) && !item.isCompleted;

                let typeBadgeClass = 'bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200';
                if (item.type === 'exam') typeBadgeClass = 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
                else if (item.type === 'assignment') typeBadgeClass = 'bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200';
                else if (item.type === 'project') typeBadgeClass = 'bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200';

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                      item.isCompleted
                        ? 'bg-neutral-50 dark:bg-[#262626]/40 border-neutral-200/60 dark:border-neutral-800 opacity-60'
                        : past
                        ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'
                        : 'bg-white dark:bg-[#171717] border-neutral-200 dark:border-neutral-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        onClick={() => toggleCompleted(item)}
                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                          item.isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-500'
                        }`}
                      >
                        {item.isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${typeBadgeClass}`}>
                            {item.type}
                          </span>
                          {item.subjectCode && (
                            <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[10px] font-bold font-mono">
                              {item.subjectCode}
                            </span>
                          )}
                          {past && (
                            <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold">
                              Overdue
                            </span>
                          )}
                        </div>

                        <h4 className={`text-sm font-extrabold text-neutral-900 dark:text-white ${
                          item.isCompleted ? 'line-through text-neutral-400' : ''
                        }`}>
                          {item.title}
                        </h4>

                        {item.notes && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                            {item.notes}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-neutral-400" /> Due: {item.dueDate}{item.dueTime ? ` at ${item.dueTime}` : ''}
                          </span>
                          {item.reminderOffsetMinutes !== undefined && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-[10px] border border-neutral-200/60 dark:border-neutral-700">
                              <BellRing className="w-2.5 h-2.5" />
                              {item.reminderOffsetMinutes === 10 ? '10m alert' :
                               item.reminderOffsetMinutes === 30 ? '30m alert' :
                               item.reminderOffsetMinutes === 60 ? '1h alert' :
                               item.reminderOffsetMinutes === 120 ? '2h alert' :
                               item.reminderOffsetMinutes === 1440 ? '1d alert' :
                               item.reminderOffsetMinutes === 2880 ? '2d alert' : '1w alert'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTask(item.id!)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Inner Add Task Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Task / Exam Reminder"
      >
        <FieldGroup className="text-xs font-semibold">
          <Field>
            <FieldLabel htmlFor="task-title">
              Reminder Title *
            </FieldLabel>
            <Input
              id="task-title"
              placeholder="e.g. Mid-Term Exam or Assignment 2"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Type</FieldLabel>
              <Select
                value={taskType}
                onValueChange={val => setTaskType(val as TaskType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Priority</FieldLabel>
              <Select
                value={priority}
                onValueChange={val => setPriority(val as TaskPriority)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" /> Due Date *
              </FieldLabel>
              <DatePicker
                value={dueDate}
                onChange={dateStr => setDueDate(dateStr)}
                placeholder="Pick due date..."
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="task-duetime" className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-neutral-400" /> Due Time
              </FieldLabel>
              <Input
                id="task-duetime"
                type="time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel className="flex items-center gap-1">
                <BellRing className="w-3.5 h-3.5 text-neutral-400" /> Notify Reminder
              </FieldLabel>
              <Select
                value={reminderOffsetMinutes}
                onValueChange={val => setReminderOffsetMinutes(Number(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reminder offset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={10}>10 Minutes Before</SelectItem>
                    <SelectItem value={30}>30 Minutes Before</SelectItem>
                    <SelectItem value={60}>1 Hour Before</SelectItem>
                    <SelectItem value={120}>2 Hours Before</SelectItem>
                    <SelectItem value={1440}>1 Day Before (24h)</SelectItem>
                    <SelectItem value={2880}>2 Days Before (48h)</SelectItem>
                    <SelectItem value={10080}>1 Week Before</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Subject</FieldLabel>
              <Select
                value={subjectCode}
                onValueChange={val => setSubjectCode(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {subjects.map(s => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="task-notes">Notes / Details</FieldLabel>
            <Textarea
              id="task-notes"
              rows={2}
              placeholder="e.g. Syllabus units, hall number, or submission instructions..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </Field>

          <FieldSeparator />

          <Field orientation="horizontal" className="justify-end gap-3 pt-1">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveTask}
            >
              Save Reminder
            </Button>
          </Field>
        </FieldGroup>
      </Modal>

      {/* Clear All Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={handleClearAllTasks}
        title="Clear All Reminders?"
        message="Are you sure you want to delete all tasks, assignments, and exam reminders? This cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        isDanger={true}
      />
    </>
  );
};
