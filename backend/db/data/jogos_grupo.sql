-- =============================================
-- JOGOS FASE DE GRUPOS - COPA 2026
-- Horários em Brasília (BRT = UTC-3)
-- =============================================

-- Limpa jogos de demo anteriores
DELETE FROM matches WHERE phase = 'group';

-- Inserir times que faltam no banco
INSERT INTO teams (name, code, flag_emoji) VALUES
('África do Sul',           'RSA', '🇿🇦'),
('República da Coreia',     'KOR', '🇰🇷'),
('República Tcheca',        'CZE', '🇨🇿'),
('Bósnia e Herzegovina',    'BIH', '🇧🇦'),
('Catar',                   'QAT', '🇶🇦'),
('Suíça',                   'SUI', '🇨🇭'),
('Haiti',                   'HAI', '🇭🇹'),
('Escócia',                 'SCO', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'),
('Austrália',               'AUS', '🇦🇺'),
('Turquia',                 'TUR', '🇹🇷'),
('Curaçau',                 'CUW', '🇨🇼'),
('Equador',                 'ECU', '🇪🇨'),
('Holanda',                 'NED', '🇳🇱'),
('Suécia',                  'SWE', '🇸🇪'),
('Tunísia',                 'TUN', '🇹🇳'),
('Cabo Verde',              'CPV', '🇨🇻'),
('Arábia Saudita',          'KSA', '🇸🇦'),
('Nova Zelândia',           'NZL', '🇳🇿'),
('Jordânia',                'JOR', '🇯🇴'),
('Argélia',                 'ALG', '🇩🇿'),
('Iraque',                  'IRQ', '🇮🇶'),
('Noruega',                 'NOR', '🇳🇴'),
('Uzbequistão',             'UZB', '🇺🇿'),
('República Democrática do Congo', 'COD', '🇨🇩'),
('Panamá',                  'PAN', '🇵🇦')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, flag_emoji = EXCLUDED.flag_emoji;

-- Garante grupos A-L
INSERT INTO groups (name) VALUES ('A'),('B'),('C'),('D'),('E'),('F'),('G'),('H'),('I'),('J'),('K'),('L')
ON CONFLICT DO NOTHING;

-- Atualiza grupos dos times conforme tabela oficial
UPDATE teams SET group_id = (SELECT id FROM groups WHERE name='A') WHERE code IN ('MEX','RSA','KOR','CZE');
UPDATE teams SET group_id = (SELECT id FROM groups WHERE name='B') WHERE code IN ('CAN','BIH','QAT','SUI');
UPDATE teams SET group_id = (SELECT id FROM groups WHERE name='C') WHERE code IN ('BRA','MAR','HAI','SCO');
UPDATE teams SET group_id = (SELECT id FROM groups WHERE name='D') WHERE code IN ('USA','PAR','AUS','TUR');
UPDATE teams SET group_id = (SELECT id FROM groups WHERE name='E') WHERE code IN ('GER','CUW','CIV','ECU');
UPDATE teams SET group_id = (SELECT id FROM groups WHERE name='F') WHERE code IN ('NED','JPN','SWE','TUN');
UPDATE teams SET group_id = (SELECT id FROM groups WHERE name='G') WHERE code IN ('BEL','EGY','IRN','NZL');
UPDATE teams SET group_id = (SELECT id FROM groups WHERE name='H') WHERE code IN ('ESP','CPV','KSA','URU');
UPDATE teams SET group_id = (SELECT id FROM groups WHERE name='I') WHERE code IN ('FRA','SEN','IRQ','NOR');
UPDATE teams SET group_id = (SELECT id FROM groups WHERE name='J') WHERE code IN ('ARG','ALG','AUT','JOR');
UPDATE teams SET group_id = (SELECT id FROM groups WHERE name='K') WHERE code IN ('POR','COD','UZB','COL');
UPDATE teams SET group_id = (SELECT id FROM groups WHERE name='L') WHERE code IN ('ENG','CRO','GHA','PAN');

-- =============================================
-- 1ª RODADA
-- =============================================

-- 11/jun Grupo A: México x África do Sul - 16h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='MEX'),
  (SELECT id FROM teams WHERE code='RSA'),
  'group', (SELECT id FROM groups WHERE name='A'),
  '2026-06-11 16:00:00-03', 'Estadio Azteca', 'Cidade do México'
);

