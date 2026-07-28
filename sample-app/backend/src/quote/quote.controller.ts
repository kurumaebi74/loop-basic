import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { QuoteService } from "./quote.service";
import type { QuoteResult } from "../logic/pricing";

// パースとHTTPステータスの割り当てだけを行う薄いコントローラ。
// 実際の計算は QuoteService 経由で logic/pricing.ts の純粋関数に委ねる。
@Controller("api/quote")
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Get()
  getQuote(@Query("amount") amountRaw?: string, @Query("taxRate") taxRateRaw?: string): QuoteResult {
    const amount = Number(amountRaw);
    const taxRate = Number(taxRateRaw);

    if (!Number.isFinite(amount) || !Number.isFinite(taxRate)) {
      throw new BadRequestException("amount and taxRate must be numbers");
    }

    try {
      return this.quoteService.calculate({ amount, taxRate });
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : "invalid input");
    }
  }
}
