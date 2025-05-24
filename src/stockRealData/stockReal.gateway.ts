import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import axios from 'axios';

interface StockDataPoint {
  Close: number;
  Date: string;
  Dividends: number;
  High: number;
  Low: number;
  Open: number;
  'Stock Splits': number;
  Volume: number;
}

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  date: string;
  weeklyData?: StockDataPoint[];
}

interface SingleStockResponse {
  ticker: string;
  period: string;
  start_date: string;
  end_date: string;
  total_records: number;
  data: StockDataPoint[];
}

interface AllStocksResponse {
  [symbol: string]: {
    period: string;
    start_date: string;
    end_date: string;
    total_records: number;
    data: StockDataPoint[];
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class StockRealGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private stocks: Map<string, StockData> = new Map();
  private chartHistory: Record<string, { timestamp: number, price: number }[]> = {};

  constructor() {
    // Initialize with empty data, will be populated when clients request
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  private async fetchSingleStockData(symbol: string): Promise<StockData | null> {
    try {
      const response = await axios.get<SingleStockResponse>(`http://localhost:3001/api/stocks/${symbol}`);
      const stockResponse = response.data;

      if (!stockResponse.data || stockResponse.data.length === 0) {
        return null;
      }

      // Get the most recent data (last item in array)
      const latestData = stockResponse.data[stockResponse.data.length - 1];
      
      // Calculate change from previous day if available
      let change = 0;
      let changePercent = 0;
      
      if (stockResponse.data.length > 1) {
        const previousData = stockResponse.data[stockResponse.data.length - 2];
        change = latestData.Close - previousData.Close;
        changePercent = (change / previousData.Close) * 100;
      } else {
        // If only one day of data, compare with stored previous value
        const prevStock = this.stocks.get(symbol);
        if (prevStock) {
          change = latestData.Close - prevStock.price;
          changePercent = (change / prevStock.price) * 100;
        }
      }

      const stock: StockData = {
        symbol,
        price: latestData.Close,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        high: latestData.High,
        low: latestData.Low,
        open: latestData.Open,
        volume: latestData.Volume,
        date: latestData.Date,
        weeklyData: stockResponse.data
      };

      this.stocks.set(symbol, stock);
      
      // Update chart history with all weekly data
      if (!this.chartHistory[symbol]) {
        this.chartHistory[symbol] = [];
      }
      
      // Clear existing data and add all weekly data points
      this.chartHistory[symbol] = stockResponse.data.map(dataPoint => ({
        timestamp: Math.floor(new Date(dataPoint.Date).getTime() / 1000),
        price: dataPoint.Close
      }));

      return stock;
    } catch (error) {
      console.error(`Error fetching stock data for ${symbol}:`, error.message);
      return null;
    }
  }

  private async fetchAllStocksData(): Promise<StockData[]> {
    try {
      const response = await axios.get<AllStocksResponse>(`http://localhost:3001/api/stocks`);
      const stocksResponse = response.data;
      const stocksData: StockData[] = [];

      for (const [symbol, stockInfo] of Object.entries(stocksResponse)) {
        if (!stockInfo.data || stockInfo.data.length === 0) {
          continue;
        }

        // Get the most recent data (last item in array)
        const latestData = stockInfo.data[stockInfo.data.length - 1];
        
        // Calculate change from previous day if available
        let change = 0;
        let changePercent = 0;
        
        if (stockInfo.data.length > 1) {
          const previousData = stockInfo.data[stockInfo.data.length - 2];
          change = latestData.Close - previousData.Close;
          changePercent = (change / previousData.Close) * 100;
        } else {
          // If only one day of data, compare with stored previous value
          const prevStock = this.stocks.get(symbol);
          if (prevStock) {
            change = latestData.Close - prevStock.price;
            changePercent = (change / prevStock.price) * 100;
          }
        }

        const stock: StockData = {
          symbol,
          price: latestData.Close,
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2)),
          high: latestData.High,
          low: latestData.Low,
          open: latestData.Open,
          volume: latestData.Volume,
          date: latestData.Date,
          weeklyData: stockInfo.data
        };

        this.stocks.set(symbol, stock);
        stocksData.push(stock);

        // Update chart history with all weekly data
        if (!this.chartHistory[symbol]) {
          this.chartHistory[symbol] = [];
        }
        
        // Clear existing data and add all weekly data points
        this.chartHistory[symbol] = stockInfo.data.map(dataPoint => ({
          timestamp: Math.floor(new Date(dataPoint.Date).getTime() / 1000),
          price: dataPoint.Close
        }));
      }

      return stocksData;
    } catch (error) {
      console.error('Error fetching all stocks data:', error.message);
      return [];
    }
  }

  @SubscribeMessage('getStockReal')
  async handleGetStock(client: Socket, payload: any) {
    let symbols: string[] = [];

    if (typeof payload === 'string') {
      try {
        const parsed = JSON.parse(payload);
        if (Array.isArray(parsed)) {
          symbols = parsed.map((s) => (typeof s === 'string' ? s.trim().toUpperCase() : ''));
        } else {
          symbols = [payload.trim().toUpperCase()];
        }
      } catch {
        symbols = [payload.trim().toUpperCase()];
      }
    } else if (Array.isArray(payload)) {
      symbols = payload.map((s) => (typeof s === 'string' ? s.trim().toUpperCase() : ''));
    }

    // Initial fetch
    const stocks: StockData[] = [];
    for (const symbol of symbols) {
      const stockData = await this.fetchSingleStockData(symbol);
      if (stockData) {
        stocks.push(stockData);
      }
    }

    if (stocks.length > 0) {
      client.emit('stockDataReal', stocks);
    } else {
      client.emit('error', { message: `Failed to fetch stock data for: ${symbols.join(', ')}` });
    }
  }

  @SubscribeMessage('getAllStocksReal')
  async handleGetAllStocks(client: Socket) {
    console.log('Client requested all stocks data');
    
    // Initial fetch
    const stocks = await this.fetchAllStocksData();
    if (stocks.length > 0) {
      client.emit('stockDataReal', stocks);
    } else {
      client.emit('error', { message: 'Failed to fetch stocks data' });
    }
  }
}