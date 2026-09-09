import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useNotification } from '../context/NotificationContext';
import { triggerHaptic } from '../utils/haptics';
import {
  User,
  Camera,
  Trash2,
  Save,
  Check,
  Building,
  GraduationCap,
  Mail,
  Phone,
  Hash,
  FileText,
  Calendar,
  Users,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/components/ui/avatar';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '@/components/ui/field';

interface ProfilePageProps {
  setActiveTab: (tab: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ setActiveTab }) => {
  const { showToast } = useNotification();

  const settingsList = useLiveQuery(() => db.settings.toArray());
  const currentSettings = settingsList?.[0];

  const students = useLiveQuery(() => db.students.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const faculty = useLiveQuery(() => db.faculty.toArray()) || [];

  // Profile fields state
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [classRepName, setClassRepName] = useState<string>('');
  const [rollNumber, setRollNumber] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [bio, setBio] = useState<string>('');

  // Class affiliation fields
  const [className, setClassName] = useState<string>('');
  const [section, setSection] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('');
  const [semester, setSemester] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with currentSettings
  useEffect(() => {
    if (currentSettings) {
      setProfilePhoto(currentSettings.profilePhoto || '');
      setClassRepName(currentSettings.classRepName || 'Class Representative');
      setRollNumber(currentSettings.rollNumber || '');
      setEmail(currentSettings.email || '');
      setPhone(currentSettings.phone || '');
      setBio(currentSettings.bio || '');

      setClassName(currentSettings.className || 'Class 5101');
      setSection(currentSettings.section || 'Section A');
      setDepartment(currentSettings.department || 'General Engineering');
      setAcademicYear(currentSettings.academicYear || '2026 - 2027');
      setSemester(currentSettings.semester || 'Semester 1');
    }
  }, [currentSettings]);

  // Handle Photo Upload with client-side compression
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Invalid File', 'Please select an image file (JPG, PNG, WebP)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize image to max 400x400 to optimize IndexedDB storage and rendering
        const maxDim = 400;
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setProfilePhoto(compressedDataUrl);
          triggerHaptic('light');
          showToast('Photo Selected', 'Click "Save Profile" to keep your new photo', 'info');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    triggerHaptic('light');
    setProfilePhoto('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Photo Removed', 'Default initials will be displayed', 'info');
  };

  // Save profile changes to IndexedDB
  const handleSaveProfile = async () => {
    if (!classRepName.trim()) {
      showToast('Name Required', 'Please provide your full name', 'warning');
      return;
    }

    setIsSaving(true);
    triggerHaptic('medium');

    try {
      if (currentSettings?.id) {
        await db.settings.update(currentSettings.id, {
          profilePhoto,
          classRepName: classRepName.trim(),
          rollNumber: rollNumber.trim(),
          email: email.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
          className: className.trim(),
          section: section.trim(),
          department: department.trim(),
          academicYear: academicYear.trim(),
          semester: semester.trim(),
        });
      } else {
        await db.settings.add({
          theme: 'system',
          profilePhoto,
          classRepName: classRepName.trim(),
          rollNumber: rollNumber.trim(),
          email: email.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
          className: className.trim(),
          section: section.trim(),
          department: department.trim(),
          academicYear: academicYear.trim(),
          semester: semester.trim(),
          disableSaturday: true,
          classReminderOffset: 10,
          examReminderOffset: 1440,
          holidays: [],
          notificationsEnabled: true,
        });
      }

      showToast('Profile Saved', 'Personal information and photo updated successfully', 'success');
    } catch (err) {
      showToast('Save Failed', String(err), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Initials for avatar fallback
  const initials = classRepName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('') || 'CR';

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 pb-32 sm:pb-36 space-y-4 sm:space-y-6 animate-fade-in-up">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Top Header & Mobile Navigation */}
      <div className="flex items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('settings');
            }}
            className="w-9 h-9 rounded-2xl bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#262626] transition-all shrink-0"
            title="Back to Settings"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white tracking-tight leading-none">
              Representative Profile
            </h1>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">
              Personal credentials & class affiliation
            </p>
          </div>
        </div>

        {/* Quick Save Header Button on Smartphone */}
        <Button
          type="button"
          onClick={handleSaveProfile}
          disabled={isSaving}
          size="sm"
          className="rounded-full gap-1.5 text-xs font-bold shadow-sm px-4 h-9"
        >
          {isSaving ? <Check className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Save</span>
        </Button>
      </div>

      {/* Profile Header Hero Card */}
      <Card className="overflow-hidden border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#171717]">
        {/* Decorative Top Accent Banner */}
        <div className="h-28 sm:h-36 bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-700 dark:from-neutral-900 dark:via-[#1f1f1f] dark:to-neutral-800 relative px-4 py-3 sm:p-6 flex items-start justify-end">
          <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-[10px] sm:text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Class Representative</span>
          </div>
        </div>

        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 -mt-12 sm:-mt-16 relative space-y-4 sm:space-y-5">
          {/* Avatar & Action row */}
          <div className="flex items-end justify-between gap-3">
            <div className="relative group shrink-0">
              <Avatar className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl ring-4 ring-white dark:ring-[#171717] shadow-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 overflow-hidden">
                {profilePhoto ? (
                  <img src={profilePhoto} alt={classRepName} className="w-full h-full object-cover rounded-3xl" />
                ) : (
                  <AvatarFallback className="rounded-3xl text-2xl sm:text-3xl font-black bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>

              {/* Upload photo trigger button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload Profile Photo"
                className="absolute -bottom-1 -right-1 p-2.5 rounded-2xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-lg border-2 border-white dark:border-[#171717] hover:scale-105 active:scale-95 transition-all"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 pb-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full gap-1.5 text-xs font-bold px-3 py-1.5 h-8 sm:h-9"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{profilePhoto ? 'Change Photo' : 'Upload Photo'}</span>
              </Button>
              {profilePhoto && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePhoto}
                  className="rounded-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold px-2.5 h-8 sm:h-9"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </Button>
              )}
            </div>
          </div>

          {/* Identity info */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                {classRepName || 'Class Representative'}
              </h2>
              {rollNumber && (
                <Badge variant="secondary" className="font-mono text-[11px] sm:text-xs font-bold">
                  {rollNumber}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium flex flex-wrap items-center gap-1 sm:gap-1.5">
              <span>{department}</span>
              <span>•</span>
              <span>{className} ({section})</span>
              <span>•</span>
              <span className="font-bold text-neutral-800 dark:text-neutral-200">{semester}</span>
            </p>
            {bio && (
              <p className="text-xs text-neutral-600 dark:text-neutral-300 pt-0.5 font-medium italic">
                "{bio}"
              </p>
            )}
          </div>

          <Separator />

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-neutral-50 dark:bg-[#202020] border border-neutral-100 dark:border-neutral-800 text-center min-w-0">
              <div className="flex items-center justify-center gap-1 text-neutral-400 text-[10px] sm:text-xs font-bold uppercase mb-0.5 truncate">
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate">Students</span>
              </div>
              <div className="text-base sm:text-lg font-black text-neutral-900 dark:text-white font-mono">
                {students.length}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-2xl bg-neutral-50 dark:bg-[#202020] border border-neutral-100 dark:border-neutral-800 text-center min-w-0">
              <div className="flex items-center justify-center gap-1 text-neutral-400 text-[10px] sm:text-xs font-bold uppercase mb-0.5 truncate">
                <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate">Subjects</span>
              </div>
              <div className="text-base sm:text-lg font-black text-neutral-900 dark:text-white font-mono">
                {subjects.length}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-2xl bg-neutral-50 dark:bg-[#202020] border border-neutral-100 dark:border-neutral-800 text-center min-w-0">
              <div className="flex items-center justify-center gap-1 text-neutral-400 text-[10px] sm:text-xs font-bold uppercase mb-0.5 truncate">
                <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate">Faculty</span>
              </div>
              <div className="text-base sm:text-lg font-black text-neutral-900 dark:text-white font-mono">
                {faculty.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information Form Card */}
      <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#171717]">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-700 dark:text-neutral-300" />
            <span>Personal & Representative Information</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Update your representative profile details, contact information, and role description.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3.5 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field>
              <FieldLabel htmlFor="profile-rep-name">Full Name / Representative Name</FieldLabel>
              <Input
                id="profile-rep-name"
                type="text"
                placeholder="e.g. Anand"
                value={classRepName}
                onChange={e => setClassRepName(e.target.value)}
              />
              <FieldDescription>Displayed in the top navigation greeting and reports.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="profile-roll">Roll / Register Number</FieldLabel>
              <Input
                id="profile-roll"
                type="text"
                placeholder="e.g. 917621104001"
                value={rollNumber}
                onChange={e => setRollNumber(e.target.value)}
              />
              <FieldDescription>Your institutional register or student ID number.</FieldDescription>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field>
              <FieldLabel htmlFor="profile-email">Email Address</FieldLabel>
              <Input
                id="profile-email"
                type="email"
                placeholder="e.g. student@college.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="profile-phone">Contact / Phone Number</FieldLabel>
              <Input
                id="profile-phone"
                type="tel"
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="profile-bio">About / Role Description</FieldLabel>
            <Textarea
              id="profile-bio"
              rows={2}
              placeholder="e.g. Class Representative for Mechanical Engineering, Batch 2024-2028."
              value={bio}
              onChange={e => setBio(e.target.value)}
            />
            <FieldDescription>A brief note about your responsibilities or batch.</FieldDescription>
          </Field>
        </CardContent>
      </Card>

      {/* Class & Academic Affiliation Card */}
      <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#171717]">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Building className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-700 dark:text-neutral-300" />
            <span>Class & Academic Affiliation</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Manage class metadata linked to automated attendance sheets, timetables, and exports.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3.5 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field>
              <FieldLabel htmlFor="profile-class-name">Class / Degree Name</FieldLabel>
              <Input
                id="profile-class-name"
                type="text"
                placeholder="e.g. Class 5101 / B.E Mech"
                value={className}
                onChange={e => setClassName(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="profile-section">Batch / Section</FieldLabel>
              <Input
                id="profile-section"
                type="text"
                placeholder="e.g. Section A"
                value={section}
                onChange={e => setSection(e.target.value)}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="profile-dept">Department</FieldLabel>
            <Input
              id="profile-dept"
              type="text"
              placeholder="e.g. Mechanical Engineering"
              value={department}
              onChange={e => setDepartment(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field>
              <FieldLabel htmlFor="profile-academic-year">Academic Year</FieldLabel>
              <Input
                id="profile-academic-year"
                type="text"
                placeholder="e.g. 2026 - 2027"
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="profile-semester">Semester</FieldLabel>
              <Input
                id="profile-semester"
                type="text"
                placeholder="e.g. Semester 5"
                value={semester}
                onChange={e => setSemester(e.target.value)}
              />
            </Field>
          </div>
        </CardContent>

        <CardFooter className="p-4 sm:p-6 pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 border-t border-neutral-100 dark:border-neutral-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('settings');
            }}
            className="gap-2 text-xs font-bold w-full sm:w-auto"
          >
            <span>Full System Settings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="gap-2 rounded-full text-xs font-bold shadow-md px-6 w-full sm:w-auto"
          >
            {isSaving ? <Check className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Profile</span>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
