import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const fixtures = JSON.parse(open('./fixtures.json'));
const TARGET = __ENV.TARGET || 'http://localhost:3000';

const tokens = new SharedArray('tokens', () => fixtures.tokens);

http.setResponseCallback(http.expectedStatuses(200, 201, 401, 404, 409, 429));

const accepted = new Counter('accepted_201');
const duplicate = new Counter('duplicate_409');
const rateLimited = new Counter('rate_limited_429');
const otherStatus = new Counter('other_status');

export const options = {
  scenarios: {
    burst: {
      executor: 'constant-vus',
      vus: 50,
      duration: '20s',
    },
  },
};

export default function () {
  const token = tokens[Math.floor(Math.random() * tokens.length)];

  const res = http.post(`${TARGET}/events/${fixtures.eventId}/interests`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(res, {
    'status is 201, 409 or 429': (r) => [201, 409, 429].includes(r.status),
  });

  if (res.status === 201) accepted.add(1);
  else if (res.status === 409) duplicate.add(1);
  else if (res.status === 429) rateLimited.add(1);
  else otherStatus.add(1);
}

export function handleSummary(data) {
  const m = data.metrics;
  const summary = {
    total_requests: m.http_reqs ? m.http_reqs.values.count : 0,
    throughput_rps: m.http_reqs ? m.http_reqs.values.rate : 0,
    accepted_201: m.accepted_201 ? m.accepted_201.values.count : 0,
    duplicate_409: m.duplicate_409 ? m.duplicate_409.values.count : 0,
    rate_limited_429: m.rate_limited_429 ? m.rate_limited_429.values.count : 0,
    other_status: m.other_status ? m.other_status.values.count : 0,
    http_req_duration_avg_ms: m.http_req_duration ? m.http_req_duration.values.avg : 0,
    http_req_duration_max_ms: m.http_req_duration ? m.http_req_duration.values.max : 0,
    http_req_duration_p95_ms: m.http_req_duration ? m.http_req_duration.values['p(95)'] : 0,
    http_req_failed_rate: m.http_req_failed ? m.http_req_failed.values.rate : 0,
  };

  return {
    stdout: `\n=== RESUMO ===\n${JSON.stringify(summary, null, 2)}\n`,
    './summary.json': JSON.stringify(summary, null, 2),
  };
}
