# 🛫 Palomito Insurance  
**Parametric Flight Delay & Cancellation Coverage on EVM**

SCROLL MAINNET: 0xC3498821e7b1eae0e47CBef225AC9D07E85E3E8B
ARBITRUM TESTNET: 0x1dfdc9b9f30cce641635ff7f006e69d6df99485a

---

### 🌍 Problem
Air travel is massive — over **4 billion passengers** fly every year. Yet around **20% of flights are delayed** and **2–3% are canceled**.  
Traditional travel insurance is slow, opaque, and underused — less than **2% of global travelers** buy any protection because claims require paperwork, adjusters, and weeks of waiting.

---

### 💡 Solution
**Palomito Insurance** uses **smart contracts** to provide instant, transparent, and borderless flight coverage.  
If a flight is delayed or canceled, the traveler automatically receives a **USDC payout** — no forms, no calls, no intermediaries.

---

### ⚙️ How It Works
1. The traveler purchases a policy, providing flight details (airline, flight number, date, departure airport).  
2. The premium (typically 5% of ticket price) is paid in **USDC** to the smart contract.  
3. Flight data is stored on-chain in a policy record.  
4. When the oracle or backend verifies a disruption, the payout is triggered automatically.  

---

### 🔧 Technical Overview
- **EVM-Compatible Smart Contract** (Solidity `^0.8.19`)  
- **Stablecoin:** USDC  
- **Parametric Logic:** payout based on external verification (no manual claim)  
- **Data Flow:**  
  - `buyPolicy()` → registers policy & stores flight data  
  - `requestClaim()` → traveler signals claim request  
  - `verifyAndPayClaim()` → oracle/backend confirms cancellation → contract pays instantly  
- **Deployment-ready:** can run on any EVM chain with a reliable oracle and USDC support  

---

### 📊 Market Relevance
- **$20B+ travel insurance market**, yet 98% of global passengers remain uninsured.  
- **$60B+ annual disruption costs** for airlines and passengers combined.  
- **Emerging markets (LATAM, Africa, Asia)** suffer most from delayed reimbursements and lack of accessible insurance.  
Palomito introduces a frictionless alternative — **micro-insurance powered by code**, not bureaucracy.

---

### 💸 Business Model
- 5% flat premium paid in stablecoins  
- Oracle or verification node earns a small fee per verified payout  
- Open-source SDK for wallets, travel apps, and fintechs to embed flight protection  

---

### 🧠 Why It Matters
- Turns **real-world data** into **programmable insurance**  
- Makes protection accessible to anyone with a crypto wallet  
- Fully transparent: policies, balances, and payouts visible on-chain  
- Demonstrates a **scalable DeFi use case** beyond trading or yield farming  

---

### 🧩 Future Work
- Integrate flight APIs (FlightAware, AviationStack, Cirium) as trusted data sources  
- Expand into weather and event-based insurance  
- Release dashboard for policy management and on-chain analytics  

---

### 👥 Team
- **Carlos Castillo** – Blockchain developer & fintech founder  
- **Open-source collaborators** from the global hackathon community  

---

> **Palomito Insurance** — Real-world protection, automated by smart contracts.
