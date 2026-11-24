#!/usr/bin/env python3
"""Real concurrent lock-wait regressions against the project's local Docker DB.
Uses fresh test UUIDs only; never reset/remote. Cleans fixtures on success/failure.
"""
import os
import subprocess
import time
import uuid

CONTAINER = os.environ.get('MMO_TEST_DB_CONTAINER', 'supabase_db_h2haigroup')
COMMAND = ['docker', 'exec', '-i', CONTAINER, 'psql', '-X', '-qAt', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1']
a, b, client, group, invitation = [str(uuid.uuid4()) for _ in range(5)]
children = []

def sql(query, check=True):
    result = subprocess.run(COMMAND, input=query, text=True, capture_output=True, timeout=15)
    if check and result.returncode:
        raise RuntimeError(result.stderr)
    return result

def actor(user, query):
    return f"set role authenticated;select set_config('request.jwt.claim.sub','{user}',false);{query}"

def wait_locked(name):
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        result = sql(f"select count(*) from pg_stat_activity where application_name='{name}' and wait_event_type='Lock';")
        if result.stdout.strip() == '1':
            return
        time.sleep(.1)
    raise AssertionError('Second session never reached the expected database lock')

def locked_attempt(lock_query, query, expected_error, hold_seconds):
    # Keep blocker alive on stdin; its marker proves lock acquisition before the
    # actor starts. Release with COMMIT after the requested wall-clock wait.
    blocker = subprocess.Popen(COMMAND, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
    children.append(blocker)
    blocker.stdin.write(f"begin;{lock_query}\n\\echo LOCK_READY\n")
    blocker.stdin.flush()
    while True:
        line = blocker.stdout.readline()
        if 'LOCK_READY' in line:
            break
        if not line:
            raise RuntimeError('Blocker failed: ' + blocker.stderr.read())
    name = 'mmo-lock-regression-' + str(uuid.uuid4())
    actor_process = subprocess.Popen(COMMAND, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    children.append(actor_process)
    actor_process.stdin.write(f"set application_name='{name}';{query}")
    actor_process.stdin.close()
    wait_locked(name)
    if expected_error == 'Position lease expired':
        validity = f"select seen>clock_timestamp()-interval '15 seconds' from private.mmo_players where id='{a}';"
    else:
        validity = f"select expires_at>clock_timestamp() from private.mmo_invites where id='{invitation}';"
    assert sql(validity).stdout.strip() == 't', 'Fixture expired before the measured lock wait'
    started = time.monotonic()
    time.sleep(hold_seconds)
    blocker.stdin.write('commit;\n')
    blocker.stdin.flush()
    blocker.stdin.close()
    blocker.wait(timeout=10)
    actor_process.wait(timeout=10)
    error = actor_process.stderr.read()
    assert actor_process.returncode != 0 and expected_error in error, error
    assert time.monotonic() - started >= hold_seconds
    print(f'PASS: {expected_error} after a real {hold_seconds}s lock wait', flush=True)

try:
    sql(f"insert into auth.users(id) values('{a}'),('{b}');" + actor(a, f"select public.mmo_connect('{client}','Lock Alpha');") + 'reset role;' + actor(b, f"select public.mmo_connect('{client}','Lock Beta');"))
    locked_attempt(f"select pg_advisory_xact_lock(hashtextextended('mmo:{a}',0));", actor(a, "select public.mmo_send('local','must expire while locked',gen_random_uuid());"), 'Position lease expired', 16)
    sql(f"insert into private.mmo_groups(id,kind,name) values('{group}','party','Lock Fixture');insert into private.mmo_members(group_id,user_id,kind,role) values('{group}','{a}','party','owner');insert into private.mmo_invites(id,group_id,inviter,target,expires_at) values('{invitation}','{group}','{a}','{b}',clock_timestamp()+interval '5 seconds');")
    locked_attempt(f"select id from private.mmo_groups where id='{group}' for update;", actor(b, f"select public.mmo_social('accept','party','{invitation}');"), 'Invitation expired', 6)
    assert sql(f"select count(*) from private.mmo_members where group_id='{group}' and user_id='{b}';").stdout.strip() == '0'
    assert sql(f"select count(*) from private.mmo_messages where sender_id='{a}';").stdout.strip() == '0'
finally:
    for child in children:
        if child.poll() is None:
            child.terminate()
            child.wait(timeout=5)
    sql(f"delete from private.mmo_groups where id='{group}';delete from auth.users where id in ('{a}','{b}');")
