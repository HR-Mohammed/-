import React, { createContext, useContext, useState, useEffect } from 'react';
import { OfficialDocument, DocumentStatus, DocumentHistory, DocumentAttachment, UserRole, UserProfile, InternalDepartment } from '../types';
import { supabase } from '../lib/supabase';

interface DocumentContextType {
  documents: OfficialDocument[];
  loading: boolean;
  userRole: UserRole | null;
  userName: string | null;
  userProfile: UserProfile | null;
  internalDepartments: InternalDepartment[];
  isGoogleDriveConnected: boolean;
  connectGoogleDrive: () => Promise<void>;
  addDocument: (doc: Omit<OfficialDocument, 'id' | 'history' | 'createdAt'>) => Promise<void>;
  updateDocumentStatus: (id: string, status: DocumentStatus, action: string, notes: string, user: string, attachments?: DocumentAttachment[]) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  updateDocument: (id: string, updates: Partial<OfficialDocument>) => Promise<void>;
  uploadFile: (file: File) => Promise<DocumentAttachment | null>;
  uploadFileToDrive: (file: File) => Promise<DocumentAttachment | null>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  updateUserProfile: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
  fetchAllProfiles: () => Promise<UserProfile[]>;
  addInternalDepartment: (name: string) => Promise<void>;
  deleteInternalDepartment: (id: string) => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<OfficialDocument[]>([]);
  const [internalDepartments, setInternalDepartments] = useState<InternalDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
  const [googleRefreshToken, setGoogleRefreshToken] = useState<string | null>(null);

  // Load from Supabase on mount
  useEffect(() => {
    fetchDocuments();
    fetchUserRole();
    fetchInternalDepartments();
  }, []);

