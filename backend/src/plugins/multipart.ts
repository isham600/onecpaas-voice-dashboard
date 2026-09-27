import fp from 'fastify-plugin';
import multipart from '@fastify/multipart';

export default fp(async (fastify) => {
  await fastify.register(multipart, {
    limits: {
      fileSize:  50 * 1024 * 1024, // 50 MB per file
      files:     15,               // 10 carousel + csv + media + headroom
      fields:    25,
      fieldSize: 4 * 1024 * 1024,  // 4 MB per text field (supports ~200k phone numbers)
    },
  });
});
