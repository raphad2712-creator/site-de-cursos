import { randomBytes, scryptSync } from 'node:crypto';
const key = randomBytes(24).toString('base64url');
const salt = randomBytes(16).toString('hex');
console.log('Execute apenas no seu computador. Guarde estes valores em local privado.');
console.log('Chave para entrar no painel:', key);
console.log('PANEL_KEY_HASH=' + salt + ':' + scryptSync(key, salt, 32).toString('hex'));
console.log('SESSION_SECRET=' + randomBytes(32).toString('hex'));
