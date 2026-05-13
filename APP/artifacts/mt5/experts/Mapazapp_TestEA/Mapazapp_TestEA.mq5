//+------------------------------------------------------------------+
//| Mapazapp_TestEA.mq5                                              |
//| Mapazapp — E3.4.2: Official Strategy Tester EA / Backtest role |
//| Daily Bias V1; virtual mode; CSV/JSON under MQL5/Files/<export> |
//| No broker execution; fail-closed outside Strategy Tester.       |
//+------------------------------------------------------------------+
#property copyright "Mapazapp"
#property link      "https://mapazapp"
#property version   "1.02"
#property description "Strategy Tester only: official TestEA (BacktestEA role). Daily Bias V1. No IFVG yet (E3.5)."
#property strict

input string            InpSchemaVersion           = "backtest_ea_v1";
input string            InpStrategyId              = "IFVG_XAUUSD_V1";
input string            InpParameterSetId          = "default";
input string            InpCanonicalSymbol         = "XAUUSD";
input string            InpRunId                   = "";
input string            InpExportRoot              = "Mapazapp\\TestEA";
input ENUM_TIMEFRAMES   InpExecutionTimeframe      = PERIOD_M15;
input ENUM_TIMEFRAMES   InpDailyBiasTimeframe      = PERIOD_D1;
input bool              InpUseH4Context            = true;
input bool              InpUseH1Context            = true;
input string            InpBacktestMode            = "virtual";
input int               InpDailyBiasMinBodyPoints  = 0;
input bool              InpWriteTradesCsv          = true;
input bool              InpWriteEventsCsv         = true;
input bool              InpWriteSummaryJson       = true;

#define TESTEA_BUILD            "MZP_TestEA_E3_4_2"
#define EVT_DAILY_BIAS_EVAL     "daily_bias_evaluated"
#define REASON_BULL_BODY        "previous_daily_close_above_open"
#define REASON_BEAR_BODY        "previous_daily_close_below_open"
#define REASON_BODY_SMALL       "previous_daily_body_too_small"
#define REASON_DOJI             "previous_daily_close_equals_open"
#define REASON_MISSING_DAILY    "missing_daily_bias_data"

enum ENUM_MAPZ_BIAS
  {
   MAPZ_BIAS_UNKNOWN = 0,
   MAPZ_BIAS_BULLISH = 1,
   MAPZ_BIAS_BEARISH = 2,
   MAPZ_BIAS_NEUTRAL = 3
  };

bool            g_testerOk = false;
bool            g_initOk = false;
string          g_runId = "";
string          g_baseRelPath = "";
string          g_brokerSymbol = "";
string          g_eventsDataLines = "";
int             g_nextEventId = 1;
string          g_exportNotes = "";

datetime        g_lastClosedBiasBarTime = 0;
ENUM_MAPZ_BIAS  g_lastBiasEnum = MAPZ_BIAS_UNKNOWN;
string          g_lastBiasReason = "";

long            g_totalBiasEvaluated = 0;
long            g_bullishBiasCount = 0;
long            g_bearishBiasCount = 0;
long            g_neutralBiasCount = 0;
long            g_unknownBiasCount = 0;
long            g_missingBiasContextCount = 0;
long            g_rejectedByDailyBias = 0;
long            g_skippedNeutralBias = 0;

bool            g_missingDataEventEmitted = false;

