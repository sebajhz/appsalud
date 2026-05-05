//+------------------------------------------------------------------+
//| Mapazapp_TestEA.mq5                                              |
//| Mapazapp — Checkpoint 14: Strategy Tester export / evidence only |
//| Writes MZP_TESTEA_V1 CSV + JSON under MQL5/Files/<export>/<run>/|
//| NO live chart use; NO OrderSend/CTrade; NO WebRequest; NO DLLs.   |
//+------------------------------------------------------------------+
#property copyright "Mapazapp"
#property link      "https://mapazapp"
#property version   "1.00"
#property description "Strategy Tester only: virtual backtest export for Mapazapp CP8 importer (no live trading)."
#property strict

input string InpSchemaVersion      = "MZP_TESTEA_V1";
input string InpStrategyId         = "MZP_IFVG_ZONE_REACTION_V1";
input string InpParameterSetId     = "MZP_IFVG_XAUUSD_V1_SET_003";
input string InpCanonicalSymbol   = "XAUUSD";
input string InpAccountId          = "TESTER_ACCOUNT";
input string InpExportRoot         = "Mapazapp\\testea";
input string InpRunId              = "";
input string InpDatasetSplit       = "validation";
input bool   InpWriteTradesCsv     = true;
input bool   InpWriteSummaryJson   = true;
input long   InpMagic              = 140013;
input double InpFixedRiskR         = 1.0;
input double InpRrTarget           = 2.0;
input int    InpMaxBars            = 0;
input bool   InpExportSignalsOnly  = true;

#define TESTEA_VERSION           "MZP_TestEA_v1"
#define PLACEHOLDER_EXIT_REASON  "PLACEHOLDER_VIRTUAL_SKELETON_NOT_IFVG"
#define MAX_COPY_BARS_CAP        100000

bool     g_testerOk = false;
bool     g_initOk = false;
string   g_runId = "";
string   g_baseRelPath = "";
string   g_brokerSymbol = "";
string   g_diagNotes = "";

//+------------------------------------------------------------------+
string Trim(const string s)
  {
   string t = s;
   StringTrimLeft(t);
   StringTrimRight(t);
   return t;
  }

//+------------------------------------------------------------------+
string JsonStringEscape(const string s)
  {
   string u = "";
   const int n = (int)StringLen(s);
   for(int i = 0; i < n; i++)
     {
      const ushort ch = StringGetCharacter(s, i);
      if(ch == '"')
         u += "\\\"";
      else if(ch == '\\')
         u += "\\\\";
      else if(ch == '\n' || ch == '\r')
         u += " ";
      else if(ch < 32)
         continue;
      else if(ch > 127)
         u += "?";
      else
         u += CharToString((uchar)ch);
     }
   return u;
  }

//+------------------------------------------------------------------+
string TimeUtcIso(const datetime t)
  {
   MqlDateTime dt;
   TimeToStruct(t, dt);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ",
                       dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec);
  }

//+------------------------------------------------------------------+
string NowUtcIso(void)
  {
   return TimeUtcIso(TimeGMT());
  }

//+------------------------------------------------------------------+
bool SchemaIsSupported(const string v)
  {
   return (v == "MZP_TESTEA_V1");
  }

//+------------------------------------------------------------------+
string SanitizeFolderNameSegment(const string s)
  {
   string o = "";
   const int n = (int)StringLen(s);
   for(int i = 0; i < n; i++)
     {
      const ushort ch = StringGetCharacter(s, i);
      if(ch == '\\' || ch == '/' || ch == ':' || ch == '*' || ch == '?' || ch == '"' || ch == '<' || ch == '>' || ch == '|')
         continue;
      if(ch < 32)
         continue;
      o += CharToString((uchar)ch);
     }
   return o;
  }

