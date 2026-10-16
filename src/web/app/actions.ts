'use server';

import { revalidatePath } from 'next/cache';

const API_URL = process.env.API_URL || 'http://localhost:3001';

export type Task = {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
};

export async function getTasks(): Promise<Task[]> {
  const res = await fetch(`${API_URL}/tasks`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

// Throws with the API's `{ error }` message when the response is not OK.
async function ensureOk(res: Response, fallback: string) {
  if (res.ok) return;
  let message = fallback;
  try {
    const body = await res.json();
    if (body && typeof body.error === 'string') message = body.error;
  } catch {
    // Non-JSON error body; keep the fallback message.
  }
  throw new Error(`${message} (HTTP ${res.status})`);
}

export async function createTask(formData: FormData) {
  const title = formData.get('title') as string;
  const res = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  await ensureOk(res, 'Failed to create task');
  revalidatePath('/');
}

export async function toggleTask(id: number, completed: boolean) {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  await ensureOk(res, 'Failed to update task');
  revalidatePath('/');
}
