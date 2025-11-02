export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Domiciliación' | 'Bizum';

export interface Student {
  id: string;
  name: string;
  birthDate: string;
  phone: string;
  email: string;
  enrolledClassIds: string[];
  monthlyFee: number;
  paymentMethod: PaymentMethod;
  iban?: string;
  active: boolean;
  notes?: string;
}

export type Specialty = 'Fitness' | 'Baile Moderno' | 'Hip Hop' | 'Pilates' | 'Zumba' | 'Competición' | 'Contemporáneo' | 'Ballet';

export interface Instructor {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialties: Specialty[];
  ratePerClass: number;
  active: boolean;
  hireDate: string; // YYYY-MM-DD
  notes?: string;
}

export type DayOfWeek = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
export type ClassCategory = 'Fitness' | 'Baile Moderno' | 'Competición' | 'Especializada';

export interface DanceClass {
  id: string;
  name: string;
  instructorId: string;
  category: ClassCategory;
  days: DayOfWeek[];
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  capacity: number;
  baseRate: number;
}


export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: 'Clase Suelta' | 'Membresía Mensual' | 'Paquete';
}

export enum View {
  DASHBOARD = 'DASHBOARD',
  STUDENTS = 'STUDENTS',
  CLASSES = 'CLASSES',
  INSTRUCTORS = 'INSTRUCTORS',
  BILLING = 'BILLING',
  INTERACTIVE_SCHEDULE = 'INTERACTIVE_SCHEDULE',
}