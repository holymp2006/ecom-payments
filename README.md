# Ecoms Payments Test

## Installation & Setup
1. Clone the repository

2. Install dependencies

```bash
npm install
```
3. Run Docker containers

```bash
docker-compose up -d
```

4. View the dashboard at `http://localhost:3000` 

5. View the RabbitMQ management UI at `http://localhost:15672` (guest/guest) (Exposed for testing purposes only).

## The Short Screening Problem

The challenge requires building a payment system demonstrating three core competencies:

1. **NestJS + RabbitMQ**: Implement reliable message-based communication with:
   - One publisher and one consumer
   - Retry mechanism with exponential backoff
   - Dead Letter Queue (DLQ) for failed messages
   - Idempotent processing to prevent duplicate processing

2. **TypeORM + PostgreSQL**: Demonstrate database proficiency with:
   - A proper migration for a transactions table
   - Indexed queries with explanation of index choices

3. **Next.js SSR Dashboard**: Show full-stack integration with:
   - Server-side rendered dashboard
   - End-to-end correlation ID tracing
   - Communication with the backend service

---

## **How This Solution Tackles Each Requirement**

### **1. NestJS + RabbitMQ Implementation**

#### **Publisher** (apps/backend/src/modules/rabbitmq/rabbitmq.service.ts:138-172)

```typescript
async publish(routingKey: string, data: any, correlationId: string)
```

**Key features:**
- Publishes messages to the `transactions.exchange` exchange
- Includes correlation ID for tracing
- Sets `persistent: true` for message durability
- Wraps data in a `MessagePayload` with timestamp and retry counter

#### **Consumer** (apps/backend/src/modules/rabbitmq/transaction.consumer.ts)

**Implements consumer pattern:**
- Listens to `transactions.processing.queue` queue
- Delegates message handling to `handleTransactionMessage()`
- Processes transactions from the database

#### **Retry Mechanism** (apps/backend/src/modules/rabbitmq/rabbitmq.service.ts:214-242)

**TTL-based retry implementation:**
```typescript
if (retryCount < this.MAX_RETRY_COUNT) {
  const nextRetryCount = retryCount + 1;
  const nextPayload: MessagePayload = {
    ...payload,
    retryCount: nextRetryCount,
    timestamp: new Date().toISOString(),
  };

  channel.publish(
    rabbitMQConfig.exchanges.transactionsRetry,
    routingKey,
    Buffer.from(JSON.stringify(nextPayload)),
    { persistent: true, correlationId }
  );

  channel.ack(msg);
}
```

**How it works (lines 112-133):**
1. Retry exchange: `transactions.retry.exchange`
2. Retry queue: `transactions.retry.queue` with:
   - `x-message-ttl: 5000` (5 second delay)
   - `x-dead-letter-exchange: transactions.exchange`
   - `x-dead-letter-routing-key: transaction.created`
3. After 5s TTL expires, message is dead-lettered back to main exchange

**Features:**
- Max 3 retries (configured at line 18)
- 5-second delay between retry attempts
- Acknowledges original message after republishing to retry exchange
- Uses RabbitMQ's TTL + DLX mechanism for delayed reprocessing

#### **Dead Letter Queue** (apps/backend/src/modules/rabbitmq/rabbitmq.service.ts:68-136)

**DLQ Setup:**
```typescript
// main queue with DLX configured
await channel.assertQueue(rabbitMQConfig.queues.transactionProcessing, {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': rabbitMQConfig.exchanges.transactionsDlx,
    'x-dead-letter-routing-key': rabbitMQConfig.routingKeys.transactionFailed,
  },
});
```

**Flow:**
1. Main exchange: `transactions.exchange`
2. Main queue: `transactions.processing.queue` (with DLX config)
3. Dead letter exchange: `transactions.dlx.exchange`
4. Dead letter queue: `transactions.dlq.queue`

When max retries exceeded (line 241): `channel.nack(msg, false, false)` sends message to DLQ.

#### **Idempotent Processing** (apps/backend/src/modules/rabbitmq/transaction.consumer.ts:38-48)

**Implementation:**
```typescript
const messageId = this.generateMessageId(message);
const alreadyProcessed = await this.isMessageProcessed(messageId);
if (alreadyProcessed) {
  console.log(`Message ${messageId} already processed, skipping`);
  return;
}
```

**How it works:**
1. Generates unique `messageId` for each message
2. Checks `processed_messages` table before processing
3. Stores processed message IDs in database (line 82)
4. Prevents duplicate processing even if message is redelivered

**Supporting table:** `processed_messages` entity (apps/backend/src/modules/transaction/entities/processed-message.entity.ts)

---

### **2. TypeORM + PostgreSQL Implementation**

#### **Migration 1: Transactions Table** (apps/backend/src/migrations/1760622335000-CreateTransactionsTable.ts)

**Table structure:**
- **id**: UUID primary key
- **amount**: Decimal(19,4) for monetary values
- **currency**: VARCHAR(3) for ISO currency codes
- **status**: ENUM (PENDING, COMPLETED, FAILED)
- **merchantId**: VARCHAR(255) - identifies merchant
- **customerId**: VARCHAR(255) - identifies customer
- **description**: TEXT - transaction details
- **metadata**: JSONB - flexible additional data
- **createdAt**, **updatedAt**: Timestamps

#### **Index Strategy & Explanation** (lines 72-119)

