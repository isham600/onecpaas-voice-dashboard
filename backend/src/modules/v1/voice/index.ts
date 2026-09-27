import { FastifyInstance } from 'fastify';
import campaignModule from './campaign/index.js';
import templateModule from './template/index.js';
import summaryModule from './summary/index.js';
import webhookModule from './webhook/index.js';
import partnerModule from './partner/index.js';
import flowsModule from './flows/index.js';
import fallbackNotifyModule from './fallback-notify/index.js';
import ivrModule from './ivr/index.js';

export default async function voiceModule(fastify: FastifyInstance) {
  await fastify.register(campaignModule, { prefix: '/campaign' });
  await fastify.register(templateModule, { prefix: '/template' });
  await fastify.register(summaryModule,  { prefix: '/summary' });
  await fastify.register(webhookModule,  { prefix: '/webhook' });
  await fastify.register(partnerModule,  { prefix: '/partner' });
  await fastify.register(flowsModule,    { prefix: '/flows' });
  await fastify.register(fallbackNotifyModule, { prefix: '/fallback-notify' });
  await fastify.register(ivrModule,      { prefix: '/ivr' });
}
