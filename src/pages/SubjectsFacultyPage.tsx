import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Subject, Faculty } from '../types';
import { useNotification } from '../context/NotificationContext';
import { Modal } from '../components/common/Modal';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  User,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';

export const SubjectsFacultyPage: React.FC = () => {
  const { showToast } = useNotification();
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const facultyList = useLiveQuery(() => db.faculty.toArray()) || [];

  // Subject Modal State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subCode, setSubCode] = useState<string>('');
  const [subName, setSubName] = useState<string>('');

  // Faculty Modal State
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState<boolean>(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [facName, setFacName] = useState<string>('');
  const [facDept, setFacDept] = useState<string>('Computer Science');

  // Handle Subject
  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setSubCode('');
    setSubName('');
    setIsSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (s: Subject) => {
    setEditingSubject(s);
    setSubCode(s.code);
    setSubName(s.name);
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = async () => {
    if (!subCode.trim() || !subName.trim()) {
      showToast('Validation Error', 'Subject Code and Name are required', 'error');
      return;
    }

    if (editingSubject && editingSubject.id) {
      await db.subjects.update(editingSubject.id, {
        code: subCode.trim().toUpperCase(),
        name: subName.trim()
      });
      showToast('Subject Updated', undefined, 'success');
    } else {
      await db.subjects.add({
        code: subCode.trim().toUpperCase(),
        name: subName.trim()
      });
      showToast('Subject Added', undefined, 'success');
    }
    setIsSubjectModalOpen(false);
  };

  const handleDeleteSubject = async (id: number) => {
    await db.subjects.delete(id);
    showToast('Subject Deleted', undefined, 'info');
  };

  // Handle Faculty
  const handleOpenAddFaculty = () => {
    setEditingFaculty(null);
    setFacName('');
    setFacDept('Computer Science');
    setIsFacultyModalOpen(true);
  };

  const handleOpenEditFaculty = (f: Faculty) => {
    setEditingFaculty(f);
    setFacName(f.name);
    setFacDept(f.department);
    setIsFacultyModalOpen(true);
  };

  const handleSaveFaculty = async () => {
    if (!facName.trim()) {
      showToast('Validation Error', 'Faculty Name is required', 'error');
      return;
    }

    if (editingFaculty && editingFaculty.id) {
      await db.faculty.update(editingFaculty.id, {
        name: facName.trim(),
        department: facDept.trim()
      });
      showToast('Faculty Member Updated', undefined, 'success');
    } else {
      await db.faculty.add({
        name: facName.trim(),
        department: facDept.trim()
      });
      showToast('Faculty Member Added', undefined, 'success');
    }
    setIsFacultyModalOpen(false);
  };

  const handleDeleteFaculty = async (id: number) => {
    await db.faculty.delete(id);
    showToast('Faculty Deleted', undefined, 'info');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-36 space-y-8 animate-fade-in-up">
      {/* Subjects Section */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-neutral-900 dark:text-white" /> Class Subjects ({subjects.length})
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Course subjects taught in the department
            </p>
          </div>
          <button
            onClick={handleOpenAddSubject}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Subject
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(s => (
            <div
              key={s.id}
              className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] flex items-center justify-between gap-3"
            >
              <div>
                <span className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-mono text-[11px] font-bold">
                  {s.code}
                </span>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white mt-1.5">
                  {s.name}
                </h4>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEditSubject(s)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-[#333333]"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteSubject(s.id!)}
                  className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-neutral-200 dark:hover:bg-[#333333]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Faculty Section */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-neutral-900 dark:text-white" /> Faculty Members ({facultyList.length})
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Professors and instructors assigned to classes
            </p>
          </div>
          <button
            onClick={handleOpenAddFaculty}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Faculty
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {facultyList.map(f => (
            <div
              key={f.id}
              className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] flex items-center justify-between gap-3"
            >
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {f.name}
                </h4>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 block mt-0.5">
                  {f.department}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEditFaculty(f)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-[#333333]"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteFaculty(f.id!)}
                  className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-neutral-200 dark:hover:bg-[#333333]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Subject Modal */}
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title={editingSubject ? 'Edit Subject' : 'Add Subject'}
      >
        <FieldGroup className="text-xs font-semibold">
          <Field>
            <FieldLabel htmlFor="subject-code">
              Subject Code *
            </FieldLabel>
            <Input
              id="subject-code"
              placeholder="e.g. CS101"
              value={subCode}
              onChange={e => setSubCode(e.target.value)}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="subject-name">
              Subject Name *
            </FieldLabel>
            <Input
              id="subject-name"
              placeholder="e.g. Data Structures & Algorithms"
              value={subName}
              onChange={e => setSubName(e.target.value)}
              required
            />
          </Field>

          <FieldSeparator />

          <Field orientation="horizontal" className="justify-end gap-3 pt-1">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsSubjectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveSubject}
            >
              Save Subject
            </Button>
          </Field>
        </FieldGroup>
      </Modal>

      {/* Add / Edit Faculty Modal */}
      <Modal
        isOpen={isFacultyModalOpen}
        onClose={() => setIsFacultyModalOpen(false)}
        title={editingFaculty ? 'Edit Faculty' : 'Add Faculty'}
      >
        <FieldGroup className="text-xs font-semibold">
          <Field>
            <FieldLabel htmlFor="faculty-name">
              Faculty Name *
            </FieldLabel>
            <Input
              id="faculty-name"
              placeholder="e.g. Dr. Rajesh Kumar"
              value={facName}
              onChange={e => setFacName(e.target.value)}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="faculty-dept">
              Department
            </FieldLabel>
            <Input
              id="faculty-dept"
              placeholder="e.g. Computer Science"
              value={facDept}
              onChange={e => setFacDept(e.target.value)}
            />
          </Field>

          <FieldSeparator />

          <Field orientation="horizontal" className="justify-end gap-3 pt-1">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsFacultyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveFaculty}
            >
              Save Faculty
            </Button>
          </Field>
        </FieldGroup>
      </Modal>
    </div>
  );
};
