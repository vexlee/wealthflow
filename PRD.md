# Product Requirements Document (PRD): WealthFlow SaaS

**Project Name:** WealthFlow SaaS (Spendee Clone)  
**Target Platforms:** Web (Desktop Optimized) & Mobile Responsive  
**Status:** Initial Draft  

---

## 1. Project Overview
WealthFlow is a comprehensive personal finance management tool designed to provide users with a unified view of their net worth, automated transaction tracking, and shared financial collaboration features.

### Core Tech Stack
* **Backend:** Supabase (PostgreSQL, Auth, Functions, Storage)
* **Frontend:** Next.js 14+ (App Router), Tailwind CSS, ShadCN UI
* **Data Providers:** Plaid (US), Salt Edge (EU/Global)
* **Visualization:** Nivo Charts

---

## 2. Functional Requirements

### 2.1 Multi-Wallet Management
* **Manual Wallets:** Custom "Cash" wallets with user-defined names, icons, and colors.
* **Synced Wallets:** Automated bank integration via Plaid/Salt Edge. Features include daily auto-sync and a manual "Fetch Transactions" trigger.
* **Crypto & E-Wallets:** Support for manual entry or API-based tracking (Coinbase, PayPal).
* **Transfer Logic:** Intelligent identification of internal transfers to prevent double-counting of income or expenses.

### 2.2 Transaction Lifecycle
* **Data Entry:** * Manual input (Amount, Category, Date, Note, Labels, Attachments).
    * AI-driven **Magic Scan** for receipt OCR.
* **Categorization:** Automated engine for synced transactions with manual user override.
* **Transaction States:** Tracking of **Pending** vs. **Posted** transactions for real-time balance accuracy.
* **Bulk Management:** (Web-only) Bulk editing of categories/tags and CSV/XLS import capabilities.

### 2.3 Budgeting & Forecasting
* **Category Budgets:** Monthly spending limits (e.g., "Food & Drink").
* **Smart Metrics:** Real-time display of "Amount Left to Spend" and "Daily Suggested Spend."
* **Alerts:** Notification triggers (Push/Email) at 75%, 90%, and 100% of budget consumption.

### 2.4 Shared Finances
* **Permissions:** * **Owner:** Subscription management and access control.
    * **Member:** View-only or "View and Add" transaction permissions.
* **Real-time Collaboration:** Instant updates across all shared devices using Supabase Realtime.

### 2.5 Analytics & Reporting
* **Main Dashboard:** Unified view of all wallets and net worth trends.
* **Visualization:** * Interactive Pie Charts for spending distribution.
    * Line Charts for historical cash flow analysis.

---

## 3. Technical Architecture Specification

### 3.1 Backend (Supabase)
* **Database:** PostgreSQL + `pgvector` for AI-based transaction matching.
* **Auth:** Email/Password and Social OAuth (Google, Apple).
* **Security:** Granular Row Level Security (RLS) ensuring data isolation.
* **Edge Functions:** Deno-based functions for API secret management and webhook processing.

### 3.2 Frontend (Next.js)
* **Framework:** Next.js 14+ (App Router).
* **Design:** Mobile-first responsive design using Tailwind CSS.

---

## 4. Database Schema

```sql
-- Core Wallet Table
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('manual', 'bank', 'crypto')),
  currency_code CHAR(3) DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Wallet Membership for Sharing
CREATE TABLE wallet_members (
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'guest')),
  PRIMARY KEY (wallet_id, user_id)
);

-- Transaction Ledger
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  category_id UUID,
  amount NUMERIC(19, 4) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'posted', -- pending, posted
  merchant_name TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Security Policy
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access wallets they are members of" ON wallets
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wallet_members 
    WHERE wallet_members.wallet_id = wallets.id 
    AND wallet_members.user_id = auth.uid()
  )
);