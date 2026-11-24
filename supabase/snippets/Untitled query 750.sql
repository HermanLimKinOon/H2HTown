select j.jobname, r.status, r.return_message, r.start_time
from cron.job_run_details r
join cron.job j using (jobid)
where j.jobname = 'reconcile-rm-payment-status'
order by r.start_time desc
limit 5;