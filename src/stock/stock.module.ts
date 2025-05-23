import { Module } from '@nestjs/common';
import { StockGateway } from './stock.gateway';

@Module({
  providers: [StockGateway],
})
export class StockModule {} 