-- 11/jun Grupo A: Coreia do Sul x República Tcheca - 23h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='KOR'),
  (SELECT id FROM teams WHERE code='CZE'),
  'group', (SELECT id FROM groups WHERE name='A'),
  '2026-06-11 23:00:00-03', 'Estadio Akron', 'Guadalajara'
);

-- 12/jun Grupo B: Canadá x Bósnia e Herzegovina - 16h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='CAN'),
  (SELECT id FROM teams WHERE code='BIH'),
  'group', (SELECT id FROM groups WHERE name='B'),
  '2026-06-12 16:00:00-03', 'BMO Field', 'Toronto'
);

-- 12/jun Grupo D: Estados Unidos x Paraguai - 22h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='USA'),
  (SELECT id FROM teams WHERE code='PAR'),
  'group', (SELECT id FROM groups WHERE name='D'),
  '2026-06-12 22:00:00-03', 'SoFi Stadium', 'Los Angeles'
);

-- 13/jun Grupo B: Catar x Suíça - 16h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='QAT'),
  (SELECT id FROM teams WHERE code='SUI'),
  'group', (SELECT id FROM groups WHERE name='B'),
  '2026-06-13 16:00:00-03', $q$Levi's Stadium$q$, 'Santa Clara'
);

-- 13/jun Grupo C: Brasil x Marrocos - 19h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='BRA'),
  (SELECT id FROM teams WHERE code='MAR'),
  'group', (SELECT id FROM groups WHERE name='C'),
  '2026-06-13 19:00:00-03', 'MetLife Stadium', 'Nova York'
);

-- 13/jun Grupo C: Haiti x Escócia - 22h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='HAI'),
  (SELECT id FROM teams WHERE code='SCO'),
  'group', (SELECT id FROM groups WHERE name='C'),
  '2026-06-13 22:00:00-03', 'Gillette Stadium', 'Boston'
);

-- 13/jun Grupo D: Austrália x Turquia - 01h do dia 14 (Brasília)
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='AUS'),
  (SELECT id FROM teams WHERE code='TUR'),
  'group', (SELECT id FROM groups WHERE name='D'),
  '2026-06-14 01:00:00-03', 'BC Place', 'Vancouver'
);

-- 14/jun Grupo E: Alemanha x Curaçau - 14h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='GER'),
  (SELECT id FROM teams WHERE code='CUW'),
  'group', (SELECT id FROM groups WHERE name='E'),
  '2026-06-14 14:00:00-03', 'NRG Stadium', 'Houston'
);

-- 14/jun Grupo E: Costa do Marfim x Equador - 20h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='CIV'),
  (SELECT id FROM teams WHERE code='ECU'),
  'group', (SELECT id FROM groups WHERE name='E'),
  '2026-06-14 20:00:00-03', 'Lincoln Financial Field', 'Filadélfia'
);

-- 14/jun Grupo F: Holanda x Japão - 17h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='NED'),
  (SELECT id FROM teams WHERE code='JPN'),
  'group', (SELECT id FROM groups WHERE name='F'),
  '2026-06-14 17:00:00-03', 'AT&T Stadium', 'Dallas'
);

-- 14/jun Grupo F: Suécia x Tunísia - 23h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='SWE'),
  (SELECT id FROM teams WHERE code='TUN'),
  'group', (SELECT id FROM groups WHERE name='F'),
  '2026-06-14 23:00:00-03', 'Estadio BBVA', 'Monterrey'
);

-- 15/jun Grupo H: Espanha x Cabo Verde - 13h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='ESP'),
  (SELECT id FROM teams WHERE code='CPV'),
  'group', (SELECT id FROM groups WHERE name='H'),
  '2026-06-15 13:00:00-03', 'Mercedes-Benz Stadium', 'Atlanta'
);

-- 15/jun Grupo H: Arábia Saudita x Uruguai - 19h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='KSA'),
  (SELECT id FROM teams WHERE code='URU'),
  'group', (SELECT id FROM groups WHERE name='H'),
  '2026-06-15 19:00:00-03', 'Hard Rock Stadium', 'Miami'
);

-- 15/jun Grupo G: Bélgica x Egito - 16h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='BEL'),
  (SELECT id FROM teams WHERE code='EGY'),
  'group', (SELECT id FROM groups WHERE name='G'),
  '2026-06-15 16:00:00-03', 'Lumen Field', 'Seattle'
);

-- 15/jun Grupo G: Irã x Nova Zelândia - 22h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='IRN'),
  (SELECT id FROM teams WHERE code='NZL'),
  'group', (SELECT id FROM groups WHERE name='G'),
  '2026-06-15 22:00:00-03', 'SoFi Stadium', 'Los Angeles'
);

