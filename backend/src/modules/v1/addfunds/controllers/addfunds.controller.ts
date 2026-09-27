import type { FastifyRequest } from 'fastify';

export const addfundsController = {
  getMultipliers: async (request: FastifyRequest) => {
    // These are the default hardcoded multipliers expected by the frontend
    const multipliers = {
      whatsapp_marketing_credits: 0.72,
      bulk_whatsapp_credits: 89,
      whatsapp_utility_credits: 0.6,
      whatsapp_credits: 0.5,
      sms_credits: 0.2,
      voice_credits: 0.8,
      rcs_credits: 1,
      ai_videos_credits: 5,
      email_credits: 0.1,
      instagram_credits: 3,
      telegram_credits: 2,
    };

    return {
      success: true,
      status: 1,
      message: 'Multipliers fetched successfully',
      multipliers
    };
  },

  getCredits: async (request: FastifyRequest) => {
    // For now, return mock credits since no table schema was provided
    // This allows the frontend to load without errors
    const data = {
      whatsapp: 100,
      sms: 100,
      rcs: 100,
      voice: 100,
    };

    return {
      success: true,
      status: 1,
      message: 'Credits fetched successfully',
      data
    };
  }
};
