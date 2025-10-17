import { headers } from 'next/headers';
import { getCorrelationId } from '@/lib/correlation';
import { fetchTransactions, Transaction } from '@/lib/api';

async function getTransactionsData(correlationId: string): Promise<Transaction[]> {
  return await fetchTransactions(correlationId);
}

export default async function DashboardPage() {
  const headersList = headers();
  const correlationId = getCorrelationId(headersList);

  const transactions = await getTransactionsData(correlationId);

  return (
    <div>
      <div className="header">
        <h1>Ecom Payments Dashboard</h1>
      </div>

      <div className="container">
        <div className="correlation-info">
          <strong>Correlation ID:</strong> {correlationId}
        </div>

        <div className="transactions-grid">
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>
            Recent Transactions
          </h2>

          {transactions.length === 0 ? (
            <p style={{ color: '#666' }}>No transactions found.</p>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="transaction-card">
                <div className="transaction-field">
                  <label>Transaction ID</label>
                  <span>{transaction.id}</span>
                </div>
                <div className="transaction-field">
                  <label>Amount</label>
                  <span>
                    {transaction.currency} {transaction.amount.toFixed(2)}
                  </span>
                </div>
                <div className="transaction-field">
                  <label>Status</label>
                  <span
                    className={`status-badge status-${transaction.status.toLowerCase()}`}
                  >
                    {transaction.status}
                  </span>
                </div>
                <div className="transaction-field">
                  <label>Merchant ID</label>
                  <span>{transaction.merchantId}</span>
                </div>
                <div className="transaction-field">
                  <label>Customer ID</label>
                  <span>{transaction.customerId}</span>
                </div>
                <div className="transaction-field">
                  <label>Created At</label>
                  <span>{new Date(transaction.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