-- 16/jun Grupo J: Áustria x Jordânia - 01h do dia 17 Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='AUT'),
  (SELECT id FROM teams WHERE code='JOR'),
  'group', (SELECT id FROM groups WHERE name='J'),
  '2026-06-17 01:00:00-03', $q$Levi's Stadium$q$, 'Santa Clara'
);

-- 16/jun Grupo I: França x Senegal - 16h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='FRA'),
  (SELECT id FROM teams WHERE code='SEN'),
  'group', (SELECT id FROM groups WHERE name='I'),
  '2026-06-16 16:00:00-03', 'MetLife Stadium', 'Nova York'
);

-- 16/jun Grupo I: Iraque x Noruega - 19h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='IRQ'),
  (SELECT id FROM teams WHERE code='NOR'),
  'group', (SELECT id FROM groups WHERE name='I'),
  '2026-06-16 19:00:00-03', 'Gillette Stadium', 'Boston'
);

-- 16/jun Grupo J: Argentina x Argélia - 22h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='ARG'),
  (SELECT id FROM teams WHERE code='ALG'),
  'group', (SELECT id FROM groups WHERE name='J'),
  '2026-06-16 22:00:00-03', 'Arrowhead Stadium', 'Kansas City'
);

-- 17/jun Grupo K: Portugal x Rep. Dem. do Congo - 14h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='POR'),
  (SELECT id FROM teams WHERE code='COD'),
  'group', (SELECT id FROM groups WHERE name='K'),
  '2026-06-17 14:00:00-03', 'NRG Stadium', 'Houston'
);

-- 17/jun Grupo L: Inglaterra x Croácia - 17h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='ENG'),
  (SELECT id FROM teams WHERE code='CRO'),
  'group', (SELECT id FROM groups WHERE name='L'),
  '2026-06-17 17:00:00-03', 'AT&T Stadium', 'Dallas'
);

-- 17/jun Grupo L: Gana x Panamá - 20h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='GHA'),
  (SELECT id FROM teams WHERE code='PAN'),
  'group', (SELECT id FROM groups WHERE name='L'),
  '2026-06-17 20:00:00-03', 'BMO Field', 'Toronto'
);

-- 17/jun Grupo K: Uzbequistão x Colômbia - 21h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='UZB'),
  (SELECT id FROM teams WHERE code='COL'),
  'group', (SELECT id FROM groups WHERE name='K'),
  '2026-06-17 21:00:00-03', 'Estadio Azteca', 'Cidade do México'
);

-- =============================================
-- 2ª RODADA
-- =============================================

-- 18/jun Grupo A: Rep. Tcheca x África do Sul - 13h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='CZE'),
  (SELECT id FROM teams WHERE code='RSA'),
  'group', (SELECT id FROM groups WHERE name='A'),
  '2026-06-18 13:00:00-03', 'Mercedes-Benz Stadium', 'Atlanta'
);

-- 18/jun Grupo B: Suíça x Bósnia - 16h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='SUI'),
  (SELECT id FROM teams WHERE code='BIH'),
  'group', (SELECT id FROM groups WHERE name='B'),
  '2026-06-18 16:00:00-03', 'SoFi Stadium', 'Los Angeles'
);

-- 18/jun Grupo B: Canadá x Catar - 19h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='CAN'),
  (SELECT id FROM teams WHERE code='QAT'),
  'group', (SELECT id FROM groups WHERE name='B'),
  '2026-06-18 19:00:00-03', 'BC Place', 'Vancouver'
);

-- 18/jun Grupo A: México x Coreia do Sul - 22h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='MEX'),
  (SELECT id FROM teams WHERE code='KOR'),
  'group', (SELECT id FROM groups WHERE name='A'),
  '2026-06-18 22:00:00-03', 'Estadio Akron', 'Guadalajara'
);

-- 19/jun Grupo D: Turquia x Paraguai - 00h Brasília (vira 20/jun)
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='TUR'),
  (SELECT id FROM teams WHERE code='PAR'),
  'group', (SELECT id FROM groups WHERE name='D'),
  '2026-06-20 00:00:00-03', $q$Levi's Stadium$q$, 'Santa Clara'
);

-- 19/jun Grupo D: EUA x Austrália - 16h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='USA'),
  (SELECT id FROM teams WHERE code='AUS'),
  'group', (SELECT id FROM groups WHERE name='D'),
  '2026-06-19 16:00:00-03', 'Lumen Field', 'Seattle'
);

