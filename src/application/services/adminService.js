

import {
  findAllAdmins,
  findAdminById,
  upsertAdmin,
  setAdminStatus,
  removeAdmin,
  isSystemAdmin,
  upsertSystemAdmin,
  insertInvitation,
  findSystemLogs,
  checkUserPermissions,
} from '../../infrastructure/repositories/adminRepository.js';

import { logEmail } from '../../infrastructure/external/emailService.js';

export const getAllAdmins = findAllAdmins;
export { checkUserPermissions };

export const setupCurrentUserAsAdmin = async (currentUser) => {
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('يجب تسجيل الدخول وتأكيد البريد الإلكتروني أولاً');
  }

  const { uid: userId, email: userEmail } = currentUser;

  await upsertAdmin(userId, {
    email:       userEmail,
    role:        'super_admin',
    permissions: ['read', 'write', 'delete', 'manage_sites', 'manage_media'],
    isActive:    true,
    emailVerified: currentUser.emailVerified,
    createdAt:   new Date().toISOString(),
    createdBy:   'self_registration',
    status:      'active',
  });

  await upsertSystemAdmin(userId, {
    email:       userEmail,
    role:        'system_admin',
    permissions: ['full_access', 'manage_admins', 'manage_system', 'view_logs'],
    isActive:    true,
    emailVerified: currentUser.emailVerified,
    createdAt:   new Date().toISOString(),
    lastLogin:   new Date().toISOString(),
    createdBy:   'self_registration',
    status:      'active',
    systemLevel: true,
  });

  return { success: true, message: 'تم إعداد صلاحيات الأدمن بنجاح', userEmail, userId };
};

export const createAdminInvitation = async (currentUserEmail, { email, role, permissions }) => {
  const isAdmin = await isSystemAdmin(currentUserEmail);
  if (!isAdmin) throw new Error('ليس لديك صلاحية إنشاء دعوات');

  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

  const id = await insertInvitation({
    email,
    role,
    permissions,
    status:    'pending',
    createdBy: currentUserEmail,
    token,
  });

  return { id, email, role, permissions, token };
};

export const updateAdminStatus = async (currentUserEmail, adminId, status) => {
  if (!(await isSystemAdmin(currentUserEmail))) {
    throw new Error('ليس لديك صلاحية تحديث حالة الأدمن');
  }
  await setAdminStatus(adminId, status);
};

export const deleteAdmin = async (currentUserEmail, adminId) => {
  if (!(await isSystemAdmin(currentUserEmail))) {
    throw new Error('ليس لديك صلاحية حذف الأدمن');
  }
  await removeAdmin(adminId);
};

export const getSystemLogs = async (currentUserEmail, maxResults = 100) => {
  if (!(await isSystemAdmin(currentUserEmail))) {
    throw new Error('ليس لديك صلاحية عرض سجلات النظام');
  }
  return findSystemLogs(maxResults);
};

const buildInvitationTemplate = (invitationLink, role, permissions) => `
  <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
    <h1 style="color:#4D3873;">مرحباً بك في نظام الإدارة</h1>
    <p>تمت دعوتك للانضمام كـ <strong>${role}</strong></p>
    <ul>${permissions.map(p => `<li>${p}</li>`).join('')}</ul>
    <a href="${invitationLink}" style="display:inline-block;padding:12px 24px;background:#4D3873;color:#fff;text-decoration:none;border-radius:4px;">
      تفعيل الحساب
    </a>
    <p style="font-size:12px;color:#666;">الرابط صالح لمدة 24 ساعة</p>
  </div>
`;

export const sendAdminInvitation = async (email, role, permissions, token) => {
  const link = `${window.location.origin}/admin-signup?token=${token}`;
  await logEmail({
    to:      email,
    subject: 'دعوة للانضمام إلى نظام الإدارة',
    html:    buildInvitationTemplate(link, role, permissions),
    type:    'admin_invitation',
  });
  return true;
};