  const fetchInternalDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('internal_departments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.error('Table internal_departments is missing. Please run the SQL migration.');
          setInternalDepartments([]);
          return;
        }
        throw error;
      }
      setInternalDepartments(data || []);
    } catch (error) {
      console.error('Error fetching internal departments:', error);
    }
  };

  const addInternalDepartment = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('internal_departments')
        .insert([{ name }])
        .select()
        .single();

      if (error) {
        if (error.code === '42P01') {
          throw new Error('جدول الأقسام غير موجود في قاعدة البيانات. يرجى مراجعة مسؤول النظام.');
        }
        throw error;
      }
      if (data) {
        setInternalDepartments(prev => [data, ...prev]);
      }
    } catch (error: any) {
      console.error('Error adding internal department:', error);
      throw error;
    }
  };

  const deleteInternalDepartment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('internal_departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setInternalDepartments(prev => prev.filter(dept => dept.id !== id));
    } catch (error: any) {
      console.error('Error deleting internal department:', error);
      throw error;
    }
  };

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserRole(null);
        return;
      }

      // 1. Check if it's the main admin email
      const isMainAdmin = user.email === 'it.moh.k.smart@gmail.com';

      // 2. Fetch from DB
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Profile doesn't exist
          const defaultRole = isMainAdmin ? 'ADMIN' : 'VIEWER';
          const { error: insertError } = await supabase.from('profiles').insert([
            { id: user.id, email: user.email, role: defaultRole }
          ]);
          if (!insertError) {
            setUserRole(defaultRole);
            setUserName(user.email);
          }
        } else {
          console.error('RLS or DB Error:', error.message);
          // Fallback to hardcoded role if DB fails
          if (isMainAdmin) setUserRole('ADMIN');
          else setUserRole('VIEWER');
          setUserName(user.email);
        }
        return;
      }

      setUserRole(isMainAdmin ? 'ADMIN' : (data.role as UserRole));
      setUserName(data.full_name || user.email);
      setUserProfile(data);
      setGoogleRefreshToken(data.google_refresh_token || null);
      setIsGoogleDriveConnected(!!data.google_refresh_token);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('VIEWER');
    }
  };

  const fetchAllProfiles = async (): Promise<UserProfile[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching all profiles:', error);
      throw new Error(error.message || 'فشل جلب البيانات من جدول profiles');
    }
  };

  const updateUserRole = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  };

  const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      // Update local state if it's the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === userId) {
        setUserProfile(prev => prev ? { ...prev, ...updates } : null);
        if (updates.full_name) setUserName(updates.full_name);
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const connectGoogleDrive = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      
      const width = 600;
      const height = 700;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;
      
      const authWindow = window.open(url, 'google_auth', `width=${width},height=${height},left=${left},top=${top}`);
      
      const handleMessage = async (event: MessageEvent) => {
        console.log('Received message from popup:', event.data?.type);
        
        if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
          const { tokens } = event.data;
          console.log('Tokens object received in client:', { 
            hasRefreshToken: !!tokens.refresh_token,
            hasAccessToken: !!tokens.access_token 
          });

          if (tokens.refresh_token) {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                console.log('Updating profile for user:', user.id);
                await updateUserProfile(user.id, { google_refresh_token: tokens.refresh_token });
                setGoogleRefreshToken(tokens.refresh_token);
                setIsGoogleDriveConnected(true);
                alert('تم ربط جوجل درايف بنجاح!');
              } else {
                console.error('No user found when trying to link drive');
              }
            } catch (err: any) {
              console.error('Error in post-auth logic:', err);
              alert('حدث خطأ أثناء حفظ بيانات الربط: ' + err.message);
            }
          } else {
            console.warn('Refresh token missing in success message');
            alert('تم تسجيل الدخول ولكن لم يتم استلام مفتاح التحديث (Refresh Token). يرجى التأكد من أنك وافقت على جميع الصلاحيات، أو قم بإلغاء صلاحية التطبيق من حساب جوجل ثم أعد المحاولة.');
          }
          window.removeEventListener('message', handleMessage);
        }
      };
      
      window.addEventListener('message', handleMessage);
    } catch (error) {
      console.error('Error connecting to Google Drive:', error);
    }
  };

  const uploadFileToDrive = async (file: File): Promise<DocumentAttachment | null> => {
    if (!googleRefreshToken) return null;

    try {
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const payload = {
        refreshToken: googleRefreshToken,
        fileName: file.name,
        mimeType: file.type,
        fileData: base64Data
      };

      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        console.error('Drive upload failed with non-JSON response:', responseText.substring(0, 500));
        throw new Error('Upload failed - Server returned HTML: ' + responseText.substring(0, 100));
      }

      if (!response.ok) {
        if (data.error === 'invalid_grant' || data.error?.includes('invalid_grant')) {
          throw new Error('انتهت صلاحية جلسة Google Drive. يرجى إعادة ربط حساب جوجل درايف.');
        }
        throw new Error(data.error || 'Upload failed');
      }

      return {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: data.webViewLink
      };
    } catch (error) {
      console.error('Error uploading to Drive:', error);
      throw error;
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File): Promise<DocumentAttachment | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message === 'Bucket not found' || uploadError.message.includes('Bucket not found')) {
          throw new Error('يرجى إنشاء حاوية (Bucket) في Supabase Storage باسم "attachments" وجعلها Public.');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      return {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: publicUrl
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const addDocument = async (docData: Omit<OfficialDocument, 'id' | 'history' | 'createdAt'>) => {
    try {
      const newDoc: OfficialDocument = {
        ...docData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        history: [{
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          action: 'تسجيل كتاب جديد',
          notes: 'تم إدخال الكتاب في النظام',
          user: userName || 'مدير النظام',
          attachments: docData.attachments
        }]
      };

      console.log('Attempting to add document:', newDoc);

      const { error } = await supabase
        .from('documents')
        .insert([newDoc]);

      if (error) {
        console.error('Supabase insert error:', error);
        alert(`فشل حفظ المعاملة في قاعدة البيانات: ${error.message}`);
        throw error;
      }
      
      setDocuments(prev => [newDoc, ...prev]);
    } catch (error: any) {
      console.error('Detailed Error adding document:', error);
      alert('حدث خطأ غير متوقع أثناء إضافة المعاملة. يرجى التأكد من اتصال الإنترنت أو مراجعة مدير النظام.');
      throw error;
    }
  };

  const updateDocumentStatus = async (id: string, status: DocumentStatus, action: string, notes: string, user: string, newAttachments?: DocumentAttachment[]) => {
    try {
      const docToUpdate = documents.find(d => d.id === id);
      if (!docToUpdate) return;

      const newHistoryEntry: DocumentHistory = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        action,
        notes,
        user,
        attachments: newAttachments
      };
      
      const updatedAttachments = [...(docToUpdate.attachments || []), ...(newAttachments || [])];
      const updatedHistory = [...(docToUpdate.history || []), newHistoryEntry];

      console.log('Updating document status:', { id, status, updatedAttachments });

      const { error } = await supabase
        .from('documents')
        .update({
          status,
          attachments: updatedAttachments,
          history: updatedHistory
        })
        .eq('id', id);

      if (error) {
        console.error('Supabase update error:', error);
        alert(`فشل تحديث حالة المعاملة: ${error.message}`);
        throw error;
      }

      setDocuments(prev => prev.map(doc => 
        doc.id === id ? { ...doc, status, attachments: updatedAttachments, history: updatedHistory } : doc
      ));
      alert('تم تحديث حالة المعاملة بنجاح');
    } catch (error: any) {
      console.error('Detailed Error updating document status:', error);
      alert('حدث خطأ أثناء تحديث الحالة. يرجى المحاولة مرة أخرى.');
      throw error;
    }
  };

  const updateDocument = async (id: string, updates: Partial<OfficialDocument>) => {
    try {
      const docToUpdate = documents.find(d => d.id === id);
      if (!docToUpdate) throw new Error('المعاملة غير موجودة');

      // Create history entries for each changed field
      const newHistoryEntries: DocumentHistory[] = [];
      const changedFields = [];
      
      const fieldTranslations: Record<string, string> = {
        subject: 'الموضوع',
        department: 'مصدر / وجهة الكتاب',
        internalDepartment: 'القسم الداخلي',
        assignedTo: 'المكلف بالمتابعة'
      };

      for (const [key, value] of Object.entries(updates)) {
        if (docToUpdate[key as keyof OfficialDocument] !== value) {
          changedFields.push(`${fieldTranslations[key] || key} من "${docToUpdate[key as keyof OfficialDocument] || ''}" إلى "${value || ''}"`);
        }
      }

      if (changedFields.length > 0) {
        newHistoryEntries.push({
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toISOString(),
          action: 'تعديل بيانات المعاملة',
          notes: changedFields.join('، '),
          user: userName || 'المستخدم الحالي'
        });
      }

      const updatedHistory = [...(docToUpdate.history || []), ...newHistoryEntries];
      const finalUpdates = { ...updates, history: updatedHistory };

      const { error } = await supabase
        .from('documents')
        .update(finalUpdates)
        .eq('id', id);

      if (error) throw error;

      setDocuments(prev => prev.map(doc => 
        doc.id === id ? { ...doc, ...finalUpdates } : doc
      ));
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  return (
    <DocumentContext.Provider value={{ 
      documents, 
      loading, 
      userRole, 
      userName, 
      userProfile,
      internalDepartments,
      isGoogleDriveConnected, 
      connectGoogleDrive, 
      addDocument, 
      updateDocumentStatus, 
      deleteDocument, 
      updateDocument, 
      uploadFile, 
      uploadFileToDrive, 
      updateUserRole, 
      updateUserProfile, 
      fetchAllProfiles,
      addInternalDepartment,
      deleteInternalDepartment
    }}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};