-- 19/jun Grupo C: Escócia x Marrocos - 19h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='SCO'),
  (SELECT id FROM teams WHERE code='MAR'),
  'group', (SELECT id FROM groups WHERE name='C'),
  '2026-06-19 19:00:00-03', 'Gillette Stadium', 'Boston'
);

-- 19/jun Grupo C: Brasil x Haiti - 21h30 Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='BRA'),
  (SELECT id FROM teams WHERE code='HAI'),
  'group', (SELECT id FROM groups WHERE name='C'),
  '2026-06-19 21:30:00-03', 'Lincoln Financial Field', 'Filadélfia'
);

-- 20/jun Grupo F: Tunísia x Japão - 23h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='TUN'),
  (SELECT id FROM teams WHERE code='JPN'),
  'group', (SELECT id FROM groups WHERE name='F'),
  '2026-06-20 23:00:00-03', 'Estadio BBVA', 'Monterrey'
);

-- 20/jun Grupo F: Holanda x Suécia - 14h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='NED'),
  (SELECT id FROM teams WHERE code='SWE'),
  'group', (SELECT id FROM groups WHERE name='F'),
  '2026-06-20 14:00:00-03', 'NRG Stadium', 'Houston'
);

-- 20/jun Grupo E: Alemanha x Costa do Marfim - 17h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='GER'),
  (SELECT id FROM teams WHERE code='CIV'),
  'group', (SELECT id FROM groups WHERE name='E'),
  '2026-06-20 17:00:00-03', 'BMO Field', 'Toronto'
);

-- 20/jun Grupo E: Equador x Curaçau - 21h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='ECU'),
  (SELECT id FROM teams WHERE code='CUW'),
  'group', (SELECT id FROM groups WHERE name='E'),
  '2026-06-20 21:00:00-03', 'Arrowhead Stadium', 'Kansas City'
);

-- 21/jun Grupo H: Espanha x Arábia Saudita - 13h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='ESP'),
  (SELECT id FROM teams WHERE code='KSA'),
  'group', (SELECT id FROM groups WHERE name='H'),
  '2026-06-21 13:00:00-03', 'Mercedes-Benz Stadium', 'Atlanta'
);

-- 21/jun Grupo G: Bélgica x Irã - 16h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='BEL'),
  (SELECT id FROM teams WHERE code='IRN'),
  'group', (SELECT id FROM groups WHERE name='G'),
  '2026-06-21 16:00:00-03', 'SoFi Stadium', 'Los Angeles'
);

-- 21/jun Grupo H: Uruguai x Cabo Verde - 19h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='URU'),
  (SELECT id FROM teams WHERE code='CPV'),
  'group', (SELECT id FROM groups WHERE name='H'),
  '2026-06-21 19:00:00-03', 'Hard Rock Stadium', 'Miami'
);

-- 21/jun Grupo G: Nova Zelândia x Egito - 22h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='NZL'),
  (SELECT id FROM teams WHERE code='EGY'),
  'group', (SELECT id FROM groups WHERE name='G'),
  '2026-06-21 22:00:00-03', 'BC Place', 'Vancouver'
);

-- 22/jun Grupo J: Argentina x Áustria - 14h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='ARG'),
  (SELECT id FROM teams WHERE code='AUT'),
  'group', (SELECT id FROM groups WHERE name='J'),
  '2026-06-22 14:00:00-03', 'AT&T Stadium', 'Dallas'
);

-- 22/jun Grupo I: França x Iraque - 18h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='FRA'),
  (SELECT id FROM teams WHERE code='IRQ'),
  'group', (SELECT id FROM groups WHERE name='I'),
  '2026-06-22 18:00:00-03', 'Lincoln Financial Field', 'Filadélfia'
);

-- 22/jun Grupo I: Noruega x Senegal - 21h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='NOR'),
  (SELECT id FROM teams WHERE code='SEN'),
  'group', (SELECT id FROM groups WHERE name='I'),
  '2026-06-22 21:00:00-03', 'MetLife Stadium', 'Nova York'
);

-- 22/jun Grupo J: Jordânia x Argélia - 00h do dia 23 Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='JOR'),
  (SELECT id FROM teams WHERE code='ALG'),
  'group', (SELECT id FROM groups WHERE name='J'),
  '2026-06-23 00:00:00-03', $q$Levi's Stadium$q$, 'Santa Clara'
);

