import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StockDummyModule } from './stockDummy/stockDummy.module';
import { StockRealModule } from './stockRealData/stockReal.module';

@Module({
  imports: [StockDummyModule, StockRealModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
