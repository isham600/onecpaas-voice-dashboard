#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// One-off SMPP test client — binds as transceiver, sends one submit_sm, prints
// the message_id, then unbinds. Run from a machine whose IP matches the test
// account's allowed_ip (the SMPP server rejects binds from anywhere else).
//
// Usage:
//   SMPP_HOST=1.2.3.4 SMPP_PORT=2775 SMPP_SYSTEM_ID=GSM_ishubhamcodecanvas \
//   SMPP_PASSWORD=vre8ebGicvkU SMPP_DEST=9111991707 \
//   node scripts/smpp-test-client.mjs
//
// To test delivery receipts: set SMPP_REGISTERED_DELIVERY=1 and
// SMPP_WAIT_DLR_SECONDS=<n> to keep the session bound and listen for a
// deliver_sm for up to n seconds after the submit_sm is accepted (the DLR
// poller checks every SMPP_DLR_POLL_INTERVAL_MS on the server, default 10s).
// ─────────────────────────────────────────────────────────────────────────────

import smpp from 'smpp';

const HOST = process.env.SMPP_HOST || 2775;
const PORT = Number(process.env.SMPP_PORT) || 2775;
const SYSTEM_ID = process.env.SMPP_SYSTEM_ID;
const PASSWORD = process.env.SMPP_PASSWORD;
const DEST = process.env.SMPP_DEST;
const MESSAGE = process.env.SMPP_MESSAGE || 'SMPP test message';
const REGISTERED_DELIVERY = Number(process.env.SMPP_REGISTERED_DELIVERY) || 0;
const WAIT_DLR_SECONDS = Number(process.env.SMPP_WAIT_DLR_SECONDS) || 0;

if (!HOST || !SYSTEM_ID || !PASSWORD || !DEST) {
  console.error('\nMissing required env vars. Usage:');
  console.error('  SMPP_HOST=<ip> SMPP_SYSTEM_ID=<id> SMPP_PASSWORD=<pw> SMPP_DEST=<mobile> node scripts/smpp-test-client.mjs\n');
  process.exit(1);
}

console.log(`Connecting to ${HOST}:${PORT} as ${SYSTEM_ID}...`);

const session = smpp.connect({ host: HOST, port: PORT }, () => {
  session.bind_transceiver({ system_id: SYSTEM_ID, password: PASSWORD }, (pdu) => {
    if (pdu.command_status !== 0) {
      console.error(`Bind failed — command_status: 0x${pdu.command_status.toString(16)}`);
      session.close();
      process.exit(1);
    }
    console.log('Bind succeeded.');

    session.submit_sm(
      {
        destination_addr: DEST,
        short_message: MESSAGE,
        registered_delivery: REGISTERED_DELIVERY,
      },
      (submitPdu) => {
        if (submitPdu.command_status !== 0) {
          console.error(`submit_sm failed — command_status: 0x${submitPdu.command_status.toString(16)}`);
          session.close();
          process.exit(1);
        }

        console.log(`submit_sm accepted — message_id: ${submitPdu.message_id}`);

        if (REGISTERED_DELIVERY && WAIT_DLR_SECONDS > 0) {
          console.log(`Waiting up to ${WAIT_DLR_SECONDS}s for a deliver_sm...`);
          const timeout = setTimeout(() => {
            console.log('No deliver_sm received in time.');
            session.unbind();
            session.close();
            process.exit(1);
          }, WAIT_DLR_SECONDS * 1000);

          session.on('deliver_sm', (dlrPdu) => {
            clearTimeout(timeout);
            // The smpp package decodes short_message into { message, udh? }, not a plain string.
            const text = typeof dlrPdu.short_message === 'string'
              ? dlrPdu.short_message
              : dlrPdu.short_message?.message ?? dlrPdu.short_message;
            console.log('deliver_sm received:', text);
            session.send(dlrPdu.response());
            session.unbind();
            session.close();
            process.exit(0);
          });
        } else {
          session.unbind();
          session.close();
          process.exit(0);
        }
      },
    );
  });
});

session.on('error', (err) => {
  console.error('Session error:', err.message);
  process.exit(1);
});
