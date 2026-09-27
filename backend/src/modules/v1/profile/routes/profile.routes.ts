import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { profileController } from '../controllers/profile.controller.js';

const auth = (fastify: FastifyInstance) => ({ preValidation: [fastify.authenticate] });

export default async function profileRoutes(fastify: FastifyInstance) {

  // GET /profile/me
  fastify.get('/me', { ...auth(fastify) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await profileController.me(request, fastify);
    return reply.code(200).send(result);
  });

  // PUT /profile/account — update name, email, country
  fastify.put('/account', {
    ...auth(fastify),
    schema: {
      body: {
        type: 'object',
        properties: {
          firstname: { type: 'string', minLength: 1, maxLength: 100 },
          lastname:  { type: 'string', minLength: 1, maxLength: 100 },
          email:     { type: 'string', format: 'email', maxLength: 255 },
          country:   { type: 'string', maxLength: 100 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await profileController.updateAccount(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // PUT /profile/business — upsert business profile
  fastify.put('/business', {
    ...auth(fastify),
    schema: {
      body: {
        type: 'object',
        properties: {
          business_name:                   { type: 'string', maxLength: 255 },
          official_business_name:          { type: 'string', maxLength: 255 },
          business_industry:               { type: 'string', maxLength: 255 },
          gst_or_taxId:                    { type: 'string', maxLength: 255 },
          gst_or_incorporationCertificate: { type: 'string', maxLength: 255 },
          company_PAN_card:                { type: 'string', maxLength: 255 },
          about:                           { type: 'string' },
          description:                     { type: 'string' },
          profile_picture:                 { type: 'string', maxLength: 500 },
          phone_number:                    { type: 'string', maxLength: 20 },
          business_email_address:          { type: 'string', maxLength: 255 },
          business_website:                { type: 'string', maxLength: 500 },
          business_address:                { type: 'string' },
          business_hours_of_operation:     { type: 'string', maxLength: 255 },
          business_ID:                     { type: 'string', maxLength: 255 },
          social_media_links:              { type: 'string' },
          greeting_message:                { type: 'string' },
          away_message:                    { type: 'string' },
          quick_replies:                   { type: 'string' },
          catalogID:                       { type: 'string', maxLength: 255 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await profileController.updateBusiness(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // POST /profile/api-token — generate/regenerate partner API token
  fastify.post('/api-token', { ...auth(fastify) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await profileController.generateApiToken(request, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // PATCH /profile/password — change own password
  fastify.patch('/password', {
    ...auth(fastify),
    schema: {
      body: {
        type: 'object',
        required: ['current_password', 'new_password', 'new_password_confirmation'],
        properties: {
          current_password:          { type: 'string', minLength: 1, maxLength: 100 },
          new_password:              { type: 'string', minLength: 8, maxLength: 100 },
          new_password_confirmation: { type: 'string', minLength: 8, maxLength: 100 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await profileController.changePassword(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

}
