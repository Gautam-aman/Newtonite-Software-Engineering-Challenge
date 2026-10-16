#!/usr/bin/env python3
"""Exercise the public HTTP contract against the running demo; no third-party modules."""
import json
import os
import urllib.error
import urllib.request
import uuid

BASE = os.environ.get('SMOKE_BASE_URL', 'http://localhost:8088/api')

def request(path, method='GET', body=None, token=None, key=None, expected=200):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    if key:
        headers['Idempotency-Key'] = key
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            status, payload = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, payload = error.code, error.read()
    assert status == expected, f'{method} {path}: expected {expected}, received {status}: {payload!r}'
    return json.loads(payload) if payload else None

def login(role):
    return request('/auth/login', 'POST', {'email': role + '@newtonops.local', 'password': 'NewtonOps!2026'})['token']

request('/items', expected=401)
member, lead, outsider = login('member'), login('lead'), login('outsider')
team = next(t for t in request('/teams', token=member) if t['name'] == 'Platform Operations')
key = str(uuid.uuid4())
body = {'title': 'HTTP smoke ' + key[:8], 'description': 'Public contract verification', 'type': 'TASK', 'priority': 'HIGH', 'teamId': team['id'], 'dueDate': None}
item = request('/items', 'POST', body, member, key, 201)
assert request('/items', 'POST', body, member, key, 201) == item
item_path = '/items/' + item['id']
request(item_path, token=outsider, expected=403)
request(item_path + '/claim', 'POST', {'version': 0}, member)
request(item_path + '/claim', 'POST', {'version': 0}, lead, expected=409)
request(item_path + '/transition', 'POST', {'version': 1, 'status': 'IN_PROGRESS'}, member)
request(item_path + '/comments', 'POST', {'version': 2, 'body': 'Recovery verified.'}, member)
request(item_path + '/transition', 'POST', {'version': 3, 'status': 'AWAITING_APPROVAL'}, member)
request(item_path + '/transition', 'POST', {'version': 4, 'status': 'RESOLVED'}, member, expected=403)
request(item_path + '/transition', 'POST', {'version': 4, 'status': 'RESOLVED'}, lead)
closed = request(item_path + '/transition', 'POST', {'version': 5, 'status': 'CLOSED'}, member)
assert closed['version'] == 6 and closed['status'] == 'CLOSED'
activity = request(item_path + '/activity', token=member)['items']
assert len(activity) == 7 and activity[1]['eventType'] == 'APPROVED'
assert len(request(item_path + '/comments', token=member)['items']) == 1
assert isinstance(request('/dashboard/summary', token=member)['metrics']['active'], int)
request('/auth/logout', 'POST', token=member)
request('/auth/me', token=member, expected=401)
print('HTTP smoke passed: authentication, replay, team boundary, claim conflict, workflow, comment, approval, closure, audit, metrics and logout.')
