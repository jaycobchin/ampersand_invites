import { transaction } from './db.mjs';

// Read ownership and the current wedding inside the same write transaction as
// the mutation. This prevents two Vercel instances overwriting each other's
// RSVP or planning changes. Send the response only after a successful commit.
export function atomicRoute(...handlers) {
  return async (req, res) => {
    let status = 200;
    let body;
    let sent = false;
    const reply = {
      status(value) {
        status = value;
        return reply;
      },
      json(value) {
        body = value;
        sent = true;
        return reply;
      },
    };
    await transaction(async () => {
      for (const handler of handlers) {
        let nextCalled = false;
        await handler(req, reply, (error) => {
          if (error) throw error;
          nextCalled = true;
        });
        if (!nextCalled) break;
      }
      if (!sent) throw new Error('A transactional API handler must return JSON.');
    });
    res.status(status).json(body);
  };
}