-- 23/jun Grupo K: Portugal x Uzbequistão - 14h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='POR'),
  (SELECT id FROM teams WHERE code='UZB'),
  'group', (SELECT id FROM groups WHERE name='K'),
  '2026-06-23 14:00:00-03', 'NRG Stadium', 'Houston'
);

-- 23/jun Grupo L: Inglaterra x Gana - 17h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='ENG'),
  (SELECT id FROM teams WHERE code='GHA'),
  'group', (SELECT id FROM groups WHERE name='L'),
  '2026-06-23 17:00:00-03', 'Gillette Stadium', 'Boston'
);

-- 23/jun Grupo L: Panamá x Croácia - 20h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='PAN'),
  (SELECT id FROM teams WHERE code='CRO'),
  'group', (SELECT id FROM groups WHERE name='L'),
  '2026-06-23 20:00:00-03', 'BMO Field', 'Toronto'
);

-- 23/jun Grupo K: Colômbia x Rep. Dem. Congo - 23h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='COL'),
  (SELECT id FROM teams WHERE code='COD'),
  'group', (SELECT id FROM groups WHERE name='K'),
  '2026-06-23 23:00:00-03', 'Estadio Akron', 'Guadalajara'
);

-- =============================================
-- 3ª RODADA (jogos simultâneos por grupo)
-- =============================================

-- 24/jun Grupo B: Suíça x Canadá - 16h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='SUI'),
  (SELECT id FROM teams WHERE code='CAN'),
  'group', (SELECT id FROM groups WHERE name='B'),
  '2026-06-24 16:00:00-03', 'BC Place', 'Vancouver'
);

-- 24/jun Grupo B: Bósnia x Catar - 16h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='BIH'),
  (SELECT id FROM teams WHERE code='QAT'),
  'group', (SELECT id FROM groups WHERE name='B'),
  '2026-06-24 16:00:00-03', 'Lumen Field', 'Seattle'
);

-- 24/jun Grupo C: Escócia x Brasil - 19h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='SCO'),
  (SELECT id FROM teams WHERE code='BRA'),
  'group', (SELECT id FROM groups WHERE name='C'),
  '2026-06-24 19:00:00-03', 'Hard Rock Stadium', 'Miami'
);

-- 24/jun Grupo C: Marrocos x Haiti - 19h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='MAR'),
  (SELECT id FROM teams WHERE code='HAI'),
  'group', (SELECT id FROM groups WHERE name='C'),
  '2026-06-24 19:00:00-03', 'Mercedes-Benz Stadium', 'Atlanta'
);

-- 24/jun Grupo A: Rep. Tcheca x México - 22h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='CZE'),
  (SELECT id FROM teams WHERE code='MEX'),
  'group', (SELECT id FROM groups WHERE name='A'),
  '2026-06-24 22:00:00-03', 'Estadio Azteca', 'Cidade do México'
);

-- 24/jun Grupo A: África do Sul x Coreia do Sul - 22h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='RSA'),
  (SELECT id FROM teams WHERE code='KOR'),
  'group', (SELECT id FROM groups WHERE name='A'),
  '2026-06-24 22:00:00-03', 'Estadio BBVA', 'Monterrey'
);

-- 25/jun Grupo E: Equador x Alemanha - 17h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='ECU'),
  (SELECT id FROM teams WHERE code='GER'),
  'group', (SELECT id FROM groups WHERE name='E'),
  '2026-06-25 17:00:00-03', 'MetLife Stadium', 'Nova York'
);

-- 25/jun Grupo E: Curaçau x Costa do Marfim - 17h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='CUW'),
  (SELECT id FROM teams WHERE code='CIV'),
  'group', (SELECT id FROM groups WHERE name='E'),
  '2026-06-25 17:00:00-03', 'Lincoln Financial Field', 'Filadélfia'
);

-- 25/jun Grupo F: Japão x Suécia - 20h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='JPN'),
  (SELECT id FROM teams WHERE code='SWE'),
  'group', (SELECT id FROM groups WHERE name='F'),
  '2026-06-25 20:00:00-03', 'AT&T Stadium', 'Dallas'
);

-- 25/jun Grupo F: Tunísia x Holanda - 20h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='TUN'),
  (SELECT id FROM teams WHERE code='NED'),
  'group', (SELECT id FROM groups WHERE name='F'),
  '2026-06-25 20:00:00-03', 'Arrowhead Stadium', 'Kansas City'
);

-- 25/jun Grupo D: Turquia x EUA - 23h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='TUR'),
  (SELECT id FROM teams WHERE code='USA'),
  'group', (SELECT id FROM groups WHERE name='D'),
  '2026-06-25 23:00:00-03', 'SoFi Stadium', 'Los Angeles'
);

