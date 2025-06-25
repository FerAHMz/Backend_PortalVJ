SELECT pg_sleep(2);

CREATE EXTENSION IF NOT EXISTS pgcrypto;

SELECT pg_sleep(1);

UPDATE maestros 
SET password = crypt(CONCAT('password', id::text), gen_salt('bf', 10));

UPDATE padres 
SET password = crypt(CONCAT('password', id::text), gen_salt('bf', 10));

UPDATE administrativos 
SET password = crypt(CONCAT('password', id::text), gen_salt('bf', 10));

UPDATE directores 
SET password = crypt(CONCAT('password', id::text), gen_salt('bf', 10));

UPDATE SuperUsuarios
SET password = crypt(CONCAT('password', id::text), gen_salt('bf', 10));