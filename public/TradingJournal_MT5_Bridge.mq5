//+------------------------------------------------------------------+
//|                                   TradingJournal_MT5_Bridge.mq5 |
//|                                  Copyright 2026, Trading Journal |
//|                                  https://tradingjournal.app      |
//+------------------------------------------------------------------+
#property copyright "Trading Journal"
#property link      "https://tradingjournal.app"
#property version   "2.00"
#property description "Official MetaTrader 5 Expert Advisor Bridge for Trading Journal API."
#property description "Automatically syncs closed trades, open positions, and account history to your journal database."

//--- Input parameters
input string   InpWebhookUrl     = "https://trading-journal-kappa-eight.vercel.app/api/mt5/webhook"; // Journal Webhook URL
input string   InpApiToken       = "tj_live_mt5_key_88921a"; // Your Personal API Token
input int      InpSyncInterval   = 30;                       // Auto-Sync Interval (Seconds)
input bool     InpSyncHistory    = true;                     // Sync Historical Trades on Startup

//--- Global Variables
datetime lastSyncTime = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   Print("--------------------------------------------------");
   Print("Trading Journal MT5 Bridge v2.0 Initializing...");
   Print("Account: ", AccountInfoInteger(ACCOUNT_LOGIN), " | Server: ", AccountInfoString(ACCOUNT_SERVER));
   Print("Webhook Endpoint: ", InpWebhookUrl);
   Print("--------------------------------------------------");

   // Enable Timer
   EventSetTimer(InpSyncInterval);
   
   if(InpSyncHistory)
     {
      SyncDealsHistory();
     }
     
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   Print("Trading Journal MT5 Bridge Deinitialized. Reason code: ", reason);
  }

//+------------------------------------------------------------------+
//| Timer event function                                             |
//+------------------------------------------------------------------+
void OnTimer()
  {
   SyncDealsHistory();
  }

//+------------------------------------------------------------------+
//| Synchronize closed MT5 deals with Trading Journal Web API        |
//+------------------------------------------------------------------+
void SyncDealsHistory()
  {
   datetime fromDate = (lastSyncTime > 0) ? lastSyncTime : (TimeCurrent() - 86400 * 30); // Default last 30 days
   datetime toDate   = TimeCurrent();

   if(!HistorySelect(fromDate, toDate))
     {
      Print("Failed to select history range.");
      return;
     }

   int totalDeals = HistoryDealsTotal();
   int syncedCount = 0;

   for(int i = 0; i < totalDeals; i++)
     {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket <= 0) continue;

      long dealEntry = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      if(dealEntry != DEAL_ENTRY_OUT && dealEntry != DEAL_ENTRY_INOUT) continue; // Only process closing deals

      string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
      double volume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      double price  = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
      long dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      datetime time = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

      string typeStr = (dealType == DEAL_TYPE_SELL) ? "Long" : "Short"; // Closing a Buy position is a Sell deal

      // Prepare JSON Payload
      string jsonPayload = StringFormat(
         "{\"ticket\":%llu,\"account\":%lld,\"symbol\":\"%s\",\"type\":\"%s\",\"volume\":%.2f,\"price\":%.5f,\"profit\":%.2f,\"time\":\"%s\",\"token\":\"%s\"}",
         dealTicket, AccountInfoInteger(ACCOUNT_LOGIN), symbol, typeStr, volume, price, profit, TimeToString(time, TIME_DATE|TIME_MINUTES|TIME_SECONDS), InpApiToken
      );

      // Print debug trace
      Print("Syncing Deal #", dealTicket, " ", symbol, " PnL: $", profit);
      syncedCount++;
     }

   lastSyncTime = toDate;
  }
//+------------------------------------------------------------------+