-- 25/jun Grupo D: Paraguai x Austrália - 23h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='PAR'),
  (SELECT id FROM teams WHERE code='AUS'),
  'group', (SELECT id FROM groups WHERE name='D'),
  '2026-06-25 23:00:00-03', $q$Levi's Stadium$q$, 'Santa Clara'
);

-- 26/jun Grupo I: Noruega x França - 16h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='NOR'),
  (SELECT id FROM teams WHERE code='FRA'),
  'group', (SELECT id FROM groups WHERE name='I'),
  '2026-06-26 16:00:00-03', 'Gillette Stadium', 'Boston'
);

-- 26/jun Grupo I: Senegal x Iraque - 16h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='SEN'),
  (SELECT id FROM teams WHERE code='IRQ'),
  'group', (SELECT id FROM groups WHERE name='I'),
  '2026-06-26 16:00:00-03', 'BMO Field', 'Toronto'
);

-- 26/jun Grupo H: Cabo Verde x Arábia Saudita - 21h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='CPV'),
  (SELECT id FROM teams WHERE code='KSA'),
  'group', (SELECT id FROM groups WHERE name='H'),
  '2026-06-26 21:00:00-03', 'NRG Stadium', 'Houston'
);

-- 26/jun Grupo H: Uruguai x Espanha - 21h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='URU'),
  (SELECT id FROM teams WHERE code='ESP'),
  'group', (SELECT id FROM groups WHERE name='H'),
  '2026-06-26 21:00:00-03', 'Estadio Akron', 'Guadalajara'
);

-- 26/jun Grupo G: Egito x Irã - 00h do dia 27 Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='EGY'),
  (SELECT id FROM teams WHERE code='IRN'),
  'group', (SELECT id FROM groups WHERE name='G'),
  '2026-06-27 00:00:00-03', 'Lumen Field', 'Seattle'
);

-- 26/jun Grupo G: Nova Zelândia x Bélgica - 00h do dia 27 Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='NZL'),
  (SELECT id FROM teams WHERE code='BEL'),
  'group', (SELECT id FROM groups WHERE name='G'),
  '2026-06-27 00:00:00-03', 'BC Place', 'Vancouver'
);

-- 27/jun Grupo L: Panamá x Inglaterra - 18h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='PAN'),
  (SELECT id FROM teams WHERE code='ENG'),
  'group', (SELECT id FROM groups WHERE name='L'),
  '2026-06-27 18:00:00-03', 'MetLife Stadium', 'Nova York'
);

-- 27/jun Grupo L: Croácia x Gana - 18h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='CRO'),
  (SELECT id FROM teams WHERE code='GHA'),
  'group', (SELECT id FROM groups WHERE name='L'),
  '2026-06-27 18:00:00-03', 'Lincoln Financial Field', 'Filadélfia'
);

-- 27/jun Grupo K: Colômbia x Portugal - 20h30 Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='COL'),
  (SELECT id FROM teams WHERE code='POR'),
  'group', (SELECT id FROM groups WHERE name='K'),
  '2026-06-27 20:30:00-03', 'Hard Rock Stadium', 'Miami'
);

-- 27/jun Grupo K: Rep. Dem. Congo x Uzbequistão - 20h30 Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='COD'),
  (SELECT id FROM teams WHERE code='UZB'),
  'group', (SELECT id FROM groups WHERE name='K'),
  '2026-06-27 20:30:00-03', 'Mercedes-Benz Stadium', 'Atlanta'
);

-- 27/jun Grupo J: Argélia x Áustria - 23h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='ALG'),
  (SELECT id FROM teams WHERE code='AUT'),
  'group', (SELECT id FROM groups WHERE name='J'),
  '2026-06-27 23:00:00-03', 'Arrowhead Stadium', 'Kansas City'
);

-- 27/jun Grupo J: Jordânia x Argentina - 23h Brasília
INSERT INTO matches (home_team_id, away_team_id, phase, group_id, match_date, stadium, city) VALUES (
  (SELECT id FROM teams WHERE code='JOR'),
  (SELECT id FROM teams WHERE code='ARG'),
  'group', (SELECT id FROM groups WHERE name='J'),
  '2026-06-27 23:00:00-03', 'AT&T Stadium', 'Dallas'
);

SELECT COUNT(*) AS total_jogos_inseridos FROM matches WHERE phase = 'group';
