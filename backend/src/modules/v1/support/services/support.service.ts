import type { FastifyInstance } from 'fastify';

// ── Status constants ──────────────────────────────────────────────────────────
export const TICKET_STATUS = {
  PENDING:              0,
  OPEN:                 1,
  CLOSED:               2,
  UNDER_INVESTIGATION:  3,
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateTicketBody {
  category?:             string;
  sub_category?:         string;
  subject_sub_category?: string;
  subject?:              string;
  body?:                 string;
  media?:                string;
}

export interface ReplyBody {
  body?:  string;
  media?: string;
}

export interface TicketQuery {
  page?:     number;
  limit?:    number;
  status?:   number;
  category?: string;
}

export interface InternalTicketQuery extends TicketQuery {
  search?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function findReseller(fastify: FastifyInstance, username: string): Promise<string | null> {
  const row = await fastify.db
    .selectFrom('clients')
    .select('username')
    .where('client_username', '=', username)
    .executeTakeFirst();
  return row?.username ?? null;
}

async function generateTicketId(fastify: FastifyInstance): Promise<string> {
  const row = await fastify.db
    .selectFrom('support_tickets')
    .select(eb => eb.fn.max('id').as('max_id'))
    .executeTakeFirst();
  const next = (Number(row?.max_id ?? 0) + 1);
  return `TKT-${String(next).padStart(5, '0')}`;
}

async function getPermissions(fastify: FastifyInstance, username: string) {
  return fastify.db
    .selectFrom('Permissions')
    .select(['admin_support', 'reseller_support'])
    .where('username', '=', username)
    .executeTakeFirst();
}

// ── User: POST /tickets ───────────────────────────────────────────────────────

export async function createTicket(
  fastify: FastifyInstance,
  username: string,
  body: CreateTicketBody,
) {
  const reseller = await findReseller(fastify, username);

  const result = await fastify.db
    .insertInto('support_tickets')
    .values({
      username,
      category:             body.category             ?? null,
      sub_category:         body.sub_category         ?? null,
      subject_sub_category: body.subject_sub_category ?? null,
      subject:              body.subject              ?? null,
      body:                 body.body                 ?? null,
      media:                body.media                ?? null,
      reseller:             reseller,
      message_by:           'user',
      status:               TICKET_STATUS.PENDING,
    })
    .executeTakeFirst();

  const newId    = Number(result.insertId);
  const ticketId = await generateTicketId(fastify);

  await fastify.db
    .updateTable('support_tickets')
    .set({ ticket_id: ticketId })
    .where('id', '=', newId)
    .execute();

  return {
    message: 'Ticket created successfully',
    data: { id: newId, ticket_id: ticketId, status: TICKET_STATUS.PENDING },
  };
}

// ── User: POST /tickets/:ticket_id/reply ──────────────────────────────────────

export async function replyToTicket(
  fastify: FastifyInstance,
  username: string,
  messageBy: 'user' | 'reseller',
  ticketId: string,
  body: ReplyBody,
) {
  const thread = await fastify.db
    .selectFrom('support_tickets')
    .select(['ticket_id', 'username', 'reseller', 'status'])
    .where('ticket_id', '=', ticketId)
    .executeTakeFirst();

  if (!thread) throw fastify.httpErrors.notFound('Ticket not found');
  if (thread.status === TICKET_STATUS.CLOSED) {
    throw fastify.httpErrors.badRequest('Cannot reply to a closed ticket');
  }

  await fastify.db
    .insertInto('support_tickets')
    .values({
      username:   thread.username,
      ticket_id:  ticketId,
      body:       body.body  ?? null,
      media:      body.media ?? null,
      reseller:   thread.reseller,
      message_by: messageBy,
      status:     thread.status ?? TICKET_STATUS.PENDING,
    })
    .execute();

  return { message: 'Reply added successfully' };
}

// ── User: GET /tickets ────────────────────────────────────────────────────────

export async function listMyTickets(
  fastify: FastifyInstance,
  username: string,
  query: TicketQuery,
) {
  const limit  = Math.min(query.limit ?? 25, 100);
  const page   = Math.max(query.page  ?? 1, 1);
  const offset = (page - 1) * limit;

  // Get latest message per ticket_id grouped
  let qb = fastify.db
    .selectFrom('support_tickets')
    .where('username', '=', username)
    .where('ticket_id', 'is not', null);

  if (query.status   !== undefined) qb = qb.where('status',   '=', query.status) as typeof qb;
  if (query.category)               qb = qb.where('category', '=', query.category) as typeof qb;

  // Get one row per ticket_id (the original/first message)
  const [countRow, rows] = await Promise.all([
    fastify.db
      .selectFrom('support_tickets')
      .where('username', '=', username)
      .where('ticket_id', 'is not', null)
      .where('message_by', '=', 'user')
      .select(eb => eb.fn.countAll<number>().as('total'))
      .executeTakeFirst(),
    fastify.db
      .selectFrom('support_tickets')
      .selectAll()
      .where('username',   '=', username)
      .where('ticket_id',  'is not', null)
      .where('message_by', '=', 'user')
      .$if(query.status !== undefined, qb => qb.where('status', '=', query.status!))
      .$if(!!query.category, qb => qb.where('category', '=', query.category!))
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute(),
  ]);

  const total      = Number(countRow?.total ?? 0);
  const totalPages = Math.ceil(total / limit) || 0;

  return {
    message: 'Tickets fetched',
    meta: { total, page, limit, totalPages },
    data: rows,
  };
}

// ── User/Internal: GET /tickets/:ticket_id ────────────────────────────────────

export async function getTicketThread(
  fastify: FastifyInstance,
  ticketId: string,
) {
  const rows = await fastify.db
    .selectFrom('support_tickets')
    .selectAll()
    .where('ticket_id', '=', ticketId)
    .orderBy('created_at', 'asc')
    .execute();

  if (!rows.length) throw fastify.httpErrors.notFound('Ticket not found');

  return {
    message: 'Ticket thread fetched',
    data: rows,
  };
}

// ── Internal: GET /tickets (support team) ────────────────────────────────────

export async function listTicketsInternal(
  fastify: FastifyInstance,
  username: string,
  query: InternalTicketQuery,
) {
  const perms = await getPermissions(fastify, username);

  if (!perms?.admin_support && !perms?.reseller_support) {
    throw fastify.httpErrors.forbidden('You do not have support access');
  }

  const limit  = Math.min(query.limit ?? 25, 100);
  const page   = Math.max(query.page  ?? 1, 1);
  const offset = (page - 1) * limit;

  const isAdmin = Boolean(perms.admin_support);

  let qb = fastify.db
    .selectFrom('support_tickets')
    .where('message_by', '=', 'user')
    .where('ticket_id', 'is not', null);

  // admin_support sees all, reseller_support sees only under their account
  if (!isAdmin) {
    qb = qb.where('reseller', '=', username) as typeof qb;
  }

  if (query.status   !== undefined) qb = qb.where('status',   '=', query.status)   as typeof qb;
  if (query.category)               qb = qb.where('category', '=', query.category) as typeof qb;
  if (query.search) {
    qb = qb.where(eb => eb.or([
      eb('subject',  'like', `%${query.search}%`),
      eb('username', 'like', `%${query.search}%`),
      eb('ticket_id','like', `%${query.search}%`),
    ])) as typeof qb;
  }

  const [countRow, rows] = await Promise.all([
    qb.select(eb => eb.fn.countAll<number>().as('total')).executeTakeFirst(),
    qb.selectAll().orderBy('created_at', 'desc').limit(limit).offset(offset).execute(),
  ]);

  const total      = Number(countRow?.total ?? 0);
  const totalPages = Math.ceil(total / limit) || 0;

  return {
    message: 'Tickets fetched',
    meta: { total, page, limit, totalPages, scope: isAdmin ? 'all' : 'reseller' },
    data: rows,
  };
}

// ── Internal: PATCH /tickets/:ticket_id/status ────────────────────────────────

export async function updateTicketStatus(
  fastify: FastifyInstance,
  username: string,
  ticketId: string,
  status: number,
) {
  const perms = await getPermissions(fastify, username);
  if (!perms?.admin_support && !perms?.reseller_support) {
    throw fastify.httpErrors.forbidden('You do not have support access');
  }

  const ticket = await fastify.db
    .selectFrom('support_tickets')
    .select(['ticket_id', 'reseller'])
    .where('ticket_id', '=', ticketId)
    .executeTakeFirst();

  if (!ticket) throw fastify.httpErrors.notFound('Ticket not found');

  if (!perms.admin_support && ticket.reseller !== username) {
    throw fastify.httpErrors.forbidden('Access denied to this ticket');
  }

  await fastify.db
    .updateTable('support_tickets')
    .set({ status })
    .where('ticket_id', '=', ticketId)
    .execute();

  return { message: 'Ticket status updated', data: { ticket_id: ticketId, status } };
}

// ── Internal: DELETE /tickets/:id ────────────────────────────────────────────

export async function deleteTicketMessage(
  fastify: FastifyInstance,
  username: string,
  id: number,
) {
  const perms = await getPermissions(fastify, username);
  if (!perms?.admin_support) {
    throw fastify.httpErrors.forbidden('Only admin support can delete tickets');
  }

  const row = await fastify.db
    .selectFrom('support_tickets')
    .select('id')
    .where('id', '=', id)
    .executeTakeFirst();

  if (!row) throw fastify.httpErrors.notFound('Ticket message not found');

  await fastify.db.deleteFrom('support_tickets').where('id', '=', id).execute();

  return { message: 'Ticket message deleted' };
}
