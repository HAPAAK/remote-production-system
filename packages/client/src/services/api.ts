// ─── API service for workflow CRUD ────────────────────────────
const BASE = '/api/v1/workflows';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API request failed');
  return json.data as T;
}

export const api = {
  listWorkflows: () => request<any[]>(BASE),

  createWorkflow: (body: { name: string; description?: string }) =>
    request<any>(BASE, { method: 'POST', body: JSON.stringify(body) }),

  getWorkflow: (id: string) => request<any>(`${BASE}/${id}`),

  updateWorkflow: (id: string, body: Record<string, unknown>) =>
    request<any>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteWorkflow: (id: string) =>
    request<any>(`${BASE}/${id}`, { method: 'DELETE' }),

  executeWorkflow: (id: string, action: 'start' | 'stop' | 'reset') =>
    request<any>(`${BASE}/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
};

