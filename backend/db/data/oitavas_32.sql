-- =============================================
-- OITAVAS DE FINAL (Round of 32) — Copa 2026
-- Horários em Brasília (BRT = UTC-3)
-- =============================================

-- 28/jun - África do Sul x Canadá - 16h BRT
INSERT INTO matches (home_team_id, away_team_id, phase, match_date, stadium, city)
SELECT
  (SELECT id FROM teams WHERE code='RSA'),
  (SELECT id FROM teams WHERE code='CAN'),
  'round_of_32', '2026-06-28 16:00:00-03', 'SoFi Stadium', 'Los Angeles';

-- 29/jun - Brasil x Japão - 14h BRT
INSERT INTO matches (home_team_id, away_team_id, phase, match_date, stadium, city)
SELECT
  (SELECT id FROM teams WHERE code='BRA'),
  (SELECT id FROM teams WHERE code='JPN'),
  'round_of_32', '2026-06-29 14:00:00-03', 'NRG Stadium', 'Houston';

-- 29/jun - Alemanha x Paraguai - 17h30 BRT
INSERT INTO matches (home_team_id, away_team_id, phase, match_date, stadium, city)
SELECT
  (SELECT id FROM teams WHERE code='GER'),
  (SELECT id FROM teams WHERE code='PAR'),
  'round_of_32', '2026-06-29 17:30:00-03', 'Gillette Stadium', 'Boston';

-- 29/jun - Holanda x Marrocos - 22h BRT
INSERT INTO matches (home_team_id, away_team_id, phase, match_date, stadium, city)
SELECT
  (SELECT id FROM teams WHERE code='NED'),
  (SELECT id FROM teams WHERE code='MAR'),
  'round_of_32', '2026-06-29 22:00:00-03', 'Estadio BBVA', 'Monterrey';

-- 30/jun - Costa do Marfim x Noruega - 14h BRT
INSERT INTO matches (home_team_id, away_team_id, phase, match_date, stadium, city)
SELECT
  (SELECT id FROM teams WHERE code='CIV'),
  (SELECT id FROM teams WHERE code='NOR'),
  'round_of_32', '2026-06-30 14:00:00-03', 'AT&T Stadium', 'Dallas';

-- 30/jun - França x Suécia - 18h BRT
INSERT INTO matches (home_team_id, away_team_id, phase, match_date, stadium, city)
SELECT
  (SELECT id FROM teams WHERE code='FRA'),
  (SELECT id FROM teams WHERE code='SWE'),
  'round_of_32', '2026-06-30 18:00:00-03', 'MetLife Stadium', 'Nova York';

-- 30/jun - México x Equador - 22h BRT
INSERT INTO matches (home_team_id, away_team_id, phase, match_date, stadium, city)
SELECT
  (SELECT id FROM teams WHERE code='MEX'),
  (SELECT id FROM teams WHERE code='ECU'),
  'round_of_32', '2026-06-30 22:00:00-03', 'Estadio Azteca', 'Cidade do México';

-- 01/jul - Inglaterra x RD Congo - 13h BRT
INSERT INTO matches (home_team_id, away_team_id, phase, match_date, stadium, city)
SELECT
  (SELECT id FROM teams WHERE code='ENG'),
  (SELECT id FROM teams WHERE code='COD'),
  'round_of_32', '2026-07-01 13:00:00-03', 'Mercedes-Benz Stadium', 'Atlanta';

-- 01/jul - Bélgica x Senegal - 17h BRT
INSERT INTO matches (home_team_id, away_team_id, phase, match_date, stadium, city)
SELECT
  (SELECT id FROM teams WHERE code='BEL'),
  (SELECT id FROM teams WHERE code='SEN'),
  'round_of_32', '2026-07-01 17:00:00-03', 'Lumen Field', 'Seattle';

-- 01/jul - Estados Unidos x Bósnia - 21h BRT
INSERT INTO matches (home_team_id, away_team_id, phase, match_date, stadium, city)
SELECT
  (SELECT id FROM teams WHERE code='USA'),
  (SELECT id FROM teams WHERE code='BIH'),
  'round_of_32', '2026-07-01 21:00:00-03', $$Levi's Stadium$$, 'Santa Clara';

-- 02/jul - Espanha x Áustria - 16h BRT
INSERT INTO matches (home_team_id, away_team_id, phase, match_date, stadium, city)
SELECT
  (SELECT id FROM teams WHERE code='ESP'),
  (SELECT id FROM teams WHERE code='AUT'),
  'round_of_32', '2026-07-02 16:00:00-03', 'SoFi Stadium', 'Los Angeles';

-- 02/jul - Portugal x Croácia - 20h BRT
INSERT INTO matches (home_team_id, away_team_id, phase, match_date, stadium, city)
SELECT
  (SELECT id FROM teams WHERE code='POR'),
  (SELECT id FROM teams WHERE code='CRO'),
  'round_of_32', '2026-07-02 20:00:00-03', 'BMO Field', 'Toronto';

-- 03/jul - Suíça x Argélia - 00h BRT
INSERT INTO matches (home_team_id, away_team_id, phase, match_date, stadium, city)
SELECT
  (SELECT id FROM teams WHERE code='SUI'),
  (SELECT id FROM teams WHERE code='ALG'),
  'round_of_32', '2026-07-03 00:00:00-03', 'BC Place', 'Vancouver';

-- 03/jul - Austrália x Egito - 15h BRT
INSERT INTO matches (home_team_id, away_team_id, phase, match_date, stadium, city)
SELECT
  (SELECT id FROM teams WHERE code='AUS'),
  (SELECT id FROM teams WHERE code='EGY'),
  'round_of_32', '2026-07-03 15:00:00-03', 'AT&T Stadium', 'Dallas';

-- 03/jul - Argentina x Cabo Verde - 19h BRT
INSERT INTO matches (home_team_id, away_team_id, phase, match_date, stadium, city)
SELECT
  (SELECT id FROM teams WHERE code='ARG'),
  (SELECT id FROM teams WHERE code='CPV'),
  'round_of_32', '2026-07-03 19:00:00-03', 'Hard Rock Stadium', 'Miami';

-- 03/jul - Colômbia x Gana - 22h30 BRT
INSERT INTO matches (home_team_id, away_team_id, phase, match_date, stadium, city)
SELECT
  (SELECT id FROM teams WHERE code='COL'),
  (SELECT id FROM teams WHERE code='GHA'),
  'round_of_32', '2026-07-03 22:30:00-03', 'Arrowhead Stadium', 'Kansas City';

SELECT COUNT(*) AS jogos_inseridos FROM matches WHERE phase = 'round_of_32';