//+------------------------------------------------------------------+
bool ParseExportRootSegments(const string raw, string &outSegments[])
  {
   ArrayResize(outSegments, 0);
   string t = Trim(raw);
   if(StringLen(t) == 0)
      return false;
   StringReplace(t, "/", "\\");
   string parts[];
   const ushort sepBackslash = StringGetCharacter("\\", 0);
   const int n = StringSplit(t, sepBackslash, parts);
   for(int i = 0; i < n; i++)
     {
      const string piece = Trim(parts[i]);
      if(StringLen(piece) == 0)
         continue;
      const string seg = SanitizeFolderNameSegment(piece);
      if(StringLen(seg) == 0)
         continue;
      const int m = ArraySize(outSegments);
      ArrayResize(outSegments, m + 1);
      outSegments[m] = seg;
     }
   return (ArraySize(outSegments) > 0);
  }

//+------------------------------------------------------------------+
string JoinPathSegmentsBackslash(const string &segments[])
  {
   string acc = "";
   const int k = ArraySize(segments);
   for(int i = 0; i < k; i++)
     {
      if(StringLen(acc) == 0)
         acc = segments[i];
      else
         acc = acc + "\\" + segments[i];
     }
   return acc;
  }

//+------------------------------------------------------------------+
bool EnsureFolderTreeFromSegments(const string &segments[])
  {
   string acc = "";
   const int k = ArraySize(segments);
   for(int i = 0; i < k; i++)
     {
      if(StringLen(acc) == 0)
         acc = segments[i];
      else
         acc = acc + "\\" + segments[i];
      FolderCreate(acc);
     }
   return (k > 0 && StringLen(acc) > 0);
  }

//+------------------------------------------------------------------+
bool WriteTextAtomic(const string relativePath, const string body)
  {
   const string tmp = relativePath + ".tmp";
   int fh = FileOpen(tmp, FILE_WRITE | FILE_TXT | FILE_ANSI | FILE_SHARE_READ);
   if(fh == INVALID_HANDLE)
      return false;
   if(FileWriteString(fh, body) <= 0)
     {
      FileClose(fh);
      return false;
     }
   FileFlush(fh);
   FileClose(fh);
   if(FileIsExist(relativePath))
      FileDelete(relativePath);
   if(!FileMove(tmp, 0, relativePath, 0))
      return false;
   return true;
  }

//+------------------------------------------------------------------+
string TfToWire(const ENUM_TIMEFRAMES tf)
  {
   switch(tf)
     {
      case PERIOD_M1:  return "M1";
      case PERIOD_M5:  return "M5";
      case PERIOD_M15: return "M15";
      case PERIOD_M30: return "M30";
      case PERIOD_H1:  return "H1";
      case PERIOD_H4:  return "H4";
      case PERIOD_D1:  return "D1";
      case PERIOD_W1:  return "W1";
      case PERIOD_MN1: return "MN1";
      default:         return "CURRENT";
     }
  }

//+------------------------------------------------------------------+
string MakeAutoRunId(void)
  {
   MqlDateTime dt;
   TimeToStruct(TimeGMT(), dt);
   const string sym = SanitizeFolderNameSegment(g_brokerSymbol);
   return StringFormat("TESTEA_%s_%04d%02d%02d_%02d%02d%02d_%d",
                       (StringLen(sym) > 0 ? sym : "SYM"),
                       dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec,
                       (int)(GetTickCount() % 1000000));
  }

//+------------------------------------------------------------------+
string ResolveRunId(void)
  {
   const string manual = Trim(InpRunId);
   if(StringLen(manual) > 0)
     {
      const string s = SanitizeFolderNameSegment(manual);
      if(StringLen(s) > 0)
         return s;
     }
   return MakeAutoRunId();
  }

//+------------------------------------------------------------------+
bool BuildBasePath(void)
  {
   string rootSegs[];
   if(!ParseExportRootSegments(InpExportRoot, rootSegs))
      return false;
   const int r = ArraySize(rootSegs);
   string allSegs[];
   ArrayResize(allSegs, r + 1);
   for(int i = 0; i < r; i++)
      allSegs[i] = rootSegs[i];
   allSegs[r] = g_runId;
   if(!EnsureFolderTreeFromSegments(allSegs))
      return false;
   g_baseRelPath = JoinPathSegmentsBackslash(allSegs);
   return (StringLen(g_baseRelPath) > 0);
  }

