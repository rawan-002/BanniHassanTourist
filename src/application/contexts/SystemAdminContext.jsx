

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import {
  getAllAdmins,
  createAdminInvitation,
  updateAdminStatus,
  deleteAdmin,
  getSystemLogs,
  checkUserPermissions,
} from '../services/adminService.js';
import { isSystemAdmin } from '../../infrastructure/repositories/adminRepository.js';

const SystemAdminContext = createContext();

export function SystemAdminProvider({ children }) {
  const { currentUser }           = useAuth();
  const [admins, setAdmins]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [isSystemAdminChecked, setIsSystemAdminChecked] = useState(false);
  const [isSysAdmin, setIsSysAdmin]     = useState(false);

  const checkSystemAdminStatus = async () => {
    if (!currentUser) {
      setIsSysAdmin(false);
      setIsSystemAdminChecked(true);
      return false;
    }
    try {
      const result = await isSystemAdmin(currentUser.email);
      setIsSysAdmin(result);
      setIsSystemAdminChecked(true);
      return result;
    } catch (err) {
      setError('حدث خطأ أثناء التحقق من صلاحيات System Admin');
      setIsSysAdmin(false);
      setIsSystemAdminChecked(true);
      return false;
    }
  };

  const fetchAdmins = async () => {
    if (!isSysAdmin) return;
    setLoading(true);
    setError(null);
    try {
      setAdmins(await getAllAdmins());
    } catch (err) {
      setError('حدث خطأ أثناء جلب قائمة الأدمنز');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) checkSystemAdminStatus();
    else { setIsSysAdmin(false); setIsSystemAdminChecked(true); }
  }, [currentUser]);

  useEffect(() => {
    if (isSysAdmin) fetchAdmins();
  }, [isSysAdmin]);

  const value = {
    admins,
    loading,
    error,
    isSystemAdmin:        isSysAdmin,
    isSystemAdminChecked,
    checkSystemAdminStatus,
    fetchAdmins,
    createAdminInvitation: (data) =>
      createAdminInvitation(currentUser?.email, data),
    updateAdminStatus: (adminId, status) =>
      updateAdminStatus(currentUser?.email, adminId, status)
        .then(fetchAdmins),
    deleteAdmin: (adminId) =>
      deleteAdmin(currentUser?.email, adminId)
        .then(fetchAdmins),
    fetchSystemLogs: (limit) =>
      getSystemLogs(currentUser?.email, limit),
  };

  return (
    <SystemAdminContext.Provider value={value}>
      {children}
    </SystemAdminContext.Provider>
  );
}

export function useSystemAdmin() {
  const context = useContext(SystemAdminContext);
  if (!context) throw new Error('useSystemAdmin must be used within a SystemAdminProvider');
  return context;
}
