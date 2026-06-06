# Patel Community Society Management Portal

This is a comprehensive financial and membership management portal designed for a community society to streamline its operations. It acts as a central system for tracking society balances, handling member accounts, managing monthly fees, processing loans, and recording expenditures.

## 🔗 Live Portal
**Portal Link:** [https://patel-society-portal.vercel.app/](https://patel-society-portal.vercel.app/)

## 🔑 Access Credentials

To explore the application, you can use the following test credentials:

**Member Access (User View)**
- **Username:** `dkp`
- **Password:** `dkp123`

**Admin Access (Management View)**
- **Username:** `admin`
- **Password:** `admin123`

## ⚙️ How It Works (Step-by-Step)

1. **Authentication & Roles:**
   - **Admins** log in to manage the entire society, including adding members, overseeing the overall balance, reviewing financial records, and approving loans.
   - **Members** log in to view their personal accounts, track monthly fee payments, monitor their loan statuses, and see their transaction history.

2. **Member Management:**
   - The system maintains a secure directory of all registered society members.
   - Each member has a dedicated account tracking their financial contributions and outstanding dues.

3. **Financial Tracking (Society Balance):**
   - The portal maintains a real-time ledger that tracks the total funds available in the society, pending loan amounts, and total lifetime interest earned.
   - All approved income and expenses update this central balance automatically.

4. **Monthly Fees Collection:**
   - Members pay recurring monthly fees to build the society fund.
   - The system tracks which members have paid, records the date of payment, and maintains a historic record in the member's account.

5. **Loan Management System:**
   - Members can request financial assistance through loans from the society fund.
   - Admins can approve and disburse these loans based on the society's available balance.
   - The system tracks the principal amount, calculates interest, and monitors the repayment schedule.
   - Members repay their loans via tracked **Installments**.

6. **Expenditure Tracking:**
   - Admins can log community expenses under various customizable categories (e.g., event costs, maintenance).
   - Every logged expenditure accurately deducts from the main society balance.

7. **Transactions Audit Trail:**
   - Every financial action (fee payment, loan disbursement, installment payment, or expenditure) is recorded as a `Transaction` to ensure complete auditing and transparency.

## 💻 Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (using Mongoose ODM)
- **Authentication:** bcryptjs for secure password hashing and express-session for stateful sessions
