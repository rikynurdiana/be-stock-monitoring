import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { StockRealGateway } from './stockReal.gateway';

@Module({
  imports: [HttpModule],
  providers: [StockRealGateway],
})
export class StockRealModule {} 