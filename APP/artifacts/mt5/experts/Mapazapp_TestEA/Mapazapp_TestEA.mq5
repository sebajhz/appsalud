//+------------------------------------------------------------------+
//| Mapazapp_TestEA.mq5                                              |
//| Mapazapp — E3.6: Official Strategy Tester EA / Backtest role   |
//| Daily Bias V1 + Setup V1 FVG candidate (core geometry);        |
//| CSV/JSON under MQL5/Files/<export>; no broker execution.        |
//+------------------------------------------------------------------+
#property copyright "Mapazapp"
#property link      "https://mapazapp"
#property version   "1.08"
#property description "Strategy Tester only: official TestEA. Daily Bias V1 + FVG/Setup V1 + virtual trade simulation E5.5.0 optimization-safe exports (no orders)."
#property strict

input string            InpSchemaVersion           = "backtest_ea_v1";
input string            InpStrategyId              = "IFVG_XAUUSD_V1";
input string            InpParameterSetId          = "default";
input string            InpCanonicalSymbol         = "XAUUSD";
input string            InpRunId                   = "";
input string            InpCampaignId              = "MZP_E5_5_XAUUSD_M15_D1_OUTCOME_V1";
input bool              InpAutoBuildRunIdFromParams = true;
input bool              InpOptimizationSafeExports = false;
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

input bool              InpEnableSetupDetection    = true;
input int               InpMinFvgPoints            = 0;
input int               InpMaxSetupAgeBars        = 20;
input bool              InpRequireDailyBiasAlignment = true;

input bool              InpEnableVirtualTrades       = true;
input string            InpVirtualEntryMode          = "fvg_midpoint";
input string            InpVirtualStopMode           = "fvg_boundary_with_buffer";
input int               InpVirtualStopBufferPoints   = 0;
input double            InpVirtualRiskReward         = 2.0;
input int               InpVirtualEntryExpiryBars  = 20;
input int               InpVirtualMaxBarsInTrade   = 40;
input string            InpVirtualAmbiguityMode     = "ambiguous";
input bool              InpVirtualOneTradeAtATime  = true;
input int               InpVirtualMinTradeFvgPoints = 2;
input bool              InpWriteVirtualTrades        = true;

#define TESTEA_BUILD            "MZP_TestEA_E5_5_0_2"
#define EVT_DAILY_BIAS_EVAL     "daily_bias_evaluated"
#define EVT_SETUP_DETECTED      "setup_detected"
#define EVT_SETUP_ALLOWED       "setup_allowed"
#define EVT_SETUP_REJECTED      "setup_rejected"
#define EVT_SETUP_SKIPPED       "setup_skipped"
#define EVT_VIRT_CANDIDATE      "virtual_trade_candidate_created"
#define EVT_VIRT_FILL           "virtual_trade_entry_filled"
#define EVT_VIRT_CLOSED         "virtual_trade_closed"
#define EVT_VIRT_EXPIRED        "virtual_trade_expired"
#define EVT_VIRT_AMBIGUOUS      "virtual_trade_ambiguous"
#define EVT_VIRT_SKIPPED        "virtual_trade_skipped"
#define EVT_VIRT_UNRESOLVED     "virtual_trade_unresolved"
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

enum ENUM_MAPZ_SETUP_DIR
  {
   MAPZ_SETUP_NONE = 0,
   MAPZ_SETUP_LONG = 1,
   MAPZ_SETUP_SHORT = 2
  };

bool            g_testerOk = false;
bool            g_initOk = false;
string          g_runId = "";
string          g_baseRelPath = "";
string          g_brokerSymbol = "";
string          g_eventsDataLines = "";
int             g_nextEventId = 1;
string          g_exportNotes = "";

string          g_exportFolderLeaf = "";
string          g_campaignIdEffective = "";
string          g_campaignIdForSummary = "";
bool            g_optimizationSafeExports = false;
int             g_exportWriteFailCount = 0;

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

datetime        g_lastExecClosedBarProcessed = 0;
long            g_totalSetupCandidates = 0;
long            g_bullishSetupCandidates = 0;
long            g_bearishSetupCandidates = 0;
long            g_allowedSetups = 0;
long            g_ignoredSmallFvg = 0;
string          g_lastSetupDirection = "none";
string          g_lastSetupDecision = "none";
string          g_lastSetupReason = "";
long            g_lastFvgPoints = 0;

string          g_tradesDataLines = "";
int             g_nextTradeSeq = 1;
long            g_virtual_trade_count = 0;
long            g_skipped_trade_active = 0;
long            g_invalid_risk_count = 0;
long            g_filled_trade_count = 0;
long            g_unfilled_expired_count = 0;
long            g_win_count = 0;
long            g_loss_count = 0;
long            g_ambiguous_count = 0;
long            g_expired_open_count = 0;
long            g_unresolved_count = 0;
long            g_trades_csv_row_count = 0;
double          g_total_r = 0.0;
double          g_equity_r_peak = 0.0;
double          g_equity_r_cum = 0.0;
double          g_max_drawdown_r = 0.0;
string          g_last_trade_outcome = "";
double          g_last_trade_result_r = 0.0;

struct MapzVirtualTrade
  {
   bool                 active;
   string               trade_id;
   string               setup_event_id;
   datetime             setup_time;
   ENUM_MAPZ_SETUP_DIR  dir;
   ENUM_MAPZ_BIAS       bias_enum;
   ENUM_MAPZ_SETUP_DIR  setup_dir;
   double               fvg_low;
   double               fvg_high;
   long                 fvg_points;
   double               entry;
   double               sl;
   double               tp;
   double               risk_abs;
   double               rr;
   int                  entry_expiry_bars;
   int                  max_bars_in_trade;
   int                  bars_waiting_entry;
   int                  bars_held;
   bool                 filled;
   datetime             entry_time;
   datetime             exit_time;
   double               exit_price;
   string               outcome;
   double               result_r;
   string               exit_reason;
   string               setup_reason_tag;
  };

MapzVirtualTrade g_vt;

//+------------------------------------------------------------------+
//| FVG geometry matches mapazapp-core `fvg-detector.ts`:            |
//| A = shift 3, B = shift 2, C = shift 1 (last three closed bars).  |
//| Bullish: C.low > A.high → zone [A.high, C.low] → setup long.     |
//| Bearish: C.high < A.low → zone [C.high, A.low] → setup short.    |
//| Core uses array A=i-1,B=i,C=i+1 — same chronological order.      |
//| IFVG inversion / ATR filters are NOT implemented (E3.6: FVG candidate only). |
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
ulong MapazappStableStringHash(const string value)
  {
   ulong hash = (ulong)2166136261u;
   const int len = (int)StringLen(value);
   for(int i = 0; i < len; i++)
     {
      const ushort ch = StringGetCharacter(value, i);
      hash = hash ^ (ulong)ch;
      hash = hash * (ulong)16777619u;
     }
   return hash;
  }

//+------------------------------------------------------------------+
uint TesterParamFingerprintU32(void)
  {
   string s = Trim(InpParameterSetId);
   s += "|" + IntegerToString(InpVirtualMinTradeFvgPoints);
   s += "|" + DoubleToString(InpVirtualRiskReward, 8);
   s += "|" + IntegerToString(InpDailyBiasMinBodyPoints);
   s += "|" + (InpRequireDailyBiasAlignment ? "1" : "0");
   return (uint)MapazappStableStringHash(s);
  }

