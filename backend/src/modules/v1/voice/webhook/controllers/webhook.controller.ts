import type { FastifyReply, FastifyRequest } from 'fastify';
import { processVoiceStatusWebhook } from '../services/webhook.service.js';
import { logRouteEvent } from '../../voice-route/services/voice-route.service.js';

function isAuthorized(request: FastifyRequest): boolean {
  const expected = process.env.VOICE_ENGINE_WEBHOOK_SECRET ?? '';
  if (!expected) return true; // no secret configured — allow (dev/test only, see .env.example)

  const header = String(request.headers.authorization ?? '').trim();
  const bearer = header.replace(/^Bearer\s+/i, '').trim();
  const tokenHeader = String(request.headers['token'] ?? request.headers['x-api-key'] ?? '').trim();

  return bearer === expected || tokenHeader === expected;
}

export const voiceWebhookController = {
  status: async (request: FastifyRequest, reply: FastifyReply) => {
    if (!isAuthorized(request)) {
      return reply.code(401).send({ success: false, message: 'Unauthorized' });
    }

    const payload = (request.body ?? {}) as Record<string, unknown>;
    request.log.info({ payload }, '[voice-webhook] Received status update');

    const result = await processVoiceStatusWebhook(request.server, payload);

    return reply.code(200).send({
      success: true,
      matched: result.matched,
      request_id: result.requestId,
      receiver: result.receiver,
    });
  },

  // POST /api/v1/voice/webhook/notifynow?token=<route webhook token>
  // Call results from the NotifyNow provider. The payload shape is read
  // leniently (several common field names) and handed to the same processor as
  // the engine's status webhook, so reports, partner webhooks, refunds and
  // fallbacks behave identically.
  notifynow: async (request: FastifyRequest, reply: FastifyReply) => {
    const route = await request.server.db.selectFrom('voice_routes').select(['webhook_token', 'status']).where('code', '=', 'notifynow').executeTakeFirst();
    const expected = route?.webhook_token ?? '';
    const q = (request.query ?? {}) as Record<string, string | undefined>;
    const header = String(request.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
    const supplied = String(q.token ?? header ?? request.headers['x-api-key'] ?? request.headers['token'] ?? '').trim();
    if (!expected || supplied !== expected) {
      return reply.code(401).send({ success: false, message: 'Unauthorized' });
    }

    const body = (request.body ?? {}) as Record<string, any>;
    const pick = (...keys: string[]) => {
      for (const src of [body, body.data, body.payload]) {
        if (!src || typeof src !== 'object') continue;
        for (const k of keys) if (src[k] !== undefined && src[k] !== null && src[k] !== '') return src[k];
      }
      return undefined;
    };
    const providerId = pick('requestId', 'request_id', 'campaignId', 'campaign_id', 'id');
    const receiver   = pick('number', 'receiver', 'mobile', 'mobile_no', 'phone', 'to', 'msisdn');
    const status     = pick('status', 'call_status', 'callStatus', 'disposition', 'state');
    const duration   = pick('duration', 'call_duration', 'callDuration', 'billsec');

    // Map the provider's id back to the cell247 campaign we sent it for, then to
    // delivery33.voice_id (the id processVoiceStatusWebhook resolves by).
    let voiceId: string | null = null;
    let cell247Request: string | null = null;
    let username: string | null = null;
    if (providerId != null) {
      const log = await request.server.db.selectFrom('voice_route_logs')
        .select(['request_id', 'username'])
        .where('kind', '=', 'submit').where('status', '=', 'sent')
        .where('provider_ref', 'like', `%${String(providerId).replace(/[%_]/g, '')}%`)
        .orderBy('id', 'desc').executeTakeFirst();
      cell247Request = log?.request_id ?? null;
      username = log?.username ?? null;
      if (cell247Request) {
        const c = await request.server.db.selectFrom('delivery33').select('voice_id').where('requestid', '=', cell247Request).executeTakeFirst();
        voiceId = c?.voice_id ?? null;
      }
    }

    const result = await processVoiceStatusWebhook(request.server, {
      request_id: voiceId ?? (providerId != null ? String(providerId) : undefined),
      receiver: receiver != null ? String(receiver).replace(/\D/g, '') : undefined,
      status,
      duration: duration != null ? Number(duration) : 0,
    });

    await logRouteEvent(request.server.db, {
      kind: 'callback', request_id: cell247Request, username, route_code: 'notifynow',
      status: 'received', provider_ref: providerId != null ? String(providerId) : null,
      response: JSON.stringify(body).slice(0, 3000),
      error: result.matched ? null : 'No matching recipient row',
    });

    return reply.code(200).send({ success: true, matched: result.matched });
  },
};
