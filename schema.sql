CREATE TABLE IF NOT EXISTS company (
  id INTEGER PRIMARY KEY AUTOINCREMENT, short_name TEXT NOT NULL UNIQUE, legal_name TEXT, ticker TEXT, isin TEXT UNIQUE,
  exchange TEXT, listing_segment TEXT, hq TEXT, currency TEXT DEFAULT 'CHF', fiscal_year_end_month INTEGER DEFAULT 12,
  focus TEXT, description TEXT, website TEXT, status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS index_membership (
  company_id INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE, index_name TEXT NOT NULL, as_of TEXT,
  PRIMARY KEY (company_id, index_name));
CREATE TABLE IF NOT EXISTS financials (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  period_end TEXT NOT NULL, period_type TEXT NOT NULL CHECK (period_type IN ('FY','H1','Q')), period_label TEXT,
  rental_income REAL, annualised_rent REAL, ebitda REAL, ebit REAL, net_profit REAL, epra_profit REAL, eps REAL, epra_eps REAL,
  revaluation_gain REAL, roe_pct REAL, vacancy_rate_pct REAL, net_yield_epra_pct REAL, walt_years REAL, portfolio_value REAL,
  total_assets REAL, equity REAL, equity_ratio_pct REAL, mortgages REAL, ltv_pct REAL, avg_interest_rate_pct REAL,
  financing_costs REAL, epra_nav_ps REAL, epra_nrv_ps REAL, dividend_ps REAL, source_url TEXT, notes TEXT,
  created_at TEXT DEFAULT (datetime('now')), UNIQUE (company_id, period_end, period_type));
CREATE TABLE IF NOT EXISTS market_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  as_of TEXT NOT NULL, price REAL, market_cap REAL, shares_outstanding REAL, analyst_buy INTEGER, analyst_neutral INTEGER,
  analyst_sell INTEGER, target_price REAL, source TEXT, notes TEXT, UNIQUE (company_id, as_of));
CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  published_date TEXT NOT NULL, category TEXT, title TEXT NOT NULL, summary TEXT, url TEXT, source TEXT,
  created_at TEXT DEFAULT (datetime('now')), UNIQUE (company_id, published_date, title));
CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  name TEXT NOT NULL, role TEXT NOT NULL, since TEXT, until TEXT, notes TEXT, UNIQUE (company_id, name, role));
CREATE TABLE IF NOT EXISTS shareholders (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  holder TEXT NOT NULL, pct REAL, as_of TEXT, source TEXT, UNIQUE (company_id, holder));
CREATE INDEX IF NOT EXISTS idx_fin_company ON financials(company_id, period_end);
CREATE INDEX IF NOT EXISTS idx_news_company ON news(company_id, published_date DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_company ON market_data(company_id, as_of DESC);

CREATE VIEW IF NOT EXISTS v_latest_period AS
SELECT f.* FROM financials f WHERE f.period_end = (SELECT MAX(period_end) FROM financials x WHERE x.company_id = f.company_id);
CREATE VIEW IF NOT EXISTS v_latest_fy AS
SELECT f.* FROM financials f WHERE f.period_type = 'FY'
  AND f.period_end = (SELECT MAX(period_end) FROM financials x WHERE x.company_id = f.company_id AND x.period_type = 'FY');
CREATE VIEW IF NOT EXISTS v_latest_market AS
SELECT m.* FROM market_data m WHERE m.as_of = (SELECT MAX(as_of) FROM market_data x WHERE x.company_id = m.company_id);
CREATE VIEW IF NOT EXISTS v_company_profile AS
SELECT c.id, c.short_name, c.legal_name, c.ticker, c.isin, c.exchange, c.hq, c.currency, c.focus, c.description,
  (SELECT GROUP_CONCAT(index_name, ', ') FROM index_membership i WHERE i.company_id = c.id) AS indices,
  (SELECT name FROM people p WHERE p.company_id = c.id AND p.role = 'CEO' AND p.until IS NULL ORDER BY since DESC LIMIT 1) AS ceo,
  (SELECT name FROM people p WHERE p.company_id = c.id AND p.role = 'VR-Präsident' AND p.until IS NULL ORDER BY since DESC LIMIT 1) AS chair,
  fy.period_label AS fy_label, fy.rental_income, fy.ebitda, fy.net_profit, fy.epra_profit, fy.epra_eps, fy.vacancy_rate_pct AS fy_vacancy,
  fy.net_yield_epra_pct, fy.portfolio_value AS fy_portfolio_value, fy.equity_ratio_pct, fy.ltv_pct AS fy_ltv, fy.avg_interest_rate_pct AS fy_interest,
  fy.epra_nav_ps, fy.dividend_ps,
  lp.period_label AS latest_label, lp.period_end AS latest_period_end, lp.portfolio_value AS latest_portfolio_value, lp.total_assets AS latest_total_assets,
  lp.vacancy_rate_pct AS latest_vacancy, lp.ltv_pct AS latest_ltv, lp.avg_interest_rate_pct AS latest_interest, lp.walt_years AS latest_walt, lp.net_profit AS latest_net_profit,
  mk.as_of AS price_date, mk.price, mk.market_cap
FROM company c
LEFT JOIN v_latest_fy fy ON fy.company_id = c.id
LEFT JOIN v_latest_period lp ON lp.company_id = c.id
LEFT JOIN v_latest_market mk ON mk.company_id = c.id;
CREATE VIEW IF NOT EXISTS v_comparison AS
SELECT c.short_name, c.ticker, c.exchange, fy.period_label AS fy_label,
  fy.rental_income, fy.net_profit, fy.epra_profit, fy.portfolio_value, fy.total_assets, fy.equity_ratio_pct,
  fy.ltv_pct, fy.avg_interest_rate_pct, fy.vacancy_rate_pct, fy.net_yield_epra_pct, fy.walt_years,
  fy.epra_nav_ps, fy.dividend_ps, mk.price, mk.market_cap,
  ROUND(mk.price / NULLIF(fy.epra_nav_ps,0), 2) AS price_to_nav,
  ROUND(100.0 * fy.dividend_ps / NULLIF(mk.price,0), 2) AS dividend_yield_pct,
  ROUND(100.0 * fy.epra_eps / NULLIF(mk.price,0), 2) AS epra_earnings_yield_pct
FROM company c
LEFT JOIN v_latest_fy fy ON fy.company_id = c.id
LEFT JOIN v_latest_market mk ON mk.company_id = c.id;
