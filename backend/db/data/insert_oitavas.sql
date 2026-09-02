INSERT INTO matches (home_team_id, away_team_id, phase, match_date, stadium, city)
VALUES
  ((SELECT id FROM teams WHERE name ILIKE 'paraguai%'), (SELECT id FROM teams WHERE name ILIKE 'fran%a%'),
   'round_of_16', '2026-07-04 21:00:00+00', 'Lincoln Financial Field', 'Filadélfia'),

  ((SELECT id FROM teams WHERE name ILIKE 'canad%'), (SELECT id FROM teams WHERE name ILIKE 'marrocos%'),
   'round_of_16', '2026-07-04 17:00:00+00', 'NRG Stadium', 'Houston'),

  ((SELECT id FROM teams WHERE name ILIKE 'portugal%'), (SELECT id FROM teams WHERE name ILIKE 'espanha%'),
   'round_of_16', '2026-07-06 19:00:00+00', 'AT&T Stadium', 'Dallas'),

  ((SELECT id FROM teams WHERE name ILIKE 'estados unidos%'), (SELECT id FROM teams WHERE name ILIKE 'b%lgica%'),
   'round_of_16', '2026-07-07 00:00:00+00', 'Lumen Field', 'Seattle'),

  ((SELECT id FROM teams WHERE name ILIKE 'brasil%'), (SELECT id FROM teams WHERE name ILIKE 'noruega%'),
   'round_of_16', '2026-07-05 20:00:00+00', 'MetLife Stadium', 'Nova Jersey'),

  ((SELECT id FROM teams WHERE name ILIKE 'm%xico%'), (SELECT id FROM teams WHERE name ILIKE 'inglaterra%'),
   'round_of_16', '2026-07-06 00:00:00+00', 'Estadio Azteca', 'Cidade do México'),

  ((SELECT id FROM teams WHERE name ILIKE 'argentina%'), (SELECT id FROM teams WHERE name ILIKE 'egito%'),
   'round_of_16', '2026-07-07 16:00:00+00', 'Mercedes-Benz Stadium', 'Atlanta')
RETURNING id, home_team_id, away_team_id, match_date, city;
