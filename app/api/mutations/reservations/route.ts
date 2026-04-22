import { NextResponse } from 'next/server';
import {
  createReservation,
  deleteReservation,
  updateReservation,
} from '@/app/actions/reservations';
import type { ReservationFormData } from '@/lib/reservation-schema';

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
      result = await createReservation(body.payload as unknown as ReservationFormData);
    } else if (body.operation === 'update') {
      const { id, ...payload } = body.payload;
      result = await updateReservation(String(id), payload as unknown as ReservationFormData);
    } else if (body.operation === 'delete') {
      result = await deleteReservation(String(body.payload.id ?? ''));
    } else {
      return NextResponse.json({ success: false, error: 'Invalid operation.' }, { status: 400 });
    }

    return NextResponse.json({
      ...result,
      clientMutationId: body.clientMutationId ?? null,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to process reservation mutation.' },
      { status: 500 }
    );
  }
}
