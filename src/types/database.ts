export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      budgets: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          id: string
          month: number
          user_id: string | null
          year: number
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          id?: string
          month: number
          user_id?: string | null
          year: number
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          id?: string
          month?: number
          user_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          day_of_month: number
          id: string
          is_active: boolean
          merchant_name: string | null
          next_run_date: string
          note: string | null
          type: string
          user_id: string | null
          wallet_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          day_of_month: number
          id?: string
          is_active?: boolean
          merchant_name?: string | null
          next_run_date: string
          note?: string | null
          type?: string
          user_id?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          day_of_month?: number
          id?: string
          is_active?: boolean
          merchant_name?: string | null
          next_run_date?: string
          note?: string | null
          type?: string
          user_id?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          date: string | null
          id: string
          merchant_name: string | null
          note: string | null
          recurring_id: string | null
          status: string | null
          type: string
          user_id: string | null
          wallet_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          merchant_name?: string | null
          note?: string | null
          recurring_id?: string | null
          status?: string | null
          type?: string
          user_id?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          merchant_name?: string | null
          note?: string | null
          recurring_id?: string | null
          status?: string | null
          type?: string
          user_id?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_members: {
        Row: {
          role: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          role?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          role?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_members_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          color: string | null
          created_at: string | null
          currency_code: string | null
          icon: string | null
          id: string
          name: string
          owner_id: string | null
          type: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          currency_code?: string | null
          icon?: string | null
          id?: string
          name: string
          owner_id?: string | null
          type?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          currency_code?: string | null
          icon?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      process_recurring_transactions: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience aliases
export type Wallet = Tables<'wallets'>
export type WalletMember = Tables<'wallet_members'>
export type Transaction = Tables<'transactions'>
export type TransactionInsert = TablesInsert<'transactions'>
export type Category = Tables<'categories'>
export type Budget = Tables<'budgets'>
export type BudgetInsert = TablesInsert<'budgets'>
export type RecurringTransaction = Tables<'recurring_transactions'>

// Joined types
export type TransactionWithCategory = Transaction & {
  categories: Category | null
}

export type WalletWithBalance = Wallet & {
  balance: number
}

export type BudgetWithCategory = Budget & {
  categories: Category | null
  spent: number
}
