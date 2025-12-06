#!/usr/bin/env node
/**
 * Tiny remote logging server - zero dependencies.
 * Usage: PORT=9000 node scripts/remote-log-server.js
 *
 * The client should POST JSON to /log with shape:
 * { ts: 1699999999999, ua: "...user agent...", message: ["...","..."] }
 */
const http = require('http');

const port = process.env.PORT || 9000;
const host = '0.0.0.0'; // listen on all interfaces so phones can reach it

const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders());
        res.end();
        return;
    }

    if (req.method !== 'POST' || req.url !== '/log') {
        res.writeHead(404, corsHeaders({ 'Content-Type': 'text/plain' }));
        res.end('Not found');
        return;
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk;
        if (body.length > 1e6) req.destroy(); // rudimentary protection
    });

    req.on('end', () => {
        try {
            const payload = JSON.parse(body || '{}');
            const timestamp = payload.ts ? new Date(payload.ts).toISOString() : new Date().toISOString();
            const ua = payload.ua || 'unknown';
            const message = Array.isArray(payload.message) ? payload.message.join(' ') : String(payload.message || '');
            console.log(`[remote][${timestamp}] ${message}`);
            if (process.env.SHOW_UA === 'true') {
                console.log(`   ua: ${ua}`);
            }
        } catch (err) {
            console.error('Failed to parse incoming log:', err);
        } finally {
            res.writeHead(204, corsHeaders());
            res.end();
        }
    });
});

server.listen(port, host, () => {
    console.log(`Remote log server listening on http://${host}:${port}/log`);
});

function corsHeaders(extra = {}) {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        ...extra
    };
}

