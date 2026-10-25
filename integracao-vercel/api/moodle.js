import { randomBytes } from 'node:crypto';
import { COOKIE, configured, validKey, session, sign, verify, sessionCookie } from '../lib/security.js';
import { AppError, queryMoodle, positiveId, clean } from '../lib/moodle.js';

// Complemento local contra tentativas repetidas. Para limite global use o Firewall da Vercel.
const attempts = new Map();
function loginLimit(req) {
  const ip = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  for (const [key, item] of attempts) if (item.until < now) attempts.delete(key);
  if (attempts.size > 10000) throw new AppError(429, 'Aguarde antes de tentar novamente.');
  const entry = attempts.get(ip) || { count: 0, until: now + 60000 };
  entry.count += 1;
  attempts.set(ip, entry);
  if (entry.count > 5) throw new AppError(429, 'Aguarde um minuto antes de tentar novamente.');
}
export function createHandler(env = process.env, fetcher = fetch) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Cookie');
    const reply = (status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)); };
    try {
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return reply(405, { error: 'Método não permitido.' }); }
      if (!configured(env)) throw new AppError(503, 'O painel ainda não foi configurado pelo responsável. Nenhuma consulta ao Moodle foi realizada.');
      if (req.headers.origin !== env.APP_ORIGIN) throw new AppError(403, 'Origem não autorizada.');
      if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new AppError(415, 'Envie dados JSON.');
      if (Number(req.headers['content-length'] || 0) > 8192) throw new AppError(413, 'Solicitação muito grande.');
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { throw new AppError(400, 'Solicitação inválida.'); } }
      if (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 8192) throw new AppError(400, 'Solicitação inválida.');
      const action = body.action;
      if (action === 'login') {
        loginLimit(req);
        if (!validKey(body.key, env)) throw new AppError(401, 'Chave de acesso incorreta.');
        res.setHeader('Set-Cookie', sessionCookie(sign({ id: randomBytes(16).toString('hex') }, env, 'session')));
        return reply(200, { ok: true });
      }
      if (action === 'logout') {
        res.setHeader('Set-Cookie', sessionCookie('', 0));
        return reply(200, { ok: true });
      }
      const auth = session(req, env);
      if (!auth) throw new AppError(401, 'Entre no painel para consultar o Moodle.');
      if (action === 'status') return reply(200, { ok: true, tokenConfigured: Boolean(env.MOODLE_TOKEN) });
      const query = (fn, params = {}) => queryMoodle(fn, params, env, fetcher);
      if (action === 'connection') {
        const data = await query('core_webservice_get_site_info');
        const functions = new Set((data.functions || []).map(item => item.name));
        const required = ['core_course_get_courses_by_field', 'core_enrol_get_enrolled_users', 'core_completion_get_course_completion_status'];
        return reply(200, { ok: true, siteName: clean(data.sitename), missing: required.filter(name => !functions.has(name)) });
      }
      if (action === 'students') {
        const courseId = positiveId(body.courseId), page = Number(body.page || 0);
        if (!Number.isInteger(page) || page < 0 || page > 1000) throw new AppError(400, 'Página inválida.');
        const courseData = await query('core_course_get_courses_by_field', { field: 'id', value: String(courseId) });
        const course = courseData.courses?.find(item => item.id === courseId);
        if (!course) throw new AppError(404, 'Curso não encontrado ou não autorizado.');
        const data = await query('core_enrol_get_enrolled_users', {
          courseid: String(courseId),
          'options[0][name]': 'userfields', 'options[0][value]': 'id,fullname',
          'options[1][name]': 'limitfrom', 'options[1][value]': String(page * 25),
          'options[2][name]': 'limitnumber', 'options[2][value]': '25',
          'options[3][name]': 'onlyactive', 'options[3][value]': '1'
        });
        if (!Array.isArray(data)) throw new AppError(502, 'Lista de alunos inválida.');
        const courseName = clean(course.fullname);
        const students = data.slice(0, 25).map(item => {
          const userId = positiveId(item.id), name = clean(item.fullname);
          return { id: userId, name, selection: sign({ courseId, userId, name, courseName, sessionId: auth.id }, env, 'selection') };
        });
        return reply(200, { courseId, courseName, students, page, mayHaveNext: data.length === 25 });
      }
      if (action === 'completion') {
        const selected = verify(body.selection, env, 'selection');
        if (!selected || selected.sessionId !== auth.id) throw new AppError(400, 'Seleção inválida ou expirada. Carregue os alunos novamente.');
        const data = await query('core_completion_get_course_completion_status', { courseid: String(selected.courseId), userid: String(selected.userId) });
        const status = data.completionstatus;
        if (!status || typeof status.completed !== 'boolean') throw new AppError(502, 'Não foi possível confirmar a conclusão deste curso.');
        return reply(200, { completed: status.completed, studentName: selected.name, courseName: selected.courseName, checkedAt: new Date().toISOString() });
      }
      throw new AppError(400, 'Operação desconhecida.');
    } catch (error) {
      // Não retorne mensagens brutas, chaves, cookies, URLs ou dados internos do Moodle.
      reply(error instanceof AppError ? error.status : 500, { error: error instanceof AppError ? error.message : 'Não foi possível processar a solicitação.' });
    }
  };
}
export default createHandler();
