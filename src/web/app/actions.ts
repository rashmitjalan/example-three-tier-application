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

export async function createTask(formData: FormData) {
  const title = formData.get('title') as string;
  const res = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Failed to create task (${res.status})`);
  }
  revalidatePath('/');
}

export async function toggleTask(id: number, completed: boolean) {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Failed to update task (${res.status})`);
  }
  revalidatePath('/');
}
