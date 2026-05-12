//+------------------------------------------------------------------+
//| Mapazapp_BacktestEA.mq5                                          |
//| Mapazapp — E3.3: Strategy Tester skeleton (Setup V1 path)       |
//| Virtual mode only: CSV/JSON under MQL5/Files/<export>/<run>/    |
//| No broker execution imports; no live chart operation.            |
//+------------------------------------------------------------------+
#property copyright "Mapazapp"
#property link      "https://mapazapp"
#property version   "1.00"
#property description "Strategy Tester only: BacktestEA skeleton export (E3.3). No live trading."
#property strict

input string            InpSchemaVersion        = "backtest_ea_v1";
input string            InpStrategyId           = "IFVG_XAUUSD_V1";
input string            InpParameterSetId       = "default";
input string            InpCanonicalSymbol      = "XAUUSD";
input string            InpRunId                = "";
input string            InpExportRoot           = "Mapazapp\\BacktestEA";
input ENUM_TIMEFRAMES   InpExecutionTimeframe   = PERIOD_M15;
input ENUM_TIMEFRAMES   InpDailyBiasTimeframe   = PERIOD_D1;
input bool              InpUseH4Context         = true;
input bool              InpUseH1Context         = true;
input string            InpBacktestMode         = "virtual";
input bool              InpWriteTradesCsv       = true;
input bool              InpWriteEventsCsv       = true;
input bool              InpWriteSummaryJson     = true;

#define BACKTESTEA_BUILD "MZP_BacktestEA_E3_3"

bool     g_testerOk = false;
bool     g_initOk = false;
string   g_runId = "";
string   g_baseRelPath = "";
string   g_brokerSymbol = "";
string   g_eventsDataLines = "";
int      g_nextEventId = 1;
string   g_exportNotes = "";

//+------------------------------------------------------------------+
//| E3.4 will implement Daily Bias V1 (real logic).                  |
//| E3.5 will implement Setup V1 IFVG detection (real logic).        |
//| E3.3: bias/setup are placeholders only — no IFVG engine yet.     |
//+------------------------------------------------------------------+

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
string SanitizeToken(const string s)
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
bool SchemaIsSupported(const string v)
  {
   return (v == "backtest_ea_v1");
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
      default:         return "CUSTOM";
     }
  }

//+------------------------------------------------------------------+
string MakeAutoRunId(void)
  {
   MqlDateTime dt;
   TimeToStruct(TimeGMT(), dt);
   const string sym = SanitizeToken(g_brokerSymbol);
   return StringFormat("BACKTESTEA_%s_%04d%02d%02d_%02d%02d%02d_%d",
                       (StringLen(sym) > 0 ? sym : "SYM"),
                       dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec,
                       (int)(GetTickCount() % 1000000));
  }