**1. Single-column indexes:**
```sql
IDX_TRANSACTIONS_STATUS         -- for filtering by status
IDX_TRANSACTIONS_MERCHANT_ID    -- for merchant lookups
IDX_TRANSACTIONS_CUSTOMER_ID    -- for customer lookups
IDX_TRANSACTIONS_CREATED_AT     -- for time-based sorting
```

**2. Composite indexes:**
```sql
IDX_TRANSACTIONS_MERCHANT_CREATED (merchantId, createdAt)
IDX_TRANSACTIONS_CUSTOMER_CREATED (customerId, createdAt)
```

**Index Choice Rationale:**

**Single-column indexes chosen because:**
- **status**: Frequently used in `findByStatus()` query (transaction.service.ts:52-61)
- **merchantId**: Used in `findByMerchantId()` query (line 30-38)
- **customerId**: Used in `findByCustomerId()` query (line 41-49)
- **createdAt**: All queries include `ORDER BY createdAt DESC`

**Composite indexes chosen because:**
- **merchantId + createdAt**: Optimizes the common pattern of fetching a merchant's recent transactions
- **customerId + createdAt**: Optimizes the common pattern of fetching a customer's recent transactions
- PostgreSQL can use these for queries filtering by merchantId/customerId AND sorting by createdAt

**Why composite over just single?**
- A query like `WHERE merchantId = 'X' ORDER BY createdAt DESC` benefits from a composite index
- Single indexes would require: (1) index scan on merchantId, (2) separate sort operation
- Composite index provides both filtering AND pre-sorted results in one pass

#### **Migration 2: Processed Messages Table** (apps/backend/src/migrations/1760622635000-CreateProcessedMessagesTable.ts)

**Purpose:** Support idempotent message processing

**Indexes:**
- `correlationId`: Fast lookup for tracing all processed messages for a request
- `processedAt`: Useful for cleanup/archival of old entries

#### **Indexed Queries in Action**

**Example query** (apps/backend/src/modules/transaction/transaction.service.ts:30-38):
```typescript
async findByMerchantId(merchantId: string, limit: number = 100) {
  return await this.transactionRepository.find({
    where: { merchantId },
    order: { createdAt: 'DESC' },
    take: limit,
  });
}
```

This query uses the `IDX_TRANSACTIONS_MERCHANT_CREATED` composite index for optimal performance.

---

### **3. Next.js SSR Dashboard + Correlation ID**

#### **Correlation ID Flow: End-to-End**

**Step 1: Client Request** → Dashboard (Browser)
- User visits `http://localhost:3000`

**Step 2: Next.js SSR** (apps/dashboard/src/app/page.tsx:10-11)
```typescript
const headersList = headers();
const correlationId = getCorrelationId(headersList);
```

**Correlation ID generation** (apps/dashboard/src/lib/correlation.ts:9-10):
```typescript
export function getCorrelationId(headers: Headers): string {
  return headers.get(CORRELATION_ID_HEADER) || generateCorrelationId();
}
```

**Step 3: Dashboard → Backend API** (apps/dashboard/src/lib/api.ts:24-40)
```typescript
const response = await fetch(`${BACKEND_URL}/api/transactions`, {
  method: 'GET',
  headers: createHeaders(correlationId), // includes x-correlation-id
});
```

**Step 4: Backend Middleware** (apps/backend/src/common/middleware/correlation-id.middleware.ts:9-21)
```typescript
const correlationId = req.headers[CORRELATION_ID_HEADER] || uuidv4();
req['correlationId'] = correlationId;
res.setHeader(CORRELATION_ID_HEADER, correlationId);
console.log(`[${correlationId}] ${req.method} ${req.url}`);
```

**Step 5: RabbitMQ message publishing** (apps/backend/src/modules/rabbitmq/rabbitmq.service.ts:138-172)
```typescript
async publish(routingKey: string, data: any, correlationId: string) {
  const payload: MessagePayload = {
    data,
    correlationId,  // stored in message
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };
  // ...
}
```

**Step 6: Consumer processes with correlation ID** (apps/backend/src/modules/rabbitmq/transaction.consumer.ts:31)
```typescript
const { data, correlationId } = message;
```

**Complete trace example:**
```
[abc-123] GET /api/transactions          ← Middleware
[abc-123] Fetching transactions          ← Controller
[abc-123] Published message               ← Publisher
[abc-123] Consumer received message       ← Consumer
[abc-123] Processing transaction          ← Business logic
[abc-123] Message processed successfully  ← Completion
```

#### **SSR Dashboard Features** (apps/dashboard/src/app/page.tsx)

**Server-side rendering:**
- Uses Next.js App Router with async server components
- `getTransactionsData()` fetches data server-side (lines 5-7)
- Correlation ID displayed to user (lines 22-24)
- Shows real-time transaction list with status badges

**Key SSR benefits demonstrated:**
1. Data fetched on server before HTML sent to client
2. Correlation ID generated/extracted on server
3. No client-side loading state needed for initial data

---

### **4. Docker & Monorepo Setup**

#### **Docker Compose** (docker-compose.yml)

**Services:**
1. **postgres**: PostgreSQL 16 with health checks
2. **rabbitmq**: RabbitMQ 3.12 with management UI
3. **backend**: NestJS service (depends on postgres + rabbitmq)
4. **dashboard**: Next.js frontend (depends on backend)

**Network:** All services on `ecom-network` bridge network

**Volumes:** Persistent storage for postgres_data and rabbitmq_data

#### **Monorepo Structure**

```
/apps
  /backend    - NestJS service
  /dashboard  - Next.js SSR app
package.json  - Root workspace configuration
```

**Workspace setup** enables shared dependencies and unified build process.