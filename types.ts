export enum CustomerStatus {
  Active = "فعال",
  Searching = "در جستجو",
  Cancelled = "منصرف شده",
  Contracted = "قرارداد بسته",
}

export enum InteractionType {
  Call = "تماس تلفنی",
  Email = "ایمیل",
  Meeting = "ملاقات حضوری",
  Note = "یادداشت",
}

export enum TaskPriority {
  High = "بالا",
  Medium = "متوسط",
  Low = "پایین",
}

export enum TransactionType {
    Sale = "فروش",
    Rent = "رهن و اجاره",
}

export interface Interaction {
  id: number;
  type: InteractionType;
  date: string;
  notes: string;
}

export interface Requirement {
  transactionType: TransactionType;
  propertyType: string;
  neighborhoods: string[];
  minArea: number;
  maxArea: number;
  bedrooms: number;
  budget?: number; // For Sale
  maxRahn?: number; // For Rent
  maxRent?: number; // For Rent
  features: string[];
  notes: string;
  tags: string[];
}

export interface Customer {
  id: number;
  name: string;
  phoneNumber: string;
  status: CustomerStatus;
  createdAt: string;
  requirements: Requirement;
  interactions: Interaction[];
}

export interface Property {
  id: number;
  title: string;
  address: string;
  transactionType: TransactionType;
  propertyType: string;
  area: number;
  bedrooms: number;
  price?: number; // For Sale
  rahn?: number; // For Rent
  rent?: number; // For Rent
  features: string[];
  description: string;
  createdAt: string;
}

export interface Task {
  id: number;
  title: string;
  dueDate: string;
  priority: TaskPriority;
  isCompleted: boolean;
  customerId?: number;
  createdAt: string;
}

export interface MatchResult {
  customerId: number;
  matchScore?: number;
  reasoning?: string;
}

export interface PropertyMatchResult {
  propertyId: number;
  matchScore?: number;
  reasoning?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface Team {
  id: number;
  name: string;
}