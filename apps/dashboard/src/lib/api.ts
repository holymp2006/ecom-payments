import { CORRELATION_ID_HEADER } from './correlation';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export interface Transaction {
  id: string;
  amount: number | string;
  currency: string;
  status: string;
  merchantId: string;
  customerId: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// helper function to create fetch headers with correlation id
function createHeaders(correlationId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    [CORRELATION_ID_HEADER]: correlationId,
  };
}

export async function fetchTransactions(correlationId: string): Promise<Transaction[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/transactions`, {
      method: 'GET',
      headers: createHeaders(correlationId),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('failed to fetch transactions:', error);
    return [];
  }
}

export async function createTransaction(
  correlationId: string,
  data: Partial<Transaction>
): Promise<Transaction | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/transactions`, {
      method: 'POST',
      headers: createHeaders(correlationId),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('failed to create transaction:', error);
    return null;
  }
}