//+------------------------------------------------------------------+
string BuildRunId(void)
  {
   const string manual = Trim(InpRunId);
   if(StringLen(manual) > 0)
     {
      const string s = SanitizeToken(manual);
      if(StringLen(s) > 0)
         return s;
     }
   return MakeAutoRunId();
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
      const string seg = SanitizeToken(piece);
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
bool BuildExportPath(void)
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
bool EnsureTesterOnly(void)
  {
   return (MQLInfoInteger(MQL_TESTER) != 0);
  }

//+------------------------------------------------------------------+
string GetBiasDirectionPlaceholder(void)
  {
   return "unknown";
  }

//+------------------------------------------------------------------+
string DetectSetupPlaceholder(void)
  {
   return "none";
  }

//+------------------------------------------------------------------+
string WriteTradesHeader(void)
  {
   return "run_id,trade_id,timestamp,symbol,timeframe,direction,bias_direction,setup_direction,entry,sl,tp,result_r,exit_reason,setup_reason,bias_reason,rejection_reason";
  }

//+------------------------------------------------------------------+
string WriteEventsHeader(void)
  {
   return "run_id,event_id,timestamp,symbol,event_type,bias_direction,setup_direction,decision,reason,details";
  }

//+------------------------------------------------------------------+
void ExportLifecycleEvent(const string eventType,
                          const string decision,
                          const string reason,
                          const string details)
  {
   if(!g_initOk)
      return;
   const string ts = NowUtcIso();
   const string evId = StringFormat("EVT_%06d", g_nextEventId++);
   const string bias = GetBiasDirectionPlaceholder();
   const string setupDir = DetectSetupPlaceholder();
   string row = g_runId + "," + evId + "," + ts + "," + InpCanonicalSymbol + ","
                + eventType + "," + bias + "," + setupDir + ","
                + decision + "," + JsonStringEscape(reason) + "," + JsonStringEscape(details);
   if(StringLen(g_eventsDataLines) > 0)
      g_eventsDataLines += "\r\n";
   g_eventsDataLines += row;
  }

//+------------------------------------------------------------------+
void ExportPlaceholderSummary(void)
  {
   g_exportNotes =
      "E3.3 skeleton: no real IFVG, no real daily bias, no virtual trades emitted; counters are zero by design.";
  }

//+------------------------------------------------------------------+
string WriteSummaryJson(void)
  {
   ExportPlaceholderSummary();
   const string execTf = TfToWire(InpExecutionTimeframe);
   const string biasTf = TfToWire(InpDailyBiasTimeframe);
   const string exportedAt = NowUtcIso();
   string json = "{\r\n";
   json += "  \"schema_version\": \"" + JsonStringEscape(InpSchemaVersion) + "\",\r\n";
   json += "  \"ea_build\": \"" + JsonStringEscape(BACKTESTEA_BUILD) + "\",\r\n";
   json += "  \"run_id\": \"" + JsonStringEscape(g_runId) + "\",\r\n";
   json += "  \"strategy_id\": \"" + JsonStringEscape(InpStrategyId) + "\",\r\n";
   json += "  \"parameter_set_id\": \"" + JsonStringEscape(InpParameterSetId) + "\",\r\n";
   json += "  \"symbol\": \"" + JsonStringEscape(InpCanonicalSymbol) + "\",\r\n";
   json += "  \"broker_symbol\": \"" + JsonStringEscape(g_brokerSymbol) + "\",\r\n";
   json += "  \"execution_timeframe\": \"" + JsonStringEscape(execTf) + "\",\r\n";
   json += "  \"daily_bias_timeframe\": \"" + JsonStringEscape(biasTf) + "\",\r\n";
   json += "  \"use_h4_context\": " + (InpUseH4Context ? "true" : "false") + ",\r\n";
   json += "  \"use_h1_context\": " + (InpUseH1Context ? "true" : "false") + ",\r\n";
   json += "  \"backtest_mode\": \"" + JsonStringEscape(Trim(InpBacktestMode)) + "\",\r\n";
   json += "  \"tester_only\": true,\r\n";
   json += "  \"has_real_ifvg_logic\": false,\r\n";
   json += "  \"has_real_daily_bias_logic\": false,\r\n";
   json += "  \"has_real_trading_orders\": false,\r\n";
   json += "  \"trade_count\": 0,\r\n";
   json += "  \"rejected_by_daily_bias\": 0,\r\n";
   json += "  \"skipped_neutral_bias\": 0,\r\n";
   json += "  \"exported_at_utc\": \"" + JsonStringEscape(exportedAt) + "\",\r\n";
   json += "  \"notes\": \"" + JsonStringEscape(g_exportNotes) + "\"\r\n";
   json += "}\r\n";
   return json;
  }

//+------------------------------------------------------------------+
void WriteAllExports(const int deinitReason)
  {
   if(!g_testerOk || !g_initOk)
      return;

   if(InpWriteEventsCsv)
      ExportLifecycleEvent("lifecycle_deinit", "ok",
                           "OnDeinit",
                           StringFormat("reason_code=%d", deinitReason));

   if(InpWriteTradesCsv)
     {
      const string tradesBody = WriteTradesHeader() + "\r\n";
      WriteTextAtomic(g_baseRelPath + "\\backtest_trades.csv", tradesBody);
     }

   if(InpWriteEventsCsv)
     {
      const string eventsBody = WriteEventsHeader() + "\r\n" + g_eventsDataLines + "\r\n";
      WriteTextAtomic(g_baseRelPath + "\\backtest_events.csv", eventsBody);
     }

   if(InpWriteSummaryJson)
     {
      WriteTextAtomic(g_baseRelPath + "\\backtest_summary.json", WriteSummaryJson());
     }
  }

//+------------------------------------------------------------------+
int OnInit()
  {
   g_testerOk = EnsureTesterOnly();
   if(!g_testerOk)
     {
      Print("Mapazapp_BacktestEA: Strategy Tester required (MQL_TESTER). Live chart blocked.");
      return INIT_FAILED;
     }

   if(!SchemaIsSupported(InpSchemaVersion))
     {
      Print("Mapazapp_BacktestEA: unsupported InpSchemaVersion: ", InpSchemaVersion);
      return INIT_FAILED;
     }

   g_brokerSymbol = _Symbol;
   g_runId = BuildRunId();
   if(!BuildExportPath())
     {
      Print("Mapazapp_BacktestEA: invalid export path.");
      return INIT_FAILED;
     }

   g_initOk = true;
   Print("Mapazapp_BacktestEA: tester-only skeleton; outputs under MQL5\\Files\\", g_baseRelPath);

   ExportLifecycleEvent("lifecycle_init", "ok", "OnInit", "paths_ready");
   ExportLifecycleEvent("skeleton_ready", "noop", "E3.3_placeholder",
                        "awaiting E3.4 bias and E3.5 setup detection");

   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   WriteAllExports(reason);
  }

//+------------------------------------------------------------------+
