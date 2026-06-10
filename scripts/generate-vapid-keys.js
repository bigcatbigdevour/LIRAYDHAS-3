#!/usr/bin/env node
/**
 * Generate a VAPID key pair for web push and print env-var paste lines.
 *
 * Run once per project. Take the output and paste the three lines into
 * your environment (Vercel → Project Settings → Environment Variables,
 * or .env.local for local dev). Then never run this again — rotating
 * the keys means every subscriber has to re-subscribe.
 *
 * Usage:
 *   node scripts/generate-vapid-keys.js
 *   node scripts/generate-vapid-keys.js you@example.com
 */

const webpush = require('web-push');

const subject = process.argv[2] || '';
const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log('');
console.log('VAPID keys generated. Paste these into your environment:');
console.log('');
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
if (subject) {
  // Most senders are mailto: but a https: URL also works. The Push API
  // requires SOME contact info so providers can reach out about abuse.
  const isUrl = /^https?:\/\//.test(subject);
  console.log(`VAPID_SUBJECT=${isUrl ? subject : `mailto:${subject}`}`);
} else {
  console.log('VAPID_SUBJECT=mailto:you@example.com   # replace with a real address');
}
console.log('');
console.log('Then:');
console.log("  1. In Vercel → Storage → enable 'KV' (one-click; injects KV_REST_API_*).");
console.log("  2. In Vercel → Settings → Environment Variables, add the three VAPID lines above.");
console.log("  3. Redeploy. The daily reminder cron (vercel.json) will start firing at 13:00 UTC.");
console.log('');