//+------------------------------------------------------------------+
//| Deterministic placeholder only — NOT the IFVG engine.            |
//+------------------------------------------------------------------+
int BuildPlaceholderTradeCsv(string &outCsv, int &tradeCount)
  {
   tradeCount = 0;
   outCsv =
      "run_id,trade_id,strategy_id,parameter_set_id,symbol,broker_symbol,account_id,direction,entry_time,exit_time,entry_price,exit_price,sl,tp,result_money,result_r,commission,swap,spread_at_entry,score_total,zone_id,exit_reason\r\n";

   if(!InpExportSignalsOnly)
     {
      g_diagNotes = "InpExportSignalsOnly=false: no synthetic rows emitted.";
      return 0;
     }

   const int totalBars = Bars(g_brokerSymbol, PERIOD_CURRENT);
   if(totalBars < 3)
     {
      g_diagNotes = "Insufficient bars for placeholder row (need >= 3).";
      return 0;
     }

   int want = totalBars;
   if(InpMaxBars > 0 && InpMaxBars < want)
      want = InpMaxBars;
   if(want > MAX_COPY_BARS_CAP)
      want = MAX_COPY_BARS_CAP;

   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   const int n = CopyRates(g_brokerSymbol, PERIOD_CURRENT, 0, want, rates);
   if(n < 3)
     {
      g_diagNotes = "CopyRates returned fewer than 3 bars.";
      return 0;
     }

   const int iExit = 0;
   const int iEntry = n - 1;
   const double entry = rates[iEntry].open;
   const double exitp = rates[iExit].close;
   const double point = SymbolInfoDouble(g_brokerSymbol, SYMBOL_POINT);
   if(point <= 0.0)
     {
      g_diagNotes = "SYMBOL_POINT invalid.";
      return 0;
     }

   const double riskDist = 50.0 * point;
   if(riskDist <= 0.0)
      return 0;

   const double sl = entry - riskDist;
   const double tp = entry + InpRrTarget * riskDist;
   const double resultR = (exitp - entry) / riskDist;
   const int digits = (int)SymbolInfoInteger(g_brokerSymbol, SYMBOL_DIGITS);

   const string tradeId = g_runId + "_VT001";
   const string entryIso = TimeUtcIso(rates[iEntry].time);
   const string exitIso = TimeUtcIso(rates[iExit].time);

   string row = g_runId + "," + tradeId + "," + InpStrategyId + "," + InpParameterSetId + ","
                + InpCanonicalSymbol + "," + g_brokerSymbol + "," + InpAccountId + ","
                + "BUY" + ","
                + entryIso + "," + exitIso + ","
                + DoubleToString(entry, digits) + "," + DoubleToString(exitp, digits) + ","
                + DoubleToString(sl, digits) + "," + DoubleToString(tp, digits) + ","
                + "0.0," + DoubleToString(resultR, 6) + ","
                + "0.0,0.0,0.0,0.0,"
                + "PLACEHOLDER_ZONE,"
                + PLACEHOLDER_EXIT_REASON + "\r\n";

   outCsv += row;
   tradeCount = 1;
   g_diagNotes =
      "Placeholder virtual BUY row from first/last sampled bars — skeleton only; not IFVG; InpFixedRiskR is metadata only here.";
   return 1;
  }

