//+------------------------------------------------------------------+
//| Mapazapp_BridgeEA.mq5                                            |
//| Mapazapp — Checkpoint 13: MT5 BridgeEA export-only               |
//| Writes MZP_BRIDGE_V1 / QTG_BRIDGE_V1 CSV + JSON under          |
//| MQL5/Files/<InpExportRoot>/<InpTerminalId>/                      |
//| NO order execution, NO command ingest, NO WebRequest, NO DLLs,   |
//| NO CTrade.                                                       |
//+------------------------------------------------------------------+
#property copyright "Mapazapp"
#property link      "https://mapazapp"
#property version   "1.00"
#property description "Export-only bridge: account, market, candles, positions, orders, deals, errors."
#property strict

input string InpSchemaVersion        = "MZP_BRIDGE_V1";
input string InpTerminalId           = "TERMINAL_A";
input string InpExportRoot           = "Mapazapp\\bridge";
input string InpSymbols              = "XAUUSD,EURUSD";
input string InpTimeframes           = "M15,H1,H4";
input int    InpTimerSeconds         = 5;
input int    InpCandleBars           = 500;
input int    InpDealsLookbackDays    = 14;
input bool   InpExportMarketSnapshot = true;
input bool   InpExportAccountSnapshot= true;
input bool   InpExportCandles        = true;
input bool   InpExportPositions      = true;
input bool   InpExportOrders         = true;
input bool   InpExportDeals          = true;
input bool   InpExportErrors         = true;

//--- internal
#define BRIDGE_EA_VERSION     "MZP_BridgeEA_v1"
#define STRATEGY_EXPORT_ID    "MZP_BRIDGE_EXPORT_V1"
#define SOURCE_TAG_BRIDGEEA   "MAPZAPP_BRIDGEEA"
#define NO_EXPIRATION_UTC     "2099-12-31T00:00:00Z"

string            g_baseRelPath;
string            g_symbols[];
ENUM_TIMEFRAMES   g_timeframes[];
int               g_symCount = 0;
int               g_tfCount  = 0;
string            g_schema   = "";
long              g_exportSeq = 0;

struct BridgeErrorRow
  {
   string            code;
   string            message;
   string            module;
   string            severity;
   string            context;
  };
BridgeErrorRow g_errors[];
const int       MAX_ERROR_ROWS = 200;

//+------------------------------------------------------------------+
string Trim(const string s)
  {
   string t = s;
   StringTrimLeft(t);
   StringTrimRight(t);
   return t;
  }

//+------------------------------------------------------------------+
string SanitizeOneLine(const string s)
  {
   string o = "";
   const int n = (int)StringLen(s);
   for(int i = 0; i < n; i++)
     {
      const ushort ch = StringGetCharacter(s, i);
      if(ch < 32)
         continue;
      if(ch > 127)
         o += "?";
      else
         o += CharToString((uchar)ch);
     }
   return o;
  }

//+------------------------------------------------------------------+
bool SchemaIsSupported(const string v)
  {
   return (v == "MZP_BRIDGE_V1" || v == "QTG_BRIDGE_V1");
  }

//+------------------------------------------------------------------+
string SanitizePathSegment(const string s)
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
   if(StringLen(o) == 0)
      return "TERMINAL";
   return o;
  }

//+------------------------------------------------------------------+
void PushError(const string code, const string message, const string module,
               const string severity, const string context)
  {
   const int sz = ArraySize(g_errors);
   if(sz >= MAX_ERROR_ROWS)
     {
      for(int i = 1; i < sz; i++)
         g_errors[i - 1] = g_errors[i];
      ArrayResize(g_errors, sz - 1);
     }
   BridgeErrorRow row;
   row.code = code;
   row.message = SanitizeOneLine(message);
   row.module = SanitizeOneLine(module);
   row.severity = SanitizeOneLine(severity);
   row.context = SanitizeOneLine(context);
   const int ns = ArraySize(g_errors);
   ArrayResize(g_errors, ns + 1);
   g_errors[ns] = row;
  }

