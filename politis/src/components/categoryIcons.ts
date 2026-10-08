import { Baby, Briefcase, Car, GraduationCap, HeartPulse, House, Receipt, Search, type LucideIcon } from 'lucide-react-native';
import type { Category } from '@/types/models';

export const categoryIcons: Record<Category, LucideIcon> = {
  family: Baby,
  work: Briefcase,
  unemployment: Search,
  housing: House,
  education: GraduationCap,
  vehicle: Car,
  tax: Receipt,
  health: HeartPulse,
};
