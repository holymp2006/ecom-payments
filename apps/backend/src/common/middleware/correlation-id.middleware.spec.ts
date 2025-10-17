import { CorrelationIdMiddleware, CORRELATION_ID_HEADER } from './correlation-id.middleware';
import { Request, Response, NextFunction } from 'express';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
    mockRequest = {
      headers: {},
      method: 'GET',
      url: '/test',
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should generate a correlation id if not provided', () => {
    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockRequest['correlationId']).toBeDefined();
    expect(typeof mockRequest['correlationId']).toBe('string');
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      mockRequest['correlationId'],
    );
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should use existing correlation id from headers', () => {
    const existingCorrelationId = 'test-correlation-id-123';
    mockRequest.headers = {
      [CORRELATION_ID_HEADER]: existingCorrelationId,
    };

    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockRequest['correlationId']).toBe(existingCorrelationId);
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      existingCorrelationId,
    );
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should log the request with correlation id', () => {
    const existingCorrelationId = 'test-id';
    mockRequest.headers = {
      [CORRELATION_ID_HEADER]: existingCorrelationId,
    };

    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(console.log).toHaveBeenCalledWith(
      `[${existingCorrelationId}] GET /test`,
    );
  });
});
