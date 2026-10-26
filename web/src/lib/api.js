// Cliente HTTP fino. Guarda o JWT no localStorage e o envia em toda chamada.
const TOKEN_KEY = 'controlaai_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Erro na requisição.');
    err.status = res.status; err.code = data.code;
    throw err;
  }
  return data;
}

export const api = {
  config: () => request('GET', '/config'),
  publicPanel: () => request('GET', '/public/panel'),
  login: (email, password) => request('POST', '/login', { email, password }),
  bootstrap: () => request('GET', '/bootstrap'),
  members: () => request('GET', '/members'),

  createTask: (form) => request('POST', '/tasks', form),
  editTask: (id, form) => request('PUT', `/tasks/${id}`, form),
  duplicateTask: (id) => request('POST', `/tasks/${id}/duplicate`),
  setStatus: (id, status, obs) => request('POST', `/tasks/${id}/status`, { status, obs }),
  approve: (id) => request('POST', `/tasks/${id}/approve`),
  reject: (id, reason) => request('POST', `/tasks/${id}/reject`, { reason }),
  reopen: (id, reason) => request('POST', `/tasks/${id}/reopen`, { reason }),
  approveReopen: (id) => request('POST', `/tasks/${id}/reopen/approve`),
  denyReopen: (id) => request('POST', `/tasks/${id}/reopen/deny`),
  addComment: (id, text) => request('POST', `/tasks/${id}/comments`, { text }),
  addEvidence: (id, name) => request('POST', `/tasks/${id}/evidence`, { name }),
  toggleChecklist: (id, idx) => request('POST', `/tasks/${id}/checklist/${idx}/toggle`),

  createUser: (body) => request('POST', '/users', body),
  editUser: (id, body) => request('PUT', `/users/${id}`, body),
  setRole: (id, role) => request('POST', `/users/${id}/role`, { role }),
  toggleSector: (id, key) => request('POST', `/users/${id}/sectors/${key}/toggle`),
  resetPassword: (id) => request('POST', `/users/${id}/reset-password`),

  changePassword: (currentPassword, newPassword) => request('POST', '/me/password', { currentPassword, newPassword }),

  addCompany: (body) => request('POST', '/companies', body),
  editCompany: (id, body) => request('PUT', `/companies/${id}`, body),
  removeCompany: (id) => request('DELETE', `/companies/${id}`),

  closeCycle: () => request('POST', '/cycle/close'),
};