//+------------------------------------------------------------------+
void WriteExports(void)
  {
   if(!InpWriteTradesCsv && !InpWriteSummaryJson)
      return;

   string csvBody = "";
   int tc = 0;
   BuildPlaceholderTradeCsv(csvBody, tc);
   if(!InpWriteTradesCsv)
      g_diagNotes += " Trades file not written (InpWriteTradesCsv=false).";

   datetime tStart = 0;
   datetime tStop = 0;
   if(TesterStartTime() > 0)
      tStart = TesterStartTime();
   if(TesterStopTime() > 0)
      tStop = TesterStopTime();

   const ENUM_TIMEFRAMES curTf = Period();
   const string tfWire = TfToWire(curTf);
   const string splitLower = Trim(InpDatasetSplit);
   const string exportedAt = NowUtcIso();

   if(InpWriteTradesCsv)
      WriteTextAtomic(g_baseRelPath + "\\backtest_trades.csv", csvBody);

   if(InpWriteSummaryJson)
     {
      string json = "{\r\n";
      json += "  \"schema_version\": \"" + JsonStringEscape(InpSchemaVersion) + "\",\r\n";
      json += "  \"ea_build\": \"" + JsonStringEscape(TESTEA_VERSION) + "\",\r\n";
      json += "  \"run_id\": \"" + JsonStringEscape(g_runId) + "\",\r\n";
      json += "  \"strategy_id\": \"" + JsonStringEscape(InpStrategyId) + "\",\r\n";
      json += "  \"parameter_set_id\": \"" + JsonStringEscape(InpParameterSetId) + "\",\r\n";
      json += "  \"canonical_symbol\": \"" + JsonStringEscape(InpCanonicalSymbol) + "\",\r\n";
      json += "  \"broker_symbol\": \"" + JsonStringEscape(g_brokerSymbol) + "\",\r\n";
      json += "  \"account_id\": \"" + JsonStringEscape(InpAccountId) + "\",\r\n";
      json += "  \"dataset_split\": \"" + JsonStringEscape(splitLower) + "\",\r\n";
      json += "  \"tester_symbol\": \"" + JsonStringEscape(g_brokerSymbol) + "\",\r\n";
      json += "  \"tester_period\": \"" + JsonStringEscape(tfWire) + "\",\r\n";
      if(tStart > 0)
         json += "  \"tester_from\": \"" + JsonStringEscape(TimeUtcIso(tStart)) + "\",\r\n";
      else
         json += "  \"tester_from\": null,\r\n";
      if(tStop > 0)
         json += "  \"tester_to\": \"" + JsonStringEscape(TimeUtcIso(tStop)) + "\",\r\n";
      else
         json += "  \"tester_to\": null,\r\n";
      json += "  \"exported_at_utc\": \"" + JsonStringEscape(exportedAt) + "\",\r\n";
      json += StringFormat("  \"trade_count\": %d,\r\n", tc);
      json += "  \"notes\": \"" + JsonStringEscape(g_diagNotes) + "\",\r\n";
      json += "  \"execution_mode\": \"virtual_export_only\",\r\n";
      json += "  \"live_trading_enabled\": false,\r\n";
      json += StringFormat("  \"magic_reserved\": %I64d,\r\n", InpMagic);
      json += StringFormat("  \"fixed_risk_r_meta\": %.8f,\r\n", InpFixedRiskR);
      json += StringFormat("  \"rr_target_meta\": %.8f\r\n", InpRrTarget);
      json += "}\r\n";
      WriteTextAtomic(g_baseRelPath + "\\backtest_summary.json", json);
     }
  }

//+------------------------------------------------------------------+
int OnInit()
  {
   g_testerOk = (MQLInfoInteger(MQL_TESTER) != 0);
   if(!g_testerOk)
     {
      Print("Mapazapp_TestEA is intended for Strategy Tester only.");
      return INIT_FAILED;
     }

   if(!SchemaIsSupported(InpSchemaVersion))
     {
      Print("Unsupported InpSchemaVersion: ", InpSchemaVersion);
      return INIT_FAILED;
     }

   g_brokerSymbol = _Symbol;
   g_runId = ResolveRunId();
   if(!BuildBasePath())
     {
      Print("Mapazapp_TestEA: invalid export path.");
      return INIT_FAILED;
     }

   g_initOk = true;
   Print("Mapazapp_TestEA: tester export mode; outputs under MQL5\\Files\\", g_baseRelPath);
   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   if(!g_testerOk || !g_initOk)
      return;
   WriteExports();
  }

//+------------------------------------------------------------------+
