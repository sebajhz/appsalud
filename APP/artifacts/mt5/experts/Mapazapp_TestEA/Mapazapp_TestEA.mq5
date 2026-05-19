//+------------------------------------------------------------------+
//| Mapazapp_TestEA.mq5                                              |
//| Mapazapp — E3.6: Official Strategy Tester EA / Backtest role   |
//| Daily Bias V1 + Setup V1 FVG candidate (core geometry);        |
//| CSV/JSON under MQL5/Files/<export>; no broker execution.        |
//+------------------------------------------------------------------+
#property copyright "Mapazapp"
#property link      "https://mapazapp"
#property version   "1.15"
#property description "Strategy Tester only: official TestEA. E5.13 Premium/Discount Context V1 (observation/export; closed candles; no gate); E5.12.2 MSS/CHoCH temporal relevance; E5.12 MSS/CHoCH V1; E5.11 HTF Structure V1; Daily Bias V1 + FVG/Setup V1 + virtual trade simulation; E5.10.6 Liquidity Chain Reaction Audit; E5.10.2 Liquidity Sweep Quality V1; E5.10 Liquidity Sweep V1; E5.8 Entry Quality Score V1 observation-only; E5.5.0.5 short paths + full JSON ids; E5.5.0.3 FileOpen-safe writes (no orders)."
#property strict

input string            InpSchemaVersion           = "backtest_ea_v1";
input string            InpStrategyId              = "MZP_IFVG_ZONE_REACTION_V1";
input string            InpParameterSetId          = "MZP_IFVG_XAUUSD_V1_OUTCOME_OPT_FVG_SWEEP_001";
input string            InpCanonicalSymbol         = "XAUUSD";
input string            InpRunId                   = "TEST_SAFE_EXPORT_SINGLE_C";
input string            InpCampaignId              = "MZP_E5_5_XAUUSD_M15_D1_OUTCOME_V1";
input bool              InpAutoBuildRunIdFromParams = true;
input bool              InpOptimizationSafeExports = true;
input string            InpExportCampaignFolder    = "E55";
input string            InpExportParameterFolder   = "SET001";
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

input bool              InpEntryQualityScoreEnabled      = true;
input bool              InpEntryQualityScoreGateEnabled = false;

input bool              InpEnableLiquiditySweepDetection = true;
input int               InpLiquiditySweepLookbackBars    = 48;
input int               InpLocalSwingLookbackBars      = 20;
input int               InpLiquiditySweepBufferPoints  = 0;
input bool              InpLiquiditySweepScoreEnabled   = true;

input bool              InpEnableHtfStructureV1        = true;
input int               InpHtfStructureSwingLookbackBars = 2;
input int               InpHtfStructureMaxBars           = 300;
input bool              InpHtfStructureScoreEnabled     = true;

input bool              InpEnableMssChochV1           = true;
input int               InpMssChochSwingLookbackBars  = 2;
input int               InpMssChochMaxBars            = 200;
input bool              InpMssChochRequireCloseBreak  = true;
input bool              InpMssChochScoreEnabled       = true;

input bool              InpEnablePremiumDiscountV1        = true;
input int               InpPremiumDiscountSwingLookbackBars = 2;
input int               InpPremiumDiscountMaxBars          = 200;
input int               InpPremiumDiscountEquilibriumBandPct = 10;
input bool              InpPremiumDiscountScoreEnabled    = true;

input bool              InpEnableEntryFillFeasibilityV1   = true;
input int               InpEntryFillFeasibilityMaxBars    = 0;
input int               InpEntryFillFeasibilityNearMissPoints = 30;
input bool              InpEntryFillFeasibilityScoreEnabled = true;

input bool              InpEnableEntryVariantFeasibilityV1 = true;
input bool              InpEntryVariantFeasibilityScoreEnabled = true;

input bool              InpEnableEntryVariantOutcomeSimulationV1 = true;
input bool              InpEntryVariantOutcomeSimulationScoreEnabled = true;

input bool              InpEnableBufferedEvosV1 = true;
input int               InpBufferedEvosBufferA_Points = 0;
input int               InpBufferedEvosBufferB_Points = 5;
input int               InpBufferedEvosBufferC_Points = 10;
input int               InpBufferedEvosBufferD_Points = 20;
input int               InpBufferedEvosBufferE_Points = 30;
input int               InpBufferedEvosBufferF_Points = 50;
input double            InpBufferedEvosMinEffectiveRr = 1.5;
input bool              InpBufferedEvosScoreEnabled = true;

#define TESTEA_BUILD            "MZP_TestEA_E5_13_6_11"
#define BUF_EVOS_VAR_N          4
#define BUF_EVOS_BUF_N          6
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

long            g_eq_grade_a = 0;
long            g_eq_grade_b = 0;
long            g_eq_grade_c = 0;
long            g_eq_grade_rejected = 0;
double          g_eq_sum_entry_quality = 0.0;
double          g_eq_sum_ambiguous_risk = 0.0;
double          g_eq_sum_entry_quality_win = 0.0;
long            g_eq_count_win_scored = 0;
double          g_eq_sum_entry_quality_loss = 0.0;
long            g_eq_count_loss_scored = 0;
double          g_eq_sum_entry_quality_ambiguous = 0.0;
long            g_eq_count_ambiguous_scored = 0;

long            g_liq_detected_count = 0;
long            g_liq_relevant_count = 0;
long            g_liq_opposite_count = 0;
long            g_liq_missing_count = 0;
long            g_liq_pdh_count = 0;
long            g_liq_pdl_count = 0;
long            g_liq_local_high_count = 0;
long            g_liq_local_low_count = 0;
double          g_liq_sum_liquidity_score = 0.0;

long            g_liq_q_grade_a = 0;
long            g_liq_q_grade_b = 0;
long            g_liq_q_grade_c = 0;
long            g_liq_q_grade_weak = 0;
long            g_liq_q_grade_none = 0;
double          g_liq_sum_quality = 0.0;
double          g_liq_sum_recency = 0.0;
double          g_liq_sum_directional = 0.0;
double          g_liq_sum_reaction = 0.0;
double          g_liq_sum_displacement = 0.0;
double          g_liq_sum_distance = 0.0;
double          g_liq_sum_q_win = 0.0;
long            g_liq_cnt_q_win = 0;
double          g_liq_sum_q_loss = 0.0;
long            g_liq_cnt_q_loss = 0;
double          g_liq_sum_q_amb = 0.0;
long            g_liq_cnt_q_amb = 0;
double          g_liq_sum_q_exp = 0.0;
long            g_liq_cnt_q_exp = 0;
long            g_chain_detected_count = 0;
long            g_chain_grade_a = 0;
long            g_chain_grade_b = 0;
long            g_chain_grade_c = 0;
long            g_chain_grade_weak = 0;
long            g_chain_grade_none = 0;
double          g_chain_sum_score = 0.0;
double          g_chain_sum_sweep_to_setup = 0.0;
long            g_chain_reaction_confirmed_count = 0;
long            g_chain_displacement_confirmed_count = 0;
long            g_chain_fvg_after_sweep_count = 0;
long            g_chain_rx_checked_count = 0;
long            g_chain_rx_fail_close_not_back_inside = 0;
long            g_chain_rx_fail_no_candle = 0;
long            g_chain_rx_fail_wrong_level = 0;
long            g_chain_rx_fail_sweep_after_fvg = 0;
long            g_chain_rx_fail_other = 0;

double          g_htf_sum_structure_score = 0.0;
long            g_htf_aligned_count = 0;
long            g_htf_conflict_count = 0;
long            g_htf_h4_bull = 0;
long            g_htf_h4_bear = 0;
long            g_htf_h4_range = 0;
long            g_htf_h4_trans = 0;
long            g_htf_h1_bull = 0;
long            g_htf_h1_bear = 0;
long            g_htf_h1_range = 0;
long            g_htf_h1_trans = 0;

double          g_mss_choch_sum_score = 0.0;
long            g_mss_detected_count = 0;
long            g_mss_bullish_count = 0;
long            g_mss_bearish_count = 0;
long            g_choch_detected_count = 0;
long            g_choch_bullish_count = 0;
long            g_choch_bearish_count = 0;
long            g_wick_break_only_count = 0;
long            g_mss_valid_close_count = 0;
long            g_choch_valid_close_count = 0;
long            g_mss_aligned_with_trade_count = 0;
long            g_mss_against_trade_count = 0;
long            g_choch_aligned_with_trade_count = 0;
long            g_choch_against_trade_count = 0;

double          g_mss_temporal_sum_score = 0.0;
double          g_choch_temporal_sum_score = 0.0;
long            g_mss_after_sweep_count = 0;
long            g_mss_before_entry_count = 0;
long            g_mss_near_entry_window_count = 0;
long            g_mss_too_early_count = 0;
long            g_mss_too_late_count = 0;
long            g_mss_after_fvg_count = 0;
long            g_mss_before_fvg_count = 0;
long            g_choch_after_sweep_count = 0;
long            g_choch_before_entry_count = 0;
long            g_choch_near_entry_window_count = 0;
long            g_choch_too_early_count = 0;
long            g_choch_too_late_count = 0;
long            g_choch_after_fvg_count = 0;
long            g_choch_before_fvg_count = 0;

double          g_pd_sum_score = 0.0;
double          g_pd_sum_position_pct = 0.0;
double          g_pd_sum_range_size_points = 0.0;
long            g_pd_valid_range_count = 0;
long            g_pd_missing_range_count = 0;
long            g_pd_entry_premium_count = 0;
long            g_pd_entry_discount_count = 0;
long            g_pd_entry_equilibrium_count = 0;
long            g_pd_entry_outside_range_count = 0;
long            g_pd_zone_valid_dir_count = 0;
long            g_pd_zone_conflict_count = 0;
long            g_pd_too_deep_count = 0;
long            g_pd_too_shallow_count = 0;

double          g_eff_sum_score = 0.0;
double          g_eff_sum_depth_pct = 0.0;
double          g_eff_sum_max_retrace_pct = 0.0;
double          g_eff_sum_missed_pts = 0.0;
double          g_eff_sum_bars_fill = 0.0;
double          g_eff_sum_bars_max_retrace = 0.0;
long            g_eff_filled_count = 0;
long            g_eff_expired_unfilled_count = 0;
long            g_eff_near_miss_count = 0;
long            g_eff_missed_shallow_count = 0;
long            g_eff_too_deep_count = 0;
long            g_eff_invalidated_count = 0;
long            g_eff_outside_fvg_count = 0;
long            g_eff_geometry_unknown_count = 0;
long            g_eff_fvg_touch_count = 0;
long            g_eff_ce_touch_count = 0;
long            g_eff_entry_touch_count = 0;
long            g_eff_fill_fast_count = 0;
long            g_eff_fill_late_count = 0;

double          g_ev_sum_score = 0.0;
double          g_ev_sum_best_depth_pct = 0.0;
double          g_ev_sum_official_depth_pct = 0.0;
double          g_ev_sum_fill_gap_pct = 0.0;
double          g_ev_sum_edge_miss = 0.0;
double          g_ev_sum_25_miss = 0.0;
double          g_ev_sum_50_miss = 0.0;
double          g_ev_sum_75_miss = 0.0;
long            g_ev_edge_reached_count = 0;
long            g_ev_25_reached_count = 0;
long            g_ev_50_reached_count = 0;
long            g_ev_75_reached_count = 0;
long            g_ev_adaptive_reached_count = 0;
long            g_ev_shallow_would_fill_count = 0;
long            g_ev_deeper_would_not_fill_count = 0;

struct MapzVariantSimSlot
  {
   double            entry_price;
   double            sl_price;
   double            tp_price;
   double            risk_points;
   double            effective_rr;
   bool              strict_official_parity;
   bool              reached;
   bool              sim_open;
   int               bars_to_fill;
   int               bars_since_fill;
   string            status;
   double            result_r;
   bool              ambiguous_flag;
   bool              invalid_risk;
   bool              finalized;
  };

struct MapzEntryVariantOutcomeSimSnap
  {
   bool              log_enabled;
   bool              finalized;
   int               bars_observed;
   string            reasons;
   MapzVariantSimSlot edge;
   MapzVariantSimSlot p25;
   MapzVariantSimSlot p50;
   MapzVariantSimSlot p75;
   MapzVariantSimSlot adaptive;
   string            best_sim_variant;
   double            best_sim_result_r;
   string            best_sim_status;
   string            best_sim_reasons;
   int               score;
   string            grade;
  };

struct MapzEvosRollup
  {
   long              filled_count;
   long              win_count;
   long              loss_count;
   long              ambiguous_count;
   long              not_filled_count;
   long              invalid_risk_count;
   double            total_r;
   long              risk_samples;
   double            sum_risk_pts;
  };

MapzEvosRollup    g_evos_edge_sum;
MapzEvosRollup    g_evos_25_sum;
MapzEvosRollup    g_evos_50_sum;
MapzEvosRollup    g_evos_75_sum;
MapzEvosRollup    g_evos_adaptive_sum;
string            g_evos_best_expectancy_variant = "";
double            g_evos_best_expectancy_r = -1e12;
string            g_evos_best_total_r_variant = "";
double            g_evos_best_total_r = -1e12;
string            g_evos_lowest_ambiguous_variant = "";
long              g_evos_lowest_ambiguous_count = 999999999;
string            g_evos_highest_fill_variant = "";
long              g_evos_highest_fill_count = -1;

struct MapzBufferedEvosCell
  {
   bool              armed;
   bool              invalid_risk;
   bool              reached;
   bool              sim_open;
   bool              finalized;
   int               bars_to_fill;
   int               bars_since_fill;
   double            buffered_entry;
   double            sl_price;
   double            tp_price;
   double            risk_points;
   double            reward_points;
   double            effective_rr;
   bool              fragile;
   string            status;
   double            result_r;
   bool              ambiguous_flag;
  };

struct MapzBufferedEvosRollup
  {
   long              filled_count;
   long              win_count;
   long              loss_count;
   long              ambiguous_count;
   long              unresolved_count;
   long              not_filled_count;
   long              invalid_risk_count;
   long              fragile_count;
   long              fast_fill_close_count;
   long              wins_failing_min_rr_count;
   double            total_r;
   long              risk_samples;
   double            sum_risk_pts;
   long              reward_samples;
   double            sum_reward_pts;
   long              eff_rr_samples;
   double            sum_eff_rr;
  };

MapzBufferedEvosCell    g_buf_evos_cells[BUF_EVOS_VAR_N][BUF_EVOS_BUF_N];
MapzBufferedEvosRollup  g_buf_evos_rollups[BUF_EVOS_VAR_N][BUF_EVOS_BUF_N];
string                  g_buf_evos_best_expectancy_variant[BUF_EVOS_BUF_N];
double                  g_buf_evos_best_expectancy_r[BUF_EVOS_BUF_N];

struct MapzHtfTradeSnap
  {
   bool              enabled;
   string            h4_structure_state;
   string            h1_structure_state;
   string            h4_structure_direction;
   string            h1_structure_direction;
   bool              htf_structure_aligned;
   bool              htf_structure_conflict;
   int               htf_structure_score;
   double            h4_protected_high;
   double            h4_protected_low;
   double            h1_protected_high;
   double            h1_protected_low;
   double            h4_external_liquidity_high;
   double            h4_external_liquidity_low;
   double            h1_external_liquidity_high;
   double            h1_external_liquidity_low;
   string            htf_structure_reasons;
  };

struct MapzMssChochTradeSnap
  {
   bool              enabled;
   bool              mss_detected;
   string            mss_direction;
   double            mss_break_level;
   double            mss_close_price;
   int               mss_bars_after_sweep;
   int               mss_bars_before_entry;
   bool              mss_valid_close;
   bool              choch_detected;
   string            choch_direction;
   double            choch_break_level;
   double            choch_close_price;
   bool              choch_valid_close;
   bool              wick_break_only;
   double            internal_swing_high;
   double            internal_swing_low;
   int               internal_swing_high_age_bars;
   int               internal_swing_low_age_bars;
   int               mss_choch_score;
   string            mss_choch_reasons;
   int               ctx_setup_bar_shift;
   int               mss_break_bar_shift;
   int               choch_break_bar_shift;
   int               mss_temporal_relevance_score;
   string            mss_temporal_relevance_grade;
   bool              mss_after_sweep;
   bool              mss_before_entry;
   bool              mss_near_entry_window;
   bool              mss_too_early;
   bool              mss_too_late;
   bool              mss_after_fvg;
   bool              mss_before_fvg;
   int               mss_sweep_to_mss_bars;
   int               mss_fvg_to_mss_bars;
   int               mss_mss_to_entry_bars;
   string            mss_temporal_relevance_reasons;
   int               choch_temporal_relevance_score;
   string            choch_temporal_relevance_grade;
   bool              choch_after_sweep;
   bool              choch_before_entry;
   bool              choch_near_entry_window;
   bool              choch_too_early;
   bool              choch_too_late;
   bool              choch_after_fvg;
   bool              choch_before_fvg;
   int               choch_sweep_to_choch_bars;
   int               choch_fvg_to_choch_bars;
   int               choch_choch_to_entry_bars;
   string            choch_temporal_relevance_reasons;
  };

struct MapzPremiumDiscountTradeSnap
  {
   bool              log_enabled;
   string            range_source;
   double            range_high;
   double            range_low;
   double            midpoint;
   double            position_pct;
   string            entry_zone;
   bool              in_premium;
   bool              in_discount;
   bool              in_equilibrium;
   bool              outside_range;
   bool              zone_valid_for_direction;
   bool              zone_conflict;
   bool              entry_too_deep;
   bool              entry_too_shallow;
   double            range_size_points;
   double            distance_mid_points;
   int               score;
   string            grade;
   string            reasons;
   bool              range_geometry_ok;
  };

struct MapzEntryFillFeasibilitySnap
  {
   bool              log_enabled;
   double            entry_price_for_fill_audit;
   double            fvg_near_edge_price;
   double            fvg_far_edge_price;
   double            fvg_ce_price;
   double            entry_depth_in_fvg_pct;
   double            entry_distance_from_near_edge_points;
   double            entry_distance_from_far_edge_points;
   double            entry_distance_from_ce_points;
   bool              entry_outside_fvg;
   bool              entry_geometry_unknown;
   bool              fvg_touch_reached;
   bool              fvg_ce_touch_reached;
   bool              entry_price_reached;
   double            max_retrace_into_fvg_pct;
   double            max_retrace_price;
   double            max_retrace_to_entry_distance_points;
   double            missed_entry_by_points;
   int               bars_to_fvg_touch;
   int               bars_to_ce_touch;
   int               bars_to_entry_fill;
   int               bars_to_max_retrace;
   int               bars_until_expiration_or_resolution;
   int               bars_observed;
   double            extreme_retrace_price;
   bool              finalized;
   string            fill_status;
   int               score;
   string            grade;
   string            reasons;
   bool              entry_expired_unfilled;
   bool              entry_missed_shallow_retrace;
   bool              entry_too_deep_for_retest;
   bool              entry_near_miss;
   bool              entry_filled_fast;
   bool              entry_filled_late;
   bool              entry_invalidated_before_fill;
  };

struct MapzEntryVariantFeasibilitySnap
  {
   bool              log_enabled;
   bool              geometry_unknown;
   double            edge_price;
   double            p25_price;
   double            p50_price;
   double            p75_price;
   double            adaptive_price;
   string            adaptive_type;
   bool              edge_reached;
   bool              p25_reached;
   bool              p50_reached;
   bool              p75_reached;
   bool              adaptive_reached;
   double            edge_missed_pts;
   double            p25_missed_pts;
   double            p50_missed_pts;
   double            p75_missed_pts;
   double            adaptive_missed_pts;
   int               edge_bars_to_touch;
   int               p25_bars_to_touch;
   int               p50_bars_to_touch;
   int               p75_bars_to_touch;
   int               adaptive_bars_to_touch;
   string            best_reached;
   double            best_reached_depth_pct;
   double            official_depth_pct;
   double            fill_gap_pct;
   bool              shallow_would_fill;
   bool              deeper_would_not_fill;
   int               score;
   string            grade;
   string            reasons;
   bool              finalized;
   int               bars_observed;
  };

struct MapzLiquiditySnapshot
  {
   bool     detected;
   string   ev_type;
   string   direction;
   int      age_bars;
   double   level;
   double   sweep_price;
   long     distance_pts;
   string   reasons;
   int      sweep_bar_shift;
   int      quality_score;
   string   quality_grade;
   int      recency_score;
   int      directional_score;
   int      reaction_score;
   int      displacement_score;
   int      distance_score;
   string   quality_reasons;
   bool     chain_detected;
   string   chain_grade;
   int      chain_score;
   int      chain_sweep_to_setup_bars;
   int      chain_sweep_to_fvg_bars;
   bool     chain_reaction_confirmed;
   bool     chain_displacement_confirmed;
   bool     chain_fvg_created_after_sweep;
   long     chain_distance_to_fvg_points;
   string   chain_reasons;
   string   chain_reaction_failure_reason;
   double   chain_reaction_close_price;
   double   chain_reaction_level;
   int      chain_reaction_bars_checked;
  };

