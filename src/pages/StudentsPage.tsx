import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Student } from '../types';
import { useNotification } from '../context/NotificationContext';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from '@/components/ui/select';
import {
  Users,
  Plus,
  Search,
  FileSpreadsheet,
  Trash2,
  Edit2,
  CheckSquare,
  Upload,
  UserPlus,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { SkeletonTableRows } from '@/components/ui/skeleton';

export const StudentsPage: React.FC = () => {
  const { showToast } = useNotification();
  const rawStudents = useLiveQuery(() => db.students.toArray());
  const isLoading = rawStudents === undefined;
  const students = rawStudents || [];

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form State
  const [regNo, setRegNo] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [batchSection, setBatchSection] = useState<string>('CS-A');

  // Selection & Bulk Delete
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState<boolean>(false);

  // Batches
  const batchSections = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.batchSection) set.add(s.batchSection);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(st => {
      const matchesSearch =
        st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.registerNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBatch = selectedBatch === 'all' || st.batchSection === selectedBatch;
      return matchesSearch && matchesBatch;
    });
  }, [students, searchQuery, selectedBatch]);

  // Add or Edit Student
  const handleOpenAdd = () => {
    setEditingStudent(null);
    setRegNo('');
    setName('');
    setBatchSection('CS-A');
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setRegNo(student.registerNo);
    setName(student.name);
    setBatchSection(student.batchSection);
    setIsAddEditOpen(true);
  };

  const handleSaveStudent = async () => {
    if (!regNo.trim() || !name.trim()) {
      showToast('Validation Error', 'Register No and Student Name are required', 'error');
      return;
    }

    try {
      if (editingStudent && editingStudent.id) {
        await db.students.update(editingStudent.id, {
          registerNo: regNo.trim(),
          name: name.trim(),
          batchSection: batchSection.trim()
        });
        showToast('Student Updated', `${name} details updated`, 'success');
      } else {
        await db.students.add({
          registerNo: regNo.trim(),
          name: name.trim(),
          batchSection: batchSection.trim()
        });
        showToast('Student Added', `${name} added to roster`, 'success');
      }

      setIsAddEditOpen(false);
    } catch (err) {
      showToast('Save Error', String(err), 'error');
    }
  };

  const handleDeleteSingle = async (id: number) => {
    await db.students.delete(id);
    setSelectedIds(prev => prev.filter(i => i !== id));
    showToast('Student Removed', undefined, 'info');
  };

  // Select all / toggle
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map(s => s.id!));
    }
  };

  const handleBulkDelete = async () => {
    await db.students.bulkDelete(selectedIds);
    showToast('Bulk Delete Completed', `Removed ${selectedIds.length} students`, 'success');
    setSelectedIds([]);
  };

  // CSV / Excel File Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async results => {
          await processImportData(results.data);
        }
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = async evt => {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
        await processImportData(rows);
      };
      reader.readAsBinaryString(file);
    }
    e.target.value = '';
  };

  const processImportData = async (rows: any[]) => {
    let count = 0;
    const newStudents: Student[] = [];

    rows.forEach(row => {
      // Flexible column headers
      const reg = row.registerNo || row['Register No'] || row['RegisterNo'] || row['RegNo'] || row['RollNo'] || row['Roll No'];
      const stName = row.name || row['Name'] || row['Student Name'] || row['StudentName'];
      const batch = row.batchSection || row['Batch'] || row['Section'] || row['BatchSection'] || 'CS-A';

      if (reg && stName) {
        newStudents.push({
          registerNo: String(reg).trim(),
          name: String(stName).trim(),
          batchSection: String(batch).trim()
        });
        count++;
      }
    });

    if (newStudents.length > 0) {
      await db.students.bulkAdd(newStudents);
      showToast('Import Successful', `Imported ${count} students into roster`, 'success');
    } else {
      showToast('Import Warning', 'No valid student records found in file. Ensure headers include Register No and Name.', 'warning');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-36 space-y-6 animate-fade-in-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-neutral-900 dark:text-white" /> Roster Management
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Total {students.length} students enrolled in the class database
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* CSV/Excel Import */}
          <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-[#262626] text-neutral-800 dark:text-neutral-200 text-xs font-semibold hover:bg-neutral-200 dark:hover:bg-[#333333] cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-neutral-600 dark:text-neutral-400" /> Import CSV / Excel
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Add Student */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Filter & Bulk Bar */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="flex-1 max-w-md relative">
            <InputGroup className="overflow-hidden">
              <InputGroupAddon align="inline-start">
                <Search className={`w-4 h-4 transition-colors ${searchQuery ? 'text-[var(--accent-tertiary)]' : 'text-neutral-400'}`} />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search student or roll number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <InputGroupAddon align="inline-end">
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-all animate-badge-pop"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </InputGroupAddon>
              )}
            </InputGroup>

            {/* Animated scanning bar when search has input */}
            {searchQuery && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-full pointer-events-none">
                <div className="w-full h-full bg-gradient-to-r from-transparent via-[var(--accent-tertiary)] to-transparent animate-search-scan" />
              </div>
            )}
          </div>

          {batchSections.length > 0 && (
            <div className="w-40 shrink-0">
              <Select
                value={selectedBatch}
                onValueChange={val => setSelectedBatch(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Batches</SelectItem>
                    {batchSections.map(b => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Bulk delete trigger if items selected */}
        {selectedIds.length > 0 && (
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Student List Table */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#262626] text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredStudents.length}
                    onChange={toggleSelectAll}
                    className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-900"
                  />
                </th>
                <th className="p-4">Register No</th>
                <th className="p-4">Student Name</th>
                <th className="p-4">Batch / Section</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-xs font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-4">
                    <SkeletonTableRows rows={5} />
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400 dark:text-neutral-500 italic">
                    No student records found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const isSelected = selectedIds.includes(student.id!);
                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-neutral-50 dark:hover:bg-[#262626]/50 transition-colors animate-result-fade ${
                        isSelected ? 'bg-neutral-100/80 dark:bg-[#262626]' : ''
                      }`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(student.id!)}
                          className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-900"
                        />
                      </td>
                      <td className="p-4 font-bold text-neutral-900 dark:text-white font-mono">
                        {student.registerNo}
                      </td>
                      <td className="p-4 text-neutral-800 dark:text-neutral-200 font-semibold">
                        {student.name}
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-[#262626] text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                          {student.batchSection}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(student)}
                            className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-[#262626] transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSingle(student.id!)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#262626] transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingStudent ? 'Edit Student Details' : 'Add New Student'}
      >
        <FieldGroup className="text-xs font-semibold">
          <Field>
            <FieldLabel htmlFor="student-regno">
              Register / Roll No *
            </FieldLabel>
            <Input
              id="student-regno"
              placeholder="e.g. 2026CS001"
              value={regNo}
              onChange={e => setRegNo(e.target.value)}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="student-name">
              Student Full Name *
            </FieldLabel>
            <Input
              id="student-name"
              placeholder="e.g. Aarav Sharma"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="student-batch">
              Batch / Section
            </FieldLabel>
            <Input
              id="student-batch"
              placeholder="e.g. CS-A"
              value={batchSection}
              onChange={e => setBatchSection(e.target.value)}
            />
          </Field>

          <FieldSeparator />

          <Field orientation="horizontal" className="justify-end gap-3 pt-1">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsAddEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveStudent}
            >
              Save Student
            </Button>
          </Field>
        </FieldGroup>
      </Modal>

      {/* Bulk Delete Confirm */}
      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Confirm Bulk Deletion"
        message={`Are you sure you want to delete ${selectedIds.length} selected students? This action cannot be undone.`}
        confirmText="Delete Students"
      />
    </div>
  );
};
