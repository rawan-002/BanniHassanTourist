

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config.js';
import { insertEmailLog } from '../repositories/adminRepository.js';

export const sendContactEmail = async ({ name, fromEmail, message }) => {
  const fn = httpsCallable(functions, 'sendContactEmail');
  const result = await fn({ name, fromEmail, message });
  return result.data;
};

export const logEmail = async ({ to, subject, html, type }) => {
  await insertEmailLog({ to, subject, html, type, status: 'sent' });
};
