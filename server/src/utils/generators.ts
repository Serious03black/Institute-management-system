import { v4 as uuidv4 } from 'uuid';

export function generateStudentId(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `STU${year}${rand}`;
}

export function generateFacultyId(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `FAC${year}${rand}`;
}

export function generateCourseId(): string {
  return `CRS${Date.now().toString().slice(-6)}`;
}

export function generateModuleId(): string {
  return `MOD${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
}

export function generateBatchId(): string {
  return `BAT${Date.now().toString().slice(-6)}`;
}

export function generateAttemptId(): string {
  return `ATT${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

export function generateExamUsername(studentId: string): string {
  const rand = Math.floor(100 + Math.random() * 900);
  return `EX${studentId}${rand}`;
}

export function generatePassword(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
