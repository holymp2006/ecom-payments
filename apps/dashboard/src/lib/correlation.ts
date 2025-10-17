import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

export function generateCorrelationId(): string {
  return uuidv4();
}

export function getCorrelationId(headers: Headers): string {
  return headers.get(CORRELATION_ID_HEADER) || generateCorrelationId();
}