//+------------------------------------------------------------------+
string CsvEscape(const string s)
  {
   const string t = s;
   if(StringFind(t, ",") < 0 && StringFind(t, "\"") < 0 && StringFind(t, "\n") < 0 && StringFind(t, "\r") < 0)
      return t;
   string u = "\"";
   const int n = (int)StringLen(t);
   for(int i = 0; i < n; i++)
     {
      const ushort ch = StringGetCharacter(t, i);
      if(ch == '"')
         u += "\"\"";
      else
         u += CharToString((uchar)ch);
     }
   u += "\"";
   return u;
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
bool ParseSymbols(const string csv)
  {
   string parts[];
   const int n = StringSplit(csv, ',', parts);
   g_symCount = 0;
   ArrayResize(g_symbols, 0);
   for(int i = 0; i < n; i++)
     {
      const string sym = Trim(parts[i]);
      if(StringLen(sym) == 0)
         continue;
      ArrayResize(g_symbols, g_symCount + 1);
      g_symbols[g_symCount] = sym;
      g_symCount++;
     }
   return (g_symCount > 0);
  }

//+------------------------------------------------------------------+
ENUM_TIMEFRAMES ParseTimeframeToken(const string tokRaw)
  {
   const string t = Trim(tokRaw);
   if(t == "M1")   return PERIOD_M1;
   if(t == "M5")   return PERIOD_M5;
   if(t == "M15")  return PERIOD_M15;
   if(t == "M30")  return PERIOD_M30;
   if(t == "H1")   return PERIOD_H1;
   if(t == "H4")   return PERIOD_H4;
   if(t == "D1")   return PERIOD_D1;
   if(t == "W1")   return PERIOD_W1;
   if(t == "MN1")  return PERIOD_MN1;
   return PERIOD_CURRENT;
  }

//+------------------------------------------------------------------+
bool ParseTimeframes(const string csv)
  {
   string parts[];
   const int n = StringSplit(csv, ',', parts);
   g_tfCount = 0;
   ArrayResize(g_timeframes, 0);
   for(int i = 0; i < n; i++)
     {
      const ENUM_TIMEFRAMES tf = ParseTimeframeToken(parts[i]);
      if(tf == PERIOD_CURRENT)
        {
         PushError("BRIDGE_TF_UNKNOWN", "Unknown timeframe token: " + Trim(parts[i]), "OnInit", "WARNING", "InpTimeframes");
         continue;
        }
      ArrayResize(g_timeframes, g_tfCount + 1);
      g_timeframes[g_tfCount] = tf;
      g_tfCount++;
     }
   return (g_tfCount > 0);
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
string PositionTypeWire(const long t)
  {
   if(t == POSITION_TYPE_BUY)
      return "BUY";
   if(t == POSITION_TYPE_SELL)
      return "SELL";
   return "UNKNOWN";
  }

//+------------------------------------------------------------------+
string OrderTypeWire(const long t)
  {
   switch((int)t)
     {
      case ORDER_TYPE_BUY:            return "BUY";
      case ORDER_TYPE_SELL:           return "SELL";
      case ORDER_TYPE_BUY_LIMIT:      return "BUY_LIMIT";
      case ORDER_TYPE_SELL_LIMIT:     return "SELL_LIMIT";
      case ORDER_TYPE_BUY_STOP:       return "BUY_STOP";
      case ORDER_TYPE_SELL_STOP:      return "SELL_STOP";
      case ORDER_TYPE_BUY_STOP_LIMIT: return "BUY_STOP_LIMIT";
      case ORDER_TYPE_SELL_STOP_LIMIT:return "SELL_STOP_LIMIT";
      default:                        return "UNKNOWN";
     }
  }

//+------------------------------------------------------------------+
string DealTypeWire(const long t)
  {
   if(t == DEAL_TYPE_BUY)
      return "BUY";
   if(t == DEAL_TYPE_SELL)
      return "SELL";
   if(t == DEAL_TYPE_BALANCE)
      return "BALANCE";
   if(t == DEAL_TYPE_CREDIT)
      return "CREDIT";
   if(t == DEAL_TYPE_COMMISSION)
      return "COMMISSION";
   if(t == DEAL_TYPE_COMMISSION_DAILY)
      return "COMMISSION_DAILY";
   if(t == DEAL_TYPE_COMMISSION_MONTHLY)
      return "COMMISSION_MONTHLY";
   if(t == DEAL_TYPE_COMMISSION_AGENT_DAILY)
      return "COMMISSION_AGENT_DAILY";
   if(t == DEAL_TYPE_COMMISSION_AGENT_MONTHLY)
      return "COMMISSION_AGENT_MONTHLY";
   if(t == DEAL_TYPE_INTEREST)
      return "INTEREST";
   if(t == DEAL_TYPE_BUY_CANCELED)
      return "BUY_CANCELED";
   if(t == DEAL_TYPE_SELL_CANCELED)
      return "SELL_CANCELED";
   return "OTHER";
  }

//+------------------------------------------------------------------+
string DealEntryWire(const long e)
  {
   if(e == DEAL_ENTRY_IN)
      return "IN";
   if(e == DEAL_ENTRY_OUT)
      return "OUT";
   if(e == DEAL_ENTRY_INOUT)
      return "INOUT";
   if(e == DEAL_ENTRY_OUT_BY)
      return "OUT_BY";
   return "UNKNOWN";
  }

//+------------------------------------------------------------------+
string DealReasonWire(const long r)
  {
   switch((int)r)
     {
      case DEAL_REASON_CLIENT:   return "CLIENT";
      case DEAL_REASON_MOBILE:   return "MOBILE";
      case DEAL_REASON_WEB:      return "WEB";
      case DEAL_REASON_EXPERT:   return "EXPERT";
      case DEAL_REASON_SL:       return "SL";
      case DEAL_REASON_TP:       return "TP";
      case DEAL_REASON_SO:       return "SO";
      case DEAL_REASON_ROLLOVER: return "ROLLOVER";
      case DEAL_REASON_VMARGIN:  return "VMARGIN";
      case DEAL_REASON_SPLIT:    return "SPLIT";
      default:                   return "OTHER";
     }
  }

//+------------------------------------------------------------------+
string TradeModeWire(const long mode)
  {
   switch((int)mode)
     {
      case SYMBOL_TRADE_MODE_DISABLED: return "DISABLED";
      case SYMBOL_TRADE_MODE_LONGONLY: return "LONGONLY";
      case SYMBOL_TRADE_MODE_SHORTONLY:return "SHORTONLY";
      case SYMBOL_TRADE_MODE_CLOSEONLY:return "CLOSEONLY";
      case SYMBOL_TRADE_MODE_FULL:     return "FULL";
      default:                          return "UNKNOWN";
     }
  }

//+------------------------------------------------------------------+
string SessionStatusForSymbol(const string sym)
  {
   const long tm = (long)SymbolInfoInteger(sym, SYMBOL_TRADE_MODE);
   if(tm == SYMBOL_TRADE_MODE_DISABLED)
      return "CLOSED";
   return "OPEN";
  }

//+------------------------------------------------------------------+
bool WriteTextAtomic(const string relativePath, const string body)
  {
   const string tmp = relativePath + ".tmp";
   int fh = FileOpen(tmp, FILE_WRITE | FILE_TXT | FILE_ANSI | FILE_SHARE_READ);
   if(fh == INVALID_HANDLE)
     {
      PushError("BRIDGE_FILE_OPEN", "Cannot open temp file: " + tmp, "WriteTextAtomic", "ERROR", relativePath);
      return false;
     }
   if(FileWriteString(fh, body) <= 0)
     {
      FileClose(fh);
      PushError("BRIDGE_FILE_WRITE", "Write failed: " + tmp, "WriteTextAtomic", "ERROR", relativePath);
      return false;
     }
   FileFlush(fh);
   FileClose(fh);
   if(FileIsExist(relativePath))
     {
      if(!FileDelete(relativePath))
        {
         PushError("BRIDGE_FILE_DELETE", "Cannot delete old file: " + relativePath, "WriteTextAtomic", "WARNING", relativePath);
        }
     }
   // MQL5: FileMove(source_name, source_common_flags, destination_name, destination_common_flags)
   if(!FileMove(tmp, 0, relativePath, 0))
     {
      PushError("BRIDGE_FILE_MOVE", "FileMove failed to: " + relativePath, "WriteTextAtomic", "ERROR", relativePath);
      return false;
     }
   return true;
  }

//+------------------------------------------------------------------+
bool ExportBridgeStatusJson(const string eaStatus, const bool connected, const int errorsCount,
                            const string lastErr, const string lastTickUtc)
  {
   const string exported = NowUtcIso();
   const long login = AccountInfoInteger(ACCOUNT_LOGIN);
   const string server = SanitizeOneLine(AccountInfoString(ACCOUNT_SERVER));
   string symJson = "[";
   for(int i = 0; i < g_symCount; i++)
     {
      if(i > 0)
         symJson += ",";
      symJson += "\"" + JsonStringEscape(SanitizeOneLine(g_symbols[i])) + "\"";
     }
   symJson += "]";
   const bool autoExpert = (TerminalInfoInteger(TERMINAL_TRADE_ALLOWED) != 0 &&
                            MQLInfoInteger(MQL_TRADE_ALLOWED) != 0);
   string json = "{";
   json += "\"schema_version\":\"" + g_schema + "\",";
   json += "\"exported_at_utc\":\"" + exported + "\",";
   json += "\"terminal_id\":\"" + JsonStringEscape(SanitizeOneLine(InpTerminalId)) + "\",";
   json += StringFormat("\"account_login\":%I64d,", login);
   json += "\"account_server\":\"" + server + "\",";
   json += "\"account_currency\":\"" + SanitizeOneLine(AccountInfoString(ACCOUNT_CURRENCY)) + "\",";
   json += "\"bridge_version\":\"" + BRIDGE_EA_VERSION + "\",";
   json += "\"ea_status\":\"" + eaStatus + "\",";
   json += "\"auto_trading_enabled\":" + (autoExpert ? "true" : "false") + ",";
   json += "\"connected\":" + (connected ? "true" : "false") + ",";
   if(StringLen(lastTickUtc) > 0)
      json += "\"last_tick_time_utc\":\"" + lastTickUtc + "\",";
   json += "\"symbols_enabled\":" + symJson + ",";
   json += StringFormat("\"errors_count\":%d,", errorsCount);
   json += "\"last_error\":\"" + JsonStringEscape(SanitizeOneLine(lastErr)) + "\"";
   json += "}";
   return WriteTextAtomic(g_baseRelPath + "\\bridge_status.json", json);
  }

//+------------------------------------------------------------------+
bool ExportMarketSnapshotCsv(void)
  {
   const string exported = NowUtcIso();
   const string loginStr = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string csv = "schema_version,exported_at_utc,terminal_id,account_login,symbol,bid,ask,last,spread_points,spread_price,point,digits,tick_size,tick_value,contract_size,volume_min,volume_max,volume_step,trade_mode,session_status,last_tick_time_utc\n";
   string latestTick = "";
   for(int s = 0; s < g_symCount; s++)
     {
      const string sym = g_symbols[s];
      if(!SymbolSelect(sym, true))
        {
         PushError("BRIDGE_SYMBOL_SELECT", "SymbolSelect failed", "ExportMarket", "WARNING", sym);
         continue;
        }
      const double bid = SymbolInfoDouble(sym, SYMBOL_BID);
      const double ask = SymbolInfoDouble(sym, SYMBOL_ASK);
      double last = SymbolInfoDouble(sym, SYMBOL_LAST);
      if(last <= 0.0 && bid > 0 && ask > 0)
         last = (bid + ask) / 2.0;
      const double point = SymbolInfoDouble(sym, SYMBOL_POINT);
      const int spreadPts = (int)SymbolInfoInteger(sym, SYMBOL_SPREAD);
      const double spreadPrice = (point > 0.0) ? ((double)spreadPts * point) : 0.0;
      const int digits = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
      const double tickSize = SymbolInfoDouble(sym, SYMBOL_TRADE_TICK_SIZE);
      const double tickValue = SymbolInfoDouble(sym, SYMBOL_TRADE_TICK_VALUE);
      const double contract = SymbolInfoDouble(sym, SYMBOL_TRADE_CONTRACT_SIZE);
      const double vmin = SymbolInfoDouble(sym, SYMBOL_VOLUME_MIN);
      const double vmax = SymbolInfoDouble(sym, SYMBOL_VOLUME_MAX);
      const double vstep = SymbolInfoDouble(sym, SYMBOL_VOLUME_STEP);
      const long tmode = SymbolInfoInteger(sym, SYMBOL_TRADE_MODE);
      const string sess = SessionStatusForSymbol(sym);
      datetime tickTime = (datetime)SymbolInfoInteger(sym, SYMBOL_TIME);
      if(tickTime == 0)
         tickTime = TimeGMT();
      const string tickUtc = TimeUtcIso(tickTime);
      if(StringLen(latestTick) == 0 || tickUtc > latestTick)
         latestTick = tickUtc;
      csv += g_schema + "," + CsvEscape(exported) + "," + CsvEscape(InpTerminalId) + "," + loginStr + "," + CsvEscape(sym) + ",";
      csv += DoubleToString(bid, digits) + "," + DoubleToString(ask, digits) + "," + DoubleToString(last, digits) + ",";
      csv += IntegerToString(spreadPts) + "," + DoubleToString(spreadPrice, digits) + ",";
      csv += DoubleToString(point, digits) + "," + IntegerToString(digits) + ",";
      csv += DoubleToString(tickSize, 8) + "," + DoubleToString(tickValue, 8) + "," + DoubleToString(contract, 4) + ",";
      csv += DoubleToString(vmin, 4) + "," + DoubleToString(vmax, 4) + "," + DoubleToString(vstep, 4) + ",";
      csv += CsvEscape(TradeModeWire(tmode)) + "," + CsvEscape(sess) + "," + CsvEscape(tickUtc) + "\n";
     }
   return WriteTextAtomic(g_baseRelPath + "\\latest_market_snapshot.csv", csv);
  }

//+------------------------------------------------------------------+
bool ExportAccountSnapshotCsv(void)
  {
   const string exported = NowUtcIso();
   const string loginStr = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string csv = "schema_version,exported_at_utc,terminal_id,account_login,account_server,currency,balance,equity,margin,free_margin,margin_level,profit_open,leverage,trade_allowed,trade_expert,company\n";
   const double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   const double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   const double margin = AccountInfoDouble(ACCOUNT_MARGIN);
   const double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   double mlevel = AccountInfoDouble(ACCOUNT_MARGIN_LEVEL);
   if(margin <= 0.0 && mlevel == 0.0)
      mlevel = 0.0;
   const double profitOpen = AccountInfoDouble(ACCOUNT_PROFIT);
   const int lev = (int)AccountInfoInteger(ACCOUNT_LEVERAGE);
   const bool tradeAllowed = (AccountInfoInteger(ACCOUNT_TRADE_ALLOWED) != 0);
   const bool tradeExpert = (AccountInfoInteger(ACCOUNT_TRADE_EXPERT) != 0);
   csv += g_schema + "," + CsvEscape(exported) + "," + CsvEscape(InpTerminalId) + "," + loginStr + ",";
   csv += CsvEscape(SanitizeOneLine(AccountInfoString(ACCOUNT_SERVER))) + ",";
   csv += CsvEscape(SanitizeOneLine(AccountInfoString(ACCOUNT_CURRENCY))) + ",";
   csv += DoubleToString(balance, 2) + "," + DoubleToString(equity, 2) + "," + DoubleToString(margin, 2) + ",";
   csv += DoubleToString(freeMargin, 2) + "," + DoubleToString(mlevel, 2) + "," + DoubleToString(profitOpen, 2) + ",";
   csv += IntegerToString(lev) + "," + (tradeAllowed ? "true" : "false") + "," + (tradeExpert ? "true" : "false") + ",";
   csv += CsvEscape(SanitizeOneLine(AccountInfoString(ACCOUNT_COMPANY))) + "\n";
   return WriteTextAtomic(g_baseRelPath + "\\account_snapshot.csv", csv);
  }

//+------------------------------------------------------------------+
bool CandleBarIsClosed(const datetime barOpen, const ENUM_TIMEFRAMES tf)
  {
   const int sec = PeriodSeconds(tf);
   if(sec <= 0)
      return true;
   return (barOpen + sec <= TimeGMT());
  }

//+------------------------------------------------------------------+
bool ExportCandlesCsv(void)
  {
   g_exportSeq++;
   const string exportId = StringFormat("EXP_%s_%I64d_%I64d", InpTerminalId, (long)TimeGMT(), g_exportSeq);
   const string exported = NowUtcIso();
   const string loginStr = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string csv = "schema_version,export_id,exported_at_utc,terminal_id,account_login,symbol,timeframe,candle_time_utc,open,high,low,close,tick_volume,spread_points,real_volume,is_closed,source\n";
   int rows = 0;
   for(int s = 0; s < g_symCount; s++)
     {
      const string sym = g_symbols[s];
      if(!SymbolSelect(sym, true))
         continue;
      const int digits = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
      for(int t = 0; t < g_tfCount; t++)
        {
         const ENUM_TIMEFRAMES tf = g_timeframes[t];
         MqlRates rates[];
         ArraySetAsSeries(rates, true);
         const int n = CopyRates(sym, tf, 0, InpCandleBars, rates);
         if(n <= 0)
           {
            PushError("BRIDGE_COPY_RATES", "CopyRates returned " + IntegerToString(n), "ExportCandles", "WARNING", sym + "|" + TfToWire(tf));
            continue;
           }
         for(int i = n - 1; i >= 0; i--)
           {
            const datetime bt = rates[i].time;
            const bool closed = CandleBarIsClosed(bt, tf);
            const long tv = (long)rates[i].tick_volume;
            const long sp = (long)rates[i].spread;
            const long rv = (long)rates[i].real_volume;
            csv += g_schema + "," + CsvEscape(exportId) + "," + CsvEscape(exported) + "," + CsvEscape(InpTerminalId) + "," + loginStr + ",";
            csv += CsvEscape(sym) + "," + CsvEscape(TfToWire(tf)) + "," + CsvEscape(TimeUtcIso(bt)) + ",";
            csv += DoubleToString(rates[i].open, digits) + "," + DoubleToString(rates[i].high, digits) + ",";
            csv += DoubleToString(rates[i].low, digits) + "," + DoubleToString(rates[i].close, digits) + ",";
            csv += IntegerToString((int)tv) + "," + IntegerToString((int)sp) + "," + IntegerToString((int)rv) + ",";
            csv += (closed ? "true" : "false") + ",MT5_BRIDGE\n";
            rows++;
           }
        }
     }
   if(rows == 0)
      PushError("BRIDGE_CANDLES_EMPTY", "No candle rows exported (CopyRates)", "ExportCandles", "WARNING", "");
   return WriteTextAtomic(g_baseRelPath + "\\candles.csv", csv);
  }

//+------------------------------------------------------------------+
bool ExportPositionsOpenCsv(void)
  {
   const string exported = NowUtcIso();
   const string loginStr = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string csv = "schema_version,exported_at_utc,terminal_id,account_login,position_ticket,symbol,type,volume,price_open,sl,tp,price_current,profit,swap,commission,magic,comment,time_open_utc,strategy_id,source_tag\n";
   const int total = PositionsTotal();
   for(int i = 0; i < total; i++)
     {
      const ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;
      const string sym = PositionGetString(POSITION_SYMBOL);
      const long ptype = PositionGetInteger(POSITION_TYPE);
      const double vol = PositionGetDouble(POSITION_VOLUME);
      const double po = PositionGetDouble(POSITION_PRICE_OPEN);
      const double sl = PositionGetDouble(POSITION_SL);
      const double tp = PositionGetDouble(POSITION_TP);
      const double pc = PositionGetDouble(POSITION_PRICE_CURRENT);
      const double prof = PositionGetDouble(POSITION_PROFIT);
      const double sw = PositionGetDouble(POSITION_SWAP);
      // POSITION_COMMISSION deprecated in newer builds; per-deal commission lives in deals export.
      const double comm = 0.0;
      const long magic = PositionGetInteger(POSITION_MAGIC);
      string cmt = SanitizeOneLine(PositionGetString(POSITION_COMMENT));
      if(StringLen(cmt) == 0)
         cmt = ".";
      const datetime op = (datetime)PositionGetInteger(POSITION_TIME);
      const int d = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
      csv += g_schema + "," + CsvEscape(exported) + "," + CsvEscape(InpTerminalId) + "," + loginStr + ",";
      csv += IntegerToString((long)ticket) + "," + CsvEscape(sym) + "," + CsvEscape(PositionTypeWire(ptype)) + ",";
      csv += DoubleToString(vol, 4) + "," + DoubleToString(po, d) + "," + DoubleToString(sl, d) + "," + DoubleToString(tp, d) + ",";
      csv += DoubleToString(pc, d) + "," + DoubleToString(prof, 2) + "," + DoubleToString(sw, 2) + "," + DoubleToString(comm, 2) + ",";
      csv += IntegerToString(magic) + "," + CsvEscape(cmt) + "," + CsvEscape(TimeUtcIso(op)) + ",";
      csv += CsvEscape(STRATEGY_EXPORT_ID) + "," + CsvEscape(SOURCE_TAG_BRIDGEEA) + "\n";
     }
   return WriteTextAtomic(g_baseRelPath + "\\positions_open.csv", csv);
  }

//+------------------------------------------------------------------+
bool ExportOrdersPendingCsv(void)
  {
   const string exported = NowUtcIso();
   const string loginStr = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string csv = "schema_version,exported_at_utc,terminal_id,account_login,order_ticket,symbol,type,volume_initial,volume_current,price_open,sl,tp,price_current,magic,comment,time_setup_utc,expiration_utc,strategy_id,source_tag\n";
   const int total = OrdersTotal();
   for(int i = 0; i < total; i++)
     {
      const ulong ticket = OrderGetTicket(i);
      if(ticket == 0 || !OrderSelect(ticket))
         continue;
      const string sym = OrderGetString(ORDER_SYMBOL);
      const long otype = OrderGetInteger(ORDER_TYPE);
      const double vi = OrderGetDouble(ORDER_VOLUME_INITIAL);
      const double vc = OrderGetDouble(ORDER_VOLUME_CURRENT);
      const double po = OrderGetDouble(ORDER_PRICE_OPEN);
      const double sl = OrderGetDouble(ORDER_SL);
      const double tp = OrderGetDouble(ORDER_TP);
      const double pc = OrderGetDouble(ORDER_PRICE_CURRENT);
      const long magic = OrderGetInteger(ORDER_MAGIC);
      string cmt = SanitizeOneLine(OrderGetString(ORDER_COMMENT));
      if(StringLen(cmt) == 0)
         cmt = ".";
      const datetime ts = (datetime)OrderGetInteger(ORDER_TIME_SETUP);
      const datetime ex = (datetime)OrderGetInteger(ORDER_TIME_EXPIRATION);
      string exUtc = NO_EXPIRATION_UTC;
      if(ex > 0)
         exUtc = TimeUtcIso(ex);
      const int d = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
      csv += g_schema + "," + CsvEscape(exported) + "," + CsvEscape(InpTerminalId) + "," + loginStr + ",";
      csv += IntegerToString((long)ticket) + "," + CsvEscape(sym) + "," + CsvEscape(OrderTypeWire(otype)) + ",";
      csv += DoubleToString(vi, 4) + "," + DoubleToString(vc, 4) + "," + DoubleToString(po, d) + ",";
      csv += DoubleToString(sl, d) + "," + DoubleToString(tp, d) + "," + DoubleToString(pc, d) + ",";
      csv += IntegerToString(magic) + "," + CsvEscape(cmt) + "," + CsvEscape(TimeUtcIso(ts)) + "," + CsvEscape(exUtc) + ",";
      csv += CsvEscape(STRATEGY_EXPORT_ID) + "," + CsvEscape(SOURCE_TAG_BRIDGEEA) + "\n";
     }
   return WriteTextAtomic(g_baseRelPath + "\\orders_pending.csv", csv);
  }

//+------------------------------------------------------------------+
bool ExportDealsHistoryCsv(void)
  {
   const string exported = NowUtcIso();
   const string loginStr = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string csv = "schema_version,exported_at_utc,terminal_id,account_login,deal_ticket,order_ticket,position_id,symbol,deal_type,entry_type,volume,price,profit,commission,swap,fee,time_utc,magic,comment,reason,strategy_id,source_tag\n";
   const datetime toT = TimeGMT();
   const datetime fromT = toT - (datetime)(InpDealsLookbackDays * 86400);
   if(!HistorySelect(fromT, toT))
     {
      PushError("BRIDGE_HISTORY_SELECT", "HistorySelect failed", "ExportDeals", "WARNING", "");
     }
   const int deals = HistoryDealsTotal();
   for(int i = 0; i < deals; i++)
     {
      const ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket == 0 || !HistoryDealSelect(dealTicket))
         continue;
      const long magic = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
      string cmt = SanitizeOneLine(HistoryDealGetString(dealTicket, DEAL_COMMENT));
      if(StringLen(cmt) == 0)
         cmt = ".";
      const string sym = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
      const int d = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
      const long dtype = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      const long entry = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      const double vol = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      const double price = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      const double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
      const double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
      const double swap = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
      double fee = HistoryDealGetDouble(dealTicket, DEAL_FEE);
      const datetime tt = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
      const long reason = HistoryDealGetInteger(dealTicket, DEAL_REASON);
      const ulong orderTk = (ulong)HistoryDealGetInteger(dealTicket, DEAL_ORDER);
      const ulong posId = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      csv += g_schema + "," + CsvEscape(exported) + "," + CsvEscape(InpTerminalId) + "," + loginStr + ",";
      csv += IntegerToString((long)dealTicket) + "," + IntegerToString((long)orderTk) + "," + IntegerToString((long)posId) + ",";
      csv += CsvEscape(sym) + "," + CsvEscape(DealTypeWire(dtype)) + "," + CsvEscape(DealEntryWire(entry)) + ",";
      csv += DoubleToString(vol, 4) + "," + DoubleToString(price, d) + "," + DoubleToString(profit, 2) + ",";
      csv += DoubleToString(commission, 2) + "," + DoubleToString(swap, 2) + "," + DoubleToString(fee, 2) + ",";
      csv += CsvEscape(TimeUtcIso(tt)) + "," + IntegerToString(magic) + "," + CsvEscape(cmt) + ",";
      csv += CsvEscape(DealReasonWire(reason)) + "," + CsvEscape(STRATEGY_EXPORT_ID) + "," + CsvEscape(SOURCE_TAG_BRIDGEEA) + "\n";
     }
   return WriteTextAtomic(g_baseRelPath + "\\deals_history.csv", csv);
  }

//+------------------------------------------------------------------+
bool ExportBridgeErrorsCsv(void)
  {
   const string exported = NowUtcIso();
   const string loginStr = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string csv = "schema_version,exported_at_utc,terminal_id,account_login,error_code,error_message,module,severity,context\n";
   const int n = ArraySize(g_errors);
   for(int i = 0; i < n; i++)
     {
      csv += g_schema + "," + CsvEscape(exported) + "," + CsvEscape(InpTerminalId) + "," + loginStr + ",";
      csv += CsvEscape(g_errors[i].code) + "," + CsvEscape(g_errors[i].message) + ",";
      csv += CsvEscape(g_errors[i].module) + "," + CsvEscape(g_errors[i].severity) + "," + CsvEscape(g_errors[i].context) + "\n";
     }
   return WriteTextAtomic(g_baseRelPath + "\\bridge_errors.csv", csv);
  }

//+------------------------------------------------------------------+
void RunExportPass(void)
  {
   const bool connected = (TerminalInfoInteger(TERMINAL_CONNECTED) != 0);
   string lastTick = "";
   if(InpExportMarketSnapshot)
     {
      if(!ExportMarketSnapshotCsv())
         PushError("BRIDGE_EXPORT_FAIL", "latest_market_snapshot.csv", "RunExportPass", "ERROR", "");
      else
        {
         // refresh last tick from first symbol if possible
         if(g_symCount > 0 && SymbolSelect(g_symbols[0], true))
           {
            datetime tickTime = (datetime)SymbolInfoInteger(g_symbols[0], SYMBOL_TIME);
            if(tickTime > 0)
               lastTick = TimeUtcIso(tickTime);
           }
        }
     }
   if(InpExportAccountSnapshot)
     {
      if(!ExportAccountSnapshotCsv())
         PushError("BRIDGE_EXPORT_FAIL", "account_snapshot.csv", "RunExportPass", "ERROR", "");
     }
   if(InpExportCandles)
     {
      if(!ExportCandlesCsv())
         PushError("BRIDGE_EXPORT_FAIL", "candles.csv", "RunExportPass", "ERROR", "");
     }
   if(InpExportPositions)
     {
      if(!ExportPositionsOpenCsv())
         PushError("BRIDGE_EXPORT_FAIL", "positions_open.csv", "RunExportPass", "ERROR", "");
     }
   if(InpExportOrders)
     {
      if(!ExportOrdersPendingCsv())
         PushError("BRIDGE_EXPORT_FAIL", "orders_pending.csv", "RunExportPass", "ERROR", "");
     }
   if(InpExportDeals)
     {
      if(!ExportDealsHistoryCsv())
         PushError("BRIDGE_EXPORT_FAIL", "deals_history.csv", "RunExportPass", "ERROR", "");
     }
   if(InpExportErrors)
     {
      ExportBridgeErrorsCsv();
     }
   const int errCount = ArraySize(g_errors);
   string lastErr = "";
   if(errCount > 0)
      lastErr = g_errors[errCount - 1].message;
   ExportBridgeStatusJson("RUNNING", connected, errCount, lastErr, lastTick);
  }

//+------------------------------------------------------------------+
int OnInit(void)
  {
   g_schema = Trim(InpSchemaVersion);
   if(!SchemaIsSupported(g_schema))
     {
      Print("Mapazapp_BridgeEA: unsupported InpSchemaVersion=", InpSchemaVersion);
      return INIT_PARAMETERS_INCORRECT;
     }
   if(!ParseSymbols(InpSymbols))
     {
      Print("Mapazapp_BridgeEA: InpSymbols empty");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(!ParseTimeframes(InpTimeframes))
     {
      Print("Mapazapp_BridgeEA: InpTimeframes empty or invalid");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(InpTimerSeconds < 1 || InpTimerSeconds > 3600)
     {
      Print("Mapazapp_BridgeEA: InpTimerSeconds out of range");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(InpCandleBars < 10 || InpCandleBars > 10000)
     {
      Print("Mapazapp_BridgeEA: InpCandleBars out of range");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(InpDealsLookbackDays < 1 || InpDealsLookbackDays > 365)
     {
      Print("Mapazapp_BridgeEA: InpDealsLookbackDays out of range");
      return INIT_PARAMETERS_INCORRECT;
     }
   const string root = SanitizePathSegment(Trim(InpExportRoot));
   const string term = SanitizePathSegment(Trim(InpTerminalId));
   g_baseRelPath = root + "\\" + term;
   if(!FolderCreate(root))
     {
      // may already exist — ignore if exists
     }
   if(!FolderCreate(g_baseRelPath))
     {
      // may already exist
     }
   int symOk = 0;
   for(int si = 0; si < g_symCount; si++)
     {
      if(SymbolSelect(g_symbols[si], true))
         symOk++;
     }
   if(symOk == 0)
     {
      Print("Mapazapp_BridgeEA: no symbols could be selected (check Market Watch names)");
      return INIT_FAILED;
     }
   ArrayResize(g_errors, 0);
   PushError("BRIDGE_EA_START", "Mapazapp_BridgeEA initialized", "OnInit", "INFO", g_baseRelPath);
   RunExportPass();
   EventSetTimer(InpTimerSeconds);
   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   const bool connected = (TerminalInfoInteger(TERMINAL_CONNECTED) != 0);
   const int errCount = ArraySize(g_errors);
   string lastErr = "";
   if(errCount > 0)
      lastErr = g_errors[errCount - 1].message;
   ExportBridgeStatusJson("STOPPED", connected, errCount, lastErr, "");
   if(InpExportErrors)
      ExportBridgeErrorsCsv();
  }

//+------------------------------------------------------------------+
void OnTimer(void)
  {
   RunExportPass();
  }

//+------------------------------------------------------------------+
