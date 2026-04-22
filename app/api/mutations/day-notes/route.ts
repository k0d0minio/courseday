import { NextResponse } from 'next/server';
import {
  createDayNote,
  deleteDayNote,
  updateDayNote,
} from '@/app/actions/day-notes';

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
      result = await createDayNote(
        String(body.payload.dayId ?? ''),
        String(body.payload.content ?? '')
      );
    } else if (body.operation === 'update') {
      result = await updateDayNote(
        String(body.payload.id ?? ''),
        String(body.payload.content ?? '')
      );
    } else if (body.operation === 'delete') {
      result = await deleteDayNote(String(body.payload.id ?? ''));
    } else {
      return NextResponse.json({ success: false, error: 'Invalid operation.' }, { status: 400 });
    }

    return NextResponse.json({
      ...result,
      clientMutationId: body.clientMutationId ?? null,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to process day note mutation.' },
      { status: 500 }
    );
  }
}
