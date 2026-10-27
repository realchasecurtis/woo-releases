'use strict';
const dns = require('node:dns').promises;
const net = require('node:net');
function name(value) {
  if (typeof value !== 'string' || value.length > 253) throw Error('Name must be at most 253 ASCII characters.');
  const n = value.toLowerCase();
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/.test(n)) throw Error('Use a dotted ASCII name, such as example.woo (each label 1–63 characters).');
  if (n.split('.').some(x => x.startsWith('xn--'))) throw Error('Internationalized name labels are not supported in this prototype.');
  return n;
}
function destination(value) {
  if (typeof value !== 'string' || value.length > 4096) throw Error('Invalid destination length.');
  let u; try { u = new URL(value); } catch { throw Error('Enter a complete HTTPS URL.'); }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) throw Error('Only HTTPS on port 443, without embedded credentials, is supported.');
  if (net.isIP(u.hostname) || u.hostname.includes(':') || !u.hostname.includes('.') || /(^|\.)(localhost|local|internal|lan|home|test|invalid|onion)$/.test(u.hostname)) throw Error('A public internet hostname is required.');
  name(u.hostname);
  return u.href;
}
function publicIPv4(ip) {
  if (net.isIP(ip) !== 4) return false;
  const [a,b,c] = ip.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >=64 && b<=127) || (a===169 && b===254) || (a===172 && b>=16 && b<=31) || (a===192 && (b===168 || (b===0 && (c===0 || c===2)) || (b===88 && c===99))) || (a===198 && (b===18 || b===19 || (b===51 && c===100))) || (a===203 && b===0 && c===113));
}
async function publicAddress(host, resolve = dns.resolve4.bind(dns)) {
  destination('https://' + host);
  const ips = await resolve(host);
  if (!ips.length || ips.some(ip => !publicIPv4(ip))) throw Error('Destination resolved to a non-public or unsupported network address.');
  return ips[0];
}
function endpoint(value) {
  if (value === '') return '';
  if (typeof value !== 'string') throw Error('Invalid registry endpoint.');
  const u = new URL(value);
  if (u.username || u.password || u.search || u.hash) throw Error('Registry endpoint cannot contain credentials, queries or fragments.');
  if (u.protocol === 'http:' && u.hostname === '127.0.0.1' && u.pathname === '/') return u.origin;
  const valid = new URL(destination(value));
  if (valid.pathname !== '/') throw Error('Use a registry origin without a path.');
  return valid.origin;
}
module.exports = { name, destination, publicIPv4, publicAddress, endpoint };
