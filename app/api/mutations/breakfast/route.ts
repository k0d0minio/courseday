import { NextResponse } from 'next/server';
import {
  createBreakfastConfiguration,
  deleteBreakfastConfiguration,
  updateBreakfastConfiguration,
} from '@/app/actions/breakfast';
import type {
  CreateBreakfastFormData,
  UpdateBreakfastFormData,
} from '@/lib/breakfast-schema';

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
      result = await createBreakfastConfiguration(
        body.payload as unknown as CreateBreakfastFormData
      );
    } else if (body.operation === 'update') {
      const { id, ...payload } = body.payload;
      result = await updateBreakfastConfiguration(
        String(id),
        payload as unknown as UpdateBreakfastFormData
      );
    } else if (body.operation === 'delete') {
      result = await deleteBreakfastConfiguration(String(body.payload.id ?? ''));
    } else {
      return NextResponse.json({ success: false, error: 'Invalid operation.' }, { status: 400 });
    }

    return NextResponse.json({
      ...result,
      clientMutationId: body.clientMutationId ?? null,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to process breakfast mutation.' },
      { status: 500 }
    );
  }
}
