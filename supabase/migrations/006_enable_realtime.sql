-- Habilita Realtime nas tabelas monitoradas pelo sininho de notificações admin
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE affiliate_withdrawals;
