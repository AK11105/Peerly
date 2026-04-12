-- Add flag column to nodes for spam/abuse flagging
-- flag values: null (clean), 'spam', 'abuse'
alter table nodes add column if not exists flag text check (flag in ('spam', 'abuse')) default null;
