import { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
  };
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      reply.status(401).send({ success: false, error: 'No token provided' });
      return;
    }

    const decoded = await request.jwtVerify<{ id: string; email: string }>();
    (request as AuthenticatedRequest).user = decoded;
  } catch (err) {
    reply.status(401).send({ success: false, error: 'Invalid or expired token' });
  }
}
