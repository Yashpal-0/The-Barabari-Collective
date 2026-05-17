const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const getTickets = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString();
  return request(`/tickets${qs ? `?${qs}` : ''}`);
};

export const createTicket = (data) =>
  request('/tickets', { method: 'POST', body: JSON.stringify(data) });

export const getTicket = (id) => request(`/tickets/${id}`);

export const updateTicket = (id, data) =>
  request(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const moveTicket = (id, status, position) =>
  request(`/tickets/${id}/move`, {
    method: 'PATCH',
    body: JSON.stringify({ status, position })
  });

export const deleteTicket = (id) =>
  request(`/tickets/${id}`, { method: 'DELETE' });

export const addComment = (ticketId, data) =>
  request(`/tickets/${ticketId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