//+------------------------------------------------------------------+
string TesterFormatRrToken(const double rr)
  {
   string a = DoubleToString(rr, 2);
   StringReplace(a, ".", "_");
   return a;
  }

//+------------------------------------------------------------------+
string TesterBuildAutoFolderLeaf(void)
  {
   string ps = SanitizeToken(Trim(InpParameterSetId));
   if(StringLen(ps) == 0)
      ps = "SET";
   const string rrTok = TesterFormatRrToken(InpVirtualRiskReward);
   const string ralign = (InpRequireDailyBiasAlignment ? "RALIGN1" : "RALIGN0");
   return StringFormat("%s_FVG%d_RR%s_BIASBODY%d_%s",
                       ps,
                       InpVirtualMinTradeFvgPoints,
                       rrTok,
                       InpDailyBiasMinBodyPoints,
                       ralign);
  }

//+------------------------------------------------------------------+
void TesterResolveExportIdentity(void)
  {
   const string baseRunId = BuildRunId();
   g_optimizationSafeExports = InpOptimizationSafeExports;

   if(!g_optimizationSafeExports)
     {
      g_runId = baseRunId;
      g_exportFolderLeaf = g_runId;
      g_campaignIdEffective = "";
      g_campaignIdForSummary = SanitizeToken(Trim(InpCampaignId));
      return;
     }

   string camp = SanitizeToken(Trim(InpCampaignId));
   if(StringLen(camp) == 0)
      camp = "MZP_CAMPAIGN_DEFAULT";
   g_campaignIdEffective = camp;
   g_campaignIdForSummary = camp;

   string leaf = "";
   if(InpAutoBuildRunIdFromParams)
     {
      leaf = TesterBuildAutoFolderLeaf();
     }
   else
     {
      leaf = SanitizeToken(Trim(InpRunId));
      if(StringLen(leaf) == 0)
         leaf = baseRunId;
      const uint fp = TesterParamFingerprintU32();
      leaf = leaf + StringFormat("_X%06X", fp & 0xFFFFFF);
     }

   const int MAXLEAF = 100;
   if(StringLen(leaf) > MAXLEAF)
      leaf = StringSubstr(leaf, 0, MAXLEAF);

   g_exportFolderLeaf = leaf;

   string combined = camp + "__" + leaf;
   const int MAXRUNID = 120;
   if(StringLen(combined) > MAXRUNID)
      combined = StringSubstr(combined, 0, MAXRUNID);
   g_runId = combined;
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
string NormalizeExportRelPath(const string raw)
  {
   string p = raw;
   StringReplace(p, "/", "\\");
   StringTrimLeft(p);
   StringTrimRight(p);
   return p;
  }

//+------------------------------------------------------------------+
bool EnsureRelativeFolderExists(const string relativeFolderRaw)
  {
   const string rel = NormalizeExportRelPath(relativeFolderRaw);
   if(StringLen(rel) == 0)
      return false;
   const ushort sep = StringGetCharacter("\\", 0);
   string parts[];
   const int n = StringSplit(rel, sep, parts);
   string acc = "";
   for(int i = 0; i < n; i++)
     {
      const string piece = Trim(parts[i]);
      if(StringLen(piece) == 0)
         continue;
      if(StringLen(acc) == 0)
         acc = piece;
      else
         acc = acc + "\\" + piece;
      ResetLastError();
      if(!FolderCreate(acc))
        {
         const int err = GetLastError();
         PrintFormat("Mapazapp_TestEA export error: FolderCreate failed for %s, err=%d", acc, err);
         return false;
        }
     }
   return StringLen(acc) > 0;
  }

//+------------------------------------------------------------------+
bool ExportParentFolderForFile(const string relativeFileRaw, string &outParent)
  {
   outParent = "";
   const string p = NormalizeExportRelPath(relativeFileRaw);
   const int len = (int)StringLen(p);
   int last = -1;
   for(int i = len - 1; i >= 0; i--)
     {
      const ushort ch = StringGetCharacter(p, i);
      if(ch == (ushort)'\\')
        {
         last = i;
         break;
        }
     }
   if(last <= 0)
      return false;
   outParent = StringSubstr(p, 0, last);
   return StringLen(outParent) > 0;
  }

//+------------------------------------------------------------------+
bool BuildExportPath(void)
  {
   string rootSegs[];
   if(!ParseExportRootSegments(InpExportRoot, rootSegs))
      return false;
   const int r = ArraySize(rootSegs);
   int t = 1;
   if(InpOptimizationSafeExports)
      t = 2;
   string tail[];
   ArrayResize(tail, t);
   if(InpOptimizationSafeExports)
     {
      tail[0] = g_campaignIdEffective;
      tail[1] = g_exportFolderLeaf;
     }
   else
     {
      tail[0] = g_runId;
     }

   string allSegs[];
   ArrayResize(allSegs, r + t);
   for(int i = 0; i < r; i++)
      allSegs[i] = rootSegs[i];
   for(int j = 0; j < t; j++)
      allSegs[r + j] = tail[j];

   g_baseRelPath = JoinPathSegmentsBackslash(allSegs);
   if(StringLen(g_baseRelPath) == 0)
      return false;
   if(!EnsureRelativeFolderExists(g_baseRelPath))
      return false;
   return true;
  }

//+------------------------------------------------------------------+
bool WriteTextAtomic(const string relativePathRaw, const string body)
  {
   const string relativePath = NormalizeExportRelPath(relativePathRaw);
   const string tmp = relativePath + ".tmp";
   string parent = "";
   if(ExportParentFolderForFile(tmp, parent))
     {
      if(!EnsureRelativeFolderExists(parent))
        {
         g_exportWriteFailCount++;
         return false;
        }
     }

   ResetLastError();
   const int fh = FileOpen(tmp,
                           FILE_WRITE | FILE_TXT | FILE_ANSI | FILE_SHARE_READ | FILE_REWRITE);
   if(fh == INVALID_HANDLE)
     {
      const int err = GetLastError();
      PrintFormat("Mapazapp_TestEA export error: FileOpen failed for %s, err=%d", tmp, err);
      g_exportWriteFailCount++;
      return false;
     }
   if(FileWriteString(fh, body) <= 0)
     {
      const int err = GetLastError();
      PrintFormat("Mapazapp_TestEA export error: FileWriteString failed for %s, err=%d", tmp, err);
      FileClose(fh);
      g_exportWriteFailCount++;
      return false;
     }
   FileFlush(fh);
   FileClose(fh);
   if(FileIsExist(relativePath, 0))
     {
      ResetLastError();
      if(!FileDelete(relativePath, 0))
        {
         const int err = GetLastError();
         PrintFormat("Mapazapp_TestEA export error: FileDelete failed for %s, err=%d (continuing with FileMove+rewrite)",
                     relativePath, err);
        }
     }
   ResetLastError();
   if(!FileMove(tmp, 0, relativePath, FILE_REWRITE))
     {
      const int err = GetLastError();
      PrintFormat("Mapazapp_TestEA export error: FileMove failed for %s -> %s, err=%d", tmp, relativePath, err);
      g_exportWriteFailCount++;
      return false;
     }
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
string AppendEventRow(const string eventType,
                      const string biasWire,
                      const string setupWire,
                      const string decision,
                      const string reason,
                      const string details)
  {
   if(!g_initOk || !InpWriteEventsCsv)
      return "";
   const string ts = NowUtcIso();
   const string evId = StringFormat("EVT_%06d", g_nextEventId++);
   string row = g_runId + "," + evId + "," + ts + "," + InpCanonicalSymbol + ","
                + eventType + "," + biasWire + "," + setupWire + ","
                + decision + "," + JsonStringEscape(reason) + "," + JsonStringEscape(details);
   if(StringLen(g_eventsDataLines) > 0)
      g_eventsDataLines += "\r\n";
   g_eventsDataLines += row;
   return evId;
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
string SetupDirectionToString(const ENUM_MAPZ_SETUP_DIR d)
  {
   if(d == MAPZ_SETUP_LONG)
      return "long";
   if(d == MAPZ_SETUP_SHORT)
      return "short";
   return "none";
  }

//+------------------------------------------------------------------+
long CalculateFvgGapPoints(const double fvgLow, const double fvgHigh, const double pt)
  {
   if(pt <= 0.0)
      return 0;
   return (long)MathRound(MathAbs(fvgHigh - fvgLow) / pt);
  }

//+------------------------------------------------------------------+
string BuildIfvgReason(const ENUM_MAPZ_SETUP_DIR d, const string tag)
  {
   if(StringLen(Trim(tag)) > 0)
      return tag;
   if(d == MAPZ_SETUP_LONG)
      return "bullish_fvg_C_low_above_A_high";
   if(d == MAPZ_SETUP_SHORT)
      return "bearish_fvg_C_high_below_A_low";
   return "no_fvg_pattern";
  }

//+------------------------------------------------------------------+
bool DetectIfvgSetupV1(const string sym,
                       const ENUM_TIMEFRAMES tf,
                       bool &outFound,
                       ENUM_MAPZ_SETUP_DIR &outDir,
                       double &outFvgLow,
                       double &outFvgHigh,
                       long &outGapPts,
                       datetime &outCandleTime,
                       string &outReason)
  {
   outFound = false;
   outDir = MAPZ_SETUP_NONE;
   outFvgLow = 0.0;
   outFvgHigh = 0.0;
   outGapPts = 0;
   outCandleTime = 0;
   outReason = "no_fvg";

   if(Bars(sym, tf) < 4)
      return false;

   const double pt = SymbolInfoDouble(sym, SYMBOL_POINT);
   if(pt <= 0.0)
      return false;

   const double aHi = iHigh(sym, tf, 3);
   const double aLo = iLow(sym, tf, 3);
   const double cHi = iHigh(sym, tf, 1);
   const double cLo = iLow(sym, tf, 1);

   if(cLo > aHi)
     {
      outFound = true;
      outDir = MAPZ_SETUP_LONG;
      outFvgLow = aHi;
      outFvgHigh = cLo;
     }
   else if(cHi < aLo)
     {
      outFound = true;
      outDir = MAPZ_SETUP_SHORT;
      outFvgLow = cHi;
      outFvgHigh = aLo;
     }
   else
     {
      outFound = false;
      return true;
     }

   outGapPts = CalculateFvgGapPoints(outFvgLow, outFvgHigh, pt);
   outCandleTime = iTime(sym, tf, 1);
   outReason = BuildIfvgReason(outDir, "");
   return true;
  }

//+------------------------------------------------------------------+
string ApplyDailyBiasGateToSetup(const string setupWireRaw)
  {
   const string s = Trim(setupWireRaw);
   if(StringLen(s) == 0 || s == "none")
      return "setup_ignored";

   if(!InpRequireDailyBiasAlignment)
      return "setup_candidate_allowed";

   if(g_lastBiasEnum == MAPZ_BIAS_UNKNOWN)
      return "missing_bias_context";
   if(g_lastBiasEnum == MAPZ_BIAS_NEUTRAL)
      return "skipped_neutral_bias";

   if(s == "long" && g_lastBiasEnum == MAPZ_BIAS_BEARISH)
      return "rejected_by_daily_bias";
   if(s == "short" && g_lastBiasEnum == MAPZ_BIAS_BULLISH)
      return "rejected_by_daily_bias";

   return "setup_candidate_allowed";
  }

//+------------------------------------------------------------------+
string ApplyDailyBiasGatePlaceholder(const string setupDirection)
  {
   const string s = Trim(setupDirection);
   if(StringLen(s) == 0 || s == "none")
      return "n_a_no_setup_direction";
   return ApplyDailyBiasGateToSetup(s);
  }

//+------------------------------------------------------------------+
string ExportSetupEvent(const string eventType,
                        const string setupWire,
                        const string decision,
                        const string reason,
                        const string details)
  {
   const string biasW = BiasDirectionToString(g_lastBiasEnum);
   return AppendEventRow(eventType, biasW, setupWire, decision, reason, details);
  }

//+------------------------------------------------------------------+
string VirtualBuildDetailsCore(void)
  {
   return StringFormat(
             "trade_id=%s setup_event_id=%s entry=%.5f sl=%.5f tp=%.5f rr=%.2f fvg_low=%.5f fvg_high=%.5f fvg_points=%I64d outcome=%s result_r=%.3f bars_waiting_entry=%d bars_held=%d reason=%s",
             JsonStringEscape(g_vt.trade_id),
             JsonStringEscape(g_vt.setup_event_id),
             g_vt.entry, g_vt.sl, g_vt.tp, g_vt.rr,
             g_vt.fvg_low, g_vt.fvg_high, g_vt.fvg_points,
             JsonStringEscape(g_vt.outcome),
             g_vt.result_r,
             g_vt.bars_waiting_entry,
             g_vt.bars_held,
             JsonStringEscape(g_vt.exit_reason));
  }

//+------------------------------------------------------------------+
void VirtualRegisterOutcomeStats(void)
  {
   g_last_trade_outcome = g_vt.outcome;
   g_last_trade_result_r = g_vt.result_r;
   g_total_r += g_vt.result_r;
   g_equity_r_cum += g_vt.result_r;
   if(g_equity_r_cum > g_equity_r_peak)
      g_equity_r_peak = g_equity_r_cum;
   const double dd = g_equity_r_peak - g_equity_r_cum;
   if(dd > g_max_drawdown_r)
      g_max_drawdown_r = dd;
   if(g_vt.outcome == "win")
      g_win_count++;
   else if(g_vt.outcome == "loss")
      g_loss_count++;
   else if(g_vt.outcome == "ambiguous")
      g_ambiguous_count++;
   else if(g_vt.outcome == "expired_unfilled")
      g_unfilled_expired_count++;
   else if(g_vt.outcome == "expired_open")
      g_expired_open_count++;
   else if(g_vt.outcome == "unresolved")
      g_unresolved_count++;
  }

//+------------------------------------------------------------------+
void VirtualAppendTradeCsvRow(const int bars_to_fill_export,
                               const string setup_reason_csv,
                               const string bias_reason_csv,
                               const string rejection_csv)
  {
   if(!InpWriteTradesCsv || !InpWriteVirtualTrades)
      return;
   const string dirW = SetupDirectionToString(g_vt.dir);
   const string biasDirW = BiasDirectionToString(g_vt.bias_enum);
   const string setupDirW = SetupDirectionToString(g_vt.setup_dir);
   const string tfW = TfToWire(InpExecutionTimeframe);
   const string tsExit = (g_vt.exit_time > 0 ? TimeUtcIso(g_vt.exit_time) : "");
   const string tsEntry = (g_vt.entry_time > 0 ? TimeUtcIso(g_vt.entry_time)
                           : (g_vt.exit_time > 0 ? TimeUtcIso(g_vt.exit_time) : ""));
   const string tsRow = (StringLen(tsExit) > 0 ? tsExit : tsEntry);
   string row = g_runId + "," + g_vt.trade_id + "," + g_vt.setup_event_id + "," + tsRow + "," + tsEntry + "," + tsExit + ","
                + InpCanonicalSymbol + "," + tfW + "," + dirW + "," + biasDirW + "," + setupDirW + ","
                + DoubleToString(g_vt.entry, _Digits) + ","
                + DoubleToString(g_vt.sl, _Digits) + ","
                + DoubleToString(g_vt.tp, _Digits) + ","
                + DoubleToString(g_vt.exit_price, _Digits) + ","
                + DoubleToString(g_vt.result_r, 3) + ","
                + "0,"
                + g_vt.outcome + ","
                + g_vt.exit_reason + ","
                + setup_reason_csv + ","
                + bias_reason_csv + ","
                + rejection_csv + ","
                + IntegerToString(bars_to_fill_export) + ","
                + IntegerToString(g_vt.bars_held) + ","
                + DoubleToString(g_vt.fvg_low, _Digits) + ","
                + DoubleToString(g_vt.fvg_high, _Digits) + ","
                + IntegerToString((int)g_vt.fvg_points) + ","
                + InpParameterSetId + ","
                + InpVirtualEntryMode + ","
                + InpVirtualStopMode + ","
                + InpVirtualAmbiguityMode;
   if(StringLen(g_tradesDataLines) > 0)
      g_tradesDataLines += "\r\n";
   g_tradesDataLines += row;
   g_trades_csv_row_count++;
  }

//+------------------------------------------------------------------+
void VirtualClearTrade(void)
  {
   g_vt.active = false;
   g_vt.filled = false;
   g_vt.bars_waiting_entry = 0;
   g_vt.bars_held = 0;
  }

//+------------------------------------------------------------------+
bool VirtualTryFillCurrentBar(const double lo, const double hi, const datetime tBar)
  {
   if(!g_vt.active || g_vt.filled)
      return false;
   if(lo <= g_vt.entry && g_vt.entry <= hi)
     {
      g_vt.filled = true;
      g_vt.entry_time = tBar;
      g_filled_trade_count++;
      g_vt.outcome = "";
      g_vt.result_r = 0.0;
      g_vt.exit_reason = "";
      const string det = VirtualBuildDetailsCore();
      AppendEventRow(EVT_VIRT_FILL,
                     BiasDirectionToString(g_vt.bias_enum),
                     SetupDirectionToString(g_vt.setup_dir),
                     "filled",
                     "entry_touch",
                     det);
      return true;
     }
   return false;
  }

//+------------------------------------------------------------------+
bool VirtualPrepareTradePrices(const ENUM_MAPZ_SETUP_DIR d,
                                 const double fvgLoIn,
                                 const double fvgHiIn,
                                 double &entry,
                                 double &sl,
                                 double &tp,
                                 double &riskAbs,
                                 double &fvgLoOut,
                                 double &fvgHiOut,
                                 long &fvgPtsOut,
                                 string &rejectReason)
  {
   rejectReason = "";
   fvgLoOut = MathMin(fvgLoIn, fvgHiIn);
   fvgHiOut = MathMax(fvgLoIn, fvgHiIn);
   const double pt = SymbolInfoDouble(g_brokerSymbol, SYMBOL_POINT);
   if(pt <= 0.0)
     {
      rejectReason = "invalid_risk_nonpositive";
      return false;
     }
   fvgPtsOut = CalculateFvgGapPoints(fvgLoOut, fvgHiOut, pt);
   if(InpVirtualMinTradeFvgPoints > 0 && fvgPtsOut < InpVirtualMinTradeFvgPoints)
     {
      rejectReason = "fvg_below_virtual_trade_min";
      return false;
     }
   if(Trim(InpVirtualEntryMode) != "fvg_midpoint")
     {
      rejectReason = "unsupported_virtual_entry_mode";
      return false;
     }
   if(Trim(InpVirtualStopMode) != "fvg_boundary_with_buffer")
     {
      rejectReason = "unsupported_virtual_stop_mode";
      return false;
     }
   const double buf = (double)InpVirtualStopBufferPoints * pt;
   entry = (fvgLoOut + fvgHiOut) / 2.0;
   if(d == MAPZ_SETUP_LONG)
     {
      sl = fvgLoOut - buf;
      riskAbs = entry - sl;
      tp = entry + riskAbs * InpVirtualRiskReward;
     }
   else if(d == MAPZ_SETUP_SHORT)
     {
      sl = fvgHiOut + buf;
      riskAbs = sl - entry;
      tp = entry - riskAbs * InpVirtualRiskReward;
     }
   else
     {
      rejectReason = "invalid_geometry_direction";
      return false;
     }
   entry = NormalizeDouble(entry, _Digits);
   sl = NormalizeDouble(sl, _Digits);
   tp = NormalizeDouble(tp, _Digits);
   if(d == MAPZ_SETUP_LONG)
     {
      riskAbs = entry - sl;
      if(entry <= sl)
        {
         rejectReason = "invalid_geometry_entry_sl";
         return false;
        }
      if(tp <= entry)
        {
         rejectReason = "invalid_geometry_tp";
         return false;
        }
     }
   else
     {
      riskAbs = sl - entry;
      if(entry >= sl)
        {
         rejectReason = "invalid_geometry_entry_sl";
         return false;
        }
      if(tp >= entry)
        {
         rejectReason = "invalid_geometry_tp";
         return false;
        }
     }
   if(riskAbs < pt)
     {
      rejectReason = "invalid_risk_nonpositive";
      return false;
     }
   if(!MathIsValidNumber(entry) || !MathIsValidNumber(sl) || !MathIsValidNumber(tp))
     {
      rejectReason = "invalid_risk_nonpositive";
      return false;
     }
   return true;
  }

//+------------------------------------------------------------------+
void VirtualEmitSkipped(const string reasonTag, const string extraDetails)
  {
   const string det = StringFormat("%s reason=%s", extraDetails, JsonStringEscape(reasonTag));
   AppendEventRow(EVT_VIRT_SKIPPED,
                  BiasDirectionToString(g_lastBiasEnum),
                  g_lastSetupDirection,
                  "skipped",
                  reasonTag,
                  det);
  }

//+------------------------------------------------------------------+
void VirtualOnSetupAllowed(const string setupEventId,
                           const string setupW,
                           const ENUM_MAPZ_SETUP_DIR sdir,
                           const double fLo,
                           const double fHi,
                           const long gapPts,
                           const datetime cTime,
                           const string setupGeomReason)
  {
   if(!InpEnableVirtualTrades)
      return;

   if(g_vt.active && InpVirtualOneTradeAtATime)
     {
      g_skipped_trade_active++;
      VirtualEmitSkipped("trade_active",
                         StringFormat("trade_id=%s setup_event_id=%s", JsonStringEscape(g_vt.trade_id), JsonStringEscape(setupEventId)));
      return;
     }

   double entry = 0.0, sl = 0.0, tp = 0.0, riskAbs = 0.0;
   double fLoN = 0.0, fHiN = 0.0;
   long fvgPtsNorm = 0;
   string rej = "";
   if(!VirtualPrepareTradePrices(sdir, fLo, fHi, entry, sl, tp, riskAbs, fLoN, fHiN, fvgPtsNorm, rej))
     {
      g_invalid_risk_count++;
      VirtualEmitSkipped(rej,
                         StringFormat("setup_event_id=%s fvg_low=%.5f fvg_high=%.5f fvg_points=%I64d",
                                      JsonStringEscape(setupEventId), fLo, fHi, gapPts));
      return;
     }

   g_vt.active = true;
   g_vt.trade_id = StringFormat("VTR_%06d", g_nextTradeSeq++);
   g_vt.setup_event_id = setupEventId;
   g_vt.setup_time = cTime;
   g_vt.dir = sdir;
   g_vt.bias_enum = g_lastBiasEnum;
   g_vt.setup_dir = sdir;
   g_vt.fvg_low = fLoN;
   g_vt.fvg_high = fHiN;
   g_vt.fvg_points = fvgPtsNorm;
   g_vt.entry = entry;
   g_vt.sl = sl;
   g_vt.tp = tp;
   g_vt.risk_abs = riskAbs;
   g_vt.rr = InpVirtualRiskReward;
   g_vt.entry_expiry_bars = InpVirtualEntryExpiryBars;
   g_vt.max_bars_in_trade = InpVirtualMaxBarsInTrade;
   g_vt.bars_waiting_entry = 0;
   g_vt.bars_held = 0;
   g_vt.filled = false;
   g_vt.entry_time = 0;
   g_vt.exit_time = 0;
   g_vt.exit_price = 0.0;
   g_vt.outcome = "";
   g_vt.result_r = 0.0;
   g_vt.exit_reason = "";
   g_vt.setup_reason_tag = setupGeomReason;

   g_virtual_trade_count++;
   const string detC = VirtualBuildDetailsCore();
   AppendEventRow(EVT_VIRT_CANDIDATE,
                  BiasDirectionToString(g_vt.bias_enum),
                  setupW,
                  "created",
                  "virtual_candidate",
                  detC);

   const double lo1 = iLow(g_brokerSymbol, InpExecutionTimeframe, 1);
   const double hi1 = iHigh(g_brokerSymbol, InpExecutionTimeframe, 1);
   const datetime t1 = iTime(g_brokerSymbol, InpExecutionTimeframe, 1);
   if(!VirtualTryFillCurrentBar(lo1, hi1, t1))
     {
      g_vt.bars_waiting_entry++;
      if(g_vt.bars_waiting_entry > InpVirtualEntryExpiryBars)
        {
         g_vt.outcome = "expired_unfilled";
         g_vt.result_r = 0.0;
         g_vt.exit_reason = "expired_unfilled";
         g_vt.exit_time = t1;
         g_vt.exit_price = 0.0;
         const string detE = VirtualBuildDetailsCore();
         AppendEventRow(EVT_VIRT_EXPIRED,
                        BiasDirectionToString(g_vt.bias_enum),
                        setupW,
                        "expired",
                        "expired_unfilled",
                        detE);
         VirtualAppendTradeCsvRow(g_vt.bars_waiting_entry, "daily_bias_aligned", g_lastBiasReason, "");
         VirtualRegisterOutcomeStats();
         VirtualClearTrade();
        }
     }
  }

//+------------------------------------------------------------------+
void VirtualManageOnNewClosedExecBar(void)
  {
   if(!g_initOk || !InpEnableVirtualTrades)
      return;
   if(!g_vt.active)
      return;

   const double lo = iLow(g_brokerSymbol, InpExecutionTimeframe, 1);
   const double hi = iHigh(g_brokerSymbol, InpExecutionTimeframe, 1);
   const double cl = iClose(g_brokerSymbol, InpExecutionTimeframe, 1);
   const datetime tBar = iTime(g_brokerSymbol, InpExecutionTimeframe, 1);
   if(tBar == 0)
      return;

   const string setupW = SetupDirectionToString(g_vt.setup_dir);

   if(!g_vt.filled)
     {
      if(VirtualTryFillCurrentBar(lo, hi, tBar))
         return;
      g_vt.bars_waiting_entry++;
      if(g_vt.bars_waiting_entry > InpVirtualEntryExpiryBars)
        {
         g_vt.outcome = "expired_unfilled";
         g_vt.result_r = 0.0;
         g_vt.exit_reason = "expired_unfilled";
         g_vt.exit_time = tBar;
         g_vt.exit_price = 0.0;
         const string detE = VirtualBuildDetailsCore();
         AppendEventRow(EVT_VIRT_EXPIRED,
                        BiasDirectionToString(g_vt.bias_enum),
                        setupW,
                        "expired",
                        "expired_unfilled",
                        detE);
         VirtualAppendTradeCsvRow(g_vt.bars_waiting_entry, "daily_bias_aligned", g_lastBiasReason, "");
         VirtualRegisterOutcomeStats();
         VirtualClearTrade();
        }
      return;
     }

   bool tpTouched = false;
   bool slTouched = false;
   if(g_vt.dir == MAPZ_SETUP_LONG)
     {
      tpTouched = (hi >= g_vt.tp);
      slTouched = (lo <= g_vt.sl);
     }
   else if(g_vt.dir == MAPZ_SETUP_SHORT)
     {
      tpTouched = (lo <= g_vt.tp);
      slTouched = (hi >= g_vt.sl);
     }

   if(tpTouched && !slTouched)
     {
      g_vt.outcome = "win";
      g_vt.result_r = InpVirtualRiskReward;
      g_vt.exit_price = g_vt.tp;
      g_vt.exit_reason = "tp_hit";
      g_vt.exit_time = tBar;
      const string detX = VirtualBuildDetailsCore();
      AppendEventRow(EVT_VIRT_CLOSED,
                     BiasDirectionToString(g_vt.bias_enum),
                     setupW,
                     "closed",
                     "tp_hit",
                     detX);
      VirtualAppendTradeCsvRow(g_vt.bars_waiting_entry, "daily_bias_aligned", g_lastBiasReason, "");
      VirtualRegisterOutcomeStats();
      VirtualClearTrade();
      return;
     }

   if(slTouched && !tpTouched)
     {
      g_vt.outcome = "loss";
      g_vt.result_r = -1.0;
      g_vt.exit_price = g_vt.sl;
      g_vt.exit_reason = "sl_hit";
      g_vt.exit_time = tBar;
      const string detX = VirtualBuildDetailsCore();
      AppendEventRow(EVT_VIRT_CLOSED,
                     BiasDirectionToString(g_vt.bias_enum),
                     setupW,
                     "closed",
                     "sl_hit",
                     detX);
      VirtualAppendTradeCsvRow(g_vt.bars_waiting_entry, "daily_bias_aligned", g_lastBiasReason, "");
      VirtualRegisterOutcomeStats();
      VirtualClearTrade();
      return;
     }

   if(tpTouched && slTouched)
     {
      if(Trim(InpVirtualAmbiguityMode) == "ambiguous")
        {
         g_vt.outcome = "ambiguous";
         g_vt.result_r = 0.0;
         g_vt.exit_price = g_vt.entry;
         g_vt.exit_reason = "ambiguous_sl_tp_same_bar";
         g_vt.exit_time = tBar;
         const string detX = VirtualBuildDetailsCore();
         AppendEventRow(EVT_VIRT_AMBIGUOUS,
                        BiasDirectionToString(g_vt.bias_enum),
                        setupW,
                        "ambiguous",
                        "ambiguous_sl_tp_same_bar",
                        detX);
         VirtualAppendTradeCsvRow(g_vt.bars_waiting_entry, "daily_bias_aligned", g_lastBiasReason, "");
         VirtualRegisterOutcomeStats();
         VirtualClearTrade();
        }
      return;
     }

   g_vt.bars_held++;
   if(g_vt.bars_held > InpVirtualMaxBarsInTrade)
     {
      g_vt.outcome = "expired_open";
      g_vt.result_r = 0.0;
      g_vt.exit_price = cl;
      g_vt.exit_reason = "expired_open";
      g_vt.exit_time = tBar;
      const string detX = VirtualBuildDetailsCore();
      AppendEventRow(EVT_VIRT_EXPIRED,
                     BiasDirectionToString(g_vt.bias_enum),
                     setupW,
                     "expired",
                     "expired_open",
                     detX);
      VirtualAppendTradeCsvRow(g_vt.bars_waiting_entry, "daily_bias_aligned", g_lastBiasReason, "");
      VirtualRegisterOutcomeStats();
      VirtualClearTrade();
     }
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
bool SetupBarAgeAllowed(const string sym, const ENUM_TIMEFRAMES tf)
  {
   if(InpMaxSetupAgeBars <= 0)
      return true;
   const datetime tA = iTime(sym, tf, 3);
   if(tA == 0)
      return false;
   const int sh = iBarShift(sym, tf, tA, false);
   if(sh < 0)
      return false;
   return (sh <= InpMaxSetupAgeBars);
  }

//+------------------------------------------------------------------+
void TryDetectIfvgOnNewExecClosedBar(void)
  {
   if(!g_initOk || !InpEnableSetupDetection)
      return;

   const datetime tExec = iTime(g_brokerSymbol, InpExecutionTimeframe, 1);
   if(tExec == 0)
      return;
   if(tExec == g_lastExecClosedBarProcessed)
      return;

   VirtualManageOnNewClosedExecBar();

   g_lastExecClosedBarProcessed = tExec;

   if(!SetupBarAgeAllowed(g_brokerSymbol, InpExecutionTimeframe))
      return;

   bool found = false;
   ENUM_MAPZ_SETUP_DIR sdir = MAPZ_SETUP_NONE;
   double fLo = 0.0, fHi = 0.0;
   long gapPts = 0;
   datetime cTime = 0;
   string rsn = "";
   if(!DetectIfvgSetupV1(g_brokerSymbol, InpExecutionTimeframe, found, sdir, fLo, fHi, gapPts, cTime, rsn))
      return;
   if(!found)
      return;

   const string setupW = SetupDirectionToString(sdir);

   if(InpMinFvgPoints > 0 && gapPts < InpMinFvgPoints)
     {
      g_ignoredSmallFvg++;
      g_lastSetupDirection = setupW;
      g_lastSetupDecision = "setup_ignored";
      g_lastSetupReason = "fvg_gap_below_min_points";
      g_lastFvgPoints = gapPts;
      const string det = StringFormat(
                            "fvg_low=%.5f fvg_high=%.5f fvg_points=%I64d candle_time=%s daily_bias_reason=%s gate_result=ignored_small_fvg min_points=%d",
                            fLo, fHi, gapPts,
                            TimeUtcIso(cTime),
                            JsonStringEscape(g_lastBiasReason),
                            InpMinFvgPoints);
      ExportSetupEvent(EVT_SETUP_SKIPPED, setupW, "setup_ignored", "fvg_gap_below_min_points", det);
      return;
     }

   g_totalSetupCandidates++;
   if(sdir == MAPZ_SETUP_LONG)
      g_bullishSetupCandidates++;
   else if(sdir == MAPZ_SETUP_SHORT)
      g_bearishSetupCandidates++;

   g_lastSetupDirection = setupW;
   g_lastFvgPoints = gapPts;

   const string detDetected = StringFormat(
                                 "fvg_low=%.5f fvg_high=%.5f fvg_points=%I64d candle_time=%s daily_bias_reason=%s gate_result=pending",
                                 fLo, fHi, gapPts,
                                 TimeUtcIso(cTime),
                                 JsonStringEscape(g_lastBiasReason));
   ExportSetupEvent(EVT_SETUP_DETECTED, setupW, "detected", rsn, detDetected);

   const string gate = ApplyDailyBiasGateToSetup(setupW);

   if(gate == "setup_candidate_allowed")
     {
      g_allowedSetups++;
      g_lastSetupDecision = gate;
      g_lastSetupReason = "daily_bias_aligned";
      const string detA = StringFormat(
                            "fvg_low=%.5f fvg_high=%.5f fvg_points=%I64d candle_time=%s daily_bias_reason=%s gate_result=%s",
                            fLo, fHi, gapPts,
                            TimeUtcIso(cTime),
                            JsonStringEscape(g_lastBiasReason),
                            gate);
      const string evAllow = ExportSetupEvent(EVT_SETUP_ALLOWED, setupW, gate, "daily_bias_aligned", detA);
      VirtualOnSetupAllowed(evAllow, setupW, sdir, fLo, fHi, gapPts, cTime, rsn);
     }
   else if(gate == "rejected_by_daily_bias")
     {
      g_rejectedByDailyBias++;
      g_lastSetupDecision = gate;
      g_lastSetupReason = "bias_mismatch";
      const string detR = StringFormat(
                            "fvg_low=%.5f fvg_high=%.5f fvg_points=%I64d candle_time=%s daily_bias_reason=%s gate_result=%s",
                            fLo, fHi, gapPts,
                            TimeUtcIso(cTime),
                            JsonStringEscape(g_lastBiasReason),
                            gate);
      ExportSetupEvent(EVT_SETUP_REJECTED, setupW, gate, "bias_mismatch", detR);
     }
   else if(gate == "skipped_neutral_bias")
     {
      g_skippedNeutralBias++;
      g_lastSetupDecision = gate;
      g_lastSetupReason = "neutral_bias";
      const string detN = StringFormat(
                            "fvg_low=%.5f fvg_high=%.5f fvg_points=%I64d candle_time=%s daily_bias_reason=%s gate_result=%s",
                            fLo, fHi, gapPts,
                            TimeUtcIso(cTime),
                            JsonStringEscape(g_lastBiasReason),
                            gate);
      ExportSetupEvent(EVT_SETUP_SKIPPED, setupW, gate, "neutral_bias", detN);
     }
   else if(gate == "missing_bias_context")
     {
      g_missingBiasContextCount++;
      g_lastSetupDecision = gate;
      g_lastSetupReason = "unknown_bias";
      const string detM = StringFormat(
                            "fvg_low=%.5f fvg_high=%.5f fvg_points=%I64d candle_time=%s daily_bias_reason=%s gate_result=%s",
                            fLo, fHi, gapPts,
                            TimeUtcIso(cTime),
                            JsonStringEscape(g_lastBiasReason),
                            gate);
      ExportSetupEvent(EVT_SETUP_SKIPPED, setupW, gate, "unknown_bias", detM);
     }
   else
     {
      g_lastSetupDecision = gate;
      g_lastSetupReason = "setup_ignored";
      const string detI = StringFormat(
                            "fvg_low=%.5f fvg_high=%.5f fvg_points=%I64d candle_time=%s daily_bias_reason=%s gate_result=%s",
                            fLo, fHi, gapPts,
                            TimeUtcIso(cTime),
                            JsonStringEscape(g_lastBiasReason),
                            gate);
      ExportSetupEvent(EVT_SETUP_SKIPPED, setupW, gate, "setup_ignored", detI);
     }
  }

//+------------------------------------------------------------------+
void RefreshSetupSummaryNotes(void)
  {
   const string gateNone = ApplyDailyBiasGatePlaceholder("none");
   const long tcRows = g_trades_csv_row_count;
   g_exportNotes = StringFormat(
                       "E5.5.0 Mapazapp_TestEA: Daily Bias V1 on %s (last=%s); Setup V1 FVG on %s; virtual trades=%s (export-only; no live execution); gate_placeholder=%s; "
                       "setup_inputs: enable=%s min_fvg_pts=%d virtual_min_trade_fvg_pts=%d max_setup_age_bars=%d require_bias=%s; trade_count=%I64d (virtual rows only).",
                       TfToWire(InpDailyBiasTimeframe),
                       BiasDirectionToString(g_lastBiasEnum),
                       TfToWire(InpExecutionTimeframe),
                       (InpEnableVirtualTrades ? "on" : "off"),
                       gateNone,
                       (InpEnableSetupDetection ? "true" : "false"),
                       InpMinFvgPoints,
                       InpVirtualMinTradeFvgPoints,
                       InpMaxSetupAgeBars,
                       (InpRequireDailyBiasAlignment ? "true" : "false"),
                       tcRows);
  }

//+------------------------------------------------------------------+
void RefreshExportNotes(void)
  {
   RefreshSetupSummaryNotes();
  }

//+------------------------------------------------------------------+
string WriteSummaryJson(void)
  {
   RefreshExportNotes();
   const string execTf = TfToWire(InpExecutionTimeframe);
   const string biasTf = TfToWire(InpDailyBiasTimeframe);
   const string exportedAt = NowUtcIso();
   const long tcRows = g_trades_csv_row_count;
   double winrate = 0.0;
   const long wl = g_win_count + g_loss_count;
   if(wl > 0)
      winrate = (double)g_win_count / (double)wl;
   double averageR = 0.0;
   if(tcRows > 0)
      averageR = g_total_r / (double)tcRows;
   const double expectancyR = averageR;
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
   json += "  \"has_real_ifvg_logic\": true,\r\n";
   json += "  \"has_full_ifvg_pipeline\": false,\r\n";
   json += "  \"has_real_daily_bias_logic\": true,\r\n";
   json += "  \"has_real_virtual_trade_logic\": " + (InpEnableVirtualTrades ? "true" : "false") + ",\r\n";
   json += "  \"has_real_trading_orders\": false,\r\n";
   json += StringFormat("  \"trade_count\": %I64d,\r\n", tcRows);
   json += StringFormat("  \"virtual_trade_count\": %I64d,\r\n", g_virtual_trade_count);
   json += StringFormat("  \"filled_trade_count\": %I64d,\r\n", g_filled_trade_count);
   json += StringFormat("  \"unfilled_expired_count\": %I64d,\r\n", g_unfilled_expired_count);
   json += StringFormat("  \"win_count\": %I64d,\r\n", g_win_count);
   json += StringFormat("  \"loss_count\": %I64d,\r\n", g_loss_count);
   json += StringFormat("  \"ambiguous_count\": %I64d,\r\n", g_ambiguous_count);
   json += StringFormat("  \"expired_open_count\": %I64d,\r\n", g_expired_open_count);
   json += StringFormat("  \"unresolved_count\": %I64d,\r\n", g_unresolved_count);
   json += StringFormat("  \"invalid_risk_count\": %I64d,\r\n", g_invalid_risk_count);
   json += StringFormat("  \"skipped_trade_active\": %I64d,\r\n", g_skipped_trade_active);
   json += StringFormat("  \"total_r\": %.6f,\r\n", g_total_r);
   json += StringFormat("  \"average_r\": %.6f,\r\n", averageR);
   json += StringFormat("  \"winrate\": %.6f,\r\n", winrate);
   json += StringFormat("  \"expectancy_r\": %.6f,\r\n", expectancyR);
   json += StringFormat("  \"max_drawdown_r\": %.6f,\r\n", g_max_drawdown_r);
   json += "  \"last_trade_outcome\": \"" + JsonStringEscape(g_last_trade_outcome) + "\",\r\n";
   json += StringFormat("  \"last_trade_result_r\": %.6f,\r\n", g_last_trade_result_r);
   json += StringFormat("  \"total_bias_evaluated\": %I64d,\r\n", g_totalBiasEvaluated);
   json += StringFormat("  \"bullish_bias_count\": %I64d,\r\n", g_bullishBiasCount);
   json += StringFormat("  \"bearish_bias_count\": %I64d,\r\n", g_bearishBiasCount);
   json += StringFormat("  \"neutral_bias_count\": %I64d,\r\n", g_neutralBiasCount);
   json += StringFormat("  \"unknown_bias_count\": %I64d,\r\n", g_unknownBiasCount);
   json += StringFormat("  \"total_setup_candidates\": %I64d,\r\n", g_totalSetupCandidates);
   json += StringFormat("  \"bullish_setup_candidates\": %I64d,\r\n", g_bullishSetupCandidates);
   json += StringFormat("  \"bearish_setup_candidates\": %I64d,\r\n", g_bearishSetupCandidates);
   json += StringFormat("  \"allowed_setups\": %I64d,\r\n", g_allowedSetups);
   json += StringFormat("  \"rejected_by_daily_bias\": %I64d,\r\n", g_rejectedByDailyBias);
   json += StringFormat("  \"skipped_neutral_bias\": %I64d,\r\n", g_skippedNeutralBias);
   json += StringFormat("  \"missing_bias_context\": %I64d,\r\n", g_missingBiasContextCount);
   json += StringFormat("  \"ignored_small_fvg\": %I64d,\r\n", g_ignoredSmallFvg);
   json += "  \"last_setup_direction\": \"" + JsonStringEscape(g_lastSetupDirection) + "\",\r\n";
   json += "  \"last_setup_decision\": \"" + JsonStringEscape(g_lastSetupDecision) + "\",\r\n";
   json += "  \"last_setup_reason\": \"" + JsonStringEscape(g_lastSetupReason) + "\",\r\n";
   json += StringFormat("  \"last_fvg_points\": %I64d,\r\n", g_lastFvgPoints);
   json += "  \"campaign_id\": \"" + JsonStringEscape(g_campaignIdForSummary) + "\",\r\n";
   json += "  \"optimization_safe_exports\": " + (g_optimizationSafeExports ? "true" : "false") + ",\r\n";
   json += "  \"effective_run_id\": \"" + JsonStringEscape(g_runId) + "\",\r\n";
   json += "  \"effective_export_folder_label\": \"" + JsonStringEscape(g_exportFolderLeaf) + "\",\r\n";
   json += "  \"optimization_parameters\": {\r\n";
   json += StringFormat("    \"virtual_min_trade_fvg_points\": %d,\r\n", InpVirtualMinTradeFvgPoints);
   json += StringFormat("    \"virtual_risk_reward\": %.6f,\r\n", InpVirtualRiskReward);
   json += StringFormat("    \"daily_bias_min_body_points\": %d,\r\n", InpDailyBiasMinBodyPoints);
   json += "    \"require_daily_bias_alignment\": " + (InpRequireDailyBiasAlignment ? "true" : "false") + "\r\n";
   json += "  },\r\n";
   json += "  \"exported_at_utc\": \"" + JsonStringEscape(exportedAt) + "\",\r\n";
   json += "  \"notes\": \"" + JsonStringEscape(g_exportNotes) + "\"\r\n";
   json += "}\r\n";
   return json;
  }

//+------------------------------------------------------------------+
string WriteTradesHeader(void)
  {
   return "run_id,trade_id,setup_event_id,timestamp,entry_time,exit_time,symbol,timeframe,direction,bias_direction,setup_direction,entry,sl,tp,exit_price,result_r,result_money,outcome,exit_reason,setup_reason,bias_reason,rejection_reason,bars_to_fill,bars_held,fvg_low,fvg_high,fvg_points,parameter_set_id,entry_mode,stop_mode,ambiguity_mode";
  }

//+------------------------------------------------------------------+
string WriteEventsHeader(void)
  {
   return "run_id,event_id,timestamp,symbol,event_type,bias_direction,setup_direction,decision,reason,details";
  }

//+------------------------------------------------------------------+
void VirtualFinalizeActiveTradeIfAny(void)
  {
   if(!g_testerOk || !g_initOk || !InpEnableVirtualTrades)
      return;
   if(!g_vt.active)
      return;

   const double cl = iClose(g_brokerSymbol, InpExecutionTimeframe, 1);
   const datetime tBar = iTime(g_brokerSymbol, InpExecutionTimeframe, 1);
   const datetime tExit = (tBar > 0 ? tBar : TimeGMT());
   const string setupW = SetupDirectionToString(g_vt.setup_dir);

   g_vt.exit_time = tExit;
   g_vt.result_r = 0.0;

   if(g_vt.filled)
     {
      g_vt.outcome = "unresolved";
      g_vt.exit_reason = "deinit_with_active_virtual_trade";
      g_vt.exit_price = (MathIsValidNumber(cl) ? NormalizeDouble(cl, _Digits) : g_vt.entry);
     }
   else
     {
      g_vt.outcome = "expired_unfilled";
      g_vt.exit_reason = "deinit_pending_virtual_entry";
      g_vt.exit_price = 0.0;
     }

   const string detU = VirtualBuildDetailsCore();
   AppendEventRow(EVT_VIRT_UNRESOLVED,
                  BiasDirectionToString(g_vt.bias_enum),
                  setupW,
                  "unresolved",
                  g_vt.exit_reason,
                  detU);
   if(InpWriteTradesCsv && InpWriteVirtualTrades)
      VirtualAppendTradeCsvRow(g_vt.bars_waiting_entry, "daily_bias_aligned", g_lastBiasReason, "");
   VirtualRegisterOutcomeStats();
   VirtualClearTrade();
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
      string tradesBody = WriteTradesHeader() + "\r\n";
      if(StringLen(g_tradesDataLines) > 0)
         tradesBody += g_tradesDataLines + "\r\n";
      const string tradesPath = g_baseRelPath + "\\backtest_trades.csv";
      if(!WriteTextAtomic(tradesPath, tradesBody))
         Print("Mapazapp_TestEA export error: trades CSV final write failed (see FileOpen/FileMove logs above).");
     }

   if(InpWriteEventsCsv)
     {
      const string eventsBody = WriteEventsHeader() + "\r\n" + g_eventsDataLines + "\r\n";
      const string eventsPath = g_baseRelPath + "\\backtest_events.csv";
      if(!WriteTextAtomic(eventsPath, eventsBody))
         Print("Mapazapp_TestEA export error: events CSV final write failed (see FileOpen/FileMove logs above).");
     }

   if(InpWriteSummaryJson)
     {
      const string summaryPath = g_baseRelPath + "\\backtest_summary.json";
      const string summaryJson = WriteSummaryJson();
      if(!WriteTextAtomic(summaryPath, summaryJson))
         Print("Mapazapp_TestEA export error: summary JSON final write failed (see FileOpen/FileMove logs above).");
     }

   if(g_exportWriteFailCount > 0)
      PrintFormat("Mapazapp_TestEA export: completed with prior write failures (count=%d).", g_exportWriteFailCount);
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
   TesterResolveExportIdentity();
   if(!BuildExportPath())
     {
      Print("Mapazapp_TestEA: invalid export path.");
      return INIT_FAILED;
     }

   PrintFormat("Mapazapp_TestEA export layout: effective folder (under MQL5\\Files\\): %s", g_baseRelPath);
   PrintFormat("Mapazapp_TestEA export layout: summary path: %s\\backtest_summary.json", g_baseRelPath);
   PrintFormat("Mapazapp_TestEA export layout: events path: %s\\backtest_events.csv", g_baseRelPath);
   PrintFormat("Mapazapp_TestEA export layout: trades path: %s\\backtest_trades.csv", g_baseRelPath);

   g_initOk = true;
   Print("Mapazapp_TestEA: official tester EA; Daily Bias V1 + FVG/Setup V1 + E5.5.0 virtual trade simulation (no orders); outputs under MQL5\\Files\\", g_baseRelPath);

   ExportLifecycleEvent("lifecycle_init", "ok", "OnInit", "paths_ready");
   ExportLifecycleEvent("skeleton_ready", "noop", "E5.5.0",
                       "Virtual trade simulation on closed execution candles; geometry/risk gates; deinit unresolved; optimization_safe_exports optional; has_full_ifvg_pipeline=false; has_real_trading_orders=false.");

   TryEmitDailyBiasOnNewClosedBar();
   TryDetectIfvgOnNewExecClosedBar();

   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
void OnTick()
  {
   TryEmitDailyBiasOnNewClosedBar();
   TryDetectIfvgOnNewExecClosedBar();
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   VirtualFinalizeActiveTradeIfAny();
   WriteAllExports(reason);
  }

//+------------------------------------------------------------------+
