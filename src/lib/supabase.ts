import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type Database = {
  public: {
    Tables: {
      signals: {
        Row: {
          id: string;
          coin: string;
          signal_type: "LONG" | "SHORT";
          status: "ACTIVE" | "TP1_HIT" | "TP2_HIT" | "TP3_HIT" | "SL_HIT" | "CLOSED" | "CANCELLED";
          entry_price: number;
          entry_low: number;
          entry_high: number;
          tp1: number;
          tp2: number;
          tp3: number;
          stop_loss: number;
          leverage: number;
          timeframe: string;
          exchange: string;
          risk_level: "LOW" | "MEDIUM" | "HIGH";
          notes: string | null;
          pnl: number | null;
          confidence: number;
          analysis_summary: string | null;
          auto_generated: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      watched_pairs: {
        Row: {
          id: string;
          symbol: string;
          coin_name: string;
          is_active: boolean;
          created_at: string;
        };
      };
      articles: {
        Row: {
          id: string;
          title: string;
          category: "guide" | "strategy" | "pattern" | "glossary";
          content: string | null;
          excerpt: string | null;
          read_time: number;
          published: boolean;
          created_at: string;
        };
      };
      portfolio_trades: {
        Row: {
          id: string;
          user_id: string;
          coin: string;
          entry_price: number;
          amount: number;
          trade_date: string;
          exit_price: number | null;
          status: "OPEN" | "CLOSED";
          signal_id: string | null;
          notes: string | null;
          created_at: string;
        };
      };
    };
  };
};
