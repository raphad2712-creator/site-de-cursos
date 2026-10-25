import test from 'node:test';
import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';
import { createHandler } from '../api/moodle.js';
import { COOKIE, sign, verify } from '../lib/security.js';
import { queryMoodle } from '../lib/moodle.js';

// Credenciais sintéticas usadas exclusivamente por estes testes.
const key = 'A'.repeat(32), salt = 'a'.repeat(32);
const env = {
  APP_ORIGIN: 'https://painel.example', PANEL_KEY_HASH: `${salt}:${scryptSync(key, salt, 32).toString('hex')}`,
  SESSION_SECRET: 'b'.repeat(64), MOODLE_TOKEN: 'token-ficticio-nao-utilizavel'
};
async function request(body, { cookie = '', origin = env.APP_ORIGIN, config = env, fetcher = () => { throw Error('Chamada externa inesperada'); }, method = 'POST', ip = 'test' } = {}) {
  const req = { method, body, headers: { origin, cookie, 'content-type': 'application/json', 'x-vercel-forwarded-for': ip } };
  const headers = {};
  let result;
  const res = { setHeader(key, value) { headers[key.toLowerCase()] = value; }, end(value) { result = JSON.parse(value); } };
  await createHandler(config, fetcher)(req, res);
  return { status: res.statusCode, body: result, headers };
}
const sessionCookie = () => `${COOKIE}=${sign({ id: 'operator' }, env, 'session')}`;
function upstream(fixtures, calls) {
  return async (url, options) => {
    const params = Object.fromEntries(options.body);
    calls.push({ url, ...options, params });
    const data = fixtures[params.wsfunction];
    assert(data !== undefined, `Função não prevista: ${params.wsfunction}`);
    return { ok: true, text: async () => JSON.stringify(data) };
  };
}
test('sem configuração, autenticação ou origem correta não consulta o Moodle', async () => {
  assert.equal((await request({ action: 'connection' }, { config: {} })).status, 503);
  assert.equal((await request({ action: 'connection' })).status, 401);
  assert.equal((await request({ action: 'connection' }, { cookie: sessionCookie(), origin: 'https://intruso.example' })).status, 403);
  assert.equal((await request({ action: 'connection' }, { method: 'GET' })).status, 405);
});
test('login real não aceita admin/admin; cookie protegido e logout', async () => {
  assert.equal((await request({ action: 'login', key: 'admin' }, { ip:'wrong' })).status, 401);
  const login = await request({ action: 'login', key }, { ip:'correct' });
  assert.equal(login.status, 200);
  assert.match(login.headers['set-cookie'], /HttpOnly; Secure; SameSite=Strict/);
  const status = await request({ action:'status' }, { cookie: login.headers['set-cookie'].split(';')[0] });
  assert.equal(status.body.tokenConfigured, true);
  const logout = await request({ action:'logout' }, { cookie: sessionCookie() });
  assert.match(logout.headers['set-cookie'], /Max-Age=0/);
});
test('cookie assinado recusa adulteração, expiração, outro propósito e rotação', () => {
  const token = sign({ id:'operator' }, env, 'session');
  assert.equal(verify(token + 'x', env, 'session'), null);
  assert.equal(verify(token, env, 'selection'), null);
  assert.equal(verify(token, { ...env, SESSION_SECRET:'c'.repeat(64) }, 'session'), null);
  assert.equal(verify(sign({ id:'operator' }, env, 'session', 0), env, 'session'), null);
});
test('limite complementar de tentativas de login', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await request({ action:'login', key:'wrong' }, { ip:'limited' })).status, 401);
  assert.equal((await request({ action:'login', key }, { ip:'limited' })).status, 429);
});
test('somente funções fixas de leitura; token fica no corpo, nunca na URL', async () => {
  await assert.rejects(queryMoodle('core_user_delete_users', {}, env), /não permitida/);
  await assert.rejects(queryMoodle('core_webservice_get_site_info', {}, { ...env, MOODLE_TOKEN:'' }), /não foi configurada/);
  const calls = [];
  const response = await request({ action:'connection' }, { cookie:sessionCookie(), fetcher:upstream({
    core_webservice_get_site_info: { sitename:'Teste', functions:[{name:'core_course_get_courses_by_field'}] }
  }, calls) });
  assert.equal(response.status, 200);
  assert.equal(response.body.missing.length, 2);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://ead.gambeti.com.br/webservice/rest/server.php');
  assert.equal(calls[0].redirect, 'error');
  assert.equal(calls[0].params.wstoken, env.MOODLE_TOKEN);
  assert(!calls[0].url.includes(env.MOODLE_TOKEN));
  assert(!JSON.stringify(response.body).includes(env.MOODLE_TOKEN));
});
test('pagina alunos, minimiza dados e vincula seleção à sessão', async () => {
  const calls = [];
  const fetcher = upstream({
    core_course_get_courses_by_field: { courses:[{ id:10, fullname:'Curso fictício' }] },
    core_enrol_get_enrolled_users: [{ id:42, fullname:'Aluno fictício', email:'nao-devolver@example.test', idnumber:'nao-devolver' }],
    core_completion_get_course_completion_status: { completionstatus:{ completed:true } }
  }, calls);
  const cookie = sessionCookie();
  const listing = await request({ action:'students', courseId:'10', page:2 }, { cookie, fetcher });
  assert.equal(listing.status, 200);
  assert.equal(calls[1].params['options[1][value]'], '50');
  assert.equal(calls[1].params['options[2][value]'], '25');
  assert.equal(calls[1].params['options[0][value]'], 'id,fullname');
  assert(!JSON.stringify(listing.body).includes('nao-devolver'));
  const selection = listing.body.students[0].selection;
  assert.equal((await request({ action:'completion', selection:selection+'x' }, { cookie, fetcher })).status, 400);
  assert.equal((await request({ action:'completion', selection }, { cookie:`${COOKIE}=${sign({id:'other'},env,'session')}`, fetcher })).status, 400);
  const completion = await request({ action:'completion', selection }, { cookie, fetcher });
  assert.equal(completion.body.completed, true);
  assert.equal(completion.body.studentName, 'Aluno fictício');
  assert.equal(calls.length, 3);
});
test('conclusão desconhecida não vira aprovação; erros não expõem detalhes', async () => {
  const selection = sign({ courseId:10, userId:42, sessionId:'operator', name:'Aluno', courseName:'Curso' }, env, 'selection');
  for (const fixture of [ { completionstatus:{} }, { exception:'moodle_exception', message:env.MOODLE_TOKEN, errorcode:'invalidtoken' } ]) {
    const result = await request({ action:'completion', selection }, { cookie:sessionCookie(), fetcher:upstream({core_completion_get_course_completion_status:fixture}, []) });
    assert.equal(result.status, 502);
    assert(!JSON.stringify(result.body).includes(env.MOODLE_TOKEN));
    assert(!result.body.completed);
  }
  const result = await request({ action:'completion', selection }, { cookie:sessionCookie(), fetcher:upstream({core_completion_get_course_completion_status:{completionstatus:{completed:false}}}, []) });
  assert.equal(result.status, 200);
  assert.equal(result.body.completed, false);
});
test('IDs, ações e corpo inválidos são recusados antes de consultar', async () => {
  const options = { cookie:sessionCookie() };
  assert.equal((await request({action:'students', courseId:'https://intruso.example'}, options)).status, 400);
  assert.equal((await request({action:'students', courseId:10, page:-1}, options)).status, 400);
  assert.equal((await request({action:'delete'}, options)).status, 400);
  assert.equal((await request('invalid-json', options)).status, 400);
});
