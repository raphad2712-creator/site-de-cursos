export const ORIGIN = 'https://ead.gambeti.com.br';
export const READ_FUNCTIONS = new Set([
  'core_webservice_get_site_info',
  'core_course_get_courses_by_field',
  'core_enrol_get_enrolled_users',
  'core_completion_get_course_completion_status'
]);
export class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function positiveId(value) {
  if (!/^\d{1,9}$/.test(String(value)) || Number(value) < 1) throw new AppError(400, 'Informe um identificador válido.');
  return Number(value);
}
export async function queryMoodle(fn, params, env, fetcher = fetch) {
  if (!READ_FUNCTIONS.has(fn)) throw new AppError(403, 'Operação não permitida.');
  if (!env.MOODLE_TOKEN) throw new AppError(503, 'A chave autorizada do Moodle ainda não foi configurada.');
  const body = new URLSearchParams({ ...params, wsfunction: fn, wstoken: env.MOODLE_TOKEN, moodlewsrestformat: 'json' });
  let response;
  try {
    response = await fetcher(ORIGIN + '/webservice/rest/server.php', {
      method: 'POST', body, redirect: 'error', cache: 'no-store',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
  } catch { throw new AppError(502, 'O Moodle não respondeu. Aguarde e tente novamente.'); }
  if (!response.ok) throw new AppError(502, 'O Moodle recusou a consulta.');
  const text = await response.text();
  if (text.length > 2000000) throw new AppError(502, 'A resposta excedeu o limite de consulta.');
  let data;
  try { data = JSON.parse(text); } catch { throw new AppError(502, 'O Moodle retornou uma resposta inesperada.'); }
  if (data?.exception || data?.errorcode) throw new AppError(502, 'Não foi possível consultar o Moodle. Verifique a chave, suas permissões e a conclusão do curso com o responsável.');
  return data;
}
export const clean = (value, max = 200) => String(value || '').replace(/<[^>]*>/g, '').slice(0, max);
