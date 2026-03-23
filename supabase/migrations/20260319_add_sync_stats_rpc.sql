-- Create or Replace the missing sync_campaign_stats RPC function
-- This natively computes and syncs the campaign counts from campaign_messages
CREATE OR REPLACE FUNCTION sync_campaign_stats(p_campaign_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE whatsapp_campaigns c
  SET
    sent_count = (SELECT count(*) FROM campaign_messages WHERE campaign_id = p_campaign_id AND status IN ('SENT', 'DELIVERED', 'READ', 'REPLIED')),
    delivered_count = (SELECT count(*) FROM campaign_messages WHERE campaign_id = p_campaign_id AND status IN ('DELIVERED', 'READ', 'REPLIED')),
    read_count = (SELECT count(*) FROM campaign_messages WHERE campaign_id = p_campaign_id AND status IN ('READ', 'REPLIED')),
    replied_count = (SELECT count(*) FROM campaign_messages WHERE campaign_id = p_campaign_id AND status = 'REPLIED'),
    failed_count = (SELECT count(*) FROM campaign_messages WHERE campaign_id = p_campaign_id AND status = 'FAILED'),
    updated_at = NOW()
  WHERE c.id = p_campaign_id;
END;
$$;
