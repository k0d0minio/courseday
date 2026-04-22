import { NextResponse } from 'next/server';
import {
  createActivity,
  deleteActivity,
  deleteActivityFromHere,
  deleteActivityRecurrenceGroup,
  updateActivity,
} from '@/app/actions/activities';
import type { ActivityFormData } from '@/lib/program-item-schema';

type RequestBody = {
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  clientMutationId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    let result:
      | { success: true; data: unknown }
      | { success: false; error: string };

    if (body.operation === 'create') {
      result = await createActivity(body.payload as unknown as ActivityFormData);
    } else if (body.operation === 'update') {
      const { id, ...payload } = body.payload;
      result = await updateActivity(String(id), payload as unknown as ActivityFormData);
    } else if (body.operation === 'delete') {
      const mode = String(body.payload.mode ?? 'single');
      const id = String(body.payload.id ?? '');
      if (mode === 'all') {
        result = await deleteActivityRecurrenceGroup(String(body.payload.recurrenceGroupId ?? ''));
      } else if (mode === 'from-here') {
        result = await deleteActivityFromHere(id, String(body.payload.recurrenceGroupId ?? ''));
      } else {
        result = await deleteActivity(id);
      }
    } else {
      return NextResponse.json({ success: false, error: 'Invalid operation.' }, { status: 400 });
    }

    return NextResponse.json({
      ...result,
      clientMutationId: body.clientMutationId ?? null,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to process activity mutation.' },
      { status: 500 }
    );
  }
}
