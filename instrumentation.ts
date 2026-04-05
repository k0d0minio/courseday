export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  err: unknown, request: any, context: any
) => {
  const { captureRequestError } = await import('@sentry/nextjs');
  await captureRequestError(err, request, context);
};
