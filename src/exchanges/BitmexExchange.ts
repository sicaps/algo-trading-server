import * as ccxt from 'ccxt'
import * as WebSocket from 'ws'

import { IOrder, IOrderBook } from 'src/interfaces'
import CCXTExchange from './core/CCXTExchange'


export default class BitmexExchange extends CCXTExchange {
  private readonly clientws: WebSocket


  constructor (exchange: ccxt.Exchange) {
    super(exchange)

    const client = new WebSocket('wss://www.bitmex.com/realtime')
    this.clientws = client
  }


  public canStreamTrades (_symbol: string): boolean {
    return true
  }


  public streamTrades (symbol: string): void {
    // check if we are already streaming this symbol or not
    // if (this.streamingTradesSymbol.indexOf(symbol) >= 0) return
    // this.streamingTradesSymbol.push(symbol)

    const wsSymbol = symbol.replace('/', '').toUpperCase()

    this.clientws.on('open', () => {
      console.log('ws opened')
      this.clientws.send(`{'op': 'subscribe', 'args': 'trade:${wsSymbol}'}`)
     // this.clientws.send('{'op': 'subscribe', 'args': 'trade'}') //for all symbols
    })

    this.clientws.on('message', (trade: any) => {
      const parsedJSON = JSON.parse(trade)
      try {
        const data = parsedJSON.data
        if (data) {
          data.forEach(obj => {
            var price = obj.price
            var size = obj.size
            var ts = obj.timestamp
            var symbol2 = obj.symbol // this will be needed for all symbols
            var timestamp = Date.parse(ts)
            var grossValue = obj.grossValue

            const ccxtTrade: ccxt.Trade = {
              amount: Number(size),
              datetime: (new Date(timestamp)).toISOString(),
              id: String(obj.trdMatchID),
              price: Number(price),
              info: {},
              timestamp: timestamp,
              side: obj.side,
              symbol: symbol2,
              takerOrMaker: trade.maker ? 'maker' : 'taker',
              cost: Number(price) * Number(size),
              fee: undefined
            }
            console.log(ccxtTrade)
            this.emit('trade', ccxtTrade)
          })
        }
      } catch (e) {
        // test
      }
    })
  }


  public streamOrderbook (symbol: string) {
    const wsSymbol = symbol.replace('/', '').toUpperCase()

    this.clientws.on('open', () => {
      console.log('ws opened')
      this.clientws.send(`{'op': 'subscribe', 'args': 'orderBook10:${wsSymbol}'}`)
    })

    this.clientws.on('message', (orders: any) => {
      const parsedJSON = JSON.parse(orders)
      try {
        const data = parsedJSON.data
        data.forEach(obj => {
          const bids: IOrder[] = obj.bids.map(bid => {
            return {
              asset: wsSymbol,
              price: bid[0],
              amount: bid[1]
            }
          })

          const asks: IOrder[] = obj.asks.map(ask => {
            return {
              asset: wsSymbol,
              price: ask[0],
              amount: ask[1]
            }
          })


          const orderBook: IOrderBook = {
            bids: bids,
            asks: asks
          }
          console.log(orderBook)
          this.emit('orderbook', orderBook)
        })
      } catch (e) {
        // console.log(e)
      }
    })
   }


  public async getTrades (symbol: string, since: number, _descending: boolean): Promise<ccxt.Trade[]> {
    return await this.exchange.fetchTrades(symbol, since)
  }
}


// const main = async () => {
//   const bitmex = new BitmexExchange()
//   // bitmex.streamTrades('ETHUSD')
//   bitmex.streamOrderbook('ETHUSD')
// }

// main()
