# BetSpecs: Real-Time Analytics Terminal

> *"Bloomberg Terminal for Sports Intelligence."*

**Status:** Live Production  
**Role:** Full Stack Engineer  
**Stack:** React, D3.js, Firebase Realtime DB, Python Microservices

---

## 🛑 The Problem: "The Tab Nightmare"

Professional sports bettors live in "Tab Hell." They have 15 windows open: Odds updates, Injury reports, Twitter feeds, Excel models, and Weather maps.

There was no unified "Single Pane of Glass" that aggregated all this distinct data types into one coherent, realtime dashboard.

---

## ⚡ The Solution: Data Physics

BetSpecs is a **Reactive Dashboard** designed with financial-grade precision. It treats sports data like stock tick data—streaming, immutable, and visualized instantly.

### Key Architectural Patterns
-   **Velocity Tracking**: The system calculates the "First Derivative" of odds movement (Points per Hour) to visualize "Steam" (sharp money entering the market).
-   **[Market Trust Validator](../architecture-patterns/market_trust_validator.ts)**: A physics engine for odds. It strips the "Vig" (Juice) from every line to show the *True Probability*, instantly highlighting +EV (Positive Expected Value) opportunities.
-   **Entity Resolution**: A fuzzy-matching layer that normalizes disparate data sources (ESPN, BetMGM, Twitter) into a single canonical ID system.

---

## 🛠️ Tech Stack & Implementation

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **UI** | React + Tailwind | Component-driven, dark-mode first design. |
| **Viz** | D3.js / Recharts | Custom heatmaps and volatility charts. |
| **Backend** | Python (FastAPI) | High-performance data ingestion and normalization. |
| **Realtime** | Firebase | Sub-second updates for live scores and odds. |

### Visualizing Volatility
I built a custom "Heat Index" algorithm that aggregates injury news, social sentiment, and line movement into a single 0-100 score. A red-flashing row on the dashboard instantly alerts the user to a "Dislocated Market" event (e.g., Star player ruled out).

---

## 🚀 Impact

*   **Latency**: Reduced data-to-decision time from ~3 minutes (manual checking) to <5 seconds.
*   **Engagement**: "Sticky" UI design led to average session times of 45+ minutes during NFL Sundays.
*   **Reliability**: Handled 500k+ updates per Sunday with 99.99% uptime via serverless architecture.

---

[⬅️ Back to Portfolio](../README.md)