//+------------------------------------------------------------------+
//| E3.5 will add Setup V1 IFVG detection (real logic).              |
//| E3.4.2: Daily Bias V1 from last closed bar on bias timeframe.    |
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
   return StringFormat("TESTEA_%s_%04d%02d%02d_%02d%02d%02d_%d",
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
string BiasDirectionToString(const ENUM_MAPZ_BIAS b)
  {
   if(b == MAPZ_BIAS_BULLISH)
      return "bullish";
   if(b == MAPZ_BIAS_BEARISH)
      return "bearish";
   if(b == MAPZ_BIAS_NEUTRAL)
      return "neutral";
   return "unknown";
  }

//+------------------------------------------------------------------+
string BuildBiasReason(const ENUM_MAPZ_BIAS b, const string primaryTag)
  {
   if(StringLen(primaryTag) > 0)
      return primaryTag;
   return BiasDirectionToString(b);
  }

//+------------------------------------------------------------------+
void IncrementBiasOutcomeCounters(const ENUM_MAPZ_BIAS b, const bool missingContext)
  {
   g_totalBiasEvaluated++;
   if(missingContext)
      g_missingBiasContextCount++;
   if(b == MAPZ_BIAS_BULLISH)
      g_bullishBiasCount++;
   else if(b == MAPZ_BIAS_BEARISH)
      g_bearishBiasCount++;
   else if(b == MAPZ_BIAS_NEUTRAL)
      g_neutralBiasCount++;
   else
      g_unknownBiasCount++;
  }

//+------------------------------------------------------------------+
//| Daily Bias V1 — last fully closed bar on InpDailyBiasTimeframe.  |
//+------------------------------------------------------------------+
bool EvaluateDailyBiasV1(const datetime closedBarTime,
                           const double openPrice,
                           const double closePrice,
                           ENUM_MAPZ_BIAS &outBias,
                           string &outReason)
  {
   outBias = MAPZ_BIAS_UNKNOWN;
   outReason = REASON_MISSING_DAILY;

   const double pt = SymbolInfoDouble(g_brokerSymbol, SYMBOL_POINT);
   if(pt <= 0.0)
     {
      outReason = REASON_MISSING_DAILY;
      return false;
     }

   if(closedBarTime == 0)
     {
      outReason = REASON_MISSING_DAILY;
      return false;
     }

   const double body = MathAbs(closePrice - openPrice);
   const int bodyPts = (int)MathRound(body / pt);

   if(InpDailyBiasMinBodyPoints > 0 && bodyPts < InpDailyBiasMinBodyPoints)
     {
      outBias = MAPZ_BIAS_NEUTRAL;
      outReason = REASON_BODY_SMALL;
      return true;
     }

   if(closePrice > openPrice)
     {
      outBias = MAPZ_BIAS_BULLISH;
      outReason = REASON_BULL_BODY;
      return true;
     }
   if(closePrice < openPrice)
     {
      outBias = MAPZ_BIAS_BEARISH;
      outReason = REASON_BEAR_BODY;
      return true;
     }

   outBias = MAPZ_BIAS_NEUTRAL;
   outReason = REASON_DOJI;
   return true;
  }

//+------------------------------------------------------------------+
void AppendEventRow(const string eventType,
                     const string biasWire,
                     const string setupWire,
                     const string decision,
                     const string reason,
                     const string details)
  {
   if(!g_initOk || !InpWriteEventsCsv)
      return;
   const string ts = NowUtcIso();
   const string evId = StringFormat("EVT_%06d", g_nextEventId++);
   string row = g_runId + "," + evId + "," + ts + "," + InpCanonicalSymbol + ","
                + eventType + "," + biasWire + "," + setupWire + ","
                + decision + "," + JsonStringEscape(reason) + "," + JsonStringEscape(details);
   if(StringLen(g_eventsDataLines) > 0)
      g_eventsDataLines += "\r\n";
   g_eventsDataLines += row;
  }

//+------------------------------------------------------------------+
void ExportDailyBiasEvent(const ENUM_MAPZ_BIAS biasEnum,
                          const string reasonTag,
                          const datetime closedBarTime,
                          const int bodyPoints)
  {
   const string biasW = BiasDirectionToString(biasEnum);
   const string reasonWire = BuildBiasReason(biasEnum, reasonTag);
   const string tiso = (closedBarTime > 0 ? TimeUtcIso(closedBarTime) : "none");
   const string details = StringFormat("bias_tf=%s closed_bar_time=%s body_points=%d reason=%s",
                                       TfToWire(InpDailyBiasTimeframe),
                                       tiso,
                                       bodyPoints,
                                       reasonWire);
   AppendEventRow(EVT_DAILY_BIAS_EVAL, biasW, "none", "bias_recorded", reasonWire, details);
  }

//+------------------------------------------------------------------+
void ExportLifecycleEvent(const string eventType,
                          const string decision,
                          const string reason,
                          const string details)
  {
   if(!g_initOk)
      return;
   const string biasW = BiasDirectionToString(g_lastBiasEnum);
   AppendEventRow(eventType, biasW, "none", decision, reason, details);
  }

//+------------------------------------------------------------------+
string ApplyDailyBiasGatePlaceholder(const string setupDirection)
  {
   const string s = Trim(setupDirection);
   if(StringLen(s) == 0 || s == "none")
      return "allowed";
   if(g_lastBiasEnum == MAPZ_BIAS_UNKNOWN)
      return "missing_bias_context";
   if(g_lastBiasEnum == MAPZ_BIAS_NEUTRAL)
      return "skipped_neutral_bias";
   if(s == "long" && g_lastBiasEnum == MAPZ_BIAS_BEARISH)
      return "rejected_by_daily_bias";
   if(s == "short" && g_lastBiasEnum == MAPZ_BIAS_BULLISH)
      return "rejected_by_daily_bias";
   return "allowed";
  }

//+------------------------------------------------------------------+
void TryEmitDailyBiasOnNewClosedBar(void)
  {
   if(!g_initOk)
      return;

   const datetime tClosed = iTime(g_brokerSymbol, InpDailyBiasTimeframe, 1);
   if(tClosed == 0)
     {
      if(!g_missingDataEventEmitted)
        {
         g_missingDataEventEmitted = true;
         g_lastBiasEnum = MAPZ_BIAS_UNKNOWN;
         g_lastBiasReason = REASON_MISSING_DAILY;
         IncrementBiasOutcomeCounters(MAPZ_BIAS_UNKNOWN, true);
         ExportDailyBiasEvent(MAPZ_BIAS_UNKNOWN, REASON_MISSING_DAILY, 0, 0);
        }
      return;
     }

   g_missingDataEventEmitted = false;

   if(tClosed == g_lastClosedBiasBarTime)
      return;

   const double o = iOpen(g_brokerSymbol, InpDailyBiasTimeframe, 1);
   const double c = iClose(g_brokerSymbol, InpDailyBiasTimeframe, 1);
   const double pt = SymbolInfoDouble(g_brokerSymbol, SYMBOL_POINT);
   int bodyPts = 0;
   if(pt > 0.0)
      bodyPts = (int)MathRound(MathAbs(c - o) / pt);

   ENUM_MAPZ_BIAS bias = MAPZ_BIAS_UNKNOWN;
   string rsn = "";
   const bool evalOk = EvaluateDailyBiasV1(tClosed, o, c, bias, rsn);
   if(!evalOk)
     {
      bias = MAPZ_BIAS_UNKNOWN;
      rsn = REASON_MISSING_DAILY;
     }

   g_lastClosedBiasBarTime = tClosed;
   g_lastBiasEnum = bias;
   g_lastBiasReason = rsn;

   IncrementBiasOutcomeCounters(bias, !evalOk);
   ExportDailyBiasEvent(bias, rsn, tClosed, bodyPts);
  }

//+------------------------------------------------------------------+
void RefreshExportNotes(void)
  {
   const string gateNone = ApplyDailyBiasGatePlaceholder("none");
   g_exportNotes = StringFormat(
                       "E3.4.2 Mapazapp_TestEA Daily Bias V1 on %s; last=%s; gate_none=%s; IFVG deferred to E3.5; no trade rows (header-only trades CSV).",
                       TfToWire(InpDailyBiasTimeframe),
                       BiasDirectionToString(g_lastBiasEnum),
                       gateNone);
  }

//+------------------------------------------------------------------+
string WriteSummaryJson(void)
  {
   RefreshExportNotes();
   const string execTf = TfToWire(InpExecutionTimeframe);
   const string biasTf = TfToWire(InpDailyBiasTimeframe);
   const string exportedAt = NowUtcIso();
   string json = "{\r\n";
   json += "  \"schema_version\": \"" + JsonStringEscape(InpSchemaVersion) + "\",\r\n";
   json += "  \"ea_build\": \"" + JsonStringEscape(TESTEA_BUILD) + "\",\r\n";
   json += "  \"run_id\": \"" + JsonStringEscape(g_runId) + "\",\r\n";
   json += "  \"strategy_id\": \"" + JsonStringEscape(InpStrategyId) + "\",\r\n";
   json += "  \"parameter_set_id\": \"" + JsonStringEscape(InpParameterSetId) + "\",\r\n";
   json += "  \"symbol\": \"" + JsonStringEscape(InpCanonicalSymbol) + "\",\r\n";
   json += "  \"broker_symbol\": \"" + JsonStringEscape(g_brokerSymbol) + "\",\r\n";
   json += "  \"execution_timeframe\": \"" + JsonStringEscape(execTf) + "\",\r\n";
   json += "  \"daily_bias_timeframe\": \"" + JsonStringEscape(biasTf) + "\",\r\n";
   json += "  \"backtest_mode\": \"" + JsonStringEscape(Trim(InpBacktestMode)) + "\",\r\n";
   json += "  \"tester_only\": true,\r\n";
   json += "  \"official_ea\": \"Mapazapp_TestEA\",\r\n";
   json += "  \"backtest_role\": true,\r\n";
   json += "  \"use_h4_context\": " + (InpUseH4Context ? "true" : "false") + ",\r\n";
   json += "  \"use_h1_context\": " + (InpUseH1Context ? "true" : "false") + ",\r\n";
   json += "  \"has_real_ifvg_logic\": false,\r\n";
   json += "  \"has_real_daily_bias_logic\": true,\r\n";
   json += "  \"has_real_trading_orders\": false,\r\n";
   json += "  \"trade_count\": 0,\r\n";
   json += StringFormat("  \"total_bias_evaluated\": %I64d,\r\n", g_totalBiasEvaluated);
   json += StringFormat("  \"bullish_bias_count\": %I64d,\r\n", g_bullishBiasCount);
   json += StringFormat("  \"bearish_bias_count\": %I64d,\r\n", g_bearishBiasCount);
   json += StringFormat("  \"neutral_bias_count\": %I64d,\r\n", g_neutralBiasCount);
   json += StringFormat("  \"unknown_bias_count\": %I64d,\r\n", g_unknownBiasCount);
   json += StringFormat("  \"rejected_by_daily_bias\": %I64d,\r\n", g_rejectedByDailyBias);
   json += StringFormat("  \"skipped_neutral_bias\": %I64d,\r\n", g_skippedNeutralBias);
   json += StringFormat("  \"missing_bias_context\": %I64d,\r\n", g_missingBiasContextCount);
   json += "  \"exported_at_utc\": \"" + JsonStringEscape(exportedAt) + "\",\r\n";
   json += "  \"notes\": \"" + JsonStringEscape(g_exportNotes) + "\"\r\n";
   json += "}\r\n";
   return json;
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
      Print("Mapazapp_TestEA: Strategy Tester required (MQL_TESTER). Live chart blocked.");
      return INIT_FAILED;
     }

   if(!SchemaIsSupported(InpSchemaVersion))
     {
      Print("Mapazapp_TestEA: unsupported InpSchemaVersion: ", InpSchemaVersion);
      return INIT_FAILED;
     }

   g_brokerSymbol = _Symbol;
   g_runId = BuildRunId();
   if(!BuildExportPath())
     {
      Print("Mapazapp_TestEA: invalid export path.");
      return INIT_FAILED;
     }

   g_initOk = true;
   Print("Mapazapp_TestEA: official tester EA (Backtest role); Daily Bias V1; outputs under MQL5\\Files\\", g_baseRelPath);

   ExportLifecycleEvent("lifecycle_init", "ok", "OnInit", "paths_ready");
   ExportLifecycleEvent("skeleton_ready", "noop", "E3.4.2",
                       "IFVG detection pending E3.5; trades CSV header-only (no synthetic rows).");

   TryEmitDailyBiasOnNewClosedBar();

   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
void OnTick()
  {
   TryEmitDailyBiasOnNewClosedBar();
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   WriteAllExports(reason);
  }

//+------------------------------------------------------------------+
