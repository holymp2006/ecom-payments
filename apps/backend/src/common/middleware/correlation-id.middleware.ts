import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers[CORRELATION_ID_HEADER] || uuidv4();

    // store correlation ID in request object for later use
    req['correlationId'] = correlationId;

    // set correlation ID in response headers
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    console.log(`[${correlationId}] ${req.method} ${req.url}`);

    next();
  }
}
