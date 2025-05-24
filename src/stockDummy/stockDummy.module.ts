import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { StockDummyGateway } from './stockDummy.gateway';

@Module({
  imports: [HttpModule],
  providers: [StockDummyGateway],
})
export class StockDummyModule {} 