struct MapzEqScorePack
  {
   int               entry_quality_score;
   string            entry_quality_grade;
   int               htf_narrative_score;
   int               liquidity_event_score;
   int               displacement_fvg_quality_score;
   int               entry_confirmation_score;
   int               target_quality_score;
   int               session_news_spread_score;
   int               risk_overtrading_score;
   int               ambiguous_risk_score;
   string            quality_reasons;
   string            missing_quality_components;
   string            ambiguous_risk_reasons;
   string            liquidity_event_type;
   string            session_bucket;
   string            trade_window_status;
   string            spread_status;
   string            news_mode;
  };

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
   MapzLiquiditySnapshot liq;
   MapzHtfTradeSnap     htf;
   MapzMssChochTradeSnap msc;
   MapzPremiumDiscountTradeSnap pd;
   MapzEntryFillFeasibilitySnap eff;
   MapzEntryVariantFeasibilitySnap ev;
   MapzEntryVariantOutcomeSimSnap evos;
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
   string ps = SanitizeToken(Trim(InpExportParameterFolder));
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

   string campFull = SanitizeToken(Trim(InpCampaignId));
   if(StringLen(campFull) == 0)
      campFull = "MZP_CAMPAIGN_DEFAULT";
   g_campaignIdForSummary = campFull;

   string phyCamp = SanitizeToken(Trim(InpExportCampaignFolder));
   if(StringLen(phyCamp) == 0)
      phyCamp = "EXP_CAMP";
   g_campaignIdEffective = phyCamp;

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

   string combined = phyCamp + "__" + leaf;
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
bool WriteTextDirect(const string relativePathRaw, const string body)
  {
   const string relativePath = NormalizeExportRelPath(relativePathRaw);
   ResetLastError();
   const int fh = FileOpen(relativePath,
                           FILE_WRITE | FILE_TXT | FILE_ANSI | FILE_SHARE_READ);
   if(fh == INVALID_HANDLE)
     {
      const int err = GetLastError();
      PrintFormat("Mapazapp_TestEA export error: direct FileOpen failed for %s, err=%d", relativePath, err);
      return false;
     }
   if(FileWriteString(fh, body) <= 0)
     {
      const int err = GetLastError();
      PrintFormat("Mapazapp_TestEA export error: direct FileWriteString failed for %s, err=%d", relativePath, err);
      FileClose(fh);
      return false;
     }
   FileFlush(fh);
   FileClose(fh);
   PrintFormat("Mapazapp_TestEA export warning: direct write succeeded after atomic fallback for %s", relativePath);
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

   if(FileIsExist(tmp, 0))
     {
      ResetLastError();
      FileDelete(tmp, 0);
     }

   ResetLastError();
   int fh = FileOpen(tmp,
                     FILE_WRITE | FILE_TXT | FILE_ANSI | FILE_SHARE_READ);
   if(fh == INVALID_HANDLE)
     {
      const int err = GetLastError();
      PrintFormat("Mapazapp_TestEA export error: FileOpen failed for %s, err=%d", tmp, err);
      PrintFormat("Mapazapp_TestEA export warning: atomic write failed, attempting direct write for %s", relativePath);
      if(!WriteTextDirect(relativePathRaw, body))
        {
         g_exportWriteFailCount++;
         return false;
        }
      return true;
     }

   if(FileWriteString(fh, body) <= 0)
     {
      const int err = GetLastError();
      PrintFormat("Mapazapp_TestEA export error: FileWriteString failed for %s, err=%d", tmp, err);
      FileClose(fh);
      ResetLastError();
      FileDelete(tmp, 0);
      PrintFormat("Mapazapp_TestEA export warning: atomic write failed, attempting direct write for %s", relativePath);
      if(!WriteTextDirect(relativePathRaw, body))
        {
         g_exportWriteFailCount++;
         return false;
        }
      return true;
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
   if(FileMove(tmp, 0, relativePath, FILE_REWRITE))
      return true;

   const int errMove = GetLastError();
   PrintFormat("Mapazapp_TestEA export error: FileMove failed for %s -> %s, err=%d", tmp, relativePath, errMove);

   if(FileIsExist(tmp, 0))
     {
      ResetLastError();
      FileDelete(tmp, 0);
     }

   PrintFormat("Mapazapp_TestEA export warning: atomic write failed, attempting direct write for %s", relativePath);
   if(!WriteTextDirect(relativePathRaw, body))
     {
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
string MapzEqGradeFromTotal(const int total)
  {
   if(total >= 80)
      return "A";
   if(total >= 65)
      return "B";
   if(total >= 50)
      return "C";
   return "Rejected";
  }

//+------------------------------------------------------------------+
void MapzEqRegisterGradeBucket(const string grade)
  {
   if(grade == "off")
      return;
   if(grade == "A")
      g_eq_grade_a++;
   else if(grade == "B")
      g_eq_grade_b++;
   else if(grade == "C")
      g_eq_grade_c++;
   else if(grade == "Rejected")
      g_eq_grade_rejected++;
  }

//+------------------------------------------------------------------+
void MapzLiquiditySnapshotClear(MapzLiquiditySnapshot &o)
  {
   o.detected = false;
   o.ev_type = "none";
   o.direction = "neutral";
   o.age_bars = 0;
   o.level = 0.0;
   o.sweep_price = 0.0;
   o.distance_pts = 0;
   o.reasons = "";
   o.sweep_bar_shift = -1;
   o.quality_score = 0;
   o.quality_grade = "None";
   o.recency_score = 0;
   o.directional_score = 0;
   o.reaction_score = 0;
   o.displacement_score = 0;
   o.distance_score = 0;
   o.quality_reasons = "";
   o.chain_detected = false;
   o.chain_grade = "None";
   o.chain_score = 0;
   o.chain_sweep_to_setup_bars = 0;
   o.chain_sweep_to_fvg_bars = 0;
   o.chain_reaction_confirmed = false;
   o.chain_displacement_confirmed = false;
   o.chain_fvg_created_after_sweep = false;
   o.chain_distance_to_fvg_points = 0;
   o.chain_reasons = "";
   o.chain_reaction_failure_reason = "";
   o.chain_reaction_close_price = 0.0;
   o.chain_reaction_level = 0.0;
   o.chain_reaction_bars_checked = 0;
  }

//+------------------------------------------------------------------+
void MapzLiquiditySnapshotCopy(MapzLiquiditySnapshot &dst, const MapzLiquiditySnapshot &src)
  {
   dst.detected = src.detected;
   dst.ev_type = src.ev_type;
   dst.direction = src.direction;
   dst.age_bars = src.age_bars;
   dst.level = src.level;
   dst.sweep_price = src.sweep_price;
   dst.distance_pts = src.distance_pts;
   dst.reasons = src.reasons;
   dst.sweep_bar_shift = src.sweep_bar_shift;
   dst.quality_score = src.quality_score;
   dst.quality_grade = src.quality_grade;
   dst.recency_score = src.recency_score;
   dst.directional_score = src.directional_score;
   dst.reaction_score = src.reaction_score;
   dst.displacement_score = src.displacement_score;
   dst.distance_score = src.distance_score;
   dst.quality_reasons = src.quality_reasons;
   dst.chain_detected = src.chain_detected;
   dst.chain_grade = src.chain_grade;
   dst.chain_score = src.chain_score;
   dst.chain_sweep_to_setup_bars = src.chain_sweep_to_setup_bars;
   dst.chain_sweep_to_fvg_bars = src.chain_sweep_to_fvg_bars;
   dst.chain_reaction_confirmed = src.chain_reaction_confirmed;
   dst.chain_displacement_confirmed = src.chain_displacement_confirmed;
   dst.chain_fvg_created_after_sweep = src.chain_fvg_created_after_sweep;
   dst.chain_distance_to_fvg_points = src.chain_distance_to_fvg_points;
   dst.chain_reasons = src.chain_reasons;
   dst.chain_reaction_failure_reason = src.chain_reaction_failure_reason;
   dst.chain_reaction_close_price = src.chain_reaction_close_price;
   dst.chain_reaction_level = src.chain_reaction_level;
   dst.chain_reaction_bars_checked = src.chain_reaction_bars_checked;
  }

//+------------------------------------------------------------------+
void MapzLiqAppendQualityReason(string &rsn, const string tok)
  {
   if(StringLen(tok) == 0)
      return;
   if(StringLen(rsn) > 0)
      rsn += "|";
   rsn += tok;
  }

//+------------------------------------------------------------------+
string MapzLiqGradeFromQuality(const int q)
  {
   if(q >= 17)
      return "A";
   if(q >= 13)
      return "B";
   if(q >= 8)
      return "C";
   if(q >= 1)
      return "Weak";
   return "None";
  }

//+------------------------------------------------------------------+
//| Liquidity Sweep Quality V1 (E5.10.2): closed-candle heuristics.   |
//| E5.10.2.1: stricter caps for A/B; reasons — weak token only on   |
//| grade Weak; subconditions are specific tokens (no duplicate weak).|
//+------------------------------------------------------------------+
void MapzLiqDistributeQualityParts(const int targetTotal,
                                   const int pRec,
                                   const int pDir,
                                   const int pReact,
                                   const int pDisp,
                                   const int pDist,
                                   int &oRec,
                                   int &oDir,
                                   int &oReact,
                                   int &oDisp,
                                   int &oDist)
  {
   oRec = oDir = oReact = oDisp = oDist = 0;
   const int raw = pRec + pDir + pReact + pDisp + pDist;
   if(targetTotal <= 0 || raw <= 0)
      return;

   oRec = (int)MathFloor((double)pRec * (double)targetTotal / (double)raw + 1e-9);
   oDir = (int)MathFloor((double)pDir * (double)targetTotal / (double)raw + 1e-9);
   oReact = (int)MathFloor((double)pReact * (double)targetTotal / (double)raw + 1e-9);
   oDisp = (int)MathFloor((double)pDisp * (double)targetTotal / (double)raw + 1e-9);
   oDist = (int)MathFloor((double)pDist * (double)targetTotal / (double)raw + 1e-9);

   int s = oRec + oDir + oReact + oDisp + oDist;
   int rem = targetTotal - s;
   while(rem > 0)
     {
      int bestDim = -1;
      double bestFrac = -1.0;
      for(int dim = 0; dim < 5; dim++)
        {
         int pi = pRec;
         int cur = oRec;
         if(dim == 1)
           {
            pi = pDir;
            cur = oDir;
           }
         else if(dim == 2)
           {
            pi = pReact;
            cur = oReact;
           }
         else if(dim == 3)
           {
            pi = pDisp;
            cur = oDisp;
           }
         else if(dim == 4)
           {
            pi = pDist;
            cur = oDist;
           }
         if(pi <= 0)
            continue;
         const double want = (double)pi * (double)targetTotal / (double)raw;
         const double frac = want - (double)cur;
         if(frac > bestFrac + 1e-12)
           {
            bestFrac = frac;
            bestDim = dim;
           }
        }
      if(bestDim < 0)
         break;
      if(bestDim == 0)
         oRec++;
      else if(bestDim == 1)
         oDir++;
      else if(bestDim == 2)
         oReact++;
      else if(bestDim == 3)
         oDisp++;
      else
         oDist++;
      rem--;
     }
   while(rem < 0)
     {
      if(oDist > 0 && pDist > 0)
        {
         oDist--;
         rem++;
        }
      else if(oDisp > 0 && pDisp > 0)
        {
         oDisp--;
         rem++;
        }
      else if(oReact > 0 && pReact > 0)
        {
         oReact--;
         rem++;
        }
      else if(oDir > 0 && pDir > 0)
        {
         oDir--;
         rem++;
        }
      else if(oRec > 0 && pRec > 0)
        {
         oRec--;
         rem++;
        }
      else
         break;
     }
  }

//+------------------------------------------------------------------+
//| E5.10.6: closed-candle reaction window — first 3 bars after sweep.|
//| Bull low sweep: close > level OR close back into pre-sweep bar    |
//| range (bar j+1). Bear high sweep: close < level OR same range.    |
//+------------------------------------------------------------------+
bool MapzLiquidityClosedReactionWindowOk(const string sym,
                                         const ENUM_TIMEFRAMES tf,
                                         const int j,
                                         const ENUM_MAPZ_SETUP_DIR setupDir,
                                         const string ev_type,
                                         const double level,
                                         double &outClosePx,
                                         int &outBarsChecked)
  {
   outClosePx = 0.0;
   outBarsChecked = 0;
   const double pt = SymbolInfoDouble(sym, SYMBOL_POINT);
   if(pt <= 0.0 || j < 2)
      return false;

   const bool wantLong = (setupDir == MAPZ_SETUP_LONG);
   const bool wantShort = (setupDir == MAPZ_SETUP_SHORT);
   const bool pairLow = (ev_type == "PDL_SWEEP" || ev_type == "LOCAL_SWING_LOW_SWEEP");
   const bool pairHigh = (ev_type == "PDH_SWEEP" || ev_type == "LOCAL_SWING_HIGH_SWEEP");
   if(!(wantLong && pairLow) && !(wantShort && pairHigh))
      return false;

   const int barsTot = Bars(sym, tf);
   const bool havePre = (j + 1 < barsTot);
   double preLo = 0.0;
   double preHi = 0.0;
   if(havePre)
     {
      preLo = iLow(sym, tf, j + 1);
      preHi = iHigh(sym, tf, j + 1);
     }

   const double eps = 2.0 * pt;
   for(int idx = 1; idx <= 3; idx++)
     {
      const int k = j - idx;
      if(k < 1)
         break;
      outBarsChecked++;
      const double cls = iClose(sym, tf, k);
      bool okBar = false;
      if(wantLong && pairLow)
        {
         const bool above = (cls > level + eps);
         bool inPre = false;
         if(havePre)
            inPre = (cls >= preLo - eps && cls <= preHi + eps);
         okBar = (above || inPre);
        }
      else if(wantShort && pairHigh)
        {
         const bool below = (cls < level - eps);
         bool inPre = false;
         if(havePre)
            inPre = (cls >= preLo - eps && cls <= preHi + eps);
         okBar = (below || inPre);
        }
      if(okBar)
        {
         outClosePx = cls;
         return true;
        }
     }
   return false;
  }

//+------------------------------------------------------------------+
//| E5.10.6: audit counters + per-trade reaction diagnostics (obs).   |
//+------------------------------------------------------------------+
void MapzLiquidityReactionAudit(const string sym,
                                const ENUM_TIMEFRAMES tf,
                                const int S,
                                const ENUM_MAPZ_SETUP_DIR setupDir,
                                MapzLiquiditySnapshot &io)
  {
   io.chain_reaction_confirmed = false;
   io.chain_reaction_failure_reason = "liquidity_chain_reaction_not_applicable";
   io.chain_reaction_close_price = 0.0;
   io.chain_reaction_level = io.level;
   io.chain_reaction_bars_checked = 0;

   if(!InpEnableLiquiditySweepDetection)
      return;

   const bool opp = (StringFind(io.direction, "opposite") >= 0);
   const bool wantLong = (setupDir == MAPZ_SETUP_LONG);
   const bool wantShort = (setupDir == MAPZ_SETUP_SHORT);
   const bool pairLow = (io.ev_type == "PDL_SWEEP" || io.ev_type == "LOCAL_SWING_LOW_SWEEP");
   const bool pairHigh = (io.ev_type == "PDH_SWEEP" || io.ev_type == "LOCAL_SWING_HIGH_SWEEP");

   if(opp || (!wantLong && !wantShort) || (wantLong && !pairLow) || (wantShort && !pairHigh))
     {
      io.chain_reaction_failure_reason = "liquidity_chain_reaction_fail_wrong_level";
      g_chain_rx_fail_wrong_level++;
      return;
     }

   if(S < 1 || io.sweep_bar_shift < 0)
     {
      io.chain_reaction_failure_reason = "liquidity_chain_reaction_fail_other";
      g_chain_rx_fail_other++;
      return;
     }

   const int j = io.sweep_bar_shift;

   if(j <= S)
     {
      io.chain_reaction_failure_reason = "liquidity_chain_reaction_fail_sweep_after_fvg";
      g_chain_rx_fail_sweep_after_fvg++;
      return;
     }

   if(j < 2)
     {
      io.chain_reaction_failure_reason = "liquidity_chain_reaction_fail_no_candle_after_sweep";
      g_chain_rx_fail_no_candle++;
      return;
     }

   g_chain_rx_checked_count++;

   double clsPx = 0.0;
   int nBars = 0;
   const bool ok = MapzLiquidityClosedReactionWindowOk(sym, tf, j, setupDir, io.ev_type, io.level, clsPx, nBars);
   io.chain_reaction_close_price = clsPx;
   io.chain_reaction_bars_checked = nBars;

   if(ok)
     {
      io.chain_reaction_confirmed = true;
      io.chain_reaction_failure_reason = "liquidity_chain_reaction_ok";
      return;
     }

   io.chain_reaction_failure_reason = "liquidity_chain_reaction_fail_close_not_back_inside";
   g_chain_rx_fail_close_not_back_inside++;
  }

//+------------------------------------------------------------------+
void MapzLiquidityFinalizeQuality(const string sym,
                                  const ENUM_TIMEFRAMES tf,
                                  const int S,
                                  const ENUM_MAPZ_SETUP_DIR setupDir,
                                  const double fvgLoIn,
                                  const double fvgHiIn,
                                  const int lbSweep,
                                  MapzLiquiditySnapshot &io)
  {
   io.quality_score = 0;
   io.quality_grade = "None";
   io.recency_score = 0;
   io.directional_score = 0;
   io.reaction_score = 0;
   io.displacement_score = 0;
   io.distance_score = 0;
   io.quality_reasons = "";

   const double fLo = MathMin(fvgLoIn, fvgHiIn);
   const double fHi = MathMax(fvgLoIn, fvgHiIn);
   const double pt = SymbolInfoDouble(sym, SYMBOL_POINT);
   if(pt <= 0.0)
     {
      MapzLiqAppendQualityReason(io.quality_reasons, "liquidity_quality_point_invalid");
      return;
     }

   if(!io.detected || io.ev_type == "none")
     {
      MapzLiqAppendQualityReason(io.quality_reasons, "liquidity_sweep_quality_none");
      return;
     }

   bool flag_old = false;
   bool flag_opp = false;
   bool flag_partial_dir = false;
   bool flag_no_rx = false;
   bool flag_disp_unc = false;
   bool flag_far = false;

   const int age = io.age_bars;
   int rec = 1;
   if(age <= 4)
      rec = 4;
   else if(age <= 12)
      rec = 3;
   else if(age <= lbSweep)
      rec = 2;
   else
     {
      rec = 1;
      flag_old = true;
     }

   const bool wantLong = (setupDir == MAPZ_SETUP_LONG);
   const bool wantShort = (setupDir == MAPZ_SETUP_SHORT);
   const bool opp = (StringFind(io.direction, "opposite") >= 0);
   int dirS = 0;
   if(opp)
     {
      dirS = 0;
      flag_opp = true;
     }
   else if(wantLong && io.ev_type == "PDL_SWEEP")
      dirS = 5;
   else if(wantShort && io.ev_type == "PDH_SWEEP")
      dirS = 5;
   else if(wantLong && io.ev_type == "LOCAL_SWING_LOW_SWEEP")
      dirS = 4;
   else if(wantShort && io.ev_type == "LOCAL_SWING_HIGH_SWEEP")
      dirS = 4;
   else
     {
      dirS = 2;
      flag_partial_dir = true;
     }

   int react = 0;
   if(opp)
     {
      react = 0;
     }
   else if(io.sweep_bar_shift < 0 || S < 1)
     {
      react = 0;
      flag_no_rx = true;
     }
   else
     {
      const int j = io.sweep_bar_shift;
      double rxCls = 0.0;
      int rxBars = 0;
      bool okReact = false;
      if(j > S && j >= 2)
         okReact = MapzLiquidityClosedReactionWindowOk(sym, tf, j, setupDir, io.ev_type, io.level, rxCls, rxBars);
      else
         flag_no_rx = true;

      if(okReact)
         react = 5;
      else
        {
         react = 0;
         flag_no_rx = true;
        }
     }

   int disp = 0;
   if(opp)
     {
      disp = 0;
     }
   else if(io.sweep_bar_shift >= 0 && S >= 1)
     {
      const int j = io.sweep_bar_shift;
      const int kMin = S + 1;
      const int kMax = j - 1;
      bool strongDisp = false;
      bool weakDisp = false;
      if(kMax >= kMin)
        {
         if(wantLong)
           {
            for(int k = kMax; k >= kMin; k--)
              {
               if(k >= 3)
                 {
                  const double aHi = iHigh(sym, tf, k + 2);
                  const double cLo = iLow(sym, tf, k);
                  if(cLo > aHi + pt)
                    {
                     strongDisp = true;
                     break;
                    }
                 }
               const double o = iOpen(sym, tf, k), c = iClose(sym, tf, k);
               const int body = (int)MathRound(MathAbs(c - o) / pt);
               if(c > o && body >= 6)
                 {
                  strongDisp = true;
                  break;
                 }
               if(c > o && body >= 3)
                  weakDisp = true;
              }
           }
         else if(wantShort)
           {
            for(int k = kMax; k >= kMin; k--)
              {
               if(k >= 3)
                 {
                  const double cHi = iHigh(sym, tf, k);
                  const double aLo = iLow(sym, tf, k + 2);
                  if(cHi < aLo - pt)
                    {
                     strongDisp = true;
                     break;
                    }
                 }
               const double o = iOpen(sym, tf, k), c = iClose(sym, tf, k);
               const int body = (int)MathRound(MathAbs(c - o) / pt);
               if(c < o && body >= 6)
                 {
                  strongDisp = true;
                  break;
                 }
               if(c < o && body >= 3)
                  weakDisp = true;
              }
           }
        }

      if(strongDisp)
         disp = 4;
      else if(weakDisp)
         disp = 2;
      else
        {
         disp = 0;
         flag_disp_unc = true;
        }
     }
   else
     {
      disp = 0;
      flag_disp_unc = true;
     }

   int distQ = 0;
   const double mid = (fLo + fHi) / 2.0;
   const long dLvl = (long)MathRound(MathAbs(io.level - mid) / pt);
   const long penetration = io.distance_pts;
   if(dLvl <= 25)
      distQ = 2;
   else if(dLvl <= 90)
      distQ = 1;
   else
     {
      distQ = 0;
      flag_far = true;
     }
   if(penetration > 140 && distQ > 0)
      distQ--;
   if(distQ < 0)
      distQ = 0;

   int total = rec + dirS + react + disp + distQ;
   if(total > 20)
      total = 20;

   if(opp)
     {
      total = (int)MathMin(total, 7);
     }
   else
     {
      const bool solid_rx = (react >= 4);
      const bool solid_disp = (disp >= 2);
      const bool ok_prox = (distQ >= 1);
      const bool ok_dir = (dirS >= 4);

      if(!solid_rx && !solid_disp)
         total = (int)MathMin(total, 8);
      else if(!solid_rx || !solid_disp)
         total = (int)MathMin(total, 12);

      if(!ok_prox)
         total = (int)MathMin(total, 10);

      if(!ok_dir)
         total = (int)MathMin(total, 13);

      const bool canA = solid_rx && solid_disp && ok_prox && ok_dir && (rec >= 4);
      if(!canA)
         total = (int)MathMin(total, 16);

      if(total > 20)
         total = 20;
     }

   int oRec = 0, oDir = 0, oReact = 0, oDisp = 0, oDist = 0;
   MapzLiqDistributeQualityParts(total, rec, dirS, react, disp, distQ, oRec, oDir, oReact, oDisp, oDist);
   io.recency_score = oRec;
   io.directional_score = oDir;
   io.reaction_score = oReact;
   io.displacement_score = oDisp;
   io.distance_score = oDist;
   io.quality_score = total;
   io.quality_grade = MapzLiqGradeFromQuality(total);

   if(flag_old)
      MapzLiqAppendQualityReason(io.quality_reasons, "liquidity_sweep_old");
   if(flag_opp)
      MapzLiqAppendQualityReason(io.quality_reasons, "opposite_liquidity_sweep");
   if(flag_partial_dir)
      MapzLiqAppendQualityReason(io.quality_reasons, "liquidity_directional_partial");
   if(flag_no_rx)
      MapzLiqAppendQualityReason(io.quality_reasons, "liquidity_sweep_no_reaction");
   if(flag_disp_unc)
      MapzLiqAppendQualityReason(io.quality_reasons, "liquidity_sweep_displacement_not_confirmed");
   if(flag_far)
      MapzLiqAppendQualityReason(io.quality_reasons, "liquidity_level_far_from_fvg");

   const string gr = io.quality_grade;
   if(gr == "Weak" && total >= 1)
      MapzLiqAppendQualityReason(io.quality_reasons, "liquidity_sweep_quality_weak");
   else if(gr == "A" || gr == "B")
      MapzLiqAppendQualityReason(io.quality_reasons, "liquidity_sweep_quality_ok");
   else if(gr == "C" && total >= 12)
      MapzLiqAppendQualityReason(io.quality_reasons, "liquidity_sweep_quality_ok");
  }

//+------------------------------------------------------------------+
//| E5.10.4: selection priority — causal proximity + reaction bonus. |
//+------------------------------------------------------------------+
int MapzLiquidityComputeSelectPri(const string sym,
                                  const ENUM_TIMEFRAMES tf,
                                  const int S,
                                  const ENUM_MAPZ_SETUP_DIR setupDir,
                                  const double fvgLoIn,
                                  const double fvgHiIn,
                                  const int sweep_shift,
                                  const int age,
                                  const string dirW,
                                  const double level,
                                  const string ev_type)
  {
   const bool opp = (StringFind(dirW, "opposite") >= 0);
   if(opp)
      return 30 - age;

   const double pt = SymbolInfoDouble(sym, SYMBOL_POINT);
   if(pt <= 0.0)
      return 120 - age;

   const double fLo = MathMin(fvgLoIn, fvgHiIn);
   const double fHi = MathMax(fvgLoIn, fvgHiIn);
   const double mid = (fLo + fHi) / 2.0;
   const long dLvl = (long)MathRound(MathAbs(level - mid) / pt);

   int pri = 420 - age;
   if(dLvl <= 25)
      pri += 220;
   else if(dLvl <= 60)
      pri += 130;
   else if(dLvl <= 90)
      pri += 55;
   else
      pri -= 140;

   const int j = sweep_shift;
   bool okReact = false;
   double rxCls = 0.0;
   int rxBars = 0;
   if(j > S && j >= 2)
      okReact = MapzLiquidityClosedReactionWindowOk(sym, tf, j, setupDir, ev_type, level, rxCls, rxBars);
   if(okReact)
      pri += 110;

   return pri;
  }

//+------------------------------------------------------------------+
//| E5.10.4: Causal Liquidity Chain V1 — sweep→rx→disp→FVG (obs).   |
//+------------------------------------------------------------------+
void MapzLiquidityFinalizeChain(const string sym,
                                const ENUM_TIMEFRAMES tf,
                                const int S,
                                const ENUM_MAPZ_SETUP_DIR setupDir,
                                const double fvgLoIn,
                                const double fvgHiIn,
                                MapzLiquiditySnapshot &io)
  {
   io.chain_detected = false;
   io.chain_grade = "None";
   io.chain_score = 0;
   io.chain_sweep_to_setup_bars = 0;
   io.chain_sweep_to_fvg_bars = 0;
   io.chain_reaction_confirmed = false;
   io.chain_displacement_confirmed = false;
   io.chain_fvg_created_after_sweep = false;
   io.chain_distance_to_fvg_points = 0;
   io.chain_reasons = "";
   io.chain_reaction_failure_reason = "";
   io.chain_reaction_close_price = 0.0;
   io.chain_reaction_level = 0.0;
   io.chain_reaction_bars_checked = 0;

   if(!io.detected || io.ev_type == "none")
     {
      MapzLiqAppendQualityReason(io.chain_reasons, "liquidity_chain_none");
      io.chain_reaction_failure_reason = "liquidity_chain_reaction_not_applicable";
      io.chain_reaction_close_price = 0.0;
      io.chain_reaction_level = 0.0;
      io.chain_reaction_bars_checked = 0;
      io.chain_reaction_confirmed = false;
      return;
     }

   const double pt = SymbolInfoDouble(sym, SYMBOL_POINT);
   const double fLo = MathMin(fvgLoIn, fvgHiIn);
   const double fHi = MathMax(fvgLoIn, fvgHiIn);
   const double mid = (fLo + fHi) / 2.0;
   if(pt > 0.0)
      io.chain_distance_to_fvg_points = (long)MathRound(MathAbs(io.level - mid) / pt);

   io.chain_sweep_to_setup_bars = io.age_bars;
   io.chain_sweep_to_fvg_bars = io.age_bars;

   MapzLiquidityReactionAudit(sym, tf, S, setupDir, io);

   const bool opp = (StringFind(io.direction, "opposite") >= 0);
   const bool rxOk = io.chain_reaction_confirmed;
   const bool dispOk = (io.displacement_score >= 2);
   const bool proxOk = (io.distance_score >= 1);
   const bool dirOk = (io.directional_score >= 4);
   const bool fvgAfter = (S >= 1 && io.sweep_bar_shift > S);

   io.chain_displacement_confirmed = dispOk;
   io.chain_fvg_created_after_sweep = fvgAfter;

   int cScore = 0;
   if(!opp && dirOk)
      cScore += 5;
   if(rxOk)
      cScore += 5;
   if(dispOk)
      cScore += 4;
   if(fvgAfter)
      cScore += 3;
   if(proxOk)
      cScore += 3;
   if(io.recency_score >= 3)
      cScore += 2;
   if(cScore > 20)
      cScore = 20;

   const bool chainOk = (!opp && rxOk && dispOk && fvgAfter && proxOk && dirOk);

   if(opp)
      MapzLiqAppendQualityReason(io.chain_reasons, "liquidity_chain_opposite_sweep");
   if(!dirOk)
      MapzLiqAppendQualityReason(io.chain_reasons, "liquidity_chain_direction_weak");
   if(!rxOk)
      MapzLiqAppendQualityReason(io.chain_reasons, "liquidity_chain_no_reaction");
   if(!dispOk)
      MapzLiqAppendQualityReason(io.chain_reasons, "liquidity_chain_displacement_missing");
   if(!fvgAfter)
      MapzLiqAppendQualityReason(io.chain_reasons, "liquidity_chain_fvg_not_after_sweep");
   if(!proxOk)
      MapzLiqAppendQualityReason(io.chain_reasons, "liquidity_chain_far_from_fvg");

   if(chainOk)
     {
      io.chain_detected = true;
      io.chain_score = cScore;
      io.chain_grade = MapzLiqGradeFromQuality(cScore);
      if(io.chain_grade == "A" || io.chain_grade == "B")
         MapzLiqAppendQualityReason(io.chain_reasons, "liquidity_chain_ok");
      else if(io.chain_grade == "C" && cScore >= 12)
         MapzLiqAppendQualityReason(io.chain_reasons, "liquidity_chain_ok");
     }
   else
     {
      io.chain_detected = false;
      const int weakCap = (int)MathMin(cScore, 7);
      io.chain_score = weakCap;
      io.chain_grade = (weakCap >= 1 ? "Weak" : "None");
      if(weakCap >= 1)
         MapzLiqAppendQualityReason(io.chain_reasons, "liquidity_chain_weak");
     }
  }

//+------------------------------------------------------------------+
//| Liquidity Sweep V1 (E5.10): PDH/PDL + local M15 swing sweeps.    |
//| Closed candles only; observation-only — no trade blocking.       |
//+------------------------------------------------------------------+
void MapzLiquidityEvaluate(const string sym,
                           const ENUM_TIMEFRAMES tfExec,
                           const datetime setupTime,
                           const ENUM_MAPZ_SETUP_DIR setupDir,
                           const double fvgLoIn,
                           const double fvgHiIn,
                           MapzLiquiditySnapshot &out)
  {
   MapzLiquiditySnapshotClear(out);
   const int lbSweepEarly = (InpLiquiditySweepLookbackBars > 1 ? InpLiquiditySweepLookbackBars : 1);
   if(!InpEnableLiquiditySweepDetection)
     {
      out.reasons = "liquidity_sweep_detection_disabled";
      MapzLiquidityFinalizeQuality(sym, tfExec, -1, setupDir, fvgLoIn, fvgHiIn, lbSweepEarly, out);
      return;
     }

   const double pt = SymbolInfoDouble(sym, SYMBOL_POINT);
   if(pt <= 0.0 || setupTime <= 0)
     {
      out.reasons = "liquidity_sweep_not_found";
      MapzLiquidityFinalizeQuality(sym, tfExec, -1, setupDir, fvgLoIn, fvgHiIn, lbSweepEarly, out);
      return;
     }

   const int S = iBarShift(sym, tfExec, setupTime, false);
   if(S < 1)
     {
      out.reasons = "liquidity_sweep_not_found";
      MapzLiquidityFinalizeQuality(sym, tfExec, -1, setupDir, fvgLoIn, fvgHiIn, lbSweepEarly, out);
      return;
     }

   const int barsTf = Bars(sym, tfExec);
   if(barsTf < S + 3)
     {
      out.reasons = "liquidity_sweep_not_found";
      MapzLiquidityFinalizeQuality(sym, tfExec, S, setupDir, fvgLoIn, fvgHiIn, lbSweepEarly, out);
      return;
     }

   const double buf = (double)InpLiquiditySweepBufferPoints * pt;
   const int lbSweep = (InpLiquiditySweepLookbackBars > 1 ? InpLiquiditySweepLookbackBars : 1);
   const int lbSwing = (InpLocalSwingLookbackBars > 3 ? InpLocalSwingLookbackBars : 3);

   double pdh = 0.0;
   double pdl = 0.0;
   bool havePd = false;
   const int dSh = iBarShift(sym, PERIOD_D1, setupTime, false);
   if(dSh >= 0 && (dSh + 1) < Bars(sym, PERIOD_D1))
     {
      pdh = iHigh(sym, PERIOD_D1, dSh + 1);
      pdl = iLow(sym, PERIOD_D1, dSh + 1);
      havePd = true;
     }

   int bestPri = -999999;
   MapzLiquiditySnapshot best;
   MapzLiquiditySnapshotClear(best);

   const bool wantLong = (setupDir == MAPZ_SETUP_LONG);
   const bool wantShort = (setupDir == MAPZ_SETUP_SHORT);

   // --- PDH / PDL sweeps in M15 lookback before setup bar (shifts S+1 ..) ---
   if(havePd)
     {
      const int jEnd = MathMin(S + lbSweep, barsTf - 1);
      for(int j = S + 1; j <= jEnd; j++)
        {
         const double hi = iHigh(sym, tfExec, j);
         const double lo = iLow(sym, tfExec, j);
         const int age = j - S;

         if(hi >= pdh + buf)
           {
            const long dist = (long)MathRound((hi - pdh) / pt);
            string dirW = "neutral";
            if(wantShort)
               dirW = "bearish_context";
            else if(wantLong)
               dirW = "opposite";
            const int pri = MapzLiquidityComputeSelectPri(sym, tfExec, S, setupDir, fvgLoIn, fvgHiIn, j, age, dirW, pdh, "PDH_SWEEP");
            if(pri > bestPri)
              {
               bestPri = pri;
               best.detected = true;
               best.ev_type = "PDH_SWEEP";
               best.direction = dirW;
               best.age_bars = age;
               best.level = pdh;
               best.sweep_price = hi;
               best.distance_pts = dist;
               best.reasons = (wantShort ? "pdh_sweep_favorable" : "opposite_liquidity_sweep");
               best.sweep_bar_shift = j;
              }
           }

         if(lo <= pdl - buf)
           {
            const long dist = (long)MathRound((pdl - lo) / pt);
            string dirW = "neutral";
            if(wantLong)
               dirW = "bullish_context";
            else if(wantShort)
               dirW = "opposite";
            const int pri = MapzLiquidityComputeSelectPri(sym, tfExec, S, setupDir, fvgLoIn, fvgHiIn, j, age, dirW, pdl, "PDL_SWEEP");
            if(pri > bestPri)
              {
               bestPri = pri;
               best.detected = true;
               best.ev_type = "PDL_SWEEP";
               best.direction = dirW;
               best.age_bars = age;
               best.level = pdl;
               best.sweep_price = lo;
               best.distance_pts = dist;
               best.reasons = (wantLong ? "pdl_sweep_favorable" : "opposite_liquidity_sweep");
               best.sweep_bar_shift = j;
              }
           }
        }
     }

   // --- Local M15 swing sweeps ---
   const int spMax = MathMin(S + lbSwing, barsTf - 2);
   for(int sp = S + 2; sp <= spMax; sp++)
     {
      if(sp + 1 >= barsTf)
         break;
      const double hC = iHigh(sym, tfExec, sp);
      const double hN = iHigh(sym, tfExec, sp - 1);
      const double hP = iHigh(sym, tfExec, sp + 1);
      const double lC = iLow(sym, tfExec, sp);
      const double lN = iLow(sym, tfExec, sp - 1);
      const double lP = iLow(sym, tfExec, sp + 1);

      const bool swingHi = (hC >= hN && hC >= hP);
      const bool swingLo = (lC <= lN && lC <= lP);

      if(swingHi)
        {
         for(int j = S + 1; j <= sp - 1; j++)
           {
            const double hi = iHigh(sym, tfExec, j);
            if(hi >= hC + buf)
              {
               const int age = j - S;
               const long dist = (long)MathRound((hi - hC) / pt);
               string dirW = "neutral";
               if(wantShort)
                  dirW = "bearish_context";
               else if(wantLong)
                  dirW = "opposite";
               const int pri = MapzLiquidityComputeSelectPri(sym, tfExec, S, setupDir, fvgLoIn, fvgHiIn, j, age, dirW, hC, "LOCAL_SWING_HIGH_SWEEP");
               if(pri > bestPri)
                 {
                  bestPri = pri;
                  best.detected = true;
                  best.ev_type = "LOCAL_SWING_HIGH_SWEEP";
                  best.direction = dirW;
                  best.age_bars = age;
                  best.level = hC;
                  best.sweep_price = hi;
                  best.distance_pts = dist;
                  best.reasons = (wantShort ? "local_swing_high_sweep_favorable" : "opposite_liquidity_sweep");
                  best.sweep_bar_shift = j;
                 }
               break;
              }
           }
        }

      if(swingLo)
        {
         for(int j = S + 1; j <= sp - 1; j++)
           {
            const double lo = iLow(sym, tfExec, j);
            if(lo <= lC - buf)
              {
               const int age = j - S;
               const long dist = (long)MathRound((lC - lo) / pt);
               string dirW = "neutral";
               if(wantLong)
                  dirW = "bullish_context";
               else if(wantShort)
                  dirW = "opposite";
               const int pri = MapzLiquidityComputeSelectPri(sym, tfExec, S, setupDir, fvgLoIn, fvgHiIn, j, age, dirW, lC, "LOCAL_SWING_LOW_SWEEP");
               if(pri > bestPri)
                 {
                  bestPri = pri;
                  best.detected = true;
                  best.ev_type = "LOCAL_SWING_LOW_SWEEP";
                  best.direction = dirW;
                  best.age_bars = age;
                  best.level = lC;
                  best.sweep_price = lo;
                  best.distance_pts = dist;
                  best.reasons = (wantLong ? "local_swing_low_sweep_favorable" : "opposite_liquidity_sweep");
                  best.sweep_bar_shift = j;
                 }
               break;
              }
           }
        }
     }

   if(best.detected)
      MapzLiquiditySnapshotCopy(out, best);
   else
      out.reasons = "liquidity_sweep_not_found";

   MapzLiquidityFinalizeQuality(sym, tfExec, S, setupDir, fvgLoIn, fvgHiIn, lbSweep, out);
   MapzLiquidityFinalizeChain(sym, tfExec, S, setupDir, fvgLoIn, fvgHiIn, out);
  }

//+------------------------------------------------------------------+
void MapzHtfSnapClear(MapzHtfTradeSnap &o)
  {
   o.enabled = false;
   o.h4_structure_state = "unknown";
   o.h1_structure_state = "unknown";
   o.h4_structure_direction = "unknown";
   o.h1_structure_direction = "unknown";
   o.htf_structure_aligned = false;
   o.htf_structure_conflict = false;
   o.htf_structure_score = 0;
   o.h4_protected_high = 0.0;
   o.h4_protected_low = 0.0;
   o.h1_protected_high = 0.0;
   o.h1_protected_low = 0.0;
   o.h4_external_liquidity_high = 0.0;
   o.h4_external_liquidity_low = 0.0;
   o.h1_external_liquidity_high = 0.0;
   o.h1_external_liquidity_low = 0.0;
   o.htf_structure_reasons = "";
  }

//+------------------------------------------------------------------+
void MapzHtfAppendToken(string &buf, const string tok)
  {
   if(StringLen(tok) == 0)
      return;
   if(StringLen(buf) > 0)
      buf += "|";
   buf += tok;
  }

//+------------------------------------------------------------------+
bool MapzReasonBufHasToken(const string buf, const string tok)
  {
   if(StringLen(tok) == 0)
      return false;
   if(buf == tok)
      return true;
   if(StringFind(buf, tok + "|") == 0)
      return true;
   if(StringFind(buf, "|" + tok + "|") >= 0)
      return true;
   const int len = StringLen(buf);
   const int tlen = StringLen(tok);
   if(len > tlen && StringSubstr(buf, len - tlen - 1, tlen + 1) == "|" + tok)
      return true;
   return false;
  }

//+------------------------------------------------------------------+
void MapzEffAppendReasonOnce(string &buf, const string tok)
  {
   if(StringLen(tok) == 0)
      return;
   if(MapzReasonBufHasToken(buf, tok))
      return;
   if(StringLen(buf) > 0)
      buf += "|";
   buf += tok;
  }

//+------------------------------------------------------------------+
bool MapzHtfIsSwingHigh(const string sym, const ENUM_TIMEFRAMES tf, const int s, const int N)
  {
   if(s < N)
      return false;
   const int bars = Bars(sym, tf);
   if(bars <= 0 || (s + N) >= bars)
      return false;
   const double h = iHigh(sym, tf, s);
   for(int k = 1; k <= N; k++)
     {
      if(h <= iHigh(sym, tf, s - k) || h <= iHigh(sym, tf, s + k))
         return false;
     }
   return true;
  }

//+------------------------------------------------------------------+
bool MapzHtfIsSwingLow(const string sym, const ENUM_TIMEFRAMES tf, const int s, const int N)
  {
   if(s < N)
      return false;
   const int bars = Bars(sym, tf);
   if(bars <= 0 || (s + N) >= bars)
      return false;
   const double lo = iLow(sym, tf, s);
   for(int k = 1; k <= N; k++)
     {
      if(lo >= iLow(sym, tf, s - k) || lo >= iLow(sym, tf, s + k))
         return false;
     }
   return true;
  }

//+------------------------------------------------------------------+
void MapzHtfClassifyTf(const string sym,
                       const ENUM_TIMEFRAMES tf,
                       const int N,
                       const int maxScanIn,
                       string &state,
                       string &direction,
                       double &prot_hi,
                       double &prot_lo,
                       double &ext_hi,
                       double &ext_lo,
                       string &rsn)
  {
   state = "unknown_structure";
   direction = "unknown";
   prot_hi = 0.0;
   prot_lo = 0.0;
   ext_hi = 0.0;
   ext_lo = 0.0;
   rsn = "";
   const int bars = Bars(sym, tf);
   if(bars <= N * 2 + 5)
     {
      MapzHtfAppendToken(rsn, "htf_structure_insufficient_swings");
      MapzHtfAppendToken(rsn, "htf_structure_unknown");
      return;
     }
   const int maxS = MathMin(maxScanIn, bars - N - 2);
   int hSh[16];
   int lSh[16];
   double hPr[16];
   double lPr[16];
   int hCnt = 0;
   int lCnt = 0;
   for(int s = 1 + N; s <= maxS && (hCnt < 8 || lCnt < 8); s++)
     {
      if(hCnt < 8 && MapzHtfIsSwingHigh(sym, tf, s, N))
        {
         hSh[hCnt] = s;
         hPr[hCnt] = iHigh(sym, tf, s);
         hCnt++;
        }
      if(lCnt < 8 && MapzHtfIsSwingLow(sym, tf, s, N))
        {
         lSh[lCnt] = s;
         lPr[lCnt] = iLow(sym, tf, s);
         lCnt++;
        }
     }
   if(hCnt < 2 || lCnt < 2)
     {
      MapzHtfAppendToken(rsn, "htf_structure_insufficient_swings");
      MapzHtfAppendToken(rsn, "htf_structure_unknown");
      state = "unknown_structure";
      direction = "unknown";
      return;
     }
   const double cls = iClose(sym, tf, 1);
   const bool hh = (hPr[0] > hPr[1]);
   const bool hl = (lPr[0] > lPr[1]);
   const bool lh = (hPr[0] < hPr[1]);
   const bool ll = (lPr[0] < lPr[1]);
   const bool bullBreak = (cls > hPr[0]);
   const bool bearBreak = (cls < lPr[0]);
   if((hh && hl && bearBreak) || (lh && ll && bullBreak))
     {
      state = "transition_structure";
      direction = "transition";
      MapzHtfAppendToken(rsn, "htf_structure_transition");
     }
   else if((hh && hl) || (bullBreak && !bearBreak))
     {
      state = "bullish_structure";
      direction = "bullish";
     }
   else if((lh && ll) || (bearBreak && !bullBreak))
     {
      state = "bearish_structure";
      direction = "bearish";
     }
   else
     {
      state = "range_structure";
      direction = "range";
      MapzHtfAppendToken(rsn, "htf_structure_range");
     }

   if(StringFind(state, "bullish") >= 0)
     {
      prot_lo = lPr[0];
      if(prot_hi <= 0.0 && hCnt >= 1)
         prot_hi = hPr[0];
     }
   else if(StringFind(state, "bearish") >= 0)
     {
      prot_hi = hPr[0];
      if(prot_lo <= 0.0 && lCnt >= 1)
         prot_lo = lPr[0];
     }
   else
     {
      prot_hi = hPr[0];
      prot_lo = lPr[0];
      MapzHtfAppendToken(rsn, "protected_level_missing");
     }

   ext_hi = 0.0;
   ext_lo = 0.0;
   for(int i = 0; i < hCnt; i++)
     {
      if(hPr[i] > cls && (ext_hi <= 0.0 || hPr[i] < ext_hi))
         ext_hi = hPr[i];
     }
   for(int j = 0; j < lCnt; j++)
     {
      if(lPr[j] < cls && (ext_lo <= 0.0 || lPr[j] > ext_lo))
         ext_lo = lPr[j];
     }
   if(ext_hi <= 0.0 || ext_lo <= 0.0)
      MapzHtfAppendToken(rsn, "external_liquidity_missing");
  }

//+------------------------------------------------------------------+
void MapzHtfFinalizeSnap(const ENUM_MAPZ_SETUP_DIR dir, const ENUM_MAPZ_BIAS biasEnum, MapzHtfTradeSnap &o)
  {
   if(!o.enabled)
      return;
   const bool longDir = (dir == MAPZ_SETUP_LONG);
   const bool shortDir = (dir == MAPZ_SETUP_SHORT);
   o.htf_structure_conflict = false;
   o.htf_structure_aligned = false;
   if(longDir)
     {
      const bool h4Bear = (o.h4_structure_direction == "bearish");
      const bool h1Bear = (o.h1_structure_direction == "bearish");
      const bool h4Bull = (o.h4_structure_direction == "bullish");
      const bool h1Bull = (o.h1_structure_direction == "bullish");
      const bool h4Soft = (o.h4_structure_direction == "range" || o.h4_structure_direction == "transition" || o.h4_structure_direction == "unknown");
      const bool h1Soft = (o.h1_structure_direction == "range" || o.h1_structure_direction == "transition" || o.h1_structure_direction == "unknown");
      if(h4Bear || h1Bear)
        {
         o.htf_structure_conflict = true;
         if(h4Bear)
            MapzHtfAppendToken(o.htf_structure_reasons, "htf_structure_h4_conflict");
         if(h1Bear)
            MapzHtfAppendToken(o.htf_structure_reasons, "htf_structure_h1_conflict");
        }
      if(!o.htf_structure_conflict)
        {
         if(h4Bull && h1Bull)
           {
            o.htf_structure_aligned = true;
            MapzHtfAppendToken(o.htf_structure_reasons, "htf_structure_aligned");
            MapzHtfAppendToken(o.htf_structure_reasons, "htf_structure_h4_aligned");
            MapzHtfAppendToken(o.htf_structure_reasons, "htf_structure_h1_aligned");
           }
         else if((h4Bull && h1Soft) || (h1Bull && h4Soft))
           {
            o.htf_structure_aligned = true;
            if(h4Bull)
               MapzHtfAppendToken(o.htf_structure_reasons, "htf_structure_h4_aligned");
            if(h1Bull)
               MapzHtfAppendToken(o.htf_structure_reasons, "htf_structure_h1_aligned");
           }
        }
     }
   else if(shortDir)
     {
      const bool h4Bull = (o.h4_structure_direction == "bullish");
      const bool h1Bull = (o.h1_structure_direction == "bullish");
      const bool h4Bear = (o.h4_structure_direction == "bearish");
      const bool h1Bear = (o.h1_structure_direction == "bearish");
      const bool h4Soft = (o.h4_structure_direction == "range" || o.h4_structure_direction == "transition" || o.h4_structure_direction == "unknown");
      const bool h1Soft = (o.h1_structure_direction == "range" || o.h1_structure_direction == "transition" || o.h1_structure_direction == "unknown");
      if(h4Bull || h1Bull)
        {
         o.htf_structure_conflict = true;
         if(h4Bull)
            MapzHtfAppendToken(o.htf_structure_reasons, "htf_structure_h4_conflict");
         if(h1Bull)
            MapzHtfAppendToken(o.htf_structure_reasons, "htf_structure_h1_conflict");
        }
      if(!o.htf_structure_conflict)
        {
         if(h4Bear && h1Bear)
           {
            o.htf_structure_aligned = true;
            MapzHtfAppendToken(o.htf_structure_reasons, "htf_structure_aligned");
            MapzHtfAppendToken(o.htf_structure_reasons, "htf_structure_h4_aligned");
            MapzHtfAppendToken(o.htf_structure_reasons, "htf_structure_h1_aligned");
           }
         else if((h4Bear && h1Soft) || (h1Bear && h4Soft))
           {
            o.htf_structure_aligned = true;
            if(h4Bear)
               MapzHtfAppendToken(o.htf_structure_reasons, "htf_structure_h4_aligned");
            if(h1Bear)
               MapzHtfAppendToken(o.htf_structure_reasons, "htf_structure_h1_aligned");
           }
        }
     }

   int sc = 0;
   const bool biasTradeAlign = (longDir && biasEnum == MAPZ_BIAS_BULLISH) || (shortDir && biasEnum == MAPZ_BIAS_BEARISH);
   if(biasTradeAlign)
      sc += 6;
   else if(biasEnum == MAPZ_BIAS_NEUTRAL)
      sc += 2;
   else if(biasEnum == MAPZ_BIAS_UNKNOWN)
      sc += 1;

   int add4 = 0;
   if(longDir)
     {
      if(o.h4_structure_direction == "bullish")
         add4 = 7;
      else if(o.h4_structure_direction == "bearish")
         add4 = 0;
      else if(o.h4_structure_direction == "range" || o.h4_structure_direction == "transition")
         add4 = 4;
      else
         add4 = 2;
     }
   else if(shortDir)
     {
      if(o.h4_structure_direction == "bearish")
         add4 = 7;
      else if(o.h4_structure_direction == "bullish")
         add4 = 0;
      else if(o.h4_structure_direction == "range" || o.h4_structure_direction == "transition")
         add4 = 4;
      else
         add4 = 2;
     }
   int add1 = 0;
   if(longDir)
     {
      if(o.h1_structure_direction == "bullish")
         add1 = 7;
      else if(o.h1_structure_direction == "bearish")
         add1 = 0;
      else if(o.h1_structure_direction == "range" || o.h1_structure_direction == "transition")
         add1 = 4;
      else
         add1 = 2;
     }
   else if(shortDir)
     {
      if(o.h1_structure_direction == "bearish")
         add1 = 7;
      else if(o.h1_structure_direction == "bullish")
         add1 = 0;
      else if(o.h1_structure_direction == "range" || o.h1_structure_direction == "transition")
         add1 = 4;
      else
         add1 = 2;
     }
   sc += add4 + add1;
   if(o.htf_structure_conflict)
      sc = (int)MathRound((double)sc * 0.4);
   if(sc > 20)
      sc = 20;
   if(sc < 0)
      sc = 0;
   o.htf_structure_score = sc;
  }

//+------------------------------------------------------------------+
void MapzHtfBuildTradeSnap(const string sym, const ENUM_MAPZ_SETUP_DIR dir, const ENUM_MAPZ_BIAS biasEnum, MapzHtfTradeSnap &out)
  {
   MapzHtfSnapClear(out);
   if(!InpEnableHtfStructureV1)
      return;
   out.enabled = true;
   int N = InpHtfStructureSwingLookbackBars;
   if(N < 2)
      N = 2;
   if(N > 5)
      N = 5;
   int mx = InpHtfStructureMaxBars;
   if(mx < 80)
      mx = 80;
   string r4 = "";
   string r1 = "";
   string st4, st1, dir4, dir1;
   double ph4, pl4, eh4, el4, ph1, pl1, eh1, el1;
   if(InpUseH4Context)
      MapzHtfClassifyTf(sym, PERIOD_H4, N, mx, st4, dir4, ph4, pl4, eh4, el4, r4);
   else
     {
      st4 = "unknown_structure";
      dir4 = "unknown";
      ph4 = pl4 = eh4 = el4 = 0.0;
      MapzHtfAppendToken(r4, "htf_structure_unknown");
     }
   if(InpUseH1Context)
      MapzHtfClassifyTf(sym, PERIOD_H1, N, mx, st1, dir1, ph1, pl1, eh1, el1, r1);
   else
     {
      st1 = "unknown_structure";
      dir1 = "unknown";
      ph1 = pl1 = eh1 = el1 = 0.0;
      MapzHtfAppendToken(r1, "htf_structure_unknown");
     }
   out.h4_structure_state = st4;
   out.h1_structure_state = st1;
   out.h4_structure_direction = dir4;
   out.h1_structure_direction = dir1;
   out.h4_protected_high = ph4;
   out.h4_protected_low = pl4;
   out.h1_protected_high = ph1;
   out.h1_protected_low = pl1;
   out.h4_external_liquidity_high = eh4;
   out.h4_external_liquidity_low = el4;
   out.h1_external_liquidity_high = eh1;
   out.h1_external_liquidity_low = el1;
   if(StringLen(r4) > 0)
      MapzHtfAppendToken(out.htf_structure_reasons, StringFormat("h4:%s", r4));
   if(StringLen(r1) > 0)
      MapzHtfAppendToken(out.htf_structure_reasons, StringFormat("h1:%s", r1));
   MapzHtfFinalizeSnap(dir, biasEnum, out);
  }

//+------------------------------------------------------------------+
bool MapzMscIsSwingHigh(const string sym, const ENUM_TIMEFRAMES tf, const int s, const int N)
  {
   const int bars = Bars(sym, tf);
   if(bars <= 0 || s < 1 || (s + N) >= bars || (s - N) < 1)
      return false;
   const double h = iHigh(sym, tf, s);
   for(int k = 1; k <= N; k++)
     {
      if(iHigh(sym, tf, s - k) >= h)
         return false;
      if(iHigh(sym, tf, s + k) >= h)
         return false;
     }
   return true;
  }

//+------------------------------------------------------------------+
bool MapzMscIsSwingLow(const string sym, const ENUM_TIMEFRAMES tf, const int s, const int N)
  {
   const int bars = Bars(sym, tf);
   if(bars <= 0 || s < 1 || (s + N) >= bars || (s - N) < 1)
      return false;
   const double lv = iLow(sym, tf, s);
   for(int k = 1; k <= N; k++)
     {
      if(iLow(sym, tf, s - k) <= lv)
         return false;
      if(iLow(sym, tf, s + k) <= lv)
         return false;
     }
   return true;
  }

//+------------------------------------------------------------------+
bool MapzMscFindLatestSwingHigh(const string sym,
                                const ENUM_TIMEFRAMES tf,
                                const int refShift,
                                const int N,
                                const int maxSpan,
                                int &outShift,
                                double &outPrice)
  {
   outShift = -1;
   outPrice = 0.0;
   const int bars = Bars(sym, tf);
   if(bars <= 0 || refShift < 1 || N < 1)
      return false;
   const int lim = MathMin(refShift + maxSpan, bars - N - 1);
   for(int ps = refShift + N + 1; ps <= lim; ps++)
     {
      if(ps + N >= bars)
         continue;
      if(MapzMscIsSwingHigh(sym, tf, ps, N))
        {
         outShift = ps;
         outPrice = iHigh(sym, tf, ps);
         return true;
        }
     }
   return false;
  }

//+------------------------------------------------------------------+
bool MapzMscFindLatestSwingLow(const string sym,
                               const ENUM_TIMEFRAMES tf,
                               const int refShift,
                               const int N,
                               const int maxSpan,
                               int &outShift,
                               double &outPrice)
  {
   outShift = -1;
   outPrice = 0.0;
   const int bars = Bars(sym, tf);
   if(bars <= 0 || refShift < 1 || N < 1)
      return false;
   const int lim = MathMin(refShift + maxSpan, bars - N - 1);
   for(int ps = refShift + N + 1; ps <= lim; ps++)
     {
      if(ps + N >= bars)
         continue;
      if(MapzMscIsSwingLow(sym, tf, ps, N))
        {
         outShift = ps;
         outPrice = iLow(sym, tf, ps);
         return true;
        }
     }
   return false;
  }

//+------------------------------------------------------------------+
void MapzMscSnapClear(MapzMssChochTradeSnap &o)
  {
   o.enabled = false;
   o.mss_detected = false;
   o.mss_direction = "none";
   o.mss_break_level = 0.0;
   o.mss_close_price = 0.0;
   o.mss_bars_after_sweep = -1;
   o.mss_bars_before_entry = -1;
   o.mss_valid_close = false;
   o.choch_detected = false;
   o.choch_direction = "none";
   o.choch_break_level = 0.0;
   o.choch_close_price = 0.0;
   o.choch_valid_close = false;
   o.wick_break_only = false;
   o.internal_swing_high = 0.0;
   o.internal_swing_low = 0.0;
   o.internal_swing_high_age_bars = -1;
   o.internal_swing_low_age_bars = -1;
   o.mss_choch_score = 0;
   o.mss_choch_reasons = "";
   o.ctx_setup_bar_shift = -1;
   o.mss_break_bar_shift = -1;
   o.choch_break_bar_shift = -1;
   o.mss_temporal_relevance_score = 0;
   o.mss_temporal_relevance_grade = "None";
   o.mss_after_sweep = false;
   o.mss_before_entry = false;
   o.mss_near_entry_window = false;
   o.mss_too_early = false;
   o.mss_too_late = false;
   o.mss_after_fvg = false;
   o.mss_before_fvg = false;
   o.mss_sweep_to_mss_bars = -1;
   o.mss_fvg_to_mss_bars = -1;
   o.mss_mss_to_entry_bars = -1;
   o.mss_temporal_relevance_reasons = "";
   o.choch_temporal_relevance_score = 0;
   o.choch_temporal_relevance_grade = "None";
   o.choch_after_sweep = false;
   o.choch_before_entry = false;
   o.choch_near_entry_window = false;
   o.choch_too_early = false;
   o.choch_too_late = false;
   o.choch_after_fvg = false;
   o.choch_before_fvg = false;
   o.choch_sweep_to_choch_bars = -1;
   o.choch_fvg_to_choch_bars = -1;
   o.choch_choch_to_entry_bars = -1;
   o.choch_temporal_relevance_reasons = "";
  }

//+------------------------------------------------------------------+
bool MapzMscCtxBullishMssAlignedLong(const ENUM_MAPZ_BIAS bias, const MapzLiquiditySnapshot &liq)
  {
   if(bias == MAPZ_BIAS_BEARISH || bias == MAPZ_BIAS_NEUTRAL || bias == MAPZ_BIAS_UNKNOWN)
      return true;
   if(liq.detected)
      return true;
   return false;
  }

//+------------------------------------------------------------------+
bool MapzMscCtxBearishMssAgainstLong(const ENUM_MAPZ_BIAS bias, const MapzLiquiditySnapshot &liq)
  {
   if(bias == MAPZ_BIAS_BULLISH || bias == MAPZ_BIAS_NEUTRAL || bias == MAPZ_BIAS_UNKNOWN)
      return true;
   if(liq.detected)
      return true;
   return false;
  }

//+------------------------------------------------------------------+
bool MapzMscCtxBearishMssAlignedShort(const ENUM_MAPZ_BIAS bias, const MapzLiquiditySnapshot &liq)
  {
   if(bias == MAPZ_BIAS_BULLISH || bias == MAPZ_BIAS_NEUTRAL || bias == MAPZ_BIAS_UNKNOWN)
      return true;
   if(liq.detected)
      return true;
   return false;
  }

//+------------------------------------------------------------------+
bool MapzMscCtxBullishMssAgainstShort(const ENUM_MAPZ_BIAS bias, const MapzLiquiditySnapshot &liq)
  {
   if(bias == MAPZ_BIAS_BEARISH || bias == MAPZ_BIAS_NEUTRAL || bias == MAPZ_BIAS_UNKNOWN)
      return true;
   if(liq.detected)
      return true;
   return false;
  }

//+------------------------------------------------------------------+
void MapzMscFinalizeScore(MapzMssChochTradeSnap &o,
                          const ENUM_MAPZ_SETUP_DIR dir,
                          const bool saw_wick_touch_break_level)
  {
   const bool longDir = (dir == MAPZ_SETUP_LONG);
   const bool shortDir = (dir == MAPZ_SETUP_SHORT);

   bool aligned_mss = false;
   if(o.mss_detected && o.mss_valid_close)
     {
      if(longDir && o.mss_direction == "bullish")
         aligned_mss = true;
      else if(shortDir && o.mss_direction == "bearish")
         aligned_mss = true;
     }

   bool aligned_choch = false;
   if(o.choch_detected && o.choch_valid_close && !o.mss_detected)
     {
      if(longDir && o.choch_direction == "bullish")
         aligned_choch = true;
      else if(shortDir && o.choch_direction == "bearish")
         aligned_choch = true;
     }

   o.wick_break_only = (saw_wick_touch_break_level && (!o.mss_valid_close && !o.choch_valid_close));

   if(!InpMssChochScoreEnabled)
     {
      o.mss_choch_score = 0;
      MapzHtfAppendToken(o.mss_choch_reasons, "mss_choch_score_disabled");
      return;
     }

   int sc = 0;
   if(StringFind(o.mss_choch_reasons, "insufficient_internal_swings") >= 0)
     {
      sc = 5;
     }
   else if(o.mss_detected && o.mss_valid_close)
     {
      sc = (aligned_mss ? 15 : 4);
      MapzHtfAppendToken(o.mss_choch_reasons, aligned_mss ? "mss_aligned_with_trade" : "mss_against_trade");
      MapzHtfAppendToken(o.mss_choch_reasons, "mss_valid_close");
     }
   else if(o.choch_detected && o.choch_valid_close)
     {
      sc = (aligned_choch ? 10 : 4);
      MapzHtfAppendToken(o.mss_choch_reasons, aligned_choch ? "choch_aligned_with_trade" : "choch_against_trade");
      MapzHtfAppendToken(o.mss_choch_reasons, "choch_valid_close");
     }
   else if(o.wick_break_only)
     {
      sc = 3;
      MapzHtfAppendToken(o.mss_choch_reasons, "wick_break_only");
     }
   else if(sc == 0)
     {
      sc = 6;
      MapzHtfAppendToken(o.mss_choch_reasons, "mss_not_found");
      MapzHtfAppendToken(o.mss_choch_reasons, "choch_not_found");
      MapzHtfAppendToken(o.mss_choch_reasons, "structure_confirmation_unknown");
     }

   if(sc > 15)
      sc = 15;
   if(sc < 0)
      sc = 0;
   o.mss_choch_score = sc;
  }

//+------------------------------------------------------------------+
void MapzMssChochBuildTradeSnap(const string sym,
                                const ENUM_TIMEFRAMES tf,
                                const ENUM_MAPZ_SETUP_DIR dir,
                                const ENUM_MAPZ_BIAS bias,
                                const MapzLiquiditySnapshot &liq,
                                const datetime setupTime,
                                MapzMssChochTradeSnap &out)
  {
   MapzMscSnapClear(out);
   out.enabled = InpEnableMssChochV1;
   if(!InpEnableMssChochV1)
     {
      MapzHtfAppendToken(out.mss_choch_reasons, "mss_choch_disabled");
      out.mss_choch_score = 0;
      if(InpMssChochScoreEnabled)
         MapzHtfAppendToken(out.mss_choch_reasons, "mss_choch_score_disabled");
      return;
     }

   const int refShift = iBarShift(sym, tf, setupTime, false);
   if(refShift < 1)
     {
      MapzHtfAppendToken(out.mss_choch_reasons, "structure_confirmation_unknown");
      out.mss_choch_score = (InpMssChochScoreEnabled ? 5 : 0);
      if(InpMssChochScoreEnabled)
         MapzHtfAppendToken(out.mss_choch_reasons, "break_level_missing");
      return;
     }

   out.ctx_setup_bar_shift = refShift;
   out.mss_break_bar_shift = -1;
   out.choch_break_bar_shift = -1;

   int Nmaj = InpMssChochSwingLookbackBars;
   if(Nmaj < 1)
      Nmaj = 1;
   if(Nmaj > 5)
      Nmaj = 5;
   int Nmin = Nmaj - 1;
   if(Nmin < 1)
      Nmin = 1;

   int mx = InpMssChochMaxBars;
   if(mx < 40)
      mx = 40;

   int phShift = -1, plShift = -1;
   double phPrice = 0.0, plPrice = 0.0;
   const bool hasHigh = MapzMscFindLatestSwingHigh(sym, tf, refShift, Nmaj, mx, phShift, phPrice);
   const bool hasLow = MapzMscFindLatestSwingLow(sym, tf, refShift, Nmaj, mx, plShift, plPrice);

   out.internal_swing_high = phPrice;
   out.internal_swing_low = plPrice;
   out.internal_swing_high_age_bars = (hasHigh ? phShift - refShift : -1);
   out.internal_swing_low_age_bars = (hasLow ? plShift - refShift : -1);

   if(!hasHigh && !hasLow)
     {
      MapzHtfAppendToken(out.mss_choch_reasons, "insufficient_internal_swings");
      MapzMscFinalizeScore(out, dir, false);
      return;
     }

   int mhMinShift = -1;
   double mhMinPrice = 0.0;
   const bool hasMinorHigh = MapzMscFindLatestSwingHigh(sym, tf, refShift, Nmin, mx, mhMinShift, mhMinPrice);

   int mlMinShift = -1;
   double mlMinPrice = 0.0;
   const bool hasMinorLow = MapzMscFindLatestSwingLow(sym, tf, refShift, Nmin, mx, mlMinShift, mlMinPrice);

   bool saw_wick = false;

   const bool reqClose = InpMssChochRequireCloseBreak;

   if(dir == MAPZ_SETUP_LONG)
     {
      bool bull_ok = false;
      int brk = -1;
      double brkCls = 0.0;
      if(hasHigh && MapzMscCtxBullishMssAlignedLong(bias, liq))
        {
         for(int k = refShift; k >= 1; k--)
           {
            if(k >= phShift)
               continue;
            const double hi = iHigh(sym, tf, k);
            const double cl = iClose(sym, tf, k);
            if(reqClose)
              {
               if(hi > phPrice && cl <= phPrice)
                  saw_wick = true;
               if(cl > phPrice)
                 {
                  bull_ok = true;
                  brk = k;
                  brkCls = cl;
                  break;
                 }
              }
            else
              {
               if(hi > phPrice)
                 {
                  bull_ok = true;
                  brk = k;
                  brkCls = cl;
                  break;
                 }
              }
           }
        }

      bool bear_against = false;
      int brkB = -1;
      double brkClsB = 0.0;
      if(!bull_ok && hasLow && MapzMscCtxBearishMssAgainstLong(bias, liq))
        {
         for(int k = refShift; k >= 1; k--)
           {
            if(k >= plShift)
               continue;
            const double lo = iLow(sym, tf, k);
            const double cl = iClose(sym, tf, k);
            if(reqClose)
              {
               if(lo < plPrice && cl >= plPrice)
                  saw_wick = true;
               if(cl < plPrice)
                 {
                  bear_against = true;
                  brkB = k;
                  brkClsB = cl;
                  break;
                 }
              }
            else
              {
               if(lo < plPrice)
                 {
                  bear_against = true;
                  brkB = k;
                  brkClsB = cl;
                  break;
                 }
              }
           }
        }

      if(bull_ok)
        {
         out.mss_detected = true;
         out.mss_direction = "bullish";
         out.mss_break_level = phPrice;
         out.mss_close_price = brkCls;
         out.mss_valid_close = true;
         out.mss_break_bar_shift = brk;
         if(liq.sweep_bar_shift >= 0 && brk >= 0)
            out.mss_bars_after_sweep = MathAbs(liq.sweep_bar_shift - brk);
         else
            out.mss_bars_after_sweep = -1;
         out.mss_bars_before_entry = (brk >= 0 ? refShift - brk : -1);
        }
      else if(bear_against)
        {
         out.mss_detected = true;
         out.mss_direction = "bearish";
         out.mss_break_level = plPrice;
         out.mss_close_price = brkClsB;
         out.mss_valid_close = true;
         out.mss_break_bar_shift = brkB;
         if(liq.sweep_bar_shift >= 0 && brkB >= 0)
            out.mss_bars_after_sweep = MathAbs(liq.sweep_bar_shift - brkB);
         else
            out.mss_bars_after_sweep = -1;
         out.mss_bars_before_entry = (brkB >= 0 ? refShift - brkB : -1);
        }

      if(!out.mss_detected && hasMinorHigh && mhMinShift >= 0 && mhMinShift != phShift)
        {
         bool ch_ok = false;
         int ck = -1;
         double ccls = 0.0;
         for(int k = refShift; k >= 1; k--)
           {
            if(k >= mhMinShift)
               continue;
            const double hi = iHigh(sym, tf, k);
            const double cl = iClose(sym, tf, k);
            if(reqClose)
              {
               if(hi > mhMinPrice && cl <= mhMinPrice)
                  saw_wick = true;
               if(cl > mhMinPrice)
                 {
                  ch_ok = true;
                  ck = k;
                  ccls = cl;
                  break;
                 }
              }
            else if(hi > mhMinPrice)
              {
               ch_ok = true;
               ck = k;
               ccls = cl;
               break;
              }
           }
         if(ch_ok)
           {
            out.choch_detected = true;
            out.choch_direction = "bullish";
            out.choch_break_level = mhMinPrice;
            out.choch_close_price = ccls;
            out.choch_valid_close = true;
            out.choch_break_bar_shift = ck;
           }
        }

      if(!out.mss_detected && !out.choch_detected && hasMinorLow && mlMinShift >= 0 && mlMinShift != plShift)
        {
         bool ch_bad = false;
         int ck = -1;
         double ccls = 0.0;
         for(int k = refShift; k >= 1; k--)
           {
            if(k >= mlMinShift)
               continue;
            const double lo = iLow(sym, tf, k);
            const double cl = iClose(sym, tf, k);
            if(reqClose)
              {
               if(lo < mlMinPrice && cl >= mlMinPrice)
                  saw_wick = true;
               if(cl < mlMinPrice)
                 {
                  ch_bad = true;
                  ck = k;
                  ccls = cl;
                  break;
                 }
              }
            else if(lo < mlMinPrice)
              {
               ch_bad = true;
               ck = k;
               ccls = cl;
               break;
              }
           }
         if(ch_bad)
           {
            out.choch_detected = true;
            out.choch_direction = "bearish";
            out.choch_break_level = mlMinPrice;
            out.choch_close_price = ccls;
            out.choch_valid_close = true;
            out.choch_break_bar_shift = ck;
           }
        }
     }
   else if(dir == MAPZ_SETUP_SHORT)
     {
      bool bear_ok = false;
      int brk = -1;
      double brkCls = 0.0;
      if(hasLow && MapzMscCtxBearishMssAlignedShort(bias, liq))
        {
         for(int k = refShift; k >= 1; k--)
           {
            if(k >= plShift)
               continue;
            const double lo = iLow(sym, tf, k);
            const double cl = iClose(sym, tf, k);
            if(reqClose)
              {
               if(lo < plPrice && cl >= plPrice)
                  saw_wick = true;
               if(cl < plPrice)
                 {
                  bear_ok = true;
                  brk = k;
                  brkCls = cl;
                  break;
                 }
              }
            else
              {
               if(lo < plPrice)
                 {
                  bear_ok = true;
                  brk = k;
                  brkCls = cl;
                  break;
                 }
              }
           }
        }

      bool bull_against = false;
      int brkB = -1;
      double brkClsB = 0.0;
      if(!bear_ok && hasHigh && MapzMscCtxBullishMssAgainstShort(bias, liq))
        {
         for(int k = refShift; k >= 1; k--)
           {
            if(k >= phShift)
               continue;
            const double hi = iHigh(sym, tf, k);
            const double cl = iClose(sym, tf, k);
            if(reqClose)
              {
               if(hi > phPrice && cl <= phPrice)
                  saw_wick = true;
               if(cl > phPrice)
                 {
                  bull_against = true;
                  brkB = k;
                  brkClsB = cl;
                  break;
                 }
              }
            else
              {
               if(hi > phPrice)
                 {
                  bull_against = true;
                  brkB = k;
                  brkClsB = cl;
                  break;
                 }
              }
           }
        }

      if(bear_ok)
        {
         out.mss_detected = true;
         out.mss_direction = "bearish";
         out.mss_break_level = plPrice;
         out.mss_close_price = brkCls;
         out.mss_valid_close = true;
         out.mss_break_bar_shift = brk;
         if(liq.sweep_bar_shift >= 0 && brk >= 0)
            out.mss_bars_after_sweep = MathAbs(liq.sweep_bar_shift - brk);
         else
            out.mss_bars_after_sweep = -1;
         out.mss_bars_before_entry = (brk >= 0 ? refShift - brk : -1);
        }
      else if(bull_against)
        {
         out.mss_detected = true;
         out.mss_direction = "bullish";
         out.mss_break_level = phPrice;
         out.mss_close_price = brkClsB;
         out.mss_valid_close = true;
         out.mss_break_bar_shift = brkB;
         if(liq.sweep_bar_shift >= 0 && brkB >= 0)
            out.mss_bars_after_sweep = MathAbs(liq.sweep_bar_shift - brkB);
         else
            out.mss_bars_after_sweep = -1;
         out.mss_bars_before_entry = (brkB >= 0 ? refShift - brkB : -1);
        }

      if(!out.mss_detected && hasMinorLow && mlMinShift >= 0 && mlMinShift != plShift)
        {
         bool ch_ok = false;
         int ck = -1;
         double ccls = 0.0;
         for(int k = refShift; k >= 1; k--)
           {
            if(k >= mlMinShift)
               continue;
            const double lo = iLow(sym, tf, k);
            const double cl = iClose(sym, tf, k);
            if(reqClose)
              {
               if(lo < mlMinPrice && cl >= mlMinPrice)
                  saw_wick = true;
               if(cl < mlMinPrice)
                 {
                  ch_ok = true;
                  ck = k;
                  ccls = cl;
                  break;
                 }
              }
            else if(lo < mlMinPrice)
              {
               ch_ok = true;
               ck = k;
               ccls = cl;
               break;
              }
           }
         if(ch_ok)
           {
            out.choch_detected = true;
            out.choch_direction = "bearish";
            out.choch_break_level = mlMinPrice;
            out.choch_close_price = ccls;
            out.choch_valid_close = true;
            out.choch_break_bar_shift = ck;
           }
        }

      if(!out.mss_detected && !out.choch_detected && hasMinorHigh && mhMinShift >= 0 && mhMinShift != phShift)
        {
         bool ch_bad = false;
         int ck = -1;
         double ccls = 0.0;
         for(int k = refShift; k >= 1; k--)
           {
            if(k >= mhMinShift)
               continue;
            const double hi = iHigh(sym, tf, k);
            const double cl = iClose(sym, tf, k);
            if(reqClose)
              {
               if(hi > mhMinPrice && cl <= mhMinPrice)
                  saw_wick = true;
               if(cl > mhMinPrice)
                 {
                  ch_bad = true;
                  ck = k;
                  ccls = cl;
                  break;
                 }
              }
            else if(hi > mhMinPrice)
              {
               ch_bad = true;
               ck = k;
               ccls = cl;
               break;
              }
           }
         if(ch_bad)
           {
            out.choch_detected = true;
            out.choch_direction = "bullish";
            out.choch_break_level = mhMinPrice;
            out.choch_close_price = ccls;
            out.choch_valid_close = true;
            out.choch_break_bar_shift = ck;
           }
        }
     }

   MapzMscFinalizeScore(out, dir, saw_wick);
  }

//+------------------------------------------------------------------+
string MapzMscCompactSuffix(const MapzMssChochTradeSnap &m)
  {
   const string dirW = (m.mss_detected ? m.mss_direction : (m.choch_detected ? m.choch_direction : "none"));
   const bool vc = (m.mss_valid_close || m.choch_valid_close);
   return StringFormat("msc_en=%s mss=%d choch=%d dir=%s valid_close=%s wick_only=%s score=%d",
                       (m.enabled ? "true" : "false"),
                       (m.mss_detected ? 1 : 0),
                       (m.choch_detected ? 1 : 0),
                       JsonStringEscape(dirW),
                       (vc ? "true" : "false"),
                       (m.wick_break_only ? "true" : "false"),
                       m.mss_choch_score);
  }

//+------------------------------------------------------------------+
string MapzMscTemporalGradeFromScore(const int sc)
  {
   if(sc >= 8)
      return "A";
   if(sc >= 6)
      return "B";
   if(sc >= 3)
      return "C";
   if(sc >= 1)
      return "Weak";
   return "None";
  }

//+------------------------------------------------------------------+
void MapzMscComputeTemporalDiagnostics(const string sym,
                                      const ENUM_TIMEFRAMES tf,
                                      const MapzLiquiditySnapshot &liq,
                                      const ENUM_MAPZ_SETUP_DIR tradeDir,
                                      const bool filled,
                                      const datetime entry_time,
                                      MapzMssChochTradeSnap &m)
  {
   m.mss_temporal_relevance_score = 0;
   m.mss_temporal_relevance_grade = "None";
   m.mss_after_sweep = false;
   m.mss_before_entry = false;
   m.mss_near_entry_window = false;
   m.mss_too_early = false;
   m.mss_too_late = false;
   m.mss_after_fvg = false;
   m.mss_before_fvg = false;
   m.mss_sweep_to_mss_bars = -1;
   m.mss_fvg_to_mss_bars = -1;
   m.mss_mss_to_entry_bars = -1;
   m.mss_temporal_relevance_reasons = "";

   m.choch_temporal_relevance_score = 0;
   m.choch_temporal_relevance_grade = "None";
   m.choch_after_sweep = false;
   m.choch_before_entry = false;
   m.choch_near_entry_window = false;
   m.choch_too_early = false;
   m.choch_too_late = false;
   m.choch_after_fvg = false;
   m.choch_before_fvg = false;
   m.choch_sweep_to_choch_bars = -1;
   m.choch_fvg_to_choch_bars = -1;
   m.choch_choch_to_entry_bars = -1;
   m.choch_temporal_relevance_reasons = "";

   if(!m.enabled)
     {
      MapzHtfAppendToken(m.mss_temporal_relevance_reasons, "mss_temporal_unknown");
      MapzHtfAppendToken(m.choch_temporal_relevance_reasons, "choch_temporal_unknown");
      return;
     }

   const int ref = m.ctx_setup_bar_shift;
   const int brk = m.mss_break_bar_shift;
   const int ck = m.choch_break_bar_shift;
   const int sweep = liq.sweep_bar_shift;
   const bool sweepOk = (liq.detected && sweep >= 0);
   int entryS = -1;
   if(filled && entry_time > 0)
      entryS = iBarShift(sym, tf, entry_time, false);

   if(m.mss_detected && brk >= 1 && ref >= 1)
     {
      if(brk < ref)
        {
         m.mss_after_fvg = true;
         MapzHtfAppendToken(m.mss_temporal_relevance_reasons, "mss_after_fvg");
        }
      else if(brk > ref)
        {
         m.mss_before_fvg = true;
         MapzHtfAppendToken(m.mss_temporal_relevance_reasons, "mss_before_fvg");
        }

      if(sweepOk)
        {
         if(brk < sweep)
           {
            m.mss_after_sweep = true;
            MapzHtfAppendToken(m.mss_temporal_relevance_reasons, "mss_after_sweep");
           }
         else if(brk > sweep)
           {
            MapzHtfAppendToken(m.mss_temporal_relevance_reasons, "mss_before_sweep");
           }
        }

      const int dRef = MathAbs(brk - ref);
      m.mss_fvg_to_mss_bars = dRef;
      if(sweepOk)
         m.mss_sweep_to_mss_bars = MathAbs(sweep - brk);
      if(filled && entryS >= 1)
         m.mss_mss_to_entry_bars = MathAbs(brk - entryS);

      if(dRef <= 8)
        {
         m.mss_near_entry_window = true;
         MapzHtfAppendToken(m.mss_temporal_relevance_reasons, "mss_near_entry_window");
        }
      if(dRef > 24)
        {
         m.mss_too_early = true;
         MapzHtfAppendToken(m.mss_temporal_relevance_reasons, "mss_too_early");
        }

      if(filled && entryS >= 1)
        {
         if(brk > entryS)
           {
            m.mss_before_entry = true;
            MapzHtfAppendToken(m.mss_temporal_relevance_reasons, "mss_before_entry");
           }
         if(brk < entryS)
           {
            MapzHtfAppendToken(m.mss_temporal_relevance_reasons, "mss_after_entry");
            m.mss_too_late = true;
            MapzHtfAppendToken(m.mss_temporal_relevance_reasons, "mss_too_late");
           }
        }
      else
        {
         if(brk >= 1 && brk <= ref)
           {
            m.mss_before_entry = true;
            MapzHtfAppendToken(m.mss_temporal_relevance_reasons, "mss_before_entry");
           }
        }

      int sc = 0;
      if(m.mss_after_sweep)
         sc += 2;
      if(m.mss_before_entry)
         sc += 2;
      if(m.mss_near_entry_window && !m.mss_too_late)
         sc += 2;
      if(m.mss_too_early)
         sc -= 2;
      if(m.mss_too_late)
         sc -= 2;
      const bool al = (tradeDir == MAPZ_SETUP_LONG && m.mss_direction == "bullish")
                   || (tradeDir == MAPZ_SETUP_SHORT && m.mss_direction == "bearish");
      if(al && m.mss_valid_close)
         sc += 2;
      if(m.mss_valid_close && !m.wick_break_only)
         sc += 1;
      if(m.wick_break_only && !m.mss_valid_close)
         sc -= 1;
      if(sc < 0)
         sc = 0;
      if(sc > 10)
         sc = 10;

      if(m.mss_after_sweep && m.mss_before_entry && m.mss_near_entry_window && !m.mss_too_early && !m.mss_too_late && al && m.mss_valid_close)
         MapzHtfAppendToken(m.mss_temporal_relevance_reasons, "mss_temporally_relevant");

      m.mss_temporal_relevance_score = sc;
      m.mss_temporal_relevance_grade = MapzMscTemporalGradeFromScore(sc);
     }
   else
     {
      MapzHtfAppendToken(m.mss_temporal_relevance_reasons, "mss_temporal_unknown");
     }

   if(m.choch_detected && !m.mss_detected && ck >= 1 && ref >= 1)
     {
      if(ck < ref)
        {
         m.choch_after_fvg = true;
         MapzHtfAppendToken(m.choch_temporal_relevance_reasons, "choch_after_fvg");
        }
      else if(ck > ref)
        {
         m.choch_before_fvg = true;
         MapzHtfAppendToken(m.choch_temporal_relevance_reasons, "choch_before_fvg");
        }

      if(sweepOk)
        {
         if(ck < sweep)
           {
            m.choch_after_sweep = true;
            MapzHtfAppendToken(m.choch_temporal_relevance_reasons, "choch_after_sweep");
           }
         else if(ck > sweep)
           {
            MapzHtfAppendToken(m.choch_temporal_relevance_reasons, "choch_before_sweep");
           }
        }

      const int dCk = MathAbs(ck - ref);
      m.choch_fvg_to_choch_bars = dCk;
      if(sweepOk)
         m.choch_sweep_to_choch_bars = MathAbs(sweep - ck);
      if(filled && entryS >= 1)
         m.choch_choch_to_entry_bars = MathAbs(ck - entryS);

      if(dCk <= 8)
        {
         m.choch_near_entry_window = true;
         MapzHtfAppendToken(m.choch_temporal_relevance_reasons, "choch_near_entry_window");
        }
      if(dCk > 24)
        {
         m.choch_too_early = true;
         MapzHtfAppendToken(m.choch_temporal_relevance_reasons, "choch_too_early");
        }

      if(filled && entryS >= 1)
        {
         if(ck > entryS)
           {
            m.choch_before_entry = true;
            MapzHtfAppendToken(m.choch_temporal_relevance_reasons, "choch_before_entry");
           }
         if(ck < entryS)
           {
            MapzHtfAppendToken(m.choch_temporal_relevance_reasons, "choch_after_entry");
            m.choch_too_late = true;
            MapzHtfAppendToken(m.choch_temporal_relevance_reasons, "choch_too_late");
           }
        }
      else
        {
         if(ck >= 1 && ck <= ref)
           {
            m.choch_before_entry = true;
            MapzHtfAppendToken(m.choch_temporal_relevance_reasons, "choch_before_entry");
           }
        }

      int scC = 0;
      if(m.choch_after_sweep)
         scC += 2;
      if(m.choch_before_entry)
         scC += 2;
      if(m.choch_near_entry_window && !m.choch_too_late)
         scC += 2;
      if(m.choch_too_early)
         scC -= 2;
      if(m.choch_too_late)
         scC -= 2;
      const bool alC = (tradeDir == MAPZ_SETUP_LONG && m.choch_direction == "bullish")
                    || (tradeDir == MAPZ_SETUP_SHORT && m.choch_direction == "bearish");
      if(alC && m.choch_valid_close)
         scC += 2;
      if(m.choch_valid_close && !m.wick_break_only)
         scC += 1;
      if(m.wick_break_only && !m.choch_valid_close)
         scC -= 1;
      if(scC < 0)
         scC = 0;
      if(scC > 10)
         scC = 10;

      if(m.choch_after_sweep && m.choch_before_entry && m.choch_near_entry_window && !m.choch_too_early && !m.choch_too_late && alC && m.choch_valid_close)
         MapzHtfAppendToken(m.choch_temporal_relevance_reasons, "choch_temporally_relevant");

      m.choch_temporal_relevance_score = scC;
      m.choch_temporal_relevance_grade = MapzMscTemporalGradeFromScore(scC);
     }
   else
     {
      MapzHtfAppendToken(m.choch_temporal_relevance_reasons, "choch_temporal_unknown");
     }
  }

//+------------------------------------------------------------------+
void MapzPdSnapClear(MapzPremiumDiscountTradeSnap &o)
  {
   o.log_enabled = false;
   o.range_source = "";
   o.range_high = 0.0;
   o.range_low = 0.0;
   o.midpoint = 0.0;
   o.position_pct = 0.0;
   o.entry_zone = "unknown";
   o.in_premium = false;
   o.in_discount = false;
   o.in_equilibrium = false;
   o.outside_range = false;
   o.zone_valid_for_direction = false;
   o.zone_conflict = false;
   o.entry_too_deep = false;
   o.entry_too_shallow = false;
   o.range_size_points = 0.0;
   o.distance_mid_points = 0.0;
   o.score = 0;
   o.grade = "None";
   o.reasons = "";
   o.range_geometry_ok = false;
  }

//+------------------------------------------------------------------+
string MapzPdGradeFromScore(const int sc)
  {
   if(sc >= 12)
      return "A";
   if(sc >= 9)
      return "B";
   if(sc >= 6)
      return "C";
   if(sc >= 2)
      return "Weak";
   return "None";
  }

//+------------------------------------------------------------------+
string MapzPdCompactSuffix(const MapzPremiumDiscountTradeSnap &p)
  {
   return StringFormat("pd_en=%s pd_zone=%s pd_pos=%.2f pd_valid=%s pd_conflict=%s pd_score=%d",
                       (p.log_enabled ? "true" : "false"),
                       JsonStringEscape(p.entry_zone),
                       p.position_pct,
                       (p.zone_valid_for_direction ? "true" : "false"),
                       (p.zone_conflict ? "true" : "false"),
                       p.score);
  }

//+------------------------------------------------------------------+
void MapzPremiumDiscountBuildTradeSnap(const string sym,
                                       const ENUM_TIMEFRAMES tf,
                                       const ENUM_MAPZ_SETUP_DIR dir,
                                       const datetime setupTime,
                                       const double entryPrice,
                                       const MapzHtfTradeSnap &htf,
                                       MapzPremiumDiscountTradeSnap &out)
  {
   MapzPdSnapClear(out);
   out.log_enabled = InpEnablePremiumDiscountV1;
   if(!InpEnablePremiumDiscountV1)
     {
      MapzHtfAppendToken(out.reasons, "pd_unknown");
      return;
     }

   const double pt = SymbolInfoDouble(sym, SYMBOL_POINT);
   const double ptSafe = (pt > 0.0 ? pt : 1e-9);

   int N = InpPremiumDiscountSwingLookbackBars;
   if(N < 1)
      N = 1;
   if(N > 5)
      N = 5;
   int mx = InpPremiumDiscountMaxBars;
   if(mx < 40)
      mx = 40;
   if(mx > 800)
      mx = 800;

   int bandPct = InpPremiumDiscountEquilibriumBandPct;
   if(bandPct < 1)
      bandPct = 1;
   if(bandPct > 25)
      bandPct = 25;

   const int refShift = iBarShift(sym, tf, setupTime, false);
   if(refShift < 1)
     {
      MapzHtfAppendToken(out.reasons, "pd_missing_range");
      return;
     }

   int shShift = -1, slShift = -1;
   double shPrice = 0.0, slPrice = 0.0;
   const bool hasHigh = MapzMscFindLatestSwingHigh(sym, tf, refShift, N, mx, shShift, shPrice);
   const bool hasLow = MapzMscFindLatestSwingLow(sym, tf, refShift, N, mx, slShift, slPrice);

   double rh = 0.0, rl = 0.0;
   string src = "";

   if(hasHigh && hasLow && shPrice > slPrice + ptSafe * 0.5)
     {
      rh = shPrice;
      rl = slPrice;
      src = "exec_tf_latest_swings";
     }
   else if(InpEnableHtfStructureV1 && htf.enabled
           && htf.h4_protected_high > htf.h4_protected_low + ptSafe * 0.5
           && MathIsValidNumber(htf.h4_protected_high)
           && MathIsValidNumber(htf.h4_protected_low))
     {
      rh = htf.h4_protected_high;
      rl = htf.h4_protected_low;
      src = "htf_h4_protected_range";
     }
   else if(hasHigh && hasLow)
     {
      rh = shPrice;
      rl = slPrice;
      src = "exec_tf_latest_swings";
      MapzHtfAppendToken(out.reasons, "pd_invalid_range");
     }
   else
     {
      MapzHtfAppendToken(out.reasons, "pd_missing_range");
     }

   if(StringFind(out.reasons, "pd_missing_range") >= 0)
      return;

   if(StringFind(out.reasons, "pd_invalid_range") >= 0 || !(rh > rl + ptSafe * 0.5))
     {
      out.range_high = rh;
      out.range_low = rl;
      out.range_source = src;
      return;
     }

   out.range_geometry_ok = true;
   out.range_high = rh;
   out.range_low = rl;
   out.range_source = src;
   out.midpoint = (rh + rl) / 2.0;
   out.range_size_points = (rh - rl) / ptSafe;
   out.distance_mid_points = MathAbs(entryPrice - out.midpoint) / ptSafe;

   out.position_pct = 100.0 * (entryPrice - rl) / (rh - rl);

   const double lowBand = 50.0 - (double)bandPct;
   const double highBand = 50.0 + (double)bandPct;

   out.outside_range = (entryPrice < rl - ptSafe * 0.5 || entryPrice > rh + ptSafe * 0.5);

   if(out.outside_range)
     {
      out.entry_zone = "unknown";
      MapzHtfAppendToken(out.reasons, "pd_entry_outside_range");
     }
   else if(out.position_pct < lowBand)
     {
      out.entry_zone = "discount";
      out.in_discount = true;
      MapzHtfAppendToken(out.reasons, "pd_entry_discount");
     }
   else if(out.position_pct > highBand)
     {
      out.entry_zone = "premium";
      out.in_premium = true;
      MapzHtfAppendToken(out.reasons, "pd_entry_premium");
     }
   else
     {
      out.entry_zone = "equilibrium";
      out.in_equilibrium = true;
      MapzHtfAppendToken(out.reasons, "pd_entry_equilibrium");
     }

   const bool longDir = (dir == MAPZ_SETUP_LONG);
   const bool shortDir = (dir == MAPZ_SETUP_SHORT);

   if(out.in_discount && longDir)
     {
      out.zone_valid_for_direction = true;
      MapzHtfAppendToken(out.reasons, "pd_zone_valid_for_long");
     }
   else if(out.in_premium && shortDir)
     {
      out.zone_valid_for_direction = true;
      MapzHtfAppendToken(out.reasons, "pd_zone_valid_for_short");
     }
   else if(out.in_premium && longDir)
     {
      out.zone_conflict = true;
      MapzHtfAppendToken(out.reasons, "pd_zone_conflict_long_in_premium");
     }
   else if(out.in_discount && shortDir)
     {
      out.zone_conflict = true;
      MapzHtfAppendToken(out.reasons, "pd_zone_conflict_short_in_discount");
     }

   if(out.range_geometry_ok)
      MapzHtfAppendToken(out.reasons, "pd_valid_range");

   if(out.range_size_points > 0.0 && out.range_size_points < 15.0)
      MapzHtfAppendToken(out.reasons, "pd_range_too_small");
   if(out.range_size_points > 50000.0)
      MapzHtfAppendToken(out.reasons, "pd_range_too_large");

   if(longDir)
     {
      if(out.outside_range && entryPrice < rl - ptSafe * 0.5)
         out.entry_too_deep = true;
      else if(!out.outside_range && out.in_discount && out.position_pct < 10.0)
         out.entry_too_deep = true;
      else if(!out.outside_range && out.in_discount && out.position_pct > 40.0)
         out.entry_too_shallow = true;
     }
   else if(shortDir)
     {
      if(out.outside_range && entryPrice > rh + ptSafe * 0.5)
         out.entry_too_deep = true;
      else if(!out.outside_range && out.in_premium && out.position_pct > 90.0)
         out.entry_too_deep = true;
      else if(!out.outside_range && out.in_premium && out.position_pct < 60.0)
         out.entry_too_shallow = true;
     }

   if(out.entry_too_deep)
      MapzHtfAppendToken(out.reasons, "pd_entry_too_deep");
   if(out.entry_too_shallow)
      MapzHtfAppendToken(out.reasons, "pd_entry_too_shallow");

   if(!InpPremiumDiscountScoreEnabled)
     {
      out.score = 0;
      out.grade = "None";
      MapzHtfAppendToken(out.reasons, "pd_score_disabled");
      return;
     }

   int sc = 0;
   if(out.outside_range)
     {
      sc = 3;
     }
   else if(out.in_equilibrium)
     {
      sc = 6;
     }
   else if(out.zone_conflict)
     {
      sc = 4;
     }
   else if(out.zone_valid_for_direction)
     {
      sc = 13;
      if(!out.entry_too_deep && !out.entry_too_shallow)
         sc = 15;
     }
   else
     {
      sc = 5;
     }

   if(StringFind(out.reasons, "pd_range_too_small") >= 0)
      sc -= 2;
   if(StringFind(out.reasons, "pd_range_too_large") >= 0)
      sc -= 1;
   if(out.entry_too_deep)
      sc -= 2;
   if(out.entry_too_shallow)
      sc -= 1;

   if(sc < 0)
      sc = 0;
   if(sc > 15)
      sc = 15;
   out.score = sc;
   out.grade = MapzPdGradeFromScore(sc);
  }

//+------------------------------------------------------------------+
void MapzEffSnapClear(MapzEntryFillFeasibilitySnap &o)
  {
   o.log_enabled = false;
   o.entry_price_for_fill_audit = 0.0;
   o.fvg_near_edge_price = 0.0;
   o.fvg_far_edge_price = 0.0;
   o.fvg_ce_price = 0.0;
   o.entry_depth_in_fvg_pct = 0.0;
   o.entry_distance_from_near_edge_points = 0.0;
   o.entry_distance_from_far_edge_points = 0.0;
   o.entry_distance_from_ce_points = 0.0;
   o.entry_outside_fvg = false;
   o.entry_geometry_unknown = true;
   o.fvg_touch_reached = false;
   o.fvg_ce_touch_reached = false;
   o.entry_price_reached = false;
   o.max_retrace_into_fvg_pct = 0.0;
   o.max_retrace_price = 0.0;
   o.max_retrace_to_entry_distance_points = 0.0;
   o.missed_entry_by_points = 0.0;
   o.bars_to_fvg_touch = -1;
   o.bars_to_ce_touch = -1;
   o.bars_to_entry_fill = -1;
   o.bars_to_max_retrace = -1;
   o.bars_until_expiration_or_resolution = -1;
   o.bars_observed = 0;
   o.extreme_retrace_price = 0.0;
   o.finalized = false;
   o.fill_status = "unknown";
   o.score = 0;
   o.grade = "None";
   o.reasons = "";
   o.entry_expired_unfilled = false;
   o.entry_missed_shallow_retrace = false;
   o.entry_too_deep_for_retest = false;
   o.entry_near_miss = false;
   o.entry_filled_fast = false;
   o.entry_filled_late = false;
   o.entry_invalidated_before_fill = false;
  }

//+------------------------------------------------------------------+
int MapzEffMaxBars(void)
  {
   if(InpEntryFillFeasibilityMaxBars > 0)
      return InpEntryFillFeasibilityMaxBars;
   return InpVirtualEntryExpiryBars;
  }

//+------------------------------------------------------------------+
string MapzEffGradeFromScore(const int sc)
  {
   if(sc >= 12)
      return "A";
   if(sc >= 9)
      return "B";
   if(sc >= 6)
      return "C";
   if(sc >= 2)
      return "Weak";
   return "None";
  }

//+------------------------------------------------------------------+
string MapzEffCompactSuffix(const MapzEntryFillFeasibilitySnap &e)
  {
   return StringFormat("fill_en=%s fill_status=%s fvg_touch=%s ce_touch=%s entry_touch=%s miss_pts=%.1f depth_pct=%.1f fill_score=%d",
                       (e.log_enabled ? "true" : "false"),
                       JsonStringEscape(e.fill_status),
                       (e.fvg_touch_reached ? "true" : "false"),
                       (e.fvg_ce_touch_reached ? "true" : "false"),
                       (e.entry_price_reached ? "true" : "false"),
                       e.missed_entry_by_points,
                       e.entry_depth_in_fvg_pct,
                       e.score);
  }

//+------------------------------------------------------------------+
void MapzEffInitGeometry(const ENUM_MAPZ_SETUP_DIR dir,
                         const double fvgLo,
                         const double fvgHi,
                         const double entry,
                         MapzEntryFillFeasibilitySnap &out)
  {
   MapzEffSnapClear(out);
   out.log_enabled = InpEnableEntryFillFeasibilityV1;
   if(!InpEnableEntryFillFeasibilityV1)
     {
      MapzEffAppendReasonOnce(out.reasons, "entry_geometry_unknown");
      return;
     }

   const double pt = SymbolInfoDouble(g_brokerSymbol, SYMBOL_POINT);
   const double ptSafe = (pt > 0.0 ? pt : 1e-9);
   const double lo = MathMin(fvgLo, fvgHi);
   const double hi = MathMax(fvgLo, fvgHi);
   const double span = hi - lo;

   out.entry_price_for_fill_audit = entry;
   out.fvg_ce_price = (lo + hi) / 2.0;

   if(span <= ptSafe * 0.5)
     {
      out.entry_geometry_unknown = true;
      MapzEffAppendReasonOnce(out.reasons, "entry_geometry_unknown");
      return;
     }

   out.entry_geometry_unknown = false;

   if(dir == MAPZ_SETUP_LONG)
     {
      out.fvg_near_edge_price = hi;
      out.fvg_far_edge_price = lo;
     }
   else if(dir == MAPZ_SETUP_SHORT)
     {
      out.fvg_near_edge_price = lo;
      out.fvg_far_edge_price = hi;
     }
   else
     {
      out.entry_geometry_unknown = true;
      MapzEffAppendReasonOnce(out.reasons, "entry_geometry_unknown");
      return;
     }

   out.entry_depth_in_fvg_pct = 100.0 * MathAbs(entry - out.fvg_near_edge_price) / span;
   out.entry_distance_from_near_edge_points = MathAbs(entry - out.fvg_near_edge_price) / ptSafe;
   out.entry_distance_from_far_edge_points = MathAbs(entry - out.fvg_far_edge_price) / ptSafe;
   out.entry_distance_from_ce_points = MathAbs(entry - out.fvg_ce_price) / ptSafe;

   out.entry_outside_fvg = (entry < lo - ptSafe * 0.5 || entry > hi + ptSafe * 0.5);
   if(out.entry_outside_fvg)
     {
      MapzEffAppendReasonOnce(out.reasons, "entry_outside_fvg");
     }
   else
     {
      if(out.entry_depth_in_fvg_pct <= 35.0)
         MapzEffAppendReasonOnce(out.reasons, "entry_depth_reasonable");
      else if(out.entry_depth_in_fvg_pct >= 72.0)
        {
         out.entry_too_deep_for_retest = true;
         MapzEffAppendReasonOnce(out.reasons, "entry_depth_too_deep");
        }
      else if(out.entry_depth_in_fvg_pct <= 18.0)
         MapzEffAppendReasonOnce(out.reasons, "entry_depth_too_shallow");
      else
         MapzEffAppendReasonOnce(out.reasons, "entry_depth_reasonable");
     }

   out.extreme_retrace_price = entry;
  }

//+------------------------------------------------------------------+
void MapzEffTrackBar(const ENUM_MAPZ_SETUP_DIR dir,
                     const double fvgLo,
                     const double fvgHi,
                     const double entry,
                     const double lo,
                     const double hi,
                     MapzEntryFillFeasibilitySnap &out)
  {
   if(!out.log_enabled || out.finalized)
      return;

   const double pt = SymbolInfoDouble(g_brokerSymbol, SYMBOL_POINT);
   const double ptSafe = (pt > 0.0 ? pt : 1e-9);
   const double zoneLo = MathMin(fvgLo, fvgHi);
   const double zoneHi = MathMax(fvgLo, fvgHi);
   const double span = zoneHi - zoneLo;
   if(span <= ptSafe * 0.5 || out.entry_geometry_unknown)
      return;

   out.bars_observed++;
   const int barN = out.bars_observed;

   if(dir == MAPZ_SETUP_LONG)
     {
      if(out.extreme_retrace_price == 0.0 || lo < out.extreme_retrace_price)
         out.extreme_retrace_price = lo;

      if(lo <= zoneHi + ptSafe * 0.5)
        {
         if(!out.fvg_touch_reached)
           {
            out.fvg_touch_reached = true;
            out.bars_to_fvg_touch = barN;
            MapzEffAppendReasonOnce(out.reasons, "fvg_touch_reached");
           }
        }
      if(lo <= out.fvg_ce_price + ptSafe * 0.5)
        {
         if(!out.fvg_ce_touch_reached)
           {
            out.fvg_ce_touch_reached = true;
            out.bars_to_ce_touch = barN;
            MapzEffAppendReasonOnce(out.reasons, "fvg_ce_touch_reached");
           }
        }
      if(lo <= entry + ptSafe * 0.5)
        {
         if(!out.entry_price_reached)
           {
            out.entry_price_reached = true;
            MapzEffAppendReasonOnce(out.reasons, "entry_price_reached");
           }
        }

      double retracePct = 0.0;
      if(lo <= zoneHi)
         retracePct = 100.0 * (zoneHi - lo) / span;
      if(retracePct > out.max_retrace_into_fvg_pct)
        {
         out.max_retrace_into_fvg_pct = retracePct;
         out.max_retrace_price = lo;
         out.bars_to_max_retrace = barN;
        }

      if(lo > entry)
        {
         const double miss = (lo - entry) / ptSafe;
         if(out.missed_entry_by_points == 0.0 || miss < out.missed_entry_by_points)
            out.missed_entry_by_points = miss;
        }
      else
         out.missed_entry_by_points = 0.0;
     }
   else if(dir == MAPZ_SETUP_SHORT)
     {
      if(out.extreme_retrace_price == 0.0 || hi > out.extreme_retrace_price)
         out.extreme_retrace_price = hi;

      if(hi >= zoneLo - ptSafe * 0.5)
        {
         if(!out.fvg_touch_reached)
           {
            out.fvg_touch_reached = true;
            out.bars_to_fvg_touch = barN;
            MapzEffAppendReasonOnce(out.reasons, "fvg_touch_reached");
           }
        }
      if(hi >= out.fvg_ce_price - ptSafe * 0.5)
        {
         if(!out.fvg_ce_touch_reached)
           {
            out.fvg_ce_touch_reached = true;
            out.bars_to_ce_touch = barN;
            MapzEffAppendReasonOnce(out.reasons, "fvg_ce_touch_reached");
           }
        }
      if(hi >= entry - ptSafe * 0.5)
        {
         if(!out.entry_price_reached)
           {
            out.entry_price_reached = true;
            MapzEffAppendReasonOnce(out.reasons, "entry_price_reached");
           }
        }

      double retracePct = 0.0;
      if(hi >= zoneLo)
         retracePct = 100.0 * (hi - zoneLo) / span;
      if(retracePct > out.max_retrace_into_fvg_pct)
        {
         out.max_retrace_into_fvg_pct = retracePct;
         out.max_retrace_price = hi;
         out.bars_to_max_retrace = barN;
        }

      if(hi < entry)
        {
         const double miss = (entry - hi) / ptSafe;
         if(out.missed_entry_by_points == 0.0 || miss < out.missed_entry_by_points)
            out.missed_entry_by_points = miss;
        }
      else
         out.missed_entry_by_points = 0.0;
     }

   out.max_retrace_to_entry_distance_points = out.missed_entry_by_points;

   if(out.max_retrace_into_fvg_pct >= 40.0)
      MapzEffAppendReasonOnce(out.reasons, "max_retrace_deep_enough");
   else if(out.fvg_touch_reached)
      MapzEffAppendReasonOnce(out.reasons, "max_retrace_shallow");
  }

//+------------------------------------------------------------------+
void MapzEffFinalize(const ENUM_MAPZ_SETUP_DIR dir,
                     const bool filled,
                     const int barsWaitingEntry,
                     const string outcome,
                     const string exitReason,
                     MapzEntryFillFeasibilitySnap &out)
  {
   if(!out.log_enabled || out.finalized)
      return;

   out.finalized = true;
   out.bars_until_expiration_or_resolution = (barsWaitingEntry > 0 ? barsWaitingEntry : out.bars_observed);

   if(filled)
     {
      out.fill_status = "filled";
      out.bars_to_entry_fill = out.bars_until_expiration_or_resolution;
      out.entry_price_reached = true;
      MapzEffAppendReasonOnce(out.reasons, "entry_fill_filled");
      if(out.bars_to_entry_fill <= 3)
        {
         out.entry_filled_fast = true;
         MapzEffAppendReasonOnce(out.reasons, "entry_fill_fast");
        }
      else if(out.bars_to_entry_fill > 10)
        {
         out.entry_filled_late = true;
         MapzEffAppendReasonOnce(out.reasons, "entry_fill_late");
        }
     }
   else if(out.entry_outside_fvg)
     {
      out.fill_status = "outside_fvg";
      MapzEffAppendReasonOnce(out.reasons, "entry_outside_fvg");
     }
   else if(out.entry_geometry_unknown)
     {
      out.fill_status = "unknown";
      MapzEffAppendReasonOnce(out.reasons, "entry_geometry_unknown");
     }
   else if(out.entry_too_deep_for_retest)
     {
      out.fill_status = "too_deep_for_retest";
      MapzEffAppendReasonOnce(out.reasons, "entry_too_deep_for_retest");
     }
   else if(StringFind(exitReason, "invalid") >= 0 || outcome == "invalid_risk")
     {
      out.fill_status = "invalidated_before_fill";
      out.entry_invalidated_before_fill = true;
      MapzEffAppendReasonOnce(out.reasons, "entry_invalidated_before_fill");
     }
   else if(!filled && out.fvg_touch_reached && !out.entry_price_reached && out.max_retrace_into_fvg_pct < 28.0)
     {
      out.fill_status = "missed_shallow_retrace";
      out.entry_missed_shallow_retrace = true;
      MapzEffAppendReasonOnce(out.reasons, "entry_missed_shallow_retrace");
     }
   else if(!filled && out.missed_entry_by_points > 0.0
           && out.missed_entry_by_points <= (double)InpEntryFillFeasibilityNearMissPoints)
     {
      out.fill_status = "near_miss";
      out.entry_near_miss = true;
      MapzEffAppendReasonOnce(out.reasons, "entry_fill_near_miss");
     }
   else if(outcome == "expired_unfilled" || StringFind(exitReason, "expired_unfilled") >= 0)
     {
      out.fill_status = "expired_unfilled";
      out.entry_expired_unfilled = true;
      MapzEffAppendReasonOnce(out.reasons, "entry_fill_expired_unfilled");
     }
   else
     {
      out.fill_status = "unknown";
      MapzEffAppendReasonOnce(out.reasons, "entry_geometry_unknown");
     }

   if(!InpEntryFillFeasibilityScoreEnabled)
     {
      out.score = 0;
      out.grade = "None";
      return;
     }

   int sc = 6;
   if(out.fill_status == "filled")
     {
      sc = 14;
      if(out.missed_entry_by_points <= 2.0)
         sc = 15;
     }
   else if(out.fill_status == "near_miss")
     {
      sc = 11;
     }
   else if(out.fill_status == "expired_unfilled")
     {
      sc = 7;
      if(out.fvg_touch_reached && out.max_retrace_into_fvg_pct >= 35.0)
         sc = 8;
     }
   else if(out.fill_status == "missed_shallow_retrace")
     {
      sc = 4;
     }
   else if(out.fill_status == "too_deep_for_retest" || out.fill_status == "outside_fvg")
     {
      sc = 3;
     }
   else if(out.fill_status == "invalidated_before_fill")
     {
      sc = 2;
     }

   if(out.entry_filled_late)
      sc -= 1;
   if(out.entry_too_deep_for_retest && out.fill_status != "too_deep_for_retest")
      sc -= 2;

   if(sc < 0)
      sc = 0;
   if(sc > 15)
      sc = 15;
   out.score = sc;
   out.grade = MapzEffGradeFromScore(sc);
  }

//+------------------------------------------------------------------+
void MapzEvSnapClear(MapzEntryVariantFeasibilitySnap &o)
  {
   o.log_enabled = false;
   o.geometry_unknown = false;
   o.edge_price = 0.0;
   o.p25_price = 0.0;
   o.p50_price = 0.0;
   o.p75_price = 0.0;
   o.adaptive_price = 0.0;
   o.adaptive_type = "";
   o.edge_reached = false;
   o.p25_reached = false;
   o.p50_reached = false;
   o.p75_reached = false;
   o.adaptive_reached = false;
   o.edge_missed_pts = 0.0;
   o.p25_missed_pts = 0.0;
   o.p50_missed_pts = 0.0;
   o.p75_missed_pts = 0.0;
   o.adaptive_missed_pts = 0.0;
   o.edge_bars_to_touch = 0;
   o.p25_bars_to_touch = 0;
   o.p50_bars_to_touch = 0;
   o.p75_bars_to_touch = 0;
   o.adaptive_bars_to_touch = 0;
   o.best_reached = "";
   o.best_reached_depth_pct = 0.0;
   o.official_depth_pct = 0.0;
   o.fill_gap_pct = 0.0;
   o.shallow_would_fill = false;
   o.deeper_would_not_fill = false;
   o.score = 0;
   o.grade = "None";
   o.reasons = "";
   o.finalized = false;
   o.bars_observed = 0;
  }

//+------------------------------------------------------------------+
double MapzEvPriceAtDepth(const double near, const double far, const double depthPct)
  {
   if(MathAbs(far - near) < 1e-12)
      return near;
   if(far >= near)
      return near + (depthPct / 100.0) * (far - near);
   return near - (depthPct / 100.0) * (near - far);
  }

//+------------------------------------------------------------------+
double MapzEvDepthPctFromPrice(const double near, const double far, const double price)
  {
   const double span = MathAbs(far - near);
   if(span <= 0.0)
      return 0.0;
   return 100.0 * MathAbs(price - near) / span;
  }

//+------------------------------------------------------------------+
string MapzEvGradeFromScore(const int sc)
  {
   if(sc >= 13)
      return "A";
   if(sc >= 10)
      return "B";
   if(sc >= 7)
      return "C";
   if(sc >= 4)
      return "D";
   if(sc > 0)
      return "F";
   return "None";
  }

//+------------------------------------------------------------------+
void MapzEvInitGeometry(const ENUM_MAPZ_SETUP_DIR dir,
                        const double fvgLo,
                        const double fvgHi,
                        const double officialEntry,
                        const MapzLiquiditySnapshot &liq,
                        const MapzMssChochTradeSnap &msc,
                        MapzEntryVariantFeasibilitySnap &out)
  {
   MapzEvSnapClear(out);
   out.log_enabled = InpEnableEntryVariantFeasibilityV1;
   if(!InpEnableEntryVariantFeasibilityV1)
     {
      out.geometry_unknown = true;
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_geometry_unknown");
      return;
     }

   const double pt = SymbolInfoDouble(g_brokerSymbol, SYMBOL_POINT);
   const double ptSafe = (pt > 0.0 ? pt : 1e-9);
   const double lo = MathMin(fvgLo, fvgHi);
   const double hi = MathMax(fvgLo, fvgHi);
   const double span = hi - lo;
   if(span <= ptSafe * 0.5)
     {
      out.geometry_unknown = true;
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_geometry_unknown");
      return;
     }

   double near = 0.0;
   double far = 0.0;
   if(dir == MAPZ_SETUP_LONG)
     {
      near = hi;
      far = lo;
     }
   else if(dir == MAPZ_SETUP_SHORT)
     {
      near = lo;
      far = hi;
     }
   else
     {
      out.geometry_unknown = true;
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_geometry_unknown");
      return;
     }

   out.geometry_unknown = false;
   out.edge_price = near;
   out.p25_price = MapzEvPriceAtDepth(near, far, 25.0);
   out.p50_price = MapzEvPriceAtDepth(near, far, 50.0);
   out.p75_price = MapzEvPriceAtDepth(near, far, 75.0);
   out.official_depth_pct = MapzEvDepthPctFromPrice(near, far, officialEntry);

   const bool chainStrong = (liq.chain_detected
                             && (liq.chain_score >= 7
                                 || liq.chain_grade == "A"
                                 || liq.chain_grade == "B"));
   const bool mssLate = (msc.mss_too_late || msc.choch_too_late);
   const bool mssWeak = (msc.mss_detected && msc.mss_temporal_relevance_score > 0
                         && msc.mss_temporal_relevance_score <= 4);
   const bool chochWeak = (msc.choch_detected && !msc.mss_detected
                           && msc.choch_temporal_relevance_score > 0
                           && msc.choch_temporal_relevance_score <= 4);

   if(chainStrong || mssLate || mssWeak || chochWeak)
     {
      out.adaptive_type = "edge";
      out.adaptive_price = out.edge_price;
     }
   else
     {
      out.adaptive_type = "25";
      out.adaptive_price = out.p25_price;
     }
  }

//+------------------------------------------------------------------+
void MapzEvTrackLevel(const ENUM_MAPZ_SETUP_DIR dir,
                      const double lo,
                      const double hi,
                      const double level,
                      const double ptSafe,
                      const int barN,
                      bool &reached,
                      int &barsToTouch,
                      double &missedPts,
                      const string reasonToken,
                      string &reasons)
  {
   if(reached)
      return;

   if(dir == MAPZ_SETUP_LONG)
     {
      if(lo <= level + ptSafe * 0.5)
        {
         reached = true;
         barsToTouch = barN;
         missedPts = 0.0;
         MapzEffAppendReasonOnce(reasons, reasonToken);
        }
      else if(lo > level)
        {
         const double miss = (lo - level) / ptSafe;
         if(missedPts == 0.0 || miss < missedPts)
            missedPts = miss;
        }
     }
   else if(dir == MAPZ_SETUP_SHORT)
     {
      if(hi >= level - ptSafe * 0.5)
        {
         reached = true;
         barsToTouch = barN;
         missedPts = 0.0;
         MapzEffAppendReasonOnce(reasons, reasonToken);
        }
      else if(hi < level)
        {
         const double miss = (level - hi) / ptSafe;
         if(missedPts == 0.0 || miss < missedPts)
            missedPts = miss;
        }
     }
  }

//+------------------------------------------------------------------+
void MapzEvTrackBar(const ENUM_MAPZ_SETUP_DIR dir,
                    const double lo,
                    const double hi,
                    MapzEntryVariantFeasibilitySnap &out)
  {
   if(!out.log_enabled || out.finalized || out.geometry_unknown)
      return;

   const double pt = SymbolInfoDouble(g_brokerSymbol, SYMBOL_POINT);
   const double ptSafe = (pt > 0.0 ? pt : 1e-9);
   out.bars_observed++;
   const int barN = out.bars_observed;

   MapzEvTrackLevel(dir, lo, hi, out.edge_price, ptSafe, barN,
                    out.edge_reached, out.edge_bars_to_touch, out.edge_missed_pts,
                    "entry_variant_edge_reached", out.reasons);
   MapzEvTrackLevel(dir, lo, hi, out.p25_price, ptSafe, barN,
                    out.p25_reached, out.p25_bars_to_touch, out.p25_missed_pts,
                    "entry_variant_25_reached", out.reasons);
   MapzEvTrackLevel(dir, lo, hi, out.p50_price, ptSafe, barN,
                    out.p50_reached, out.p50_bars_to_touch, out.p50_missed_pts,
                    "entry_variant_50_reached", out.reasons);
   MapzEvTrackLevel(dir, lo, hi, out.p75_price, ptSafe, barN,
                    out.p75_reached, out.p75_bars_to_touch, out.p75_missed_pts,
                    "entry_variant_75_reached", out.reasons);
   MapzEvTrackLevel(dir, lo, hi, out.adaptive_price, ptSafe, barN,
                    out.adaptive_reached, out.adaptive_bars_to_touch, out.adaptive_missed_pts,
                    "entry_variant_adaptive_reached", out.reasons);
  }

//+------------------------------------------------------------------+
void MapzEvFinalize(MapzEntryVariantFeasibilitySnap &out)
  {
   if(!out.log_enabled || out.finalized)
      return;
   out.finalized = true;

   if(out.geometry_unknown)
     {
      out.best_reached = "none";
      out.score = 0;
      out.grade = "None";
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_geometry_unknown");
      return;
     }

   double bestDepth = 999.0;
   string best = "none";
   if(out.edge_reached)
     {
      bestDepth = 0.0;
      best = "edge";
     }
   if(out.p25_reached && bestDepth > 25.0)
     {
      bestDepth = 25.0;
      best = "25";
     }
   if(out.p50_reached && bestDepth > 50.0)
     {
      bestDepth = 50.0;
      best = "50";
     }
   if(out.p75_reached && bestDepth > 75.0)
     {
      bestDepth = 75.0;
      best = "75";
     }
   if(out.adaptive_reached)
     {
      const double adDepth = (out.adaptive_type == "edge" ? 0.0 : 25.0);
      if(bestDepth > adDepth)
        {
         bestDepth = adDepth;
         best = "adaptive";
        }
     }

   out.best_reached = best;
   out.best_reached_depth_pct = (bestDepth < 900.0 ? bestDepth : 0.0);

   out.shallow_would_fill = (!out.p50_reached
                             && (out.edge_reached || out.p25_reached
                                 || (out.adaptive_reached && out.adaptive_type != "75")));
   out.deeper_would_not_fill = ((out.p25_reached || out.p50_reached) && !out.p75_reached);

   if(!out.p50_reached && out.best_reached_depth_pct > 0.0 && out.official_depth_pct > out.best_reached_depth_pct)
      out.fill_gap_pct = out.official_depth_pct - out.best_reached_depth_pct;
   else
      out.fill_gap_pct = 0.0;

   if(out.p50_reached)
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_ce_reached");
   if(out.p75_reached)
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_deep_reached");
   if(out.shallow_would_fill)
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_shallow_would_fill");
   if(out.deeper_would_not_fill)
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_deeper_would_not_fill");
   if(!out.p50_reached && out.official_depth_pct >= 45.0 && out.shallow_would_fill)
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_official_too_deep");

   const bool anyReached = (out.edge_reached || out.p25_reached || out.p50_reached
                            || out.p75_reached || out.adaptive_reached);
   if(!anyReached)
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_no_variant_reached");
   else if(!out.p50_reached && (out.edge_reached || out.p25_reached))
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_only_shallow_reached");

   if(!InpEntryVariantFeasibilityScoreEnabled)
     {
      out.score = 0;
      out.grade = "None";
      return;
     }

   int sc = 5;
   if(out.p50_reached)
     {
      sc = 14;
      if(out.edge_reached && out.p25_reached)
         sc = 15;
     }
   else if(out.p25_reached || out.adaptive_reached)
     {
      sc = 11;
     }
   else if(out.edge_reached)
     {
      sc = 8;
     }
   else if(anyReached)
     {
      sc = 6;
     }
   else
     {
      sc = 3;
     }

   if(out.shallow_would_fill && !out.p50_reached)
      sc = MathMax(sc, 10);
   if(sc < 0)
      sc = 0;
   if(sc > 15)
      sc = 15;
   out.score = sc;
   out.grade = MapzEvGradeFromScore(sc);
  }

//+------------------------------------------------------------------+
void MapzEvosRollupClear(MapzEvosRollup &r)
  {
   r.filled_count = 0;
   r.win_count = 0;
   r.loss_count = 0;
   r.ambiguous_count = 0;
   r.not_filled_count = 0;
   r.invalid_risk_count = 0;
   r.total_r = 0.0;
   r.risk_samples = 0;
   r.sum_risk_pts = 0.0;
  }

//+------------------------------------------------------------------+
void MapzEvosSlotClear(MapzVariantSimSlot &s)
  {
   s.entry_price = 0.0;
   s.sl_price = 0.0;
   s.tp_price = 0.0;
   s.risk_points = 0.0;
   s.effective_rr = 0.0;
   s.strict_official_parity = false;
   s.reached = false;
   s.sim_open = false;
   s.bars_to_fill = 0;
   s.bars_since_fill = 0;
   s.status = "";
   s.result_r = 0.0;
   s.ambiguous_flag = false;
   s.invalid_risk = false;
   s.finalized = false;
  }

//+------------------------------------------------------------------+
void MapzEvosSnapClear(MapzEntryVariantOutcomeSimSnap &o)
  {
   o.log_enabled = false;
   o.finalized = false;
   o.bars_observed = 0;
   o.reasons = "";
   MapzEvosSlotClear(o.edge);
   MapzEvosSlotClear(o.p25);
   MapzEvosSlotClear(o.p50);
   MapzEvosSlotClear(o.p75);
   MapzEvosSlotClear(o.adaptive);
   o.best_sim_variant = "";
   o.best_sim_result_r = 0.0;
   o.best_sim_status = "";
   o.best_sim_reasons = "";
   o.score = 0;
   o.grade = "None";
  }

//+------------------------------------------------------------------+
bool MapzEvosPrepareSlot(const ENUM_MAPZ_SETUP_DIR dir,
                         const double entryPx,
                         const double slOfficial,
                         MapzVariantSimSlot &slot)
  {
   MapzEvosSlotClear(slot);
   slot.entry_price = NormalizeDouble(entryPx, _Digits);
   slot.sl_price = NormalizeDouble(slOfficial, _Digits);
   const double pt = SymbolInfoDouble(g_brokerSymbol, SYMBOL_POINT);
   const double ptSafe = (pt > 0.0 ? pt : 1e-9);
   if(dir == MAPZ_SETUP_LONG)
     {
      slot.risk_points = (slot.entry_price - slot.sl_price) / ptSafe;
      if(slot.entry_price <= slot.sl_price)
        {
         slot.invalid_risk = true;
         slot.status = "invalid_risk";
         slot.finalized = true;
         return false;
        }
      slot.tp_price = NormalizeDouble(slot.entry_price + (slot.entry_price - slot.sl_price) * InpVirtualRiskReward, _Digits);
      if(slot.tp_price <= slot.entry_price)
        {
         slot.invalid_risk = true;
         slot.status = "invalid_risk";
         slot.finalized = true;
         return false;
        }
     }
   else if(dir == MAPZ_SETUP_SHORT)
     {
      slot.risk_points = (slot.sl_price - slot.entry_price) / ptSafe;
      if(slot.entry_price >= slot.sl_price)
        {
         slot.invalid_risk = true;
         slot.status = "invalid_risk";
         slot.finalized = true;
         return false;
        }
      slot.tp_price = NormalizeDouble(slot.entry_price - (slot.sl_price - slot.entry_price) * InpVirtualRiskReward, _Digits);
      if(slot.tp_price >= slot.entry_price)
        {
         slot.invalid_risk = true;
         slot.status = "invalid_risk";
         slot.finalized = true;
         return false;
        }
     }
   else
     {
      slot.invalid_risk = true;
      slot.status = "invalid_risk";
      slot.finalized = true;
      return false;
     }
   if(slot.risk_points <= 0.0)
     {
      slot.invalid_risk = true;
      slot.status = "invalid_risk";
      slot.finalized = true;
      return false;
     }
   slot.effective_rr = InpVirtualRiskReward;
   return true;
  }

//+------------------------------------------------------------------+
bool MapzEvosPrepareSlotStrictOfficial(const ENUM_MAPZ_SETUP_DIR dir,
                                     const double entryOfficial,
                                     const double slOfficial,
                                     const double tpOfficial,
                                     MapzVariantSimSlot &slot)
  {
   MapzEvosSlotClear(slot);
   slot.strict_official_parity = true;
   slot.entry_price = NormalizeDouble(entryOfficial, _Digits);
   slot.sl_price = NormalizeDouble(slOfficial, _Digits);
   slot.tp_price = NormalizeDouble(tpOfficial, _Digits);
   const double pt = SymbolInfoDouble(g_brokerSymbol, SYMBOL_POINT);
   const double ptSafe = (pt > 0.0 ? pt : 1e-9);
   if(dir == MAPZ_SETUP_LONG)
     {
      slot.risk_points = (slot.entry_price - slot.sl_price) / ptSafe;
      if(slot.entry_price <= slot.sl_price || slot.tp_price <= slot.entry_price)
        {
         slot.invalid_risk = true;
         slot.status = "invalid_risk";
         slot.finalized = true;
         return false;
        }
     }
   else if(dir == MAPZ_SETUP_SHORT)
     {
      slot.risk_points = (slot.sl_price - slot.entry_price) / ptSafe;
      if(slot.entry_price >= slot.sl_price || slot.tp_price >= slot.entry_price)
        {
         slot.invalid_risk = true;
         slot.status = "invalid_risk";
         slot.finalized = true;
         return false;
        }
     }
   else
     {
      slot.invalid_risk = true;
      slot.status = "invalid_risk";
      slot.finalized = true;
      return false;
     }
   if(slot.risk_points <= 0.0)
     {
      slot.invalid_risk = true;
      slot.status = "invalid_risk";
      slot.finalized = true;
      return false;
     }
   slot.effective_rr = InpVirtualRiskReward;
   return true;
  }

//+------------------------------------------------------------------+
void MapzEvosSyncP50StrictOnOfficialFill(const int barsToFillOfficial)
  {
   if(!g_vt.evos.log_enabled || !g_vt.evos.p50.strict_official_parity)
      return;
   if(g_vt.evos.p50.finalized || g_vt.evos.p50.invalid_risk)
      return;
   g_vt.evos.p50.reached = true;
   g_vt.evos.p50.sim_open = true;
   g_vt.evos.p50.bars_to_fill = barsToFillOfficial;
   g_vt.evos.p50.bars_since_fill = 0;
   MapzEffAppendReasonOnce(g_vt.evos.reasons, "entry_variant_sim_filled");
   MapzEffAppendReasonOnce(g_vt.evos.reasons, "entry_variant_sim_p50_official_parity");
   MapzBufEvosArmCellsFromBase(g_vt.dir, g_vt.evos.p50, 2);
  }

//+------------------------------------------------------------------+
void MapzEvosSyncP50StrictOnOfficialClose(const string outcome,
                                          const double resultR,
                                          const int barsHeldOfficial)
  {
   if(!g_vt.evos.log_enabled || !g_vt.evos.p50.strict_official_parity)
      return;
   if(g_vt.evos.p50.invalid_risk)
      return;
   if(outcome == "expired_unfilled" || !g_vt.filled)
     {
      g_vt.evos.p50.reached = false;
      g_vt.evos.p50.sim_open = false;
      g_vt.evos.p50.status = "not_filled";
      g_vt.evos.p50.result_r = 0.0;
      g_vt.evos.p50.bars_since_fill = 0;
      g_vt.evos.p50.ambiguous_flag = false;
      g_vt.evos.p50.finalized = true;
      MapzEffAppendReasonOnce(g_vt.evos.reasons, "entry_variant_sim_not_filled");
      return;
     }
   g_vt.evos.p50.reached = true;
   g_vt.evos.p50.sim_open = true;
   g_vt.evos.p50.status = outcome;
   g_vt.evos.p50.result_r = resultR;
   g_vt.evos.p50.bars_since_fill = barsHeldOfficial;
   g_vt.evos.p50.ambiguous_flag = (outcome == "ambiguous");
   g_vt.evos.p50.finalized = true;
   if(outcome == "win")
      MapzEffAppendReasonOnce(g_vt.evos.reasons, "entry_variant_sim_win");
   else if(outcome == "loss")
      MapzEffAppendReasonOnce(g_vt.evos.reasons, "entry_variant_sim_loss");
   else if(outcome == "ambiguous")
     {
      MapzEffAppendReasonOnce(g_vt.evos.reasons, "entry_variant_sim_ambiguous");
      MapzEffAppendReasonOnce(g_vt.evos.reasons, "entry_variant_sim_same_bar_ambiguous");
     }
  }

//+------------------------------------------------------------------+
bool MapzEvosBarTouchesEntry(const ENUM_MAPZ_SETUP_DIR dir,
                             const double lo,
                             const double hi,
                             const double entryPx)
  {
   const double pt = SymbolInfoDouble(g_brokerSymbol, SYMBOL_POINT);
   const double ptSafe = (pt > 0.0 ? pt : 1e-9);
   if(dir == MAPZ_SETUP_LONG)
      return (lo <= entryPx + ptSafe * 0.5);
   if(dir == MAPZ_SETUP_SHORT)
      return (hi >= entryPx - ptSafe * 0.5);
   return false;
  }

//+------------------------------------------------------------------+
void MapzEvosTryFillSlot(const ENUM_MAPZ_SETUP_DIR dir,
                         const double lo,
                         const double hi,
                         const int barN,
                         MapzVariantSimSlot &slot,
                         string &reasons)
  {
   if(slot.finalized || slot.invalid_risk || slot.reached)
      return;
   if(!MapzEvosBarTouchesEntry(dir, lo, hi, slot.entry_price))
      return;
   slot.reached = true;
   slot.sim_open = true;
   slot.bars_to_fill = barN;
   slot.bars_since_fill = 0;
   MapzEffAppendReasonOnce(reasons, "entry_variant_sim_filled");
  }

//+------------------------------------------------------------------+
void MapzEvosResolveSlotBar(const ENUM_MAPZ_SETUP_DIR dir,
                            const double lo,
                            const double hi,
                            MapzVariantSimSlot &slot,
                            string &reasons)
  {
   if(!slot.sim_open || slot.finalized || slot.invalid_risk)
      return;
   slot.bars_since_fill++;
   bool tpTouched = false;
   bool slTouched = false;
   if(dir == MAPZ_SETUP_LONG)
     {
      tpTouched = (hi >= slot.tp_price);
      slTouched = (lo <= slot.sl_price);
     }
   else if(dir == MAPZ_SETUP_SHORT)
     {
      tpTouched = (lo <= slot.tp_price);
      slTouched = (hi >= slot.sl_price);
     }
   if(tpTouched && !slTouched)
     {
      slot.status = "win";
      slot.result_r = InpVirtualRiskReward;
      slot.finalized = true;
      MapzEffAppendReasonOnce(reasons, "entry_variant_sim_win");
      return;
     }
   if(slTouched && !tpTouched)
     {
      slot.status = "loss";
      slot.result_r = -1.0;
      slot.finalized = true;
      MapzEffAppendReasonOnce(reasons, "entry_variant_sim_loss");
      return;
     }
   if(tpTouched && slTouched)
     {
      if(Trim(InpVirtualAmbiguityMode) == "ambiguous")
        {
         slot.status = "ambiguous";
         slot.result_r = 0.0;
         slot.ambiguous_flag = true;
         slot.finalized = true;
         MapzEffAppendReasonOnce(reasons, "entry_variant_sim_ambiguous");
         MapzEffAppendReasonOnce(reasons, "entry_variant_sim_same_bar_ambiguous");
        }
      return;
     }
   if(slot.bars_since_fill > InpVirtualMaxBarsInTrade)
     {
      slot.status = "unresolved";
      slot.result_r = 0.0;
      slot.finalized = true;
      MapzEffAppendReasonOnce(reasons, "entry_variant_sim_unresolved");
     }
  }

//+------------------------------------------------------------------+
void MapzEvosInitFromTrade(const ENUM_MAPZ_SETUP_DIR dir,
                           const double entryOfficial,
                           const double slOfficial,
                           const double tpOfficial,
                           const MapzEntryVariantFeasibilitySnap &ev,
                           MapzEntryVariantOutcomeSimSnap &out)
  {
   MapzEvosSnapClear(out);
   out.log_enabled = InpEnableEntryVariantOutcomeSimulationV1;
   if(!InpEnableEntryVariantOutcomeSimulationV1)
     {
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_geometry_unknown");
      return;
     }
   if(ev.geometry_unknown)
     {
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_geometry_unknown");
      return;
     }
   MapzEvosPrepareSlot(dir, ev.edge_price, slOfficial, out.edge);
   MapzEvosPrepareSlot(dir, ev.p25_price, slOfficial, out.p25);
   MapzEvosPrepareSlotStrictOfficial(dir, entryOfficial, slOfficial, tpOfficial, out.p50);
   MapzEvosPrepareSlot(dir, ev.p75_price, slOfficial, out.p75);
   MapzEvosPrepareSlot(dir, ev.adaptive_price, slOfficial, out.adaptive);
   if(out.edge.invalid_risk || out.p25.invalid_risk || out.p50.invalid_risk
      || out.p75.invalid_risk || out.adaptive.invalid_risk)
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_sim_invalid_risk");
   MapzEffAppendReasonOnce(out.reasons, "entry_variant_sim_ce_reference");
   MapzEffAppendReasonOnce(out.reasons, "entry_variant_sim_p50_official_control");
   MapzBufEvosClearTrade();
  }

//+------------------------------------------------------------------+
void MapzEvosTrackBar(const ENUM_MAPZ_SETUP_DIR dir,
                      const double lo,
                      const double hi,
                      MapzEntryVariantOutcomeSimSnap &out)
  {
   if(!out.log_enabled || out.finalized)
      return;
   out.bars_observed++;
   const int barN = out.bars_observed;
   MapzEvosTryFillSlot(dir, lo, hi, barN, out.edge, out.reasons);
   MapzEvosTryFillSlot(dir, lo, hi, barN, out.p25, out.reasons);
   if(!out.p50.strict_official_parity)
     {
      MapzEvosTryFillSlot(dir, lo, hi, barN, out.p50, out.reasons);
      MapzEvosResolveSlotBar(dir, lo, hi, out.p50, out.reasons);
     }
   MapzEvosTryFillSlot(dir, lo, hi, barN, out.p75, out.reasons);
   MapzEvosTryFillSlot(dir, lo, hi, barN, out.adaptive, out.reasons);
   MapzEvosResolveSlotBar(dir, lo, hi, out.edge, out.reasons);
   MapzEvosResolveSlotBar(dir, lo, hi, out.p25, out.reasons);
   MapzEvosResolveSlotBar(dir, lo, hi, out.p75, out.reasons);
   MapzEvosResolveSlotBar(dir, lo, hi, out.adaptive, out.reasons);
   MapzBufEvosTrackBar(dir, lo, hi, out);
  }

//+------------------------------------------------------------------+
void MapzEvosFinalizeSlotOpen(MapzVariantSimSlot &slot, string &reasons)
  {
   if(slot.finalized)
      return;
   if(slot.invalid_risk)
     {
      if(slot.status == "")
         slot.status = "invalid_risk";
      slot.finalized = true;
      return;
     }
   if(!slot.reached)
     {
      slot.status = "not_filled";
      slot.result_r = 0.0;
      slot.finalized = true;
      MapzEffAppendReasonOnce(reasons, "entry_variant_sim_not_filled");
      return;
     }
   if(slot.sim_open && !slot.finalized)
     {
      slot.status = "unresolved";
      slot.result_r = 0.0;
      slot.finalized = true;
      MapzEffAppendReasonOnce(reasons, "entry_variant_sim_unresolved");
     }
  }

//+------------------------------------------------------------------+
void MapzEvosPickBest(MapzEntryVariantOutcomeSimSnap &out)
  {
   double bestR = -1e12;
   string bestName = "";
   string bestSt = "";
   const double candidates[5] = {out.edge.result_r, out.p25.result_r, out.p50.result_r, out.p75.result_r, out.adaptive.result_r};
   const string names[5] = {"edge", "25", "50", "75", "adaptive"};
   const string stats[5] = {out.edge.status, out.p25.status, out.p50.status, out.p75.status, out.adaptive.status};
   for(int i = 0; i < 5; i++)
     {
      if(stats[i] == "not_filled" || stats[i] == "invalid_risk")
         continue;
      if(candidates[i] > bestR)
        {
         bestR = candidates[i];
         bestName = names[i];
         bestSt = stats[i];
        }
     }
   out.best_sim_variant = bestName;
   out.best_sim_result_r = (bestName != "" ? bestR : 0.0);
   out.best_sim_status = bestSt;
   if(bestName != "")
      out.best_sim_reasons = "entry_variant_best_sim=" + bestName;
  }

//+------------------------------------------------------------------+
void MapzEvosFinalizeTrade(MapzEntryVariantOutcomeSimSnap &out)
  {
   if(!out.log_enabled || out.finalized)
      return;
   out.finalized = true;
   MapzEvosFinalizeSlotOpen(out.edge, out.reasons);
   MapzEvosFinalizeSlotOpen(out.p25, out.reasons);
   if(!out.p50.strict_official_parity || !out.p50.finalized)
      MapzEvosFinalizeSlotOpen(out.p50, out.reasons);
   MapzEvosFinalizeSlotOpen(out.p75, out.reasons);
   MapzEvosFinalizeSlotOpen(out.adaptive, out.reasons);
   if(out.edge.reached && !out.p50.reached)
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_sim_edge_more_fillable");
   if(out.p25.reached && !out.p50.reached)
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_sim_25_more_fillable");
   if(out.p75.reached && out.p50.reached)
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_sim_deep_reached");
   else if(!out.p75.reached && (out.p50.reached || out.p25.reached))
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_sim_75_less_fillable");
   if(out.adaptive.reached)
      MapzEffAppendReasonOnce(out.reasons, "entry_variant_sim_adaptive_reference");
   MapzEvosPickBest(out);
   MapzBufEvosFinalizeTrade(out);
   if(!InpEntryVariantOutcomeSimulationScoreEnabled)
     {
      out.score = 0;
      out.grade = "None";
      return;
     }
   int sc = 6;
   if(out.p50.status == "win")
      sc = 12;
   if(out.best_sim_result_r >= InpVirtualRiskReward - 0.01)
      sc = 14;
   if(out.edge.reached && out.p50.status == "not_filled")
      sc = MathMax(sc, 9);
   if(sc > 15)
      sc = 15;
   if(sc < 0)
      sc = 0;
   out.score = sc;
   out.grade = MapzEvGradeFromScore(sc);
  }

//+------------------------------------------------------------------+
void MapzEvosRegisterSlotCampaign(const MapzVariantSimSlot &slot, MapzEvosRollup &rollup)
  {
   if(slot.invalid_risk)
     {
      rollup.invalid_risk_count++;
      return;
     }
   if(!slot.reached || slot.status == "not_filled")
     {
      rollup.not_filled_count++;
      return;
     }
   rollup.filled_count++;
   rollup.total_r += slot.result_r;
   if(slot.risk_points > 0.0)
     {
      rollup.risk_samples++;
      rollup.sum_risk_pts += slot.risk_points;
     }
   if(slot.status == "win")
      rollup.win_count++;
   else if(slot.status == "loss")
      rollup.loss_count++;
   else if(slot.status == "ambiguous")
      rollup.ambiguous_count++;
  }

//+------------------------------------------------------------------+
void MapzEvosRegisterTradeCampaign(const MapzEntryVariantOutcomeSimSnap &out)
  {
   if(!out.log_enabled)
      return;
   MapzEvosRegisterSlotCampaign(out.edge, g_evos_edge_sum);
   MapzEvosRegisterSlotCampaign(out.p25, g_evos_25_sum);
   MapzEvosRegisterSlotCampaign(out.p50, g_evos_50_sum);
   MapzEvosRegisterSlotCampaign(out.p75, g_evos_75_sum);
   MapzEvosRegisterSlotCampaign(out.adaptive, g_evos_adaptive_sum);
   const int n = 5;
   const double expR[5] = {
      (g_evos_edge_sum.filled_count > 0 ? g_evos_edge_sum.total_r / (double)g_evos_edge_sum.filled_count : 0.0),
      (g_evos_25_sum.filled_count > 0 ? g_evos_25_sum.total_r / (double)g_evos_25_sum.filled_count : 0.0),
      (g_evos_50_sum.filled_count > 0 ? g_evos_50_sum.total_r / (double)g_evos_50_sum.filled_count : 0.0),
      (g_evos_75_sum.filled_count > 0 ? g_evos_75_sum.total_r / (double)g_evos_75_sum.filled_count : 0.0),
      (g_evos_adaptive_sum.filled_count > 0 ? g_evos_adaptive_sum.total_r / (double)g_evos_adaptive_sum.filled_count : 0.0)
   };
   const double totR[5] = {g_evos_edge_sum.total_r, g_evos_25_sum.total_r, g_evos_50_sum.total_r, g_evos_75_sum.total_r, g_evos_adaptive_sum.total_r};
   const long fillC[5] = {g_evos_edge_sum.filled_count, g_evos_25_sum.filled_count, g_evos_50_sum.filled_count,
                          g_evos_75_sum.filled_count, g_evos_adaptive_sum.filled_count};
   const long ambC[5] = {g_evos_edge_sum.ambiguous_count, g_evos_25_sum.ambiguous_count, g_evos_50_sum.ambiguous_count,
                         g_evos_75_sum.ambiguous_count, g_evos_adaptive_sum.ambiguous_count};
   const string names[5] = {"edge", "25", "50", "75", "adaptive"};
   for(int i = 0; i < n; i++)
     {
      if(expR[i] > g_evos_best_expectancy_r)
        {
         g_evos_best_expectancy_r = expR[i];
         g_evos_best_expectancy_variant = names[i];
        }
      if(totR[i] > g_evos_best_total_r)
        {
         g_evos_best_total_r = totR[i];
         g_evos_best_total_r_variant = names[i];
        }
      if(ambC[i] < g_evos_lowest_ambiguous_count)
        {
         g_evos_lowest_ambiguous_count = ambC[i];
         g_evos_lowest_ambiguous_variant = names[i];
        }
      if(fillC[i] > g_evos_highest_fill_count)
        {
         g_evos_highest_fill_count = fillC[i];
         g_evos_highest_fill_variant = names[i];
        }
     }
  }

//+------------------------------------------------------------------+
string MapzEvosFormatSlotCsv(const MapzVariantSimSlot &s)
  {
   return "," + s.status
          + "," + DoubleToString(s.result_r, 3)
          + "," + DoubleToString(s.entry_price, _Digits)
          + "," + DoubleToString(s.sl_price, _Digits)
          + "," + DoubleToString(s.tp_price, _Digits)
          + "," + DoubleToString(s.risk_points, 2)
          + "," + DoubleToString(s.effective_rr, 3)
          + "," + IntegerToString(s.bars_to_fill)
          + "," + IntegerToString((s.finalized && s.reached ? s.bars_since_fill : 0))
          + "," + (s.ambiguous_flag ? "true" : "false")
          + "," + (s.invalid_risk ? "true" : "false");
  }

//+------------------------------------------------------------------+
void MapzEvosAppendSummaryRollup(string &json, const string prefix, const MapzEvosRollup &r)
  {
   const double winrate = ((r.win_count + r.loss_count) > 0
                           ? (double)r.win_count / (double)(r.win_count + r.loss_count)
                           : 0.0);
   const double expectancy = (r.filled_count > 0 ? r.total_r / (double)r.filled_count : 0.0);
   const double avgRisk = (r.risk_samples > 0 ? r.sum_risk_pts / (double)r.risk_samples : 0.0);
   json += StringFormat("  \"entry_variant_%s_sim_filled_count\": %I64d,\r\n", prefix, r.filled_count);
   json += StringFormat("  \"entry_variant_%s_sim_win_count\": %I64d,\r\n", prefix, r.win_count);
   json += StringFormat("  \"entry_variant_%s_sim_loss_count\": %I64d,\r\n", prefix, r.loss_count);
   json += StringFormat("  \"entry_variant_%s_sim_ambiguous_count\": %I64d,\r\n", prefix, r.ambiguous_count);
   json += StringFormat("  \"entry_variant_%s_sim_not_filled_count\": %I64d,\r\n", prefix, r.not_filled_count);
   json += StringFormat("  \"entry_variant_%s_sim_invalid_risk_count\": %I64d,\r\n", prefix, r.invalid_risk_count);
   json += StringFormat("  \"entry_variant_%s_sim_total_r\": %.6f,\r\n", prefix, r.total_r);
   json += StringFormat("  \"entry_variant_%s_sim_expectancy_r\": %.6f,\r\n", prefix, expectancy);
   json += StringFormat("  \"entry_variant_%s_sim_winrate\": %.6f,\r\n", prefix, winrate);
   json += StringFormat("  \"entry_variant_%s_sim_average_risk_points\": %.6f,\r\n", prefix, avgRisk);
  }

//+------------------------------------------------------------------+
bool MapzBufEvosEnabled(void)
  {
   return (InpEnableBufferedEvosV1 && InpEnableEntryVariantOutcomeSimulationV1);
  }

//+------------------------------------------------------------------+
int MapzBufEvosBufferPoints(const int bi)
  {
   if(bi == 0)
      return InpBufferedEvosBufferA_Points;
   if(bi == 1)
      return InpBufferedEvosBufferB_Points;
   if(bi == 2)
      return InpBufferedEvosBufferC_Points;
   if(bi == 3)
      return InpBufferedEvosBufferD_Points;
   if(bi == 4)
      return InpBufferedEvosBufferE_Points;
   if(bi == 5)
      return InpBufferedEvosBufferF_Points;
   return 0;
  }

//+------------------------------------------------------------------+
string MapzBufEvosBufferLabel(const int bi)
  {
   const int pts = MapzBufEvosBufferPoints(bi);
   if(pts == 0)
      return "b0";
   if(pts == 5)
      return "b5";
   if(pts == 10)
      return "b10";
   if(pts == 20)
      return "b20";
   if(pts == 30)
      return "b30";
   if(pts == 50)
      return "b50";
   return "b" + IntegerToString(pts);
  }

//+------------------------------------------------------------------+
string MapzBufEvosVariantPrefix(const int vi)
  {
   if(vi == 0)
      return "edge";
   if(vi == 1)
      return "p25";
   if(vi == 2)
      return "p50";
   if(vi == 3)
      return "adaptive";
   return "";
  }

//+------------------------------------------------------------------+
void MapzBufEvosCellClear(MapzBufferedEvosCell &cell)
  {
   cell.armed = false;
   cell.invalid_risk = false;
   cell.reached = false;
   cell.sim_open = false;
   cell.finalized = false;
   cell.bars_to_fill = 0;
   cell.bars_since_fill = 0;
   cell.buffered_entry = 0.0;
   cell.sl_price = 0.0;
   cell.tp_price = 0.0;
   cell.risk_points = 0.0;
   cell.reward_points = 0.0;
   cell.effective_rr = 0.0;
   cell.fragile = false;
   cell.status = "";
   cell.result_r = 0.0;
   cell.ambiguous_flag = false;
  }

//+------------------------------------------------------------------+
void MapzBufEvosClearTrade(void)
  {
   for(int vi = 0; vi < BUF_EVOS_VAR_N; vi++)
      for(int bi = 0; bi < BUF_EVOS_BUF_N; bi++)
         MapzBufEvosCellClear(g_buf_evos_cells[vi][bi]);
  }

//+------------------------------------------------------------------+
bool MapzBufEvosComputeGeometry(const ENUM_MAPZ_SETUP_DIR dir,
                                const double baseEntry,
                                const double slPrice,
                                const double tpPrice,
                                const int bufferPts,
                                MapzBufferedEvosCell &cell)
  {
   const double pt = SymbolInfoDouble(g_brokerSymbol, SYMBOL_POINT);
   const double ptSafe = (pt > 0.0 ? pt : 1e-9);
   const double bufPx = (double)bufferPts * ptSafe;
   cell.sl_price = NormalizeDouble(slPrice, _Digits);
   cell.tp_price = NormalizeDouble(tpPrice, _Digits);
   if(dir == MAPZ_SETUP_LONG)
     {
      cell.buffered_entry = NormalizeDouble(baseEntry + bufPx, _Digits);
      cell.risk_points = (cell.buffered_entry - cell.sl_price) / ptSafe;
      cell.reward_points = (cell.tp_price - cell.buffered_entry) / ptSafe;
     }
   else if(dir == MAPZ_SETUP_SHORT)
     {
      cell.buffered_entry = NormalizeDouble(baseEntry - bufPx, _Digits);
      cell.risk_points = (cell.sl_price - cell.buffered_entry) / ptSafe;
      cell.reward_points = (cell.buffered_entry - cell.tp_price) / ptSafe;
     }
   else
     {
      cell.invalid_risk = true;
      cell.status = "invalid_risk";
      cell.finalized = true;
      return false;
     }
   if(cell.risk_points <= 0.0 || cell.reward_points <= 0.0)
     {
      cell.invalid_risk = true;
      cell.status = "invalid_risk";
      cell.finalized = true;
      return false;
     }
   cell.effective_rr = cell.reward_points / cell.risk_points;
   cell.fragile = (cell.effective_rr < InpBufferedEvosMinEffectiveRr);
   return true;
  }

//+------------------------------------------------------------------+
void MapzBufEvosArmCellsFromBase(const ENUM_MAPZ_SETUP_DIR dir,
                                 const MapzVariantSimSlot &base,
                                 const int vi)
  {
   if(!MapzBufEvosEnabled() || base.invalid_risk || !base.reached)
      return;
   if(g_buf_evos_cells[vi][0].armed)
      return;
   for(int bi = 0; bi < BUF_EVOS_BUF_N; bi++)
     {
      MapzBufEvosCellClear(g_buf_evos_cells[vi][bi]);
      g_buf_evos_cells[vi][bi].armed = true;
      const int bufferPts = MapzBufEvosBufferPoints(bi);
      if(!MapzBufEvosComputeGeometry(dir, base.entry_price, base.sl_price, base.tp_price, bufferPts, g_buf_evos_cells[vi][bi]))
         continue;
      g_buf_evos_cells[vi][bi].reached = true;
      g_buf_evos_cells[vi][bi].sim_open = true;
      g_buf_evos_cells[vi][bi].bars_to_fill = base.bars_to_fill;
      g_buf_evos_cells[vi][bi].bars_since_fill = 0;
     }
  }

//+------------------------------------------------------------------+
void MapzBufEvosResolveCellBar(const ENUM_MAPZ_SETUP_DIR dir,
                               const double lo,
                               const double hi,
                               MapzBufferedEvosCell &cell)
  {
   if(!cell.sim_open || cell.finalized || cell.invalid_risk)
      return;
   cell.bars_since_fill++;
   bool tpTouched = false;
   bool slTouched = false;
   if(dir == MAPZ_SETUP_LONG)
     {
      tpTouched = (hi >= cell.tp_price);
      slTouched = (lo <= cell.sl_price);
     }
   else if(dir == MAPZ_SETUP_SHORT)
     {
      tpTouched = (lo <= cell.tp_price);
      slTouched = (hi >= cell.sl_price);
     }
   if(tpTouched && !slTouched)
     {
      cell.status = "win";
      cell.result_r = cell.reward_points / cell.risk_points;
      cell.finalized = true;
      return;
     }
   if(slTouched && !tpTouched)
     {
      cell.status = "loss";
      cell.result_r = -1.0;
      cell.finalized = true;
      return;
     }
   if(tpTouched && slTouched)
     {
      if(Trim(InpVirtualAmbiguityMode) == "ambiguous")
        {
         cell.status = "ambiguous";
         cell.result_r = 0.0;
         cell.ambiguous_flag = true;
         cell.finalized = true;
        }
      return;
     }
   if(cell.bars_since_fill > InpVirtualMaxBarsInTrade)
     {
      cell.status = "unresolved";
      cell.result_r = 0.0;
      cell.finalized = true;
     }
  }

//+------------------------------------------------------------------+
void MapzBufEvosTrackVariant(const ENUM_MAPZ_SETUP_DIR dir,
                             const double lo,
                             const double hi,
                             const MapzVariantSimSlot &base,
                             const int vi)
  {
   if(!MapzBufEvosEnabled() || base.invalid_risk)
      return;
   MapzBufEvosArmCellsFromBase(dir, base, vi);
   if(!g_buf_evos_cells[vi][0].armed)
      return;
   for(int bi = 0; bi < BUF_EVOS_BUF_N; bi++)
     {
      if(g_buf_evos_cells[vi][bi].finalized || g_buf_evos_cells[vi][bi].invalid_risk || !g_buf_evos_cells[vi][bi].sim_open)
         continue;
      MapzBufEvosResolveCellBar(dir, lo, hi, g_buf_evos_cells[vi][bi]);
     }
  }

//+------------------------------------------------------------------+
void MapzBufEvosTrackBar(const ENUM_MAPZ_SETUP_DIR dir,
                         const double lo,
                         const double hi,
                         MapzEntryVariantOutcomeSimSnap &out)
  {
   if(!MapzBufEvosEnabled() || !out.log_enabled || out.finalized)
      return;
   MapzBufEvosTrackVariant(dir, lo, hi, out.edge, 0);
   MapzBufEvosTrackVariant(dir, lo, hi, out.p25, 1);
   MapzBufEvosTrackVariant(dir, lo, hi, out.p50, 2);
   MapzBufEvosTrackVariant(dir, lo, hi, out.adaptive, 3);
  }

//+------------------------------------------------------------------+
void MapzBufEvosFinalizeCell(MapzBufferedEvosCell &cell)
  {
   if(cell.finalized)
      return;
   if(cell.invalid_risk)
     {
      if(cell.status == "")
         cell.status = "invalid_risk";
      cell.finalized = true;
      return;
     }
   if(!cell.armed || !cell.reached)
     {
      cell.status = "not_filled";
      cell.result_r = 0.0;
      cell.finalized = true;
      return;
     }
   if(cell.sim_open && !cell.finalized)
     {
      cell.status = "unresolved";
      cell.result_r = 0.0;
      cell.finalized = true;
     }
  }

//+------------------------------------------------------------------+
void MapzBufEvosFinalizeTrade(MapzEntryVariantOutcomeSimSnap &out)
  {
   if(!MapzBufEvosEnabled() || !out.log_enabled)
      return;
   for(int vi = 0; vi < BUF_EVOS_VAR_N; vi++)
      for(int bi = 0; bi < BUF_EVOS_BUF_N; bi++)
         MapzBufEvosFinalizeCell(g_buf_evos_cells[vi][bi]);
  }

//+------------------------------------------------------------------+
void MapzBufEvosRegisterCell(const MapzBufferedEvosCell &cell, MapzBufferedEvosRollup &rollup)
  {
   if(cell.invalid_risk)
     {
      rollup.invalid_risk_count++;
      return;
     }
   if(!cell.armed || !cell.reached || cell.status == "not_filled")
     {
      rollup.not_filled_count++;
      return;
     }
   rollup.filled_count++;
   rollup.total_r += cell.result_r;
   if(cell.risk_points > 0.0)
     {
      rollup.risk_samples++;
      rollup.sum_risk_pts += cell.risk_points;
     }
   if(cell.reward_points > 0.0)
     {
      rollup.reward_samples++;
      rollup.sum_reward_pts += cell.reward_points;
     }
   if(cell.effective_rr > 0.0)
     {
      rollup.eff_rr_samples++;
      rollup.sum_eff_rr += cell.effective_rr;
     }
   if(cell.fragile)
      rollup.fragile_count++;
   if(cell.bars_to_fill <= 1 && cell.finalized && cell.bars_since_fill <= 1
      && (cell.status == "win" || cell.status == "loss" || cell.status == "ambiguous"))
      rollup.fast_fill_close_count++;
   if(cell.status == "win")
     {
      rollup.win_count++;
      if(cell.fragile)
         rollup.wins_failing_min_rr_count++;
     }
   else if(cell.status == "loss")
      rollup.loss_count++;
   else if(cell.status == "ambiguous")
      rollup.ambiguous_count++;
   else if(cell.status == "unresolved")
      rollup.unresolved_count++;
  }

//+------------------------------------------------------------------+
void MapzBufEvosRegisterTrade(const MapzEntryVariantOutcomeSimSnap &out)
  {
   if(!MapzBufEvosEnabled() || !out.log_enabled)
      return;
   for(int vi = 0; vi < BUF_EVOS_VAR_N; vi++)
      for(int bi = 0; bi < BUF_EVOS_BUF_N; bi++)
         MapzBufEvosRegisterCell(g_buf_evos_cells[vi][bi], g_buf_evos_rollups[vi][bi]);
  }

//+------------------------------------------------------------------+
void MapzBufEvosComputeBestVariants(void)
  {
   for(int bi = 0; bi < BUF_EVOS_BUF_N; bi++)
     {
      g_buf_evos_best_expectancy_variant[bi] = "";
      g_buf_evos_best_expectancy_r[bi] = -1e12;
      for(int vi = 0; vi < BUF_EVOS_VAR_N; vi++)
        {
         const MapzBufferedEvosRollup r = g_buf_evos_rollups[vi][bi];
         const double e = (r.filled_count > 0 ? r.total_r / (double)r.filled_count : 0.0);
         if(e > g_buf_evos_best_expectancy_r[bi])
           {
            g_buf_evos_best_expectancy_r[bi] = e;
            g_buf_evos_best_expectancy_variant[bi] = MapzBufEvosVariantPrefix(vi);
           }
        }
     }
  }

//+------------------------------------------------------------------+
void MapzBufEvosAppendRollup(string &json, const int vi, const int bi)
  {
   const MapzBufferedEvosRollup r = g_buf_evos_rollups[vi][bi];
   const string vp = MapzBufEvosVariantPrefix(vi);
   const string bl = MapzBufEvosBufferLabel(bi);
   const string keyBase = "buffered_evos_" + vp + "_" + bl + "_";
   const double winrate = ((r.win_count + r.loss_count) > 0
                           ? (double)r.win_count / (double)(r.win_count + r.loss_count)
                           : 0.0);
   const double expectancy = (r.filled_count > 0 ? r.total_r / (double)r.filled_count : 0.0);
   const double avgRisk = (r.risk_samples > 0 ? r.sum_risk_pts / (double)r.risk_samples : 0.0);
   const double avgReward = (r.reward_samples > 0 ? r.sum_reward_pts / (double)r.reward_samples : 0.0);
   const double avgEffRr = (r.eff_rr_samples > 0 ? r.sum_eff_rr / (double)r.eff_rr_samples : 0.0);
   json += StringFormat("  \"%sfilled_count\": %I64d,\r\n", keyBase, r.filled_count);
   json += StringFormat("  \"%swin_count\": %I64d,\r\n", keyBase, r.win_count);
   json += StringFormat("  \"%sloss_count\": %I64d,\r\n", keyBase, r.loss_count);
   json += StringFormat("  \"%sambiguous_count\": %I64d,\r\n", keyBase, r.ambiguous_count);
   json += StringFormat("  \"%sunresolved_count\": %I64d,\r\n", keyBase, r.unresolved_count);
   json += StringFormat("  \"%snot_filled_count\": %I64d,\r\n", keyBase, r.not_filled_count);
   json += StringFormat("  \"%sinvalid_risk_count\": %I64d,\r\n", keyBase, r.invalid_risk_count);
   json += StringFormat("  \"%sfragile_count\": %I64d,\r\n", keyBase, r.fragile_count);
   json += StringFormat("  \"%stotal_r\": %.6f,\r\n", keyBase, r.total_r);
   json += StringFormat("  \"%sexpectancy_r\": %.6f,\r\n", keyBase, expectancy);
   json += StringFormat("  \"%swinrate\": %.6f,\r\n", keyBase, winrate);
   json += StringFormat("  \"%saverage_effective_rr\": %.6f,\r\n", keyBase, avgEffRr);
   json += StringFormat("  \"%saverage_risk_points\": %.6f,\r\n", keyBase, avgRisk);
   json += StringFormat("  \"%saverage_reward_points\": %.6f,\r\n", keyBase, avgReward);
   json += StringFormat("  \"%sfast_fill_close_count\": %I64d,\r\n", keyBase, r.fast_fill_close_count);
   if(vi == 0)
     {
      json += StringFormat("  \"%swins_failing_min_effective_rr_count\": %I64d,\r\n", keyBase, r.wins_failing_min_rr_count);
      json += StringFormat("  \"%sedge_wins_fragile_count\": %I64d,\r\n", keyBase, r.wins_failing_min_rr_count);
     }
  }

//+------------------------------------------------------------------+
void MapzBufEvosAppendSummary(string &json)
  {
   MapzBufEvosComputeBestVariants();
   for(int vi = 0; vi < BUF_EVOS_VAR_N; vi++)
      for(int bi = 0; bi < BUF_EVOS_BUF_N; bi++)
         MapzBufEvosAppendRollup(json, vi, bi);
   json += "  \"buffered_evos_best_variant_by_expectancy_b0\": \"" + JsonStringEscape(g_buf_evos_best_expectancy_variant[0]) + "\",\r\n";
   json += "  \"buffered_evos_best_variant_by_expectancy_b30\": \"" + JsonStringEscape(g_buf_evos_best_expectancy_variant[4]) + "\",\r\n";
   json += "  \"buffered_evos_best_variant_by_expectancy_b50\": \"" + JsonStringEscape(g_buf_evos_best_expectancy_variant[5]) + "\",\r\n";
  }

//+------------------------------------------------------------------+
void MapzEqComputeScoresFromState(const ENUM_MAPZ_SETUP_DIR dir,
                                  const ENUM_MAPZ_BIAS biasEnum,
                                  const long fvgPts,
                                  const double entry,
                                  const double sl,
                                  const double tp,
                                  const double riskAbs,
                                  const bool filled,
                                  const string outcome,
                                  const MapzLiquiditySnapshot &liq,
                                  const MapzHtfTradeSnap &htfSnap,
                                  MapzEqScorePack &out)
  {
   out.entry_quality_score = 0;
   out.entry_quality_grade = "off";
   out.htf_narrative_score = 0;
   out.liquidity_event_score = 0;
   out.displacement_fvg_quality_score = 0;
   out.entry_confirmation_score = 0;
   out.target_quality_score = 0;
   out.session_news_spread_score = 0;
   out.risk_overtrading_score = 0;
   out.ambiguous_risk_score = 0;
   out.quality_reasons = "";
   out.missing_quality_components = "";
   out.ambiguous_risk_reasons = "";
   out.liquidity_event_type = "none";
   out.session_bucket = "unknown";
   out.trade_window_status = "unknown";
   out.spread_status = "unknown";
   out.news_mode = "observe_only";

   if(!InpEntryQualityScoreEnabled)
     {
      out.missing_quality_components = "entry_quality_score_export_disabled|";
      return;
     }

   const bool longDir = (dir == MAPZ_SETUP_LONG);
   const bool shortDir = (dir == MAPZ_SETUP_SHORT);
   const bool biasAlign = (longDir && biasEnum == MAPZ_BIAS_BULLISH) || (shortDir && biasEnum == MAPZ_BIAS_BEARISH);

   const bool useHtfEq = (InpEnableHtfStructureV1 && InpHtfStructureScoreEnabled && htfSnap.enabled);
   if(useHtfEq)
     {
      out.htf_narrative_score = htfSnap.htf_structure_score;
      if(biasAlign)
         out.quality_reasons += "daily_bias_aligned|";
      else if(biasEnum == MAPZ_BIAS_NEUTRAL)
         out.missing_quality_components += "neutral_bias_context|";
      else if(biasEnum == MAPZ_BIAS_UNKNOWN)
         out.missing_quality_components += "daily_bias_unknown|";
      else
         out.missing_quality_components += "bias_not_aligned|";
      if(htfSnap.htf_structure_aligned)
         out.quality_reasons += "htf_structure_aligned|";
      if(htfSnap.htf_structure_conflict)
         out.quality_reasons += "htf_structure_conflict|";
     }
   else
     {
      if(biasAlign)
        {
         out.htf_narrative_score = 18;
         out.quality_reasons += "daily_bias_aligned|";
        }
      else if(biasEnum == MAPZ_BIAS_NEUTRAL)
        {
         out.htf_narrative_score = 5;
         out.missing_quality_components += "neutral_bias_context|";
        }
      else if(biasEnum == MAPZ_BIAS_UNKNOWN)
        {
         out.htf_narrative_score = 3;
         out.missing_quality_components += "daily_bias_unknown|";
        }
      else
        {
         out.htf_narrative_score = 0;
         out.missing_quality_components += "bias_not_aligned|";
        }
     }

   if(InpEnableHtfStructureV1 && htfSnap.enabled)
     {
      // H4/H1 structure exported — do not emit legacy missing_h4_h1_structure placeholder.
     }
   else if(InpUseH4Context || InpUseH1Context)
      out.missing_quality_components += "missing_h4_h1_structure|";

   out.liquidity_event_score = 0;
   out.liquidity_event_type = liq.ev_type;
   if(!InpEnableLiquiditySweepDetection)
     {
      out.missing_quality_components += "liquidity_sweep_detection_disabled|";
      out.quality_reasons += "liquidity_sweep_disabled|";
     }
   else
     {
      if(InpLiquiditySweepScoreEnabled)
        {
         if(!liq.detected || liq.ev_type == "none")
           {
            out.quality_reasons += "liquidity_sweep_not_found|";
           }
         else
           {
            int qs = 0;
            if(liq.chain_detected)
              {
               qs = liq.chain_score;
               out.quality_reasons += "liquidity_chain_v1|";
               if(StringLen(liq.chain_reasons) > 0)
                  out.quality_reasons += liq.chain_reasons + "|";
              }
            else
              {
               qs = liq.quality_score;
               if(qs > 7)
                  qs = 7;
               out.quality_reasons += "liquidity_chain_weak_or_absent|";
               if(StringLen(liq.chain_reasons) > 0)
                  out.quality_reasons += liq.chain_reasons + "|";
               if(StringLen(liq.quality_reasons) > 0)
                  out.quality_reasons += liq.quality_reasons + "|";
              }
            if(qs < 0)
               qs = 0;
            if(qs > 20)
               qs = 20;
            out.liquidity_event_score = qs;
           }
        }
      else
        {
         out.quality_reasons += "liquidity_sweep_score_disabled|";
        }
     }

   const int vmin = (InpVirtualMinTradeFvgPoints > 0 ? InpVirtualMinTradeFvgPoints : 1);
   const double ratio = (double)fvgPts / (double)vmin;
   string fvgBucket = "below_virtual_min";
   if(fvgPts < vmin)
     {
      out.displacement_fvg_quality_score = 0;
      fvgBucket = "below_virtual_min";
     }
   else if(ratio < 1.25)
     {
      out.displacement_fvg_quality_score = 5;
      fvgBucket = "near_min";
     }
   else if(ratio < 2.0)
     {
      out.displacement_fvg_quality_score = 10;
      fvgBucket = "medium";
     }
   else
     {
      out.displacement_fvg_quality_score = 15;
      fvgBucket = "strong";
     }
   out.quality_reasons += StringFormat("fvg_size_bucket=%s|", fvgBucket);

   if(!filled)
     {
      out.entry_confirmation_score = 3;
      out.missing_quality_components += "entry_not_filled|";
     }
   else if(outcome == "ambiguous")
     {
      out.entry_confirmation_score = 6;
      out.quality_reasons += "midpoint_fill|";
     }
   else if(outcome == "win" || outcome == "loss")
     {
      out.entry_confirmation_score = 8;
      out.quality_reasons += "midpoint_fill|";
     }
   else
     {
      out.entry_confirmation_score = 5;
      out.quality_reasons += "midpoint_fill|";
     }
   out.missing_quality_components += "confirmation_not_implemented|";

   if(riskAbs <= 0.0 || (!longDir && !shortDir))
     {
      out.target_quality_score = 0;
      out.missing_quality_components += "invalid_risk_geometry|";
     }
   else
     {
      const double rrObs = (longDir ? (tp - entry) / (entry - sl) : (entry - tp) / (sl - entry));
      const double rrTol = 0.25;
      if(MathAbs(rrObs - InpVirtualRiskReward) <= rrTol)
         out.target_quality_score = 7;
      else
         out.target_quality_score = 5;
      out.quality_reasons += "rr_geometry_ok|";
     }
   out.missing_quality_components += "target_liquidity_not_implemented|";

   out.session_news_spread_score = 0;
   out.missing_quality_components += "session_news_spread_not_implemented|";

   if(InpVirtualOneTradeAtATime)
      out.risk_overtrading_score = 5;
   else
      out.risk_overtrading_score = 3;
   out.missing_quality_components += "risk_daily_limits_not_implemented|";

   const double pt = SymbolInfoDouble(g_brokerSymbol, SYMBOL_POINT);
   long riskPts = 0;
   if(pt > 0.0 && riskAbs > 0.0)
      riskPts = (long)MathRound(riskAbs / pt);

   int amb = 25;
   if(fvgPts < (long)(vmin * 1.5))
     {
      amb += 20;
      out.ambiguous_risk_reasons += "small_fvg|";
     }
   if(riskPts > 0 && riskPts < (long)(vmin * 1.2))
     {
      amb += 20;
      out.ambiguous_risk_reasons += "tight_risk|";
     }
   if(outcome == "ambiguous")
     {
      amb += 30;
      out.ambiguous_risk_reasons += "both_sl_tp_possible|";
     }
   else if(StringLen(outcome) == 0)
     {
      out.ambiguous_risk_reasons += "unknown_until_exit|";
     }

   if(g_initOk && pt > 0.0 && riskAbs > 0.0)
     {
      const datetime tEx = g_vt.exit_time;
      if(tEx > 0)
        {
         const int sh = iBarShift(g_brokerSymbol, InpExecutionTimeframe, tEx, false);
         if(sh >= 0)
           {
            const double rg = iHigh(g_brokerSymbol, InpExecutionTimeframe, sh)
                              - iLow(g_brokerSymbol, InpExecutionTimeframe, sh);
            if(rg > riskAbs * 3.0)
              {
               amb += 15;
               out.ambiguous_risk_reasons += "large_exit_bar_range|";
              }
           }
        }
     }

   if(amb > 100)
      amb = 100;
   if(amb < 0)
      amb = 0;
   out.ambiguous_risk_score = amb;

   out.entry_quality_score = out.htf_narrative_score + out.liquidity_event_score + out.displacement_fvg_quality_score
                             + out.entry_confirmation_score + out.target_quality_score + out.session_news_spread_score
                             + out.risk_overtrading_score;
   if(out.entry_quality_score > 100)
      out.entry_quality_score = 100;
   if(out.entry_quality_score < 0)
      out.entry_quality_score = 0;
   out.entry_quality_grade = MapzEqGradeFromTotal(out.entry_quality_score);
  }

//+------------------------------------------------------------------+
string MapzEqScoresToDetailsSuffix(const MapzEqScorePack &p, const MapzLiquiditySnapshot &lx, const MapzHtfTradeSnap &hx)
  {
   const string htfComp = StringFormat(
             " htf_en=%s h4=%s h1=%s htf_ali=%s htf_cnf=%s htf_scr=%d",
             (hx.enabled ? "true" : "false"),
             JsonStringEscape(hx.h4_structure_direction),
             JsonStringEscape(hx.h1_structure_direction),
             (hx.htf_structure_aligned ? "true" : "false"),
             (hx.htf_structure_conflict ? "true" : "false"),
             hx.htf_structure_score);
   return StringFormat(
             "eq_score=%d eq_grade=%s eq_htf=%d eq_liq=%d eq_disp=%d eq_entry=%d eq_tgt=%d eq_sess=%d eq_risk=%d eq_amb_risk=%d eq_miss=%s eq_qual=%s eq_amb_rsn=%s liq_type=%s "
             "liq_ev_det=%s liq_ev_type=%s liq_ev_dir=%s liq_age=%d liq_lvl=%.5f liq_sweep_px=%.5f liq_dist_pts=%I64d liq_rsn=%s "
             "liq_q=%d liq_q_grade=%s liq_q_rec=%d liq_q_dir=%d liq_q_react=%d liq_q_disp=%d liq_q_dist=%d liq_q_rsn=%s "
             "sess_bucket=%s tw=%s spr=%s news=%s%s",
             p.entry_quality_score,
             JsonStringEscape(p.entry_quality_grade),
             p.htf_narrative_score,
             p.liquidity_event_score,
             p.displacement_fvg_quality_score,
             p.entry_confirmation_score,
             p.target_quality_score,
             p.session_news_spread_score,
             p.risk_overtrading_score,
             p.ambiguous_risk_score,
             JsonStringEscape(p.missing_quality_components),
             JsonStringEscape(p.quality_reasons),
             JsonStringEscape(p.ambiguous_risk_reasons),
             JsonStringEscape(p.liquidity_event_type),
             (lx.detected ? "true" : "false"),
             JsonStringEscape(lx.ev_type),
             JsonStringEscape(lx.direction),
             lx.age_bars,
             lx.level,
             lx.sweep_price,
             lx.distance_pts,
             JsonStringEscape(lx.reasons),
             lx.quality_score,
             JsonStringEscape(lx.quality_grade),
             lx.recency_score,
             lx.directional_score,
             lx.reaction_score,
             lx.displacement_score,
             lx.distance_score,
             JsonStringEscape(lx.quality_reasons),
             JsonStringEscape(p.session_bucket),
             JsonStringEscape(p.trade_window_status),
             JsonStringEscape(p.spread_status),
             JsonStringEscape(p.news_mode),
             htfComp);
  }

//+------------------------------------------------------------------+
string VirtualBuildDetailsCore(void)
  {
   MapzEqScorePack eqp;
   MapzEqComputeScoresFromState(g_vt.dir,
                                g_vt.bias_enum,
                                g_vt.fvg_points,
                                g_vt.entry,
                                g_vt.sl,
                                g_vt.tp,
                                g_vt.risk_abs,
                                g_vt.filled,
                                g_vt.outcome,
                                g_vt.liq,
                                g_vt.htf,
                                eqp);
   const string base = StringFormat(
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
   return base + " " + MapzEqScoresToDetailsSuffix(eqp, g_vt.liq, g_vt.htf) + " " + MapzMscCompactSuffix(g_vt.msc) + " " + MapzPdCompactSuffix(g_vt.pd) + " " + MapzEffCompactSuffix(g_vt.eff);
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
   if(g_vt.eff.log_enabled && !g_vt.eff.finalized)
      MapzEffFinalize(g_vt.dir, g_vt.filled, bars_to_fill_export, g_vt.outcome, g_vt.exit_reason, g_vt.eff);
   if(g_vt.ev.log_enabled && !g_vt.ev.finalized)
      MapzEvFinalize(g_vt.ev);
   if(g_vt.evos.log_enabled && !g_vt.evos.finalized)
      MapzEvosFinalizeTrade(g_vt.evos);
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

   MapzEqScorePack eqp;
   MapzEqComputeScoresFromState(g_vt.dir,
                                g_vt.bias_enum,
                                g_vt.fvg_points,
                                g_vt.entry,
                                g_vt.sl,
                                g_vt.tp,
                                g_vt.risk_abs,
                                g_vt.filled,
                                g_vt.outcome,
                                g_vt.liq,
                                g_vt.htf,
                                eqp);
   MapzMscComputeTemporalDiagnostics(g_brokerSymbol, InpExecutionTimeframe, g_vt.liq, g_vt.dir, g_vt.filled, g_vt.entry_time, g_vt.msc);
   row += "," + IntegerToString(eqp.entry_quality_score)
          + "," + eqp.entry_quality_grade
          + "," + IntegerToString(eqp.htf_narrative_score)
          + "," + IntegerToString(eqp.liquidity_event_score)
          + "," + IntegerToString(eqp.displacement_fvg_quality_score)
          + "," + IntegerToString(eqp.entry_confirmation_score)
          + "," + IntegerToString(eqp.target_quality_score)
          + "," + IntegerToString(eqp.session_news_spread_score)
          + "," + IntegerToString(eqp.risk_overtrading_score)
          + "," + IntegerToString(eqp.ambiguous_risk_score)
          + "," + eqp.quality_reasons
          + "," + eqp.missing_quality_components
          + "," + eqp.ambiguous_risk_reasons
          + "," + (g_vt.liq.detected ? "true" : "false")
          + "," + g_vt.liq.ev_type
          + "," + g_vt.liq.direction
          + "," + IntegerToString(g_vt.liq.age_bars)
          + "," + DoubleToString(g_vt.liq.level, _Digits)
          + "," + DoubleToString(g_vt.liq.sweep_price, _Digits)
          + "," + IntegerToString((int)g_vt.liq.distance_pts)
          + "," + g_vt.liq.reasons
          + "," + IntegerToString(g_vt.liq.quality_score)
          + "," + g_vt.liq.quality_grade
          + "," + IntegerToString(g_vt.liq.recency_score)
          + "," + IntegerToString(g_vt.liq.directional_score)
          + "," + IntegerToString(g_vt.liq.reaction_score)
          + "," + IntegerToString(g_vt.liq.displacement_score)
          + "," + IntegerToString(g_vt.liq.distance_score)
          + "," + g_vt.liq.quality_reasons
          + "," + (g_vt.liq.chain_detected ? "true" : "false")
          + "," + g_vt.liq.chain_grade
          + "," + IntegerToString(g_vt.liq.chain_score)
          + "," + IntegerToString(g_vt.liq.chain_sweep_to_setup_bars)
          + "," + IntegerToString(g_vt.liq.chain_sweep_to_fvg_bars)
          + "," + (g_vt.liq.chain_reaction_confirmed ? "true" : "false")
          + "," + (g_vt.liq.chain_displacement_confirmed ? "true" : "false")
          + "," + (g_vt.liq.chain_fvg_created_after_sweep ? "true" : "false")
          + "," + IntegerToString((int)g_vt.liq.chain_distance_to_fvg_points)
          + "," + g_vt.liq.chain_reasons
          + "," + g_vt.liq.chain_reaction_failure_reason
          + "," + DoubleToString(g_vt.liq.chain_reaction_close_price, _Digits)
          + "," + DoubleToString(g_vt.liq.chain_reaction_level, _Digits)
          + "," + IntegerToString(g_vt.liq.chain_reaction_bars_checked)
          + "," + (g_vt.htf.enabled ? "true" : "false")
          + "," + g_vt.htf.h4_structure_state
          + "," + g_vt.htf.h1_structure_state
          + "," + g_vt.htf.h4_structure_direction
          + "," + g_vt.htf.h1_structure_direction
          + "," + (g_vt.htf.htf_structure_aligned ? "true" : "false")
          + "," + (g_vt.htf.htf_structure_conflict ? "true" : "false")
          + "," + IntegerToString(g_vt.htf.htf_structure_score)
          + "," + DoubleToString(g_vt.htf.h4_protected_high, _Digits)
          + "," + DoubleToString(g_vt.htf.h4_protected_low, _Digits)
          + "," + DoubleToString(g_vt.htf.h1_protected_high, _Digits)
          + "," + DoubleToString(g_vt.htf.h1_protected_low, _Digits)
          + "," + DoubleToString(g_vt.htf.h4_external_liquidity_high, _Digits)
          + "," + DoubleToString(g_vt.htf.h4_external_liquidity_low, _Digits)
          + "," + DoubleToString(g_vt.htf.h1_external_liquidity_high, _Digits)
          + "," + DoubleToString(g_vt.htf.h1_external_liquidity_low, _Digits)
          + "," + g_vt.htf.htf_structure_reasons
          + "," + (g_vt.msc.enabled ? "true" : "false")
          + "," + (g_vt.msc.mss_detected ? "true" : "false")
          + "," + g_vt.msc.mss_direction
          + "," + DoubleToString(g_vt.msc.mss_break_level, _Digits)
          + "," + DoubleToString(g_vt.msc.mss_close_price, _Digits)
          + "," + IntegerToString(g_vt.msc.mss_bars_after_sweep)
          + "," + IntegerToString(g_vt.msc.mss_bars_before_entry)
          + "," + (g_vt.msc.mss_valid_close ? "true" : "false")
          + "," + (g_vt.msc.choch_detected ? "true" : "false")
          + "," + g_vt.msc.choch_direction
          + "," + DoubleToString(g_vt.msc.choch_break_level, _Digits)
          + "," + DoubleToString(g_vt.msc.choch_close_price, _Digits)
          + "," + (g_vt.msc.choch_valid_close ? "true" : "false")
          + "," + (g_vt.msc.wick_break_only ? "true" : "false")
          + "," + DoubleToString(g_vt.msc.internal_swing_high, _Digits)
          + "," + DoubleToString(g_vt.msc.internal_swing_low, _Digits)
          + "," + IntegerToString(g_vt.msc.internal_swing_high_age_bars)
          + "," + IntegerToString(g_vt.msc.internal_swing_low_age_bars)
          + "," + IntegerToString(g_vt.msc.mss_choch_score)
          + "," + g_vt.msc.mss_choch_reasons
          + "," + IntegerToString(g_vt.msc.mss_temporal_relevance_score)
          + "," + g_vt.msc.mss_temporal_relevance_grade
          + "," + (g_vt.msc.mss_after_sweep ? "true" : "false")
          + "," + (g_vt.msc.mss_before_entry ? "true" : "false")
          + "," + (g_vt.msc.mss_near_entry_window ? "true" : "false")
          + "," + (g_vt.msc.mss_too_early ? "true" : "false")
          + "," + (g_vt.msc.mss_too_late ? "true" : "false")
          + "," + (g_vt.msc.mss_after_fvg ? "true" : "false")
          + "," + (g_vt.msc.mss_before_fvg ? "true" : "false")
          + "," + IntegerToString(g_vt.msc.mss_sweep_to_mss_bars)
          + "," + IntegerToString(g_vt.msc.mss_fvg_to_mss_bars)
          + "," + IntegerToString(g_vt.msc.mss_mss_to_entry_bars)
          + "," + g_vt.msc.mss_temporal_relevance_reasons
          + "," + IntegerToString(g_vt.msc.choch_temporal_relevance_score)
          + "," + g_vt.msc.choch_temporal_relevance_grade
          + "," + (g_vt.msc.choch_after_sweep ? "true" : "false")
          + "," + (g_vt.msc.choch_before_entry ? "true" : "false")
          + "," + (g_vt.msc.choch_near_entry_window ? "true" : "false")
          + "," + (g_vt.msc.choch_too_early ? "true" : "false")
          + "," + (g_vt.msc.choch_too_late ? "true" : "false")
          + "," + (g_vt.msc.choch_after_fvg ? "true" : "false")
          + "," + (g_vt.msc.choch_before_fvg ? "true" : "false")
          + "," + IntegerToString(g_vt.msc.choch_sweep_to_choch_bars)
          + "," + IntegerToString(g_vt.msc.choch_fvg_to_choch_bars)
          + "," + IntegerToString(g_vt.msc.choch_choch_to_entry_bars)
          + "," + g_vt.msc.choch_temporal_relevance_reasons
          + "," + (g_vt.pd.log_enabled ? "true" : "false")
          + "," + g_vt.pd.range_source
          + "," + DoubleToString(g_vt.pd.range_high, _Digits)
          + "," + DoubleToString(g_vt.pd.range_low, _Digits)
          + "," + DoubleToString(g_vt.pd.midpoint, _Digits)
          + "," + DoubleToString(g_vt.pd.position_pct, 2)
          + "," + g_vt.pd.entry_zone
          + "," + (g_vt.pd.in_premium ? "true" : "false")
          + "," + (g_vt.pd.in_discount ? "true" : "false")
          + "," + (g_vt.pd.in_equilibrium ? "true" : "false")
          + "," + (g_vt.pd.outside_range ? "true" : "false")
          + "," + (g_vt.pd.zone_valid_for_direction ? "true" : "false")
          + "," + (g_vt.pd.zone_conflict ? "true" : "false")
          + "," + (g_vt.pd.entry_too_deep ? "true" : "false")
          + "," + (g_vt.pd.entry_too_shallow ? "true" : "false")
          + "," + DoubleToString(g_vt.pd.range_size_points, 2)
          + "," + DoubleToString(g_vt.pd.distance_mid_points, 2)
          + "," + IntegerToString(g_vt.pd.score)
          + "," + g_vt.pd.grade
          + "," + g_vt.pd.reasons
          + "," + (g_vt.eff.log_enabled ? "true" : "false")
          + "," + g_vt.eff.fill_status
          + "," + IntegerToString(g_vt.eff.score)
          + "," + g_vt.eff.grade
          + "," + g_vt.eff.reasons
          + "," + DoubleToString(g_vt.eff.entry_price_for_fill_audit, _Digits)
          + "," + DoubleToString(g_vt.eff.fvg_near_edge_price, _Digits)
          + "," + DoubleToString(g_vt.eff.fvg_far_edge_price, _Digits)
          + "," + DoubleToString(g_vt.eff.fvg_ce_price, _Digits)
          + "," + DoubleToString(g_vt.eff.entry_depth_in_fvg_pct, 2)
          + "," + DoubleToString(g_vt.eff.entry_distance_from_near_edge_points, 2)
          + "," + DoubleToString(g_vt.eff.entry_distance_from_far_edge_points, 2)
          + "," + DoubleToString(g_vt.eff.entry_distance_from_ce_points, 2)
          + "," + (g_vt.eff.fvg_touch_reached ? "true" : "false")
          + "," + (g_vt.eff.fvg_ce_touch_reached ? "true" : "false")
          + "," + (g_vt.eff.entry_price_reached ? "true" : "false")
          + "," + DoubleToString(g_vt.eff.max_retrace_into_fvg_pct, 2)
          + "," + DoubleToString(g_vt.eff.max_retrace_price, _Digits)
          + "," + DoubleToString(g_vt.eff.max_retrace_to_entry_distance_points, 2)
          + "," + DoubleToString(g_vt.eff.missed_entry_by_points, 2)
          + "," + IntegerToString(g_vt.eff.bars_to_fvg_touch)
          + "," + IntegerToString(g_vt.eff.bars_to_ce_touch)
          + "," + IntegerToString(g_vt.eff.bars_to_entry_fill)
          + "," + IntegerToString(g_vt.eff.bars_to_max_retrace)
          + "," + IntegerToString(g_vt.eff.bars_until_expiration_or_resolution)
          + "," + (g_vt.eff.entry_expired_unfilled ? "true" : "false")
          + "," + (g_vt.eff.entry_missed_shallow_retrace ? "true" : "false")
          + "," + (g_vt.eff.entry_too_deep_for_retest ? "true" : "false")
          + "," + (g_vt.eff.entry_near_miss ? "true" : "false")
          + "," + (g_vt.eff.entry_filled_fast ? "true" : "false")
          + "," + (g_vt.eff.entry_filled_late ? "true" : "false")
          + "," + (g_vt.eff.entry_invalidated_before_fill ? "true" : "false")
          + "," + (g_vt.eff.entry_outside_fvg ? "true" : "false")
          + "," + (g_vt.eff.entry_geometry_unknown ? "true" : "false")
          + "," + (g_vt.ev.log_enabled ? "true" : "false")
          + "," + DoubleToString(g_vt.ev.edge_price, _Digits)
          + "," + DoubleToString(g_vt.ev.p25_price, _Digits)
          + "," + DoubleToString(g_vt.ev.p50_price, _Digits)
          + "," + DoubleToString(g_vt.ev.p75_price, _Digits)
          + "," + DoubleToString(g_vt.ev.adaptive_price, _Digits)
          + "," + g_vt.ev.adaptive_type
          + "," + (g_vt.ev.edge_reached ? "true" : "false")
          + "," + (g_vt.ev.p25_reached ? "true" : "false")
          + "," + (g_vt.ev.p50_reached ? "true" : "false")
          + "," + (g_vt.ev.p75_reached ? "true" : "false")
          + "," + (g_vt.ev.adaptive_reached ? "true" : "false")
          + "," + DoubleToString(g_vt.ev.edge_missed_pts, 2)
          + "," + DoubleToString(g_vt.ev.p25_missed_pts, 2)
          + "," + DoubleToString(g_vt.ev.p50_missed_pts, 2)
          + "," + DoubleToString(g_vt.ev.p75_missed_pts, 2)
          + "," + DoubleToString(g_vt.ev.adaptive_missed_pts, 2)
          + "," + IntegerToString(g_vt.ev.edge_bars_to_touch)
          + "," + IntegerToString(g_vt.ev.p25_bars_to_touch)
          + "," + IntegerToString(g_vt.ev.p50_bars_to_touch)
          + "," + IntegerToString(g_vt.ev.p75_bars_to_touch)
          + "," + IntegerToString(g_vt.ev.adaptive_bars_to_touch)
          + "," + g_vt.ev.best_reached
          + "," + DoubleToString(g_vt.ev.best_reached_depth_pct, 2)
          + "," + DoubleToString(g_vt.ev.official_depth_pct, 2)
          + "," + DoubleToString(g_vt.ev.fill_gap_pct, 2)
          + "," + (g_vt.ev.shallow_would_fill ? "true" : "false")
          + "," + (g_vt.ev.deeper_would_not_fill ? "true" : "false")
          + "," + IntegerToString(g_vt.ev.score)
          + "," + g_vt.ev.grade
          + "," + g_vt.ev.reasons
          + "," + (g_vt.evos.log_enabled ? "true" : "false")
          + "," + g_vt.evos.reasons
          + MapzEvosFormatSlotCsv(g_vt.evos.edge)
          + MapzEvosFormatSlotCsv(g_vt.evos.p25)
          + MapzEvosFormatSlotCsv(g_vt.evos.p50)
          + MapzEvosFormatSlotCsv(g_vt.evos.p75)
          + MapzEvosFormatSlotCsv(g_vt.evos.adaptive)
          + "," + g_vt.evos.best_sim_variant
          + "," + DoubleToString(g_vt.evos.best_sim_result_r, 3)
          + "," + g_vt.evos.best_sim_status
          + "," + g_vt.evos.best_sim_reasons
          + "," + eqp.session_bucket
          + "," + eqp.trade_window_status
          + "," + eqp.spread_status
          + "," + eqp.news_mode;

   if(InpEntryQualityScoreEnabled)
     {
      g_eq_sum_entry_quality += (double)eqp.entry_quality_score;
      g_eq_sum_ambiguous_risk += (double)eqp.ambiguous_risk_score;
      MapzEqRegisterGradeBucket(eqp.entry_quality_grade);
      if(g_vt.outcome == "win")
        {
         g_eq_sum_entry_quality_win += (double)eqp.entry_quality_score;
         g_eq_count_win_scored++;
        }
      else if(g_vt.outcome == "loss")
        {
         g_eq_sum_entry_quality_loss += (double)eqp.entry_quality_score;
         g_eq_count_loss_scored++;
        }
      else if(g_vt.outcome == "ambiguous")
        {
         g_eq_sum_entry_quality_ambiguous += (double)eqp.entry_quality_score;
         g_eq_count_ambiguous_scored++;
        }
     }

   g_liq_sum_liquidity_score += (double)eqp.liquidity_event_score;
   if(InpEnableLiquiditySweepDetection)
     {
      if(g_vt.liq.detected)
        {
         g_liq_detected_count++;
         if(StringFind(g_vt.liq.direction, "opposite") >= 0)
            g_liq_opposite_count++;
         else if(g_vt.liq.direction == "bullish_context" || g_vt.liq.direction == "bearish_context")
            g_liq_relevant_count++;
         if(g_vt.liq.ev_type == "PDH_SWEEP")
            g_liq_pdh_count++;
         else if(g_vt.liq.ev_type == "PDL_SWEEP")
            g_liq_pdl_count++;
         else if(g_vt.liq.ev_type == "LOCAL_SWING_HIGH_SWEEP")
            g_liq_local_high_count++;
         else if(g_vt.liq.ev_type == "LOCAL_SWING_LOW_SWEEP")
            g_liq_local_low_count++;
        }
      else
        {
         g_liq_missing_count++;
        }

      g_liq_sum_quality += (double)g_vt.liq.quality_score;
      g_liq_sum_recency += (double)g_vt.liq.recency_score;
      g_liq_sum_directional += (double)g_vt.liq.directional_score;
      g_liq_sum_reaction += (double)g_vt.liq.reaction_score;
      g_liq_sum_displacement += (double)g_vt.liq.displacement_score;
      g_liq_sum_distance += (double)g_vt.liq.distance_score;

      const string qg = g_vt.liq.quality_grade;
      if(qg == "A")
         g_liq_q_grade_a++;
      else if(qg == "B")
         g_liq_q_grade_b++;
      else if(qg == "C")
         g_liq_q_grade_c++;
      else if(qg == "Weak")
         g_liq_q_grade_weak++;
      else
         g_liq_q_grade_none++;

      if(g_vt.outcome == "win")
        {
         g_liq_sum_q_win += (double)g_vt.liq.quality_score;
         g_liq_cnt_q_win++;
        }
      else if(g_vt.outcome == "loss")
        {
         g_liq_sum_q_loss += (double)g_vt.liq.quality_score;
         g_liq_cnt_q_loss++;
        }
      else if(g_vt.outcome == "ambiguous")
        {
         g_liq_sum_q_amb += (double)g_vt.liq.quality_score;
         g_liq_cnt_q_amb++;
        }
      else if(g_vt.outcome == "expired_unfilled")
        {
         g_liq_sum_q_exp += (double)g_vt.liq.quality_score;
         g_liq_cnt_q_exp++;
        }

      g_chain_sum_score += (double)g_vt.liq.chain_score;
      g_chain_sum_sweep_to_setup += (double)g_vt.liq.chain_sweep_to_setup_bars;
      if(g_vt.liq.chain_detected)
         g_chain_detected_count++;
      if(g_vt.liq.chain_reaction_confirmed)
         g_chain_reaction_confirmed_count++;
      if(g_vt.liq.chain_displacement_confirmed)
         g_chain_displacement_confirmed_count++;
      if(g_vt.liq.chain_fvg_created_after_sweep)
         g_chain_fvg_after_sweep_count++;
      const string cg = g_vt.liq.chain_grade;
      if(cg == "A")
         g_chain_grade_a++;
      else if(cg == "B")
         g_chain_grade_b++;
      else if(cg == "C")
         g_chain_grade_c++;
      else if(cg == "Weak")
         g_chain_grade_weak++;
      else
         g_chain_grade_none++;
     }

   if(g_vt.htf.enabled)
     {
      g_htf_sum_structure_score += (double)g_vt.htf.htf_structure_score;
      if(g_vt.htf.htf_structure_aligned)
         g_htf_aligned_count++;
      if(g_vt.htf.htf_structure_conflict)
         g_htf_conflict_count++;
      const string s4 = g_vt.htf.h4_structure_state;
      if(s4 == "bullish_structure")
         g_htf_h4_bull++;
      else if(s4 == "bearish_structure")
         g_htf_h4_bear++;
      else if(s4 == "range_structure")
         g_htf_h4_range++;
      else if(s4 == "transition_structure")
         g_htf_h4_trans++;
      const string s1h = g_vt.htf.h1_structure_state;
      if(s1h == "bullish_structure")
         g_htf_h1_bull++;
      else if(s1h == "bearish_structure")
         g_htf_h1_bear++;
      else if(s1h == "range_structure")
         g_htf_h1_range++;
      else if(s1h == "transition_structure")
         g_htf_h1_trans++;
     }

   if(g_vt.msc.enabled)
     {
      g_mss_choch_sum_score += (double)g_vt.msc.mss_choch_score;
      if(g_vt.msc.wick_break_only)
         g_wick_break_only_count++;
      if(g_vt.msc.mss_valid_close)
         g_mss_valid_close_count++;
      if(g_vt.msc.choch_valid_close)
         g_choch_valid_close_count++;
      if(g_vt.msc.mss_detected)
        {
         g_mss_detected_count++;
         if(g_vt.msc.mss_direction == "bullish")
            g_mss_bullish_count++;
         else if(g_vt.msc.mss_direction == "bearish")
            g_mss_bearish_count++;
         if(g_vt.msc.mss_valid_close)
           {
            const bool msAl = (g_vt.dir == MAPZ_SETUP_LONG && g_vt.msc.mss_direction == "bullish")
                           || (g_vt.dir == MAPZ_SETUP_SHORT && g_vt.msc.mss_direction == "bearish");
            if(msAl)
               g_mss_aligned_with_trade_count++;
            else
               g_mss_against_trade_count++;
           }
        }
      if(g_vt.msc.choch_detected && !g_vt.msc.mss_detected)
        {
         g_choch_detected_count++;
         if(g_vt.msc.choch_direction == "bullish")
            g_choch_bullish_count++;
         else if(g_vt.msc.choch_direction == "bearish")
            g_choch_bearish_count++;
         if(g_vt.msc.choch_valid_close)
           {
            const bool chAl = (g_vt.dir == MAPZ_SETUP_LONG && g_vt.msc.choch_direction == "bullish")
                           || (g_vt.dir == MAPZ_SETUP_SHORT && g_vt.msc.choch_direction == "bearish");
            if(chAl)
               g_choch_aligned_with_trade_count++;
            else
               g_choch_against_trade_count++;
           }
        }

      g_mss_temporal_sum_score += (double)g_vt.msc.mss_temporal_relevance_score;
      g_choch_temporal_sum_score += (double)g_vt.msc.choch_temporal_relevance_score;
      if(g_vt.msc.mss_detected)
        {
         if(g_vt.msc.mss_after_sweep)
            g_mss_after_sweep_count++;
         if(g_vt.msc.mss_before_entry)
            g_mss_before_entry_count++;
         if(g_vt.msc.mss_near_entry_window)
            g_mss_near_entry_window_count++;
         if(g_vt.msc.mss_too_early)
            g_mss_too_early_count++;
         if(g_vt.msc.mss_too_late)
            g_mss_too_late_count++;
         if(g_vt.msc.mss_after_fvg)
            g_mss_after_fvg_count++;
         if(g_vt.msc.mss_before_fvg)
            g_mss_before_fvg_count++;
        }
      if(g_vt.msc.choch_detected && !g_vt.msc.mss_detected)
        {
         if(g_vt.msc.choch_after_sweep)
            g_choch_after_sweep_count++;
         if(g_vt.msc.choch_before_entry)
            g_choch_before_entry_count++;
         if(g_vt.msc.choch_near_entry_window)
            g_choch_near_entry_window_count++;
         if(g_vt.msc.choch_too_early)
            g_choch_too_early_count++;
         if(g_vt.msc.choch_too_late)
            g_choch_too_late_count++;
         if(g_vt.msc.choch_after_fvg)
            g_choch_after_fvg_count++;
         if(g_vt.msc.choch_before_fvg)
            g_choch_before_fvg_count++;
        }
     }

   if(InpEnablePremiumDiscountV1)
     {
      g_pd_sum_score += (double)g_vt.pd.score;
      g_pd_sum_position_pct += g_vt.pd.position_pct;
      g_pd_sum_range_size_points += g_vt.pd.range_size_points;
      if(g_vt.pd.range_geometry_ok)
        {
         g_pd_valid_range_count++;
         if(g_vt.pd.in_premium)
            g_pd_entry_premium_count++;
         if(g_vt.pd.in_discount)
            g_pd_entry_discount_count++;
         if(g_vt.pd.in_equilibrium)
            g_pd_entry_equilibrium_count++;
         if(g_vt.pd.outside_range)
            g_pd_entry_outside_range_count++;
         if(g_vt.pd.zone_valid_for_direction)
            g_pd_zone_valid_dir_count++;
         if(g_vt.pd.zone_conflict)
            g_pd_zone_conflict_count++;
         if(g_vt.pd.entry_too_deep)
            g_pd_too_deep_count++;
         if(g_vt.pd.entry_too_shallow)
            g_pd_too_shallow_count++;
        }
      else
        {
         g_pd_missing_range_count++;
        }
     }

   if(InpEnableEntryFillFeasibilityV1)
     {
      g_eff_sum_score += (double)g_vt.eff.score;
      g_eff_sum_depth_pct += g_vt.eff.entry_depth_in_fvg_pct;
      g_eff_sum_max_retrace_pct += g_vt.eff.max_retrace_into_fvg_pct;
      g_eff_sum_missed_pts += g_vt.eff.missed_entry_by_points;
      if(g_vt.eff.bars_to_entry_fill > 0)
         g_eff_sum_bars_fill += (double)g_vt.eff.bars_to_entry_fill;
      if(g_vt.eff.bars_to_max_retrace > 0)
         g_eff_sum_bars_max_retrace += (double)g_vt.eff.bars_to_max_retrace;
      if(g_vt.eff.fill_status == "filled")
         g_eff_filled_count++;
      else if(g_vt.eff.fill_status == "expired_unfilled")
         g_eff_expired_unfilled_count++;
      else if(g_vt.eff.fill_status == "near_miss")
         g_eff_near_miss_count++;
      else if(g_vt.eff.fill_status == "missed_shallow_retrace")
         g_eff_missed_shallow_count++;
      else if(g_vt.eff.fill_status == "too_deep_for_retest")
         g_eff_too_deep_count++;
      else if(g_vt.eff.fill_status == "invalidated_before_fill")
         g_eff_invalidated_count++;
      else if(g_vt.eff.fill_status == "outside_fvg")
         g_eff_outside_fvg_count++;
      else if(g_vt.eff.fill_status == "unknown")
         g_eff_geometry_unknown_count++;
      if(g_vt.eff.fvg_touch_reached)
         g_eff_fvg_touch_count++;
      if(g_vt.eff.fvg_ce_touch_reached)
         g_eff_ce_touch_count++;
      if(g_vt.eff.entry_price_reached)
         g_eff_entry_touch_count++;
      if(g_vt.eff.entry_filled_fast)
         g_eff_fill_fast_count++;
      if(g_vt.eff.entry_filled_late)
         g_eff_fill_late_count++;
     }

   if(InpEnableEntryVariantFeasibilityV1)
     {
      g_ev_sum_score += (double)g_vt.ev.score;
      g_ev_sum_best_depth_pct += g_vt.ev.best_reached_depth_pct;
      g_ev_sum_official_depth_pct += g_vt.ev.official_depth_pct;
      g_ev_sum_fill_gap_pct += g_vt.ev.fill_gap_pct;
      g_ev_sum_edge_miss += g_vt.ev.edge_missed_pts;
      g_ev_sum_25_miss += g_vt.ev.p25_missed_pts;
      g_ev_sum_50_miss += g_vt.ev.p50_missed_pts;
      g_ev_sum_75_miss += g_vt.ev.p75_missed_pts;
      if(g_vt.ev.edge_reached)
         g_ev_edge_reached_count++;
      if(g_vt.ev.p25_reached)
         g_ev_25_reached_count++;
      if(g_vt.ev.p50_reached)
         g_ev_50_reached_count++;
      if(g_vt.ev.p75_reached)
         g_ev_75_reached_count++;
      if(g_vt.ev.adaptive_reached)
         g_ev_adaptive_reached_count++;
      if(g_vt.ev.shallow_would_fill)
         g_ev_shallow_would_fill_count++;
      if(g_vt.ev.deeper_would_not_fill)
         g_ev_deeper_would_not_fill_count++;
     }

   if(InpEnableEntryVariantOutcomeSimulationV1)
     {
      MapzEvosRegisterTradeCampaign(g_vt.evos);
      MapzBufEvosRegisterTrade(g_vt.evos);
      MapzBufEvosClearTrade();
     }

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
   MapzLiquiditySnapshotClear(g_vt.liq);
   MapzHtfSnapClear(g_vt.htf);
   MapzMscSnapClear(g_vt.msc);
   MapzPdSnapClear(g_vt.pd);
   MapzEffSnapClear(g_vt.eff);
   MapzEvSnapClear(g_vt.ev);
   MapzEvosSnapClear(g_vt.evos);
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
      const int barsFill = (g_vt.bars_waiting_entry > 0 ? g_vt.bars_waiting_entry : g_vt.eff.bars_observed);
      MapzEffFinalize(g_vt.dir, true, barsFill, "", "", g_vt.eff);
      if(g_vt.ev.log_enabled && !g_vt.ev.finalized)
         MapzEvFinalize(g_vt.ev);
      MapzEvosSyncP50StrictOnOfficialFill(barsFill);
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
                           const string setupGeomReason,
                           const MapzLiquiditySnapshot &liqInit)
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
   MapzLiquiditySnapshotCopy(g_vt.liq, liqInit);
   MapzHtfBuildTradeSnap(g_brokerSymbol, sdir, g_lastBiasEnum, g_vt.htf);
   MapzMssChochBuildTradeSnap(g_brokerSymbol, InpExecutionTimeframe, sdir, g_lastBiasEnum, liqInit, cTime, g_vt.msc);
   MapzPremiumDiscountBuildTradeSnap(g_brokerSymbol, InpExecutionTimeframe, sdir, cTime, g_vt.entry, g_vt.htf, g_vt.pd);
   MapzEffInitGeometry(sdir, g_vt.fvg_low, g_vt.fvg_high, g_vt.entry, g_vt.eff);
   MapzEvInitGeometry(sdir, g_vt.fvg_low, g_vt.fvg_high, g_vt.entry, g_vt.liq, g_vt.msc, g_vt.ev);
   MapzEvosInitFromTrade(sdir, g_vt.entry, g_vt.sl, g_vt.tp, g_vt.ev, g_vt.evos);

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
   MapzEffTrackBar(sdir, g_vt.fvg_low, g_vt.fvg_high, g_vt.entry, lo1, hi1, g_vt.eff);
   MapzEvTrackBar(sdir, lo1, hi1, g_vt.ev);
   MapzEvosTrackBar(sdir, lo1, hi1, g_vt.evos);
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
         MapzEffFinalize(g_vt.dir, false, g_vt.bars_waiting_entry, g_vt.outcome, g_vt.exit_reason, g_vt.eff);
         if(g_vt.ev.log_enabled && !g_vt.ev.finalized)
            MapzEvFinalize(g_vt.ev);
         const string detE = VirtualBuildDetailsCore();
         AppendEventRow(EVT_VIRT_EXPIRED,
                        BiasDirectionToString(g_vt.bias_enum),
                        setupW,
                        "expired",
                        "expired_unfilled",
                        detE);
         MapzEvosSyncP50StrictOnOfficialClose(g_vt.outcome, g_vt.result_r, g_vt.bars_held);
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
      MapzEffTrackBar(g_vt.dir, g_vt.fvg_low, g_vt.fvg_high, g_vt.entry, lo, hi, g_vt.eff);
      MapzEvTrackBar(g_vt.dir, lo, hi, g_vt.ev);
      MapzEvosTrackBar(g_vt.dir, lo, hi, g_vt.evos);
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
         MapzEffFinalize(g_vt.dir, false, g_vt.bars_waiting_entry, g_vt.outcome, g_vt.exit_reason, g_vt.eff);
         if(g_vt.ev.log_enabled && !g_vt.ev.finalized)
            MapzEvFinalize(g_vt.ev);
         const string detE = VirtualBuildDetailsCore();
         AppendEventRow(EVT_VIRT_EXPIRED,
                        BiasDirectionToString(g_vt.bias_enum),
                        setupW,
                        "expired",
                        "expired_unfilled",
                        detE);
         MapzEvosSyncP50StrictOnOfficialClose(g_vt.outcome, g_vt.result_r, g_vt.bars_held);
         VirtualAppendTradeCsvRow(g_vt.bars_waiting_entry, "daily_bias_aligned", g_lastBiasReason, "");
         VirtualRegisterOutcomeStats();
         VirtualClearTrade();
        }
      return;
     }

   MapzEvosTrackBar(g_vt.dir, lo, hi, g_vt.evos);

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
      MapzEvosSyncP50StrictOnOfficialClose(g_vt.outcome, g_vt.result_r, g_vt.bars_held);
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
      MapzEvosSyncP50StrictOnOfficialClose(g_vt.outcome, g_vt.result_r, g_vt.bars_held);
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
         MapzEvosSyncP50StrictOnOfficialClose(g_vt.outcome, g_vt.result_r, g_vt.bars_held);
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
      MapzEvosSyncP50StrictOnOfficialClose(g_vt.outcome, g_vt.result_r, g_vt.bars_held);
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
      string detA = StringFormat(
                            "fvg_low=%.5f fvg_high=%.5f fvg_points=%I64d candle_time=%s daily_bias_reason=%s gate_result=%s",
                            fLo, fHi, gapPts,
                            TimeUtcIso(cTime),
                            JsonStringEscape(g_lastBiasReason),
                            gate);
      MapzLiquiditySnapshot liqWork;
      MapzLiquidityEvaluate(g_brokerSymbol, InpExecutionTimeframe, cTime, sdir, fLo, fHi, liqWork);
      double entP = 0.0, slP = 0.0, tpP = 0.0, rAbsP = 0.0, fLoP = 0.0, fHiP = 0.0;
      long fvgPtsP = 0;
      string rjP = "";
      if(VirtualPrepareTradePrices(sdir, fLo, fHi, entP, slP, tpP, rAbsP, fLoP, fHiP, fvgPtsP, rjP))
        {
         MapzHtfTradeSnap htfPrev;
         MapzHtfBuildTradeSnap(g_brokerSymbol, sdir, g_lastBiasEnum, htfPrev);
         MapzEqScorePack eqSetup;
         MapzEqComputeScoresFromState(sdir, g_lastBiasEnum, fvgPtsP, entP, slP, tpP, rAbsP, false, "", liqWork, htfPrev, eqSetup);
         MapzMssChochTradeSnap mscPrev;
         MapzMssChochBuildTradeSnap(g_brokerSymbol, InpExecutionTimeframe, sdir, g_lastBiasEnum, liqWork, cTime, mscPrev);
         MapzPremiumDiscountTradeSnap pdPrev;
         MapzPremiumDiscountBuildTradeSnap(g_brokerSymbol, InpExecutionTimeframe, sdir, cTime, entP, htfPrev, pdPrev);
         detA = detA + " " + MapzEqScoresToDetailsSuffix(eqSetup, liqWork, htfPrev) + " " + MapzMscCompactSuffix(mscPrev) + " " + MapzPdCompactSuffix(pdPrev);
        }
      const string evAllow = ExportSetupEvent(EVT_SETUP_ALLOWED, setupW, gate, "daily_bias_aligned", detA);
      VirtualOnSetupAllowed(evAllow, setupW, sdir, fLo, fHi, gapPts, cTime, rsn, liqWork);
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
                       "E5.13.4 Mapazapp_TestEA: Daily Bias V1 on %s (last=%s); Setup V1 FVG on %s; virtual trades=%s (export-only; no live execution); gate_placeholder=%s; liquidity_sweep_v1+quality_v1+chain_v1=%s (observation-only); entry_quality_score_export=%s (observation-only); htf_structure_v1=%s (observation-only; no gate); mss_choch_v1_exec_tf=%s (E5.12.2 incl. temporal relevance; observation-only; closed candles; no gate); premium_discount_v1=%s (E5.13; observation-only; no gate); entry_fill_feasibility_v1=%s (E5.13.2 post-candidate diagnostic; no gate); entry_variant_feasibility_v1=%s (E5.13.4 hypothetical variants; no gate); "
                       "setup_inputs: enable=%s min_fvg_pts=%d virtual_min_trade_fvg_pts=%d max_setup_age_bars=%d require_bias=%s; trade_count=%I64d (virtual rows only).",
                       TfToWire(InpDailyBiasTimeframe),
                       BiasDirectionToString(g_lastBiasEnum),
                       TfToWire(InpExecutionTimeframe),
                       (InpEnableVirtualTrades ? "on" : "off"),
                       gateNone,
                       (InpEnableLiquiditySweepDetection ? "on" : "off"),
                       (InpEntryQualityScoreEnabled ? "on" : "off"),
                       (InpEnableHtfStructureV1 ? "on" : "off"),
                       (InpEnableMssChochV1 ? "on" : "off"),
                       (InpEnablePremiumDiscountV1 ? "on" : "off"),
                       (InpEnableEntryFillFeasibilityV1 ? "on" : "off"),
                       (InpEnableEntryVariantFeasibilityV1 ? "on" : "off"),
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
   json += "  \"has_liquidity_sweep_v1_logic\": true,\r\n";
   json += "  \"has_liquidity_sweep_quality_v1_logic\": true,\r\n";
   json += "  \"has_liquidity_chain_v1_logic\": true,\r\n";
   json += "  \"has_liquidity_chain_reaction_audit_v1_logic\": true,\r\n";
   json += "  \"has_htf_structure_v1_logic\": true,\r\n";
   json += "  \"has_mss_choch_v1_logic\": true,\r\n";
   json += "  \"has_mss_choch_temporal_relevance_v1_logic\": true,\r\n";
   json += "  \"has_premium_discount_v1_logic\": true,\r\n";
   json += "  \"premium_discount_enabled\": " + (InpEnablePremiumDiscountV1 ? "true" : "false") + ",\r\n";
   json += "  \"has_entry_fill_feasibility_v1_logic\": true,\r\n";
   json += "  \"entry_fill_feasibility_enabled\": " + (InpEnableEntryFillFeasibilityV1 ? "true" : "false") + ",\r\n";
   json += "  \"has_entry_variant_feasibility_v1_logic\": true,\r\n";
   json += "  \"entry_variant_feasibility_enabled\": " + (InpEnableEntryVariantFeasibilityV1 ? "true" : "false") + ",\r\n";
   json += "  \"has_entry_variant_outcome_sim_v1_logic\": true,\r\n";
   json += "  \"has_entry_variant_outcome_sim_v1_parity_control\": true,\r\n";
   json += "  \"has_buffered_evos_v1_logic\": true,\r\n";
   json += "  \"buffered_evos_enabled\": " + (InpEnableBufferedEvosV1 ? "true" : "false") + ",\r\n";
   json += "  \"entry_variant_outcome_sim_enabled\": " + (InpEnableEntryVariantOutcomeSimulationV1 ? "true" : "false") + ",\r\n";
   json += "  \"has_entry_quality_score_logic\": true,\r\n";
   json += "  \"score_observation_only\": true,\r\n";
   json += "  \"score_gate_enabled\": false,\r\n";
   json += "  \"entry_quality_score_export_enabled\": " + (InpEntryQualityScoreEnabled ? "true" : "false") + ",\r\n";
   json += "  \"liquidity_sweep_detection_enabled\": " + (InpEnableLiquiditySweepDetection ? "true" : "false") + ",\r\n";
   json += "  \"liquidity_sweep_score_enabled\": " + (InpLiquiditySweepScoreEnabled ? "true" : "false") + ",\r\n";
   json += "  \"htf_structure_enabled\": " + (InpEnableHtfStructureV1 ? "true" : "false") + ",\r\n";
   json += "  \"mss_choch_enabled\": " + (InpEnableMssChochV1 ? "true" : "false") + ",\r\n";
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
   const double avgEntryQ = (tcRows > 0 ? g_eq_sum_entry_quality / (double)tcRows : 0.0);
   const double avgAmbR = (tcRows > 0 ? g_eq_sum_ambiguous_risk / (double)tcRows : 0.0);
   const double avgEqWin = (g_eq_count_win_scored > 0 ? g_eq_sum_entry_quality_win / (double)g_eq_count_win_scored : 0.0);
   const double avgEqLoss = (g_eq_count_loss_scored > 0 ? g_eq_sum_entry_quality_loss / (double)g_eq_count_loss_scored : 0.0);
   const double avgEqAmb = (g_eq_count_ambiguous_scored > 0 ? g_eq_sum_entry_quality_ambiguous / (double)g_eq_count_ambiguous_scored : 0.0);
   json += StringFormat("  \"score_a_count\": %I64d,\r\n", g_eq_grade_a);
   json += StringFormat("  \"score_b_count\": %I64d,\r\n", g_eq_grade_b);
   json += StringFormat("  \"score_c_count\": %I64d,\r\n", g_eq_grade_c);
   json += StringFormat("  \"score_rejected_count\": %I64d,\r\n", g_eq_grade_rejected);
   json += StringFormat("  \"average_entry_quality_score\": %.6f,\r\n", avgEntryQ);
   json += StringFormat("  \"average_ambiguous_risk_score\": %.6f,\r\n", avgAmbR);
   json += StringFormat("  \"average_score_win\": %.6f,\r\n", avgEqWin);
   json += StringFormat("  \"average_score_loss\": %.6f,\r\n", avgEqLoss);
   json += StringFormat("  \"average_score_ambiguous\": %.6f,\r\n", avgEqAmb);
   const double avgLiq = (tcRows > 0 ? g_liq_sum_liquidity_score / (double)tcRows : 0.0);
   json += StringFormat("  \"average_liquidity_event_score\": %.6f,\r\n", avgLiq);
   json += StringFormat("  \"liquidity_sweep_detected_count\": %I64d,\r\n", g_liq_detected_count);
   json += StringFormat("  \"liquidity_sweep_relevant_count\": %I64d,\r\n", g_liq_relevant_count);
   json += StringFormat("  \"liquidity_sweep_opposite_count\": %I64d,\r\n", g_liq_opposite_count);
   json += StringFormat("  \"liquidity_sweep_missing_count\": %I64d,\r\n", g_liq_missing_count);
   json += StringFormat("  \"liquidity_sweep_pdh_count\": %I64d,\r\n", g_liq_pdh_count);
   json += StringFormat("  \"liquidity_sweep_pdl_count\": %I64d,\r\n", g_liq_pdl_count);
   json += StringFormat("  \"liquidity_sweep_local_high_count\": %I64d,\r\n", g_liq_local_high_count);
   json += StringFormat("  \"liquidity_sweep_local_low_count\": %I64d,\r\n", g_liq_local_low_count);
   const double avgLiqQ = (tcRows > 0 ? g_liq_sum_quality / (double)tcRows : 0.0);
   const double avgLiqRec = (tcRows > 0 ? g_liq_sum_recency / (double)tcRows : 0.0);
   const double avgLiqDir = (tcRows > 0 ? g_liq_sum_directional / (double)tcRows : 0.0);
   const double avgLiqReact = (tcRows > 0 ? g_liq_sum_reaction / (double)tcRows : 0.0);
   const double avgLiqDisp = (tcRows > 0 ? g_liq_sum_displacement / (double)tcRows : 0.0);
   const double avgLiqDist = (tcRows > 0 ? g_liq_sum_distance / (double)tcRows : 0.0);
   json += StringFormat("  \"average_liquidity_sweep_quality_score\": %.6f,\r\n", avgLiqQ);
   json += StringFormat("  \"liquidity_sweep_quality_a_count\": %I64d,\r\n", g_liq_q_grade_a);
   json += StringFormat("  \"liquidity_sweep_quality_b_count\": %I64d,\r\n", g_liq_q_grade_b);
   json += StringFormat("  \"liquidity_sweep_quality_c_count\": %I64d,\r\n", g_liq_q_grade_c);
   json += StringFormat("  \"liquidity_sweep_quality_weak_count\": %I64d,\r\n", g_liq_q_grade_weak);
   json += StringFormat("  \"liquidity_sweep_quality_none_count\": %I64d,\r\n", g_liq_q_grade_none);
   json += StringFormat("  \"average_liquidity_sweep_recency_score\": %.6f,\r\n", avgLiqRec);
   json += StringFormat("  \"average_liquidity_sweep_reaction_score\": %.6f,\r\n", avgLiqReact);
   json += StringFormat("  \"average_liquidity_sweep_displacement_score\": %.6f,\r\n", avgLiqDisp);
   json += StringFormat("  \"average_liquidity_sweep_directional_score\": %.6f,\r\n", avgLiqDir);
   json += StringFormat("  \"average_liquidity_sweep_distance_score\": %.6f,\r\n", avgLiqDist);
   const double avgLiqQWin = (g_liq_cnt_q_win > 0 ? g_liq_sum_q_win / (double)g_liq_cnt_q_win : 0.0);
   const double avgLiqQLoss = (g_liq_cnt_q_loss > 0 ? g_liq_sum_q_loss / (double)g_liq_cnt_q_loss : 0.0);
   const double avgLiqQAmb = (g_liq_cnt_q_amb > 0 ? g_liq_sum_q_amb / (double)g_liq_cnt_q_amb : 0.0);
   const double avgLiqQExp = (g_liq_cnt_q_exp > 0 ? g_liq_sum_q_exp / (double)g_liq_cnt_q_exp : 0.0);
   json += StringFormat("  \"average_liquidity_sweep_quality_score_win\": %.6f,\r\n", avgLiqQWin);
   json += StringFormat("  \"average_liquidity_sweep_quality_score_loss\": %.6f,\r\n", avgLiqQLoss);
   json += StringFormat("  \"average_liquidity_sweep_quality_score_ambiguous\": %.6f,\r\n", avgLiqQAmb);
   json += StringFormat("  \"average_liquidity_sweep_quality_score_expired_unfilled\": %.6f,\r\n", avgLiqQExp);
   const double avgChain = (tcRows > 0 ? g_chain_sum_score / (double)tcRows : 0.0);
   const double avgChainBars = (tcRows > 0 ? g_chain_sum_sweep_to_setup / (double)tcRows : 0.0);
   json += StringFormat("  \"liquidity_chain_detected_count\": %I64d,\r\n", g_chain_detected_count);
   json += StringFormat("  \"liquidity_chain_a_count\": %I64d,\r\n", g_chain_grade_a);
   json += StringFormat("  \"liquidity_chain_b_count\": %I64d,\r\n", g_chain_grade_b);
   json += StringFormat("  \"liquidity_chain_c_count\": %I64d,\r\n", g_chain_grade_c);
   json += StringFormat("  \"liquidity_chain_weak_count\": %I64d,\r\n", g_chain_grade_weak);
   json += StringFormat("  \"liquidity_chain_none_count\": %I64d,\r\n", g_chain_grade_none);
   json += StringFormat("  \"average_liquidity_chain_score\": %.6f,\r\n", avgChain);
   json += StringFormat("  \"average_liquidity_chain_sweep_to_setup_bars\": %.6f,\r\n", avgChainBars);
   json += StringFormat("  \"liquidity_chain_reaction_confirmed_count\": %I64d,\r\n", g_chain_reaction_confirmed_count);
   json += StringFormat("  \"liquidity_chain_displacement_confirmed_count\": %I64d,\r\n", g_chain_displacement_confirmed_count);
   json += StringFormat("  \"liquidity_chain_fvg_after_sweep_count\": %I64d,\r\n", g_chain_fvg_after_sweep_count);
   json += StringFormat("  \"liquidity_chain_reaction_checked_count\": %I64d,\r\n", g_chain_rx_checked_count);
   json += StringFormat("  \"liquidity_chain_reaction_fail_close_not_back_inside_count\": %I64d,\r\n", g_chain_rx_fail_close_not_back_inside);
   json += StringFormat("  \"liquidity_chain_reaction_fail_no_candle_after_sweep_count\": %I64d,\r\n", g_chain_rx_fail_no_candle);
   json += StringFormat("  \"liquidity_chain_reaction_fail_wrong_level_count\": %I64d,\r\n", g_chain_rx_fail_wrong_level);
   json += StringFormat("  \"liquidity_chain_reaction_fail_sweep_after_fvg_count\": %I64d,\r\n", g_chain_rx_fail_sweep_after_fvg);
   json += StringFormat("  \"liquidity_chain_reaction_fail_other_count\": %I64d,\r\n", g_chain_rx_fail_other);
   const double avgHtfStruct = (tcRows > 0 ? g_htf_sum_structure_score / (double)tcRows : 0.0);
   json += StringFormat("  \"htf_structure_aligned_count\": %I64d,\r\n", g_htf_aligned_count);
   json += StringFormat("  \"htf_structure_conflict_count\": %I64d,\r\n", g_htf_conflict_count);
   json += StringFormat("  \"htf_structure_h4_bullish_count\": %I64d,\r\n", g_htf_h4_bull);
   json += StringFormat("  \"htf_structure_h4_bearish_count\": %I64d,\r\n", g_htf_h4_bear);
   json += StringFormat("  \"htf_structure_h4_range_count\": %I64d,\r\n", g_htf_h4_range);
   json += StringFormat("  \"htf_structure_h4_transition_count\": %I64d,\r\n", g_htf_h4_trans);
   json += StringFormat("  \"htf_structure_h1_bullish_count\": %I64d,\r\n", g_htf_h1_bull);
   json += StringFormat("  \"htf_structure_h1_bearish_count\": %I64d,\r\n", g_htf_h1_bear);
   json += StringFormat("  \"htf_structure_h1_range_count\": %I64d,\r\n", g_htf_h1_range);
   json += StringFormat("  \"htf_structure_h1_transition_count\": %I64d,\r\n", g_htf_h1_trans);
   json += StringFormat("  \"average_htf_structure_score\": %.6f,\r\n", avgHtfStruct);
   const double avgMsc = (tcRows > 0 ? g_mss_choch_sum_score / (double)tcRows : 0.0);
   json += StringFormat("  \"mss_detected_count\": %I64d,\r\n", g_mss_detected_count);
   json += StringFormat("  \"bullish_mss_count\": %I64d,\r\n", g_mss_bullish_count);
   json += StringFormat("  \"bearish_mss_count\": %I64d,\r\n", g_mss_bearish_count);
   json += StringFormat("  \"choch_detected_count\": %I64d,\r\n", g_choch_detected_count);
   json += StringFormat("  \"bullish_choch_count\": %I64d,\r\n", g_choch_bullish_count);
   json += StringFormat("  \"bearish_choch_count\": %I64d,\r\n", g_choch_bearish_count);
   json += StringFormat("  \"wick_break_only_count\": %I64d,\r\n", g_wick_break_only_count);
   json += StringFormat("  \"mss_valid_close_count\": %I64d,\r\n", g_mss_valid_close_count);
   json += StringFormat("  \"choch_valid_close_count\": %I64d,\r\n", g_choch_valid_close_count);
   json += StringFormat("  \"mss_aligned_with_trade_count\": %I64d,\r\n", g_mss_aligned_with_trade_count);
   json += StringFormat("  \"mss_against_trade_count\": %I64d,\r\n", g_mss_against_trade_count);
   json += StringFormat("  \"choch_aligned_with_trade_count\": %I64d,\r\n", g_choch_aligned_with_trade_count);
   json += StringFormat("  \"choch_against_trade_count\": %I64d,\r\n", g_choch_against_trade_count);
   json += StringFormat("  \"average_mss_choch_score\": %.6f,\r\n", avgMsc);
   const double avgMssTemp = (tcRows > 0 ? g_mss_temporal_sum_score / (double)tcRows : 0.0);
   const double avgChTemp = (tcRows > 0 ? g_choch_temporal_sum_score / (double)tcRows : 0.0);
   json += StringFormat("  \"average_mss_temporal_relevance_score\": %.6f,\r\n", avgMssTemp);
   json += StringFormat("  \"average_choch_temporal_relevance_score\": %.6f,\r\n", avgChTemp);
   json += StringFormat("  \"mss_after_sweep_count\": %I64d,\r\n", g_mss_after_sweep_count);
   json += StringFormat("  \"mss_before_entry_count\": %I64d,\r\n", g_mss_before_entry_count);
   json += StringFormat("  \"mss_near_entry_window_count\": %I64d,\r\n", g_mss_near_entry_window_count);
   json += StringFormat("  \"mss_too_early_count\": %I64d,\r\n", g_mss_too_early_count);
   json += StringFormat("  \"mss_too_late_count\": %I64d,\r\n", g_mss_too_late_count);
   json += StringFormat("  \"mss_after_fvg_count\": %I64d,\r\n", g_mss_after_fvg_count);
   json += StringFormat("  \"mss_before_fvg_count\": %I64d,\r\n", g_mss_before_fvg_count);
   json += StringFormat("  \"choch_after_sweep_count\": %I64d,\r\n", g_choch_after_sweep_count);
   json += StringFormat("  \"choch_before_entry_count\": %I64d,\r\n", g_choch_before_entry_count);
   json += StringFormat("  \"choch_near_entry_window_count\": %I64d,\r\n", g_choch_near_entry_window_count);
   json += StringFormat("  \"choch_too_early_count\": %I64d,\r\n", g_choch_too_early_count);
   json += StringFormat("  \"choch_too_late_count\": %I64d,\r\n", g_choch_too_late_count);
   json += StringFormat("  \"choch_after_fvg_count\": %I64d,\r\n", g_choch_after_fvg_count);
   json += StringFormat("  \"choch_before_fvg_count\": %I64d,\r\n", g_choch_before_fvg_count);
   const double avgPdScore = (tcRows > 0 ? g_pd_sum_score / (double)tcRows : 0.0);
   const double avgPdPos = (tcRows > 0 ? g_pd_sum_position_pct / (double)tcRows : 0.0);
   const double avgPdRangePts = (tcRows > 0 ? g_pd_sum_range_size_points / (double)tcRows : 0.0);
   json += StringFormat("  \"pd_valid_range_count\": %I64d,\r\n", g_pd_valid_range_count);
   json += StringFormat("  \"pd_missing_range_count\": %I64d,\r\n", g_pd_missing_range_count);
   json += StringFormat("  \"pd_entry_premium_count\": %I64d,\r\n", g_pd_entry_premium_count);
   json += StringFormat("  \"pd_entry_discount_count\": %I64d,\r\n", g_pd_entry_discount_count);
   json += StringFormat("  \"pd_entry_equilibrium_count\": %I64d,\r\n", g_pd_entry_equilibrium_count);
   json += StringFormat("  \"pd_entry_outside_range_count\": %I64d,\r\n", g_pd_entry_outside_range_count);
   json += StringFormat("  \"pd_entry_zone_valid_for_direction_count\": %I64d,\r\n", g_pd_zone_valid_dir_count);
   json += StringFormat("  \"pd_entry_zone_conflict_count\": %I64d,\r\n", g_pd_zone_conflict_count);
   json += StringFormat("  \"pd_entry_too_deep_count\": %I64d,\r\n", g_pd_too_deep_count);
   json += StringFormat("  \"pd_entry_too_shallow_count\": %I64d,\r\n", g_pd_too_shallow_count);
   json += StringFormat("  \"average_premium_discount_score\": %.6f,\r\n", avgPdScore);
   json += StringFormat("  \"average_pd_position_pct\": %.6f,\r\n", avgPdPos);
   json += StringFormat("  \"average_pd_range_size_points\": %.6f,\r\n", avgPdRangePts);
   const double avgEffScore = (tcRows > 0 ? g_eff_sum_score / (double)tcRows : 0.0);
   const double avgEffDepth = (tcRows > 0 ? g_eff_sum_depth_pct / (double)tcRows : 0.0);
   const double avgEffRetrace = (tcRows > 0 ? g_eff_sum_max_retrace_pct / (double)tcRows : 0.0);
   const double avgEffMiss = (tcRows > 0 ? g_eff_sum_missed_pts / (double)tcRows : 0.0);
   const double avgEffBarsFill = (g_eff_filled_count > 0 ? g_eff_sum_bars_fill / (double)g_eff_filled_count : 0.0);
   const double avgEffBarsMaxRet = (tcRows > 0 ? g_eff_sum_bars_max_retrace / (double)tcRows : 0.0);
   json += StringFormat("  \"entry_fill_filled_count\": %I64d,\r\n", g_eff_filled_count);
   json += StringFormat("  \"entry_fill_expired_unfilled_count\": %I64d,\r\n", g_eff_expired_unfilled_count);
   json += StringFormat("  \"entry_fill_near_miss_count\": %I64d,\r\n", g_eff_near_miss_count);
   json += StringFormat("  \"entry_fill_missed_shallow_retrace_count\": %I64d,\r\n", g_eff_missed_shallow_count);
   json += StringFormat("  \"entry_fill_too_deep_for_retest_count\": %I64d,\r\n", g_eff_too_deep_count);
   json += StringFormat("  \"entry_fill_invalidated_before_fill_count\": %I64d,\r\n", g_eff_invalidated_count);
   json += StringFormat("  \"entry_fill_outside_fvg_count\": %I64d,\r\n", g_eff_outside_fvg_count);
   json += StringFormat("  \"entry_fill_geometry_unknown_count\": %I64d,\r\n", g_eff_geometry_unknown_count);
   json += StringFormat("  \"fvg_touch_reached_count\": %I64d,\r\n", g_eff_fvg_touch_count);
   json += StringFormat("  \"fvg_ce_touch_reached_count\": %I64d,\r\n", g_eff_ce_touch_count);
   json += StringFormat("  \"entry_price_reached_count\": %I64d,\r\n", g_eff_entry_touch_count);
   json += StringFormat("  \"average_entry_fill_feasibility_score\": %.6f,\r\n", avgEffScore);
   json += StringFormat("  \"average_entry_depth_in_fvg_pct\": %.6f,\r\n", avgEffDepth);
   json += StringFormat("  \"average_max_retrace_into_fvg_pct\": %.6f,\r\n", avgEffRetrace);
   json += StringFormat("  \"average_missed_entry_by_points\": %.6f,\r\n", avgEffMiss);
   json += StringFormat("  \"average_bars_to_entry_fill\": %.6f,\r\n", avgEffBarsFill);
   json += StringFormat("  \"average_bars_to_max_retrace\": %.6f,\r\n", avgEffBarsMaxRet);
   const double avgEvScore = (tcRows > 0 ? g_ev_sum_score / (double)tcRows : 0.0);
   const double avgEvBestDepth = (tcRows > 0 ? g_ev_sum_best_depth_pct / (double)tcRows : 0.0);
   const double avgEvOfficialDepth = (tcRows > 0 ? g_ev_sum_official_depth_pct / (double)tcRows : 0.0);
   const double avgEvFillGap = (tcRows > 0 ? g_ev_sum_fill_gap_pct / (double)tcRows : 0.0);
   const double avgEvEdgeMiss = (tcRows > 0 ? g_ev_sum_edge_miss / (double)tcRows : 0.0);
   const double avgEv25Miss = (tcRows > 0 ? g_ev_sum_25_miss / (double)tcRows : 0.0);
   const double avgEv50Miss = (tcRows > 0 ? g_ev_sum_50_miss / (double)tcRows : 0.0);
   const double avgEv75Miss = (tcRows > 0 ? g_ev_sum_75_miss / (double)tcRows : 0.0);
   json += StringFormat("  \"entry_variant_edge_reached_count\": %I64d,\r\n", g_ev_edge_reached_count);
   json += StringFormat("  \"entry_variant_25_reached_count\": %I64d,\r\n", g_ev_25_reached_count);
   json += StringFormat("  \"entry_variant_50_reached_count\": %I64d,\r\n", g_ev_50_reached_count);
   json += StringFormat("  \"entry_variant_75_reached_count\": %I64d,\r\n", g_ev_75_reached_count);
   json += StringFormat("  \"entry_variant_adaptive_reached_count\": %I64d,\r\n", g_ev_adaptive_reached_count);
   json += StringFormat("  \"entry_variant_shallow_would_fill_count\": %I64d,\r\n", g_ev_shallow_would_fill_count);
   json += StringFormat("  \"entry_variant_deeper_would_not_fill_count\": %I64d,\r\n", g_ev_deeper_would_not_fill_count);
   json += StringFormat("  \"average_entry_variant_feasibility_score\": %.6f,\r\n", avgEvScore);
   json += StringFormat("  \"average_entry_variant_best_reached_depth_pct\": %.6f,\r\n", avgEvBestDepth);
   json += StringFormat("  \"average_entry_variant_official_depth_pct\": %.6f,\r\n", avgEvOfficialDepth);
   json += StringFormat("  \"average_entry_variant_fill_gap_pct\": %.6f,\r\n", avgEvFillGap);
   json += StringFormat("  \"average_entry_variant_edge_missed_by_points\": %.6f,\r\n", avgEvEdgeMiss);
   json += StringFormat("  \"average_entry_variant_25_missed_by_points\": %.6f,\r\n", avgEv25Miss);
   json += StringFormat("  \"average_entry_variant_50_missed_by_points\": %.6f,\r\n", avgEv50Miss);
   json += StringFormat("  \"average_entry_variant_75_missed_by_points\": %.6f,\r\n", avgEv75Miss);
   MapzEvosAppendSummaryRollup(json, "edge", g_evos_edge_sum);
   MapzEvosAppendSummaryRollup(json, "25", g_evos_25_sum);
   MapzEvosAppendSummaryRollup(json, "50", g_evos_50_sum);
   MapzEvosAppendSummaryRollup(json, "75", g_evos_75_sum);
   MapzEvosAppendSummaryRollup(json, "adaptive", g_evos_adaptive_sum);
   json += "  \"entry_variant_outcome_sim_best_variant_by_expectancy\": \"" + JsonStringEscape(g_evos_best_expectancy_variant) + "\",\r\n";
   json += "  \"entry_variant_outcome_sim_best_variant_by_total_r\": \"" + JsonStringEscape(g_evos_best_total_r_variant) + "\",\r\n";
   json += "  \"entry_variant_outcome_sim_lowest_ambiguous_variant\": \"" + JsonStringEscape(g_evos_lowest_ambiguous_variant) + "\",\r\n";
   json += "  \"entry_variant_outcome_sim_highest_fill_variant\": \"" + JsonStringEscape(g_evos_highest_fill_variant) + "\",\r\n";
   MapzBufEvosComputeBestVariants();
   MapzBufEvosAppendSummary(json);
   json += "  \"campaign_id\": \"" + JsonStringEscape(g_campaignIdForSummary) + "\",\r\n";
   json += "  \"export_campaign_folder\": \"" + JsonStringEscape(Trim(InpExportCampaignFolder)) + "\",\r\n";
   json += "  \"export_parameter_folder\": \"" + JsonStringEscape(Trim(InpExportParameterFolder)) + "\",\r\n";
   json += "  \"optimization_safe_exports\": " + (g_optimizationSafeExports ? "true" : "false") + ",\r\n";
   json += "  \"effective_run_id\": \"" + JsonStringEscape(g_runId) + "\",\r\n";
   json += "  \"effective_export_folder_label\": \"" + JsonStringEscape(g_exportFolderLeaf) + "\",\r\n";
   json += "  \"optimization_parameters\": {\r\n";
   json += StringFormat("    \"virtual_min_trade_fvg_points\": %d,\r\n", InpVirtualMinTradeFvgPoints);
   json += StringFormat("    \"virtual_risk_reward\": %.6f,\r\n", InpVirtualRiskReward);
   json += StringFormat("    \"daily_bias_min_body_points\": %d,\r\n", InpDailyBiasMinBodyPoints);
   json += "    \"require_daily_bias_alignment\": " + (InpRequireDailyBiasAlignment ? "true" : "false") + ",\r\n";
   json += "    \"entry_quality_score_enabled\": " + (InpEntryQualityScoreEnabled ? "true" : "false") + ",\r\n";
   json += "    \"entry_quality_score_gate_enabled\": " + (InpEntryQualityScoreGateEnabled ? "true" : "false") + ",\r\n";
   json += "    \"liquidity_sweep_detection_enabled\": " + (InpEnableLiquiditySweepDetection ? "true" : "false") + ",\r\n";
   json += StringFormat("    \"liquidity_sweep_lookback_bars\": %d,\r\n", InpLiquiditySweepLookbackBars);
   json += StringFormat("    \"local_swing_lookback_bars\": %d,\r\n", InpLocalSwingLookbackBars);
   json += StringFormat("    \"liquidity_sweep_buffer_points\": %d,\r\n", InpLiquiditySweepBufferPoints);
   json += "    \"liquidity_sweep_score_enabled\": " + (InpLiquiditySweepScoreEnabled ? "true" : "false") + ",\r\n";
   json += "    \"htf_structure_v1_enabled\": " + (InpEnableHtfStructureV1 ? "true" : "false") + ",\r\n";
   json += StringFormat("    \"htf_structure_swing_lookback_bars\": %d,\r\n", InpHtfStructureSwingLookbackBars);
   json += StringFormat("    \"htf_structure_max_bars\": %d,\r\n", InpHtfStructureMaxBars);
   json += "    \"htf_structure_score_enabled\": " + (InpHtfStructureScoreEnabled ? "true" : "false") + ",\r\n";
   json += "    \"mss_choch_v1_enabled\": " + (InpEnableMssChochV1 ? "true" : "false") + ",\r\n";
   json += StringFormat("    \"mss_choch_swing_lookback_bars\": %d,\r\n", InpMssChochSwingLookbackBars);
   json += StringFormat("    \"mss_choch_max_bars\": %d,\r\n", InpMssChochMaxBars);
   json += "    \"mss_choch_require_close_break\": " + (InpMssChochRequireCloseBreak ? "true" : "false") + ",\r\n";
   json += "    \"mss_choch_score_enabled\": " + (InpMssChochScoreEnabled ? "true" : "false") + ",\r\n";
   json += "    \"premium_discount_v1_enabled\": " + (InpEnablePremiumDiscountV1 ? "true" : "false") + ",\r\n";
   json += StringFormat("    \"premium_discount_swing_lookback_bars\": %d,\r\n", InpPremiumDiscountSwingLookbackBars);
   json += StringFormat("    \"premium_discount_max_bars\": %d,\r\n", InpPremiumDiscountMaxBars);
   json += StringFormat("    \"premium_discount_equilibrium_band_pct\": %d,\r\n", InpPremiumDiscountEquilibriumBandPct);
   json += "    \"premium_discount_score_enabled\": " + (InpPremiumDiscountScoreEnabled ? "true" : "false") + ",\r\n";
   json += "    \"entry_fill_feasibility_v1_enabled\": " + (InpEnableEntryFillFeasibilityV1 ? "true" : "false") + ",\r\n";
   json += StringFormat("    \"entry_fill_feasibility_near_miss_points\": %d,\r\n", InpEntryFillFeasibilityNearMissPoints);
   json += "    \"entry_fill_feasibility_score_enabled\": " + (InpEntryFillFeasibilityScoreEnabled ? "true" : "false") + ",\r\n";
   json += "    \"entry_variant_feasibility_v1_enabled\": " + (InpEnableEntryVariantFeasibilityV1 ? "true" : "false") + ",\r\n";
   json += "    \"entry_variant_feasibility_score_enabled\": " + (InpEntryVariantFeasibilityScoreEnabled ? "true" : "false") + ",\r\n";
   json += "    \"entry_variant_outcome_sim_v1_enabled\": " + (InpEnableEntryVariantOutcomeSimulationV1 ? "true" : "false") + ",\r\n";
   json += "    \"entry_variant_outcome_sim_score_enabled\": " + (InpEntryVariantOutcomeSimulationScoreEnabled ? "true" : "false") + ",\r\n";
   json += "    \"buffered_evos_v1_enabled\": " + (InpEnableBufferedEvosV1 ? "true" : "false") + ",\r\n";
   json += StringFormat("    \"buffered_evos_buffer_a_points\": %d,\r\n", InpBufferedEvosBufferA_Points);
   json += StringFormat("    \"buffered_evos_buffer_b_points\": %d,\r\n", InpBufferedEvosBufferB_Points);
   json += StringFormat("    \"buffered_evos_buffer_c_points\": %d,\r\n", InpBufferedEvosBufferC_Points);
   json += StringFormat("    \"buffered_evos_buffer_d_points\": %d,\r\n", InpBufferedEvosBufferD_Points);
   json += StringFormat("    \"buffered_evos_buffer_e_points\": %d,\r\n", InpBufferedEvosBufferE_Points);
   json += StringFormat("    \"buffered_evos_buffer_f_points\": %d,\r\n", InpBufferedEvosBufferF_Points);
   json += StringFormat("    \"buffered_evos_min_effective_rr\": %.6f,\r\n", InpBufferedEvosMinEffectiveRr);
   json += "    \"buffered_evos_score_enabled\": " + (InpBufferedEvosScoreEnabled ? "true" : "false") + "\r\n";
   json += "  },\r\n";
   json += "  \"exported_at_utc\": \"" + JsonStringEscape(exportedAt) + "\",\r\n";
   json += "  \"notes\": \"" + JsonStringEscape(g_exportNotes) + "\"\r\n";
   json += "}\r\n";
   return json;
  }

//+------------------------------------------------------------------+
string WriteTradesHeader(void)
  {
   return "run_id,trade_id,setup_event_id,timestamp,entry_time,exit_time,symbol,timeframe,direction,bias_direction,setup_direction,entry,sl,tp,exit_price,result_r,result_money,outcome,exit_reason,setup_reason,bias_reason,rejection_reason,bars_to_fill,bars_held,fvg_low,fvg_high,fvg_points,parameter_set_id,entry_mode,stop_mode,ambiguity_mode,entry_quality_score,entry_quality_grade,htf_narrative_score,liquidity_event_score,displacement_fvg_quality_score,entry_confirmation_score,target_quality_score,session_news_spread_score,risk_overtrading_score,ambiguous_risk_score,quality_reasons,missing_quality_components,ambiguous_risk_reasons,liquidity_event_detected,liquidity_event_type,liquidity_event_direction,liquidity_event_age_bars,liquidity_event_level,liquidity_event_sweep_price,liquidity_event_distance_points,liquidity_event_reasons,liquidity_sweep_quality_score,liquidity_sweep_quality_grade,liquidity_sweep_recency_score,liquidity_sweep_directional_score,liquidity_sweep_reaction_score,liquidity_sweep_displacement_score,liquidity_sweep_distance_score,liquidity_sweep_quality_reasons,liquidity_chain_detected,liquidity_chain_grade,liquidity_chain_score,liquidity_chain_sweep_to_setup_bars,liquidity_chain_sweep_to_fvg_bars,liquidity_chain_reaction_confirmed,liquidity_chain_displacement_confirmed,liquidity_chain_fvg_created_after_sweep,liquidity_chain_distance_to_fvg_points,liquidity_chain_reasons,liquidity_chain_reaction_failure_reason,liquidity_chain_reaction_close_price,liquidity_chain_reaction_level,liquidity_chain_reaction_bars_checked,htf_structure_enabled,h4_structure_state,h1_structure_state,h4_structure_direction,h1_structure_direction,htf_structure_aligned,htf_structure_conflict,htf_structure_score,h4_protected_high,h4_protected_low,h1_protected_high,h1_protected_low,h4_external_liquidity_high,h4_external_liquidity_low,h1_external_liquidity_high,h1_external_liquidity_low,htf_structure_reasons,mss_choch_enabled,mss_detected,mss_direction,mss_break_level,mss_close_price,mss_bars_after_sweep,mss_bars_before_entry,mss_valid_close,choch_detected,choch_direction,choch_break_level,choch_close_price,choch_valid_close,wick_break_only,internal_swing_high,internal_swing_low,internal_swing_high_age_bars,internal_swing_low_age_bars,mss_choch_score,mss_choch_reasons,mss_temporal_relevance_score,mss_temporal_relevance_grade,mss_after_sweep,mss_before_entry,mss_near_entry_window,mss_too_early,mss_too_late,mss_after_fvg,mss_before_fvg,mss_sweep_to_mss_bars,mss_fvg_to_mss_bars,mss_mss_to_entry_bars,mss_temporal_relevance_reasons,choch_temporal_relevance_score,choch_temporal_relevance_grade,choch_after_sweep,choch_before_entry,choch_near_entry_window,choch_too_early,choch_too_late,choch_after_fvg,choch_before_fvg,choch_sweep_to_choch_bars,choch_fvg_to_choch_bars,choch_choch_to_entry_bars,choch_temporal_relevance_reasons,premium_discount_enabled,pd_range_source,pd_range_high,pd_range_low,pd_midpoint_50,pd_position_pct,pd_entry_zone,pd_entry_in_premium,pd_entry_in_discount,pd_entry_in_equilibrium,pd_entry_outside_range,pd_entry_zone_valid_for_direction,pd_entry_zone_conflict,pd_entry_too_deep,pd_entry_too_shallow,pd_range_size_points,pd_entry_distance_to_midpoint_points,premium_discount_score,premium_discount_grade,premium_discount_reasons,entry_fill_feasibility_enabled,entry_fill_status,entry_fill_feasibility_score,entry_fill_feasibility_grade,entry_fill_feasibility_reasons,entry_price_for_fill_audit,fvg_near_edge_price,fvg_far_edge_price,fvg_ce_price,entry_depth_in_fvg_pct,entry_distance_from_near_edge_points,entry_distance_from_far_edge_points,entry_distance_from_ce_points,fvg_touch_reached,fvg_ce_touch_reached,entry_price_reached,max_retrace_into_fvg_pct,max_retrace_price,max_retrace_to_entry_distance_points,missed_entry_by_points,bars_to_fvg_touch,bars_to_ce_touch,bars_to_entry_fill,bars_to_max_retrace,bars_until_expiration_or_resolution,entry_expired_unfilled,entry_missed_shallow_retrace,entry_too_deep_for_retest,entry_near_miss,entry_filled_fast,entry_filled_late,entry_invalidated_before_fill,entry_outside_fvg,entry_geometry_unknown,entry_variant_feasibility_enabled,entry_variant_edge_price,entry_variant_25_price,entry_variant_50_price,entry_variant_75_price,entry_variant_adaptive_price,entry_variant_adaptive_type,entry_variant_edge_reached,entry_variant_25_reached,entry_variant_50_reached,entry_variant_75_reached,entry_variant_adaptive_reached,entry_variant_edge_missed_by_points,entry_variant_25_missed_by_points,entry_variant_50_missed_by_points,entry_variant_75_missed_by_points,entry_variant_adaptive_missed_by_points,entry_variant_edge_bars_to_touch,entry_variant_25_bars_to_touch,entry_variant_50_bars_to_touch,entry_variant_75_bars_to_touch,entry_variant_adaptive_bars_to_touch,entry_variant_best_reached,entry_variant_best_reached_depth_pct,entry_variant_official_depth_pct,entry_variant_fill_gap_pct,entry_variant_shallow_would_fill,entry_variant_deeper_would_not_fill,entry_variant_feasibility_score,entry_variant_feasibility_grade,entry_variant_feasibility_reasons,entry_variant_outcome_sim_enabled,entry_variant_outcome_sim_reasons,entry_variant_edge_sim_status,entry_variant_edge_sim_result_r,entry_variant_edge_sim_entry_price,entry_variant_edge_sim_sl_price,entry_variant_edge_sim_tp_price,entry_variant_edge_sim_risk_points,entry_variant_edge_sim_effective_rr,entry_variant_edge_sim_bars_to_fill,entry_variant_edge_sim_bars_to_close,entry_variant_edge_sim_ambiguous,entry_variant_edge_sim_invalid_risk,entry_variant_25_sim_status,entry_variant_25_sim_result_r,entry_variant_25_sim_entry_price,entry_variant_25_sim_sl_price,entry_variant_25_sim_tp_price,entry_variant_25_sim_risk_points,entry_variant_25_sim_effective_rr,entry_variant_25_sim_bars_to_fill,entry_variant_25_sim_bars_to_close,entry_variant_25_sim_ambiguous,entry_variant_25_sim_invalid_risk,entry_variant_50_sim_status,entry_variant_50_sim_result_r,entry_variant_50_sim_entry_price,entry_variant_50_sim_sl_price,entry_variant_50_sim_tp_price,entry_variant_50_sim_risk_points,entry_variant_50_sim_effective_rr,entry_variant_50_sim_bars_to_fill,entry_variant_50_sim_bars_to_close,entry_variant_50_sim_ambiguous,entry_variant_50_sim_invalid_risk,entry_variant_75_sim_status,entry_variant_75_sim_result_r,entry_variant_75_sim_entry_price,entry_variant_75_sim_sl_price,entry_variant_75_sim_tp_price,entry_variant_75_sim_risk_points,entry_variant_75_sim_effective_rr,entry_variant_75_sim_bars_to_fill,entry_variant_75_sim_bars_to_close,entry_variant_75_sim_ambiguous,entry_variant_75_sim_invalid_risk,entry_variant_adaptive_sim_status,entry_variant_adaptive_sim_result_r,entry_variant_adaptive_sim_entry_price,entry_variant_adaptive_sim_sl_price,entry_variant_adaptive_sim_tp_price,entry_variant_adaptive_sim_risk_points,entry_variant_adaptive_sim_effective_rr,entry_variant_adaptive_sim_bars_to_fill,entry_variant_adaptive_sim_bars_to_close,entry_variant_adaptive_sim_ambiguous,entry_variant_adaptive_sim_invalid_risk,entry_variant_best_sim_variant,entry_variant_best_sim_result_r,entry_variant_best_sim_status,entry_variant_best_sim_reasons,session_bucket,trade_window_status,spread_status,news_mode";
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
      if(g_vt.eff.log_enabled && !g_vt.eff.finalized)
         MapzEffFinalize(g_vt.dir, true, g_vt.bars_waiting_entry, g_vt.outcome, g_vt.exit_reason, g_vt.eff);
      if(g_vt.ev.log_enabled && !g_vt.ev.finalized)
         MapzEvFinalize(g_vt.ev);
     }
   else
     {
      g_vt.outcome = "expired_unfilled";
      g_vt.exit_reason = "deinit_pending_virtual_entry";
      g_vt.exit_price = 0.0;
      MapzEffFinalize(g_vt.dir, false, g_vt.bars_waiting_entry, g_vt.outcome, g_vt.exit_reason, g_vt.eff);
      if(g_vt.ev.log_enabled && !g_vt.ev.finalized)
         MapzEvFinalize(g_vt.ev);
     }

   const string detU = VirtualBuildDetailsCore();
   AppendEventRow(EVT_VIRT_UNRESOLVED,
                  BiasDirectionToString(g_vt.bias_enum),
                  setupW,
                  "unresolved",
                  g_vt.exit_reason,
                  detU);
   MapzEvosSyncP50StrictOnOfficialClose(g_vt.outcome, g_vt.result_r, g_vt.bars_held);
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
   Print("Mapazapp_TestEA: official tester EA; Daily Bias V1 + FVG/Setup V1 + virtual trades + E5.10 Liquidity Sweep V1 + E5.8 Entry Quality Score (observation-only, no orders); outputs under MQL5\\Files\\", g_baseRelPath);

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
