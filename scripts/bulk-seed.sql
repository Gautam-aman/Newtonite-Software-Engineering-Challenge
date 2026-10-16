-- Repeatable opt-in demonstration data. Run against a development database only.
-- Generates 5,000 items without a browser-memory or API batch-import shortcut.
BEGIN;
INSERT INTO work_items(id,title,description,type,priority,status,team_id,created_by,due_date,created_at)
SELECT md5('newtonops-bulk-'||n)::uuid,
       (ARRAY['Investigate regional latency','Review payment reconciliation','Follow up customer escalation','Verify vendor compliance','Refresh operations playbook'])[1+(n%5)]||' #'||n,
       'Bulk demonstration work item. Review context, record findings, and request approval.',
       (ARRAY['INCIDENT','PAYMENT','CUSTOMER_ISSUE','COMPLIANCE','TASK'])[1+(n%5)],
       (ARRAY['CRITICAL','HIGH','MEDIUM','LOW'])[1+(n%4)],'OPEN',
       t.id,u.id,current_date+(n%20)-5,
       now()-n*interval '1 minute'
FROM generate_series(1,5000) n
CROSS JOIN (SELECT id FROM teams WHERE name='Platform Operations') t
CROSS JOIN (SELECT id FROM users WHERE email='admin@newtonops.local') u
ON CONFLICT (id) DO NOTHING;
INSERT INTO activity_events(item_id,actor_id,event_type,details)
SELECT w.id,w.created_by,'CREATED',jsonb_build_object('source','bulk demo seed')
FROM work_items w WHERE w.description LIKE 'Bulk demonstration work item.%'
AND NOT EXISTS(SELECT 1 FROM activity_events e WHERE e.item_id=w.id);
COMMIT;
