import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class StockDummyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private stocks: StockData[] = [
    { symbol: 'BBRI', price: 5500, change: 50, changePercent: 0.92 },
    { symbol: 'BBCA', price: 9500, change: -25, changePercent: -0.26 },
    { symbol: 'TLKM', price: 3500, change: 15, changePercent: 0.43 },
    { symbol: 'ANTM', price: 1200, change: -10, changePercent: -0.83 },
  ];

  private clientIntervals = new Map<string, NodeJS.Timeout>();
  private chartHistory: Record<string, { timestamp: number, price: number }[]> = {};
  private chartIntervals = new Map<string, NodeJS.Timeout>();

  private sendStockData(client: Socket, symbols: string[]) {
    const stocks = this.stocks.filter((s) => symbols.includes(s.symbol));
    if (stocks.length > 0) {
      client.emit('stockDataDummy', stocks);
    } else {
      client.emit('error', { message: `Stock symbol(s) not found: ${symbols.join(', ')}` });
    }
  }

  private sendChartData(client: Socket, symbols: string[]) {
    const chartData = symbols.map(symbol => ({
      symbol,
      chart: this.chartHistory[symbol] || [],
    }));
    client.emit('chartDataDummy', chartData);
  }

  private updateChartHistory(symbols: string[]) {
    const now = Math.floor(Date.now() / 1000);
    for (const symbol of symbols) {
      const history = this.chartHistory[symbol];
      if (history && history.length > 0) {
        // Ambil harga terakhir
        let lastPrice = history[history.length - 1].price;
        // Simulasi harga baru
        lastPrice = Math.max(100, lastPrice + Math.round((Math.random() - 0.5) * 20));
        // Shift data lama, push data baru
        history.shift();
        history.push({ timestamp: now, price: lastPrice });
        // Update harga di this.stocks agar sinkron dengan chart
        const stock = this.stocks.find(s => s.symbol === symbol);
        if (stock) {
          const prevPrice = stock.price;
          stock.price = lastPrice;
          stock.change = stock.price - prevPrice;
          stock.changePercent = parseFloat(((stock.change / prevPrice) * 100).toFixed(2));
        }
      }
    }
  }

  constructor() {
    // Inisialisasi chart history untuk semua symbol
    const now = Math.floor(Date.now() / 1000);
    for (const stock of this.stocks) {
      let lastPrice = stock.price;
      this.chartHistory[stock.symbol] = Array.from({ length: 30 }, (_, i) => {
        lastPrice = Math.max(100, lastPrice + Math.round((Math.random() - 0.5) * 20));
        return {
          timestamp: now - (29 - i) * 60,
          price: lastPrice,
        };
      });
    }
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Hentikan interval saham
    if (this.clientIntervals.has(client.id)) {
      clearInterval(this.clientIntervals.get(client.id));
      this.clientIntervals.delete(client.id);
    }
    // Hentikan interval chart
    if (this.chartIntervals.has(client.id)) {
      clearInterval(this.chartIntervals.get(client.id));
      this.chartIntervals.delete(client.id);
    }
  }

  @SubscribeMessage('getStockDummy')
  handleGetStock(client: Socket, payload: any) {
    let symbols: string[] = [];

    // Jika payload string dan berbentuk array, parse dulu
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

    // Hentikan interval lama jika ada
    if (this.clientIntervals.has(client.id)) {
      clearInterval(this.clientIntervals.get(client.id));
      this.clientIntervals.delete(client.id);
    }

    // Kirim data pertama kali langsung
    this.sendStockData(client, symbols);

    // Set interval untuk kirim data setiap 5 detik
    const interval = setInterval(() => {
      this.sendStockData(client, symbols);
    }, 5000);
    this.clientIntervals.set(client.id, interval);
  }

  @SubscribeMessage('getAllStocksDummy')
  handleGetAllStocks(client: Socket) {
    console.log('Client requested all stocks data');
    client.emit('stockDataDummy', this.stocks);
  }

  @SubscribeMessage('getChartDummy')
  handleGetChart(client: Socket, payload: any) {
    let symbols: string[] = [];

    // Parsing symbol sama seperti getStock
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

    // Hentikan interval chart lama jika ada
    if (this.chartIntervals.has(client.id)) {
      clearInterval(this.chartIntervals.get(client.id));
      this.chartIntervals.delete(client.id);
    }

    // Kirim chart pertama kali langsung
    this.sendChartData(client, symbols);

    // Set interval untuk update chart dan kirim ke client setiap 5 detik
    const interval = setInterval(() => {
      this.updateChartHistory(symbols);
      this.sendChartData(client, symbols);
    }, 5000);
    this.chartIntervals.set(client.id, interval);
  }

  
} 