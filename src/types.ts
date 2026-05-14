export type UserRole = 'ADMIN' | 'MANAGER' | 'VIEWER';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  google_refresh_token?: string;
  role: UserRole;
  department_id?: string;
  created_at: string;
}

export interface InternalDepartment {
  id: string;
  name: string;
  created_at: string;
}

export interface MailMessage {
  id: string;
  sender_id: string;
  receiver_dept_id: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
  attachments?: DocumentAttachment[];
  sender?: UserProfile;
  receiver_dept?: InternalDepartment;
}

export type DocumentType = 'INCOMING' | 'OUTGOING';

export type DocumentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export interface DocumentHistory {
  id: string;
  date: string;
  action: string;
  notes: string;
  user: string; // Who performed the action
  attachments?: DocumentAttachment[];
}

export interface DocumentAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string; // URL for downloading or viewing
}

export interface OfficialDocument {
  id: string;
  referenceNumber: string; // رقم الكتاب
  type: DocumentType; // نوع الكتاب (صادر/وارد)
  subject: string; // الموضوع
  department: string; // الجهة الصادر منها أو الوارد إليها
  internalDepartment?: string; // القسم الداخلي المعني (للكتب الصادرة خصوصاً)
  assignedTo: string; // الجهة/الموظف المكلف بالمتابعة
  date: string; // تاريخ الكتاب
  createdAt: string; // تاريخ الإضافة للنظام
  status: DocumentStatus; // حالة الكتاب
  dueDate?: string; // تاريخ الاستحقاق (إن وجد)
  notes: string; // ملاحظات عامة
  attachments?: DocumentAttachment[]; // المرفقات
  history: DocumentHistory[]; // سجل الإجراءات
}
