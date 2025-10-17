import { Controller, Get, Post, Body, Param, Query, Req } from "@nestjs/common";
import { TransactionService } from "./transaction.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { Transaction, TransactionStatus } from "./entities/transaction.entity";
import { Request } from "express";

@Controller("api/transactions")
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  async create(
    @Body() createTransactionDto: CreateTransactionDto,
    @Req() req: Request
  ): Promise<Transaction> {
    return await this.transactionService.create(createTransactionDto);
  }

  @Get()
  async findAll(
    @Query("limit") limit?: string,
    @Req() req?: Request
  ): Promise<Transaction[]> {
    const queryLimit = limit ? parseInt(limit, 10) : 100;

    return await this.transactionService.findAll(queryLimit);
  }

  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @Req() req: Request
  ): Promise<Transaction | null> {
    return await this.transactionService.findById(id);
  }

  @Get("merchant/:merchantId")
  async findByMerchant(
    @Param("merchantId") merchantId: string,
    @Query("limit") limit?: string,
    @Req() req?: Request
  ): Promise<Transaction[]> {
    const queryLimit = limit ? parseInt(limit, 10) : 100;

    return await this.transactionService.findByMerchantId(
      merchantId,
      queryLimit
    );
  }

  @Get("customer/:customerId")
  async findByCustomer(
    @Param("customerId") customerId: string,
    @Query("limit") limit?: string,
    @Req() req?: Request
  ): Promise<Transaction[]> {
    const queryLimit = limit ? parseInt(limit, 10) : 100;

    return await this.transactionService.findByCustomerId(
      customerId,
      queryLimit
    );
  }

  @Get("status/:status")
  async findByStatus(
    @Param("status") status: TransactionStatus,
    @Query("limit") limit?: string,
    @Req() req?: Request
  ): Promise<Transaction[]> {
    const queryLimit = limit ? parseInt(limit, 10) : 100;

    return await this.transactionService.findByStatus(status, queryLimit);
  }
}
