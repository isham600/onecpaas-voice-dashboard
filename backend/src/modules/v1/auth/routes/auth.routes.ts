import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authController } from '../controllers/auth.controller.js';
import type { RegisterBody } from '../services/register.service.js';

interface LoginBody {
  email_or_username: string;
  password: string;
}

export default async function authRoutes(fastify: FastifyInstance) {

  // ── POST /login ────────────────────────────────────────────
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email_or_username', 'password'],
        properties: {
          email_or_username: { type: 'string', maxLength: 255 },
          password:          { type: 'string', maxLength: 255 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
    const result = await authController.login(request, fastify);
    return reply.code(200).send(result);
  });

  // ── POST /register ─────────────────────────────────────────
  fastify.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['firstname', 'lastname', 'email', 'username', 'password', 'password_confirmation', 'mobile_no_demo'],
        properties: {
          firstname:             { type: 'string', minLength: 1, maxLength: 255 },
          lastname:              { type: 'string', minLength: 1, maxLength: 255 },
          email:                 { type: 'string', format: 'email', maxLength: 255 },
          username:              { type: 'string', minLength: 1, maxLength: 255 },
          password:              { type: 'string', maxLength: 255 },
          password_confirmation: { type: 'string', maxLength: 255 },
          mobile_no_demo:        { type: 'string', pattern: '^[0-9]{8,15}$' },
          domain:                { type: 'string', maxLength: 255, nullable: true },
          country:               { type: 'string', maxLength: 255, nullable: true },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
    const result = await authController.register(request, fastify);
    return reply.code(201).send(result);
  });

  // ── GET /me ────────────────────────────────────────────────
  fastify.get('/me', {
    preValidation: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await authController.getProfile(request, fastify);
    return reply.code(200).send(result);
  });

  // ── GET /login-history — last 10 logins for current user ───
  fastify.get('/login-history', {
    preValidation: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await authController.loginHistory(request, fastify);
    return reply.code(200).send(result);
  });

  // ── POST /forgot-password — send OTP ───────────────────────
  fastify.post('/forgot-password', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', maxLength: 255 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { email: string } }>, reply: FastifyReply) => {
    const result = await authController.forgotPassword(request, fastify);
    return reply.code(200).send(result);
  });

  // ── POST /verify-otp — verify OTP, receive reset token ─────
  fastify.post('/verify-otp', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'otp'],
        properties: {
          email: { type: 'string', format: 'email', maxLength: 255 },
          otp:   { type: 'string', minLength: 6, maxLength: 6, pattern: '^[0-9]{6}$' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { email: string; otp: string } }>, reply: FastifyReply) => {
    const result = await authController.verifyOtp(request, fastify);
    return reply.code(200).send(result);
  });

  // ── POST /reset-password — set new password ─────────────────
  fastify.post('/reset-password', {
    schema: {
      body: {
        type: 'object',
        required: ['reset_token', 'new_password'],
        properties: {
          reset_token:  { type: 'string', minLength: 64, maxLength: 64 },
          new_password: { type: 'string', minLength: 8,  maxLength: 100 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { reset_token: string; new_password: string } }>, reply: FastifyReply) => {
    const result = await authController.resetPassword(request, fastify);
    return reply.code(200).send(result);
  });
}
