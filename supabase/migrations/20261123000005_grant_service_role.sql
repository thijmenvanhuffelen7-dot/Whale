-- Nieuwe Supabase-projecten geven service_role geen automatische rechten
-- meer op zelfgemaakte tabellen. De server (bot, site, cron) gebruikt service_role.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on function claim_alert_slot(chain, text, interval) to service_role;
grant execute on function release_alert_slot(chain, text) to service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
