const loginForm = document.querySelector('#login-form');
const loginMessage = document.querySelector('#login-message');
const loginButton = loginForm.querySelector('button');
document.title = 'Certificados conectados | Gambeti';
document.querySelector('.login-card h1').textContent = 'Certificados Gambeti';
document.querySelector('.login-card p').textContent = 'Entre com a chave do painel. O acesso ao Moodle é somente para consulta.';
document.querySelector('#username').closest('label').remove();
const passwordInput = document.querySelector('#password');
passwordInput.parentElement.replaceChildren(document.createTextNode('Chave do painel'), passwordInput);
document.querySelector('#password').minLength = 32;
document.querySelector('#password').maxLength = 32;
document.querySelector('#password').autocomplete = 'off';
document.querySelector('.brand span').textContent = 'Consulta ao Moodle · emissão manual';
document.querySelector('.heading h1').textContent = 'Gerador de certificados';
document.querySelector('.heading p').textContent = 'Consulte a conclusão do aluno antes de emitir. Nada é enviado ou alterado no Moodle.';
document.querySelector('.top-actions a').textContent = 'Abrir Moodle';
document.querySelector('.top-actions a').href = 'https://ead.gambeti.com.br/';
document.querySelector('.top-actions a').rel = 'noopener noreferrer';
document.querySelector('#program-content').value = '';
const style = document.createElement('style');
style.textContent = '#courses-section,#count,[data-tab="courses-section"]{display:none!important}.moodle-query{padding:20px;margin:0 0 20px}.moodle-query h2{margin:0 0 8px}.moodle-query p{margin:8px 0}.query-actions{display:flex;flex-wrap:wrap;gap:8px}.query-fields{display:grid;grid-template-columns:1fr 2fr;gap:15px}@media(max-width:650px){.query-fields{grid-template-columns:1fr}}';
document.head.append(style);
// A lista de cursos local não precisa carregar capas nem consultar endereços externos.
renderList = () => {};
const originalDefaults = setCertificateDefaults;
setCertificateDefaults = () => { originalDefaults(); document.querySelector('#program-content').value = ''; };
const panel = document.createElement('section');
panel.className = 'panel moodle-query';
panel.innerHTML = `<h2>Consultar no Moodle</h2><p>Carregue um curso pelo ID, escolha o aluno e confira sua conclusão. Consultas realizadas somente quando você clicar.</p>
<div class="query-actions"><button type="button" id="test-connection" class="secondary">Verificar conexão</button><button type="button" id="clear-moodle" class="secondary">Limpar consulta</button></div>
<div class="query-fields"><label>ID do curso<input id="moodle-course-id" inputmode="numeric" placeholder="Ex.: 10"></label><label>Aluno matriculado<select id="moodle-student"><option value="">Carregue os alunos do curso</option></select></label></div>
<div class="query-actions"><button type="button" id="load-students" class="secondary">Buscar alunos</button><button type="button" id="previous-students" class="secondary" disabled>Anterior</button><button type="button" id="next-students" class="secondary" disabled>Próxima página</button><button type="button" id="check-completion" class="primary">Consultar conclusão</button></div><p id="moodle-status" role="status">Entre no painel para consultar.</p>`;
document.querySelector('#certificates-section').prepend(panel);
const status = document.querySelector('#moodle-status');
const studentSelect = document.querySelector('#moodle-student');
let page = 0, students = [], selectedCourse = '', busy = false;
window.moodleApproval = null;
async function api(action, data = {}) {
  const response = await fetch('/api/moodle', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) });
  let result;
  try { result = await response.json(); }
  catch { throw new Error('Abra o painel pela implantação Vercel. Este endereço não oferece a API da integração.'); }
  if (!response.ok) {
    if (response.status === 401) { setLoggedIn(false); window.moodleApproval = null; }
    throw new Error(result.error || 'A consulta não pôde ser concluída.');
  }
  return result;
}
function clearApproval() { window.moodleApproval = null; }
function showApp() {
  setLoggedIn(true);
  document.querySelector('[data-tab="certificates-section"]').click();
}
loginForm.addEventListener('submit', async event => {
  event.preventDefault(); loginButton.disabled = true; loginMessage.textContent = 'Validando acesso…';
  try { await api('login', { key: document.querySelector('#password').value }); document.querySelector('#password').value = ''; loginMessage.textContent = ''; showApp(); status.textContent = 'Acesso confirmado. Escolha um curso para consultar.'; }
  catch (error) { loginMessage.textContent = error.message; }
  finally { loginButton.disabled = false; }
});
document.querySelector('#logout').addEventListener('click', async () => {
  try { await api('logout'); location.reload(); } catch (error) { status.textContent = error.message; }
});
async function run(callback) {
  if (busy) return;
  busy = true;
  const buttons = [...panel.querySelectorAll('button')];
  const states = buttons.map(button => button.disabled);
  buttons.forEach(button => button.disabled = true);
  try { await callback(); } catch (error) { clearApproval(); status.textContent = error.message; }
  finally { busy = false; buttons.forEach((button, index) => button.disabled = states[index]); updatePaging(); }
}
function updatePaging() {
  document.querySelector('#previous-students').disabled = page === 0;
  document.querySelector('#next-students').disabled = students.length !== 25;
}
async function loadStudents(newPage = 0) {
  clearApproval();
  status.textContent = 'Consultando curso e alunos…';
  const data = await api('students', { courseId: document.querySelector('#moodle-course-id').value.trim(), page: newPage });
  page = data.page; students = data.students; selectedCourse = data.courseName;
  studentSelect.replaceChildren(new Option('Selecione um aluno', ''));
  for (const student of students) studentSelect.add(new Option(student.name, String(student.id)));
  status.textContent = `${selectedCourse} · página ${page + 1} · ${students.length} aluno(s).`;
}
document.querySelector('#load-students').addEventListener('click', () => run(() => loadStudents(0)));
document.querySelector('#previous-students').addEventListener('click', () => run(() => loadStudents(page - 1)));
document.querySelector('#next-students').addEventListener('click', () => run(() => loadStudents(page + 1)));
document.querySelector('#test-connection').addEventListener('click', () => run(async () => {
  status.textContent = 'Verificando acesso de consulta…';
  const data = await api('connection');
  status.textContent = data.missing.length ? `Conexão disponível, mas faltam permissões para: ${data.missing.join(', ')}. Nenhuma configuração foi alterada.` : `Conexão confirmada com ${data.siteName}. As funções necessárias estão disponíveis.`;
}));
document.querySelector('#check-completion').addEventListener('click', () => run(async () => {
  clearApproval();
  const student = students.find(item => String(item.id) === studentSelect.value);
  if (!student) throw new Error('Selecione um aluno da lista.');
  status.textContent = 'Consultando conclusão…';
  const data = await api('completion', { selection: student.selection });
  if (!data.completed) { status.textContent = 'O Moodle não confirmou a conclusão. A emissão por esta integração permanece bloqueada.'; return; }
  document.querySelector('#student-name').value = data.studentName;
  document.querySelector('#certificate-course').value = data.courseName;
  window.moodleApproval = { name: data.studentName, course: data.courseName, checkedAt: Date.parse(data.checkedAt) };
  status.textContent = 'Conclusão confirmada. Confira os demais dados do certificado. A consulta vale por cinco minutos; o PDF será gerado aqui, sem envio ao Moodle.';
}));
studentSelect.addEventListener('change', clearApproval);
document.querySelector('#moodle-course-id').addEventListener('input', () => { clearApproval(); students = []; studentSelect.replaceChildren(new Option('Carregue os alunos do curso', '')); updatePaging(); });
document.querySelector('#clear-moodle').addEventListener('click', () => { clearApproval(); students = []; studentSelect.replaceChildren(new Option('Carregue os alunos do curso', '')); status.textContent = 'Consulta limpa. Nenhum dado foi alterado no Moodle.'; updatePaging(); });
// Dados não são persistidos em servidor por esta integração. O histórico já existente usa este navegador.
api('status').then(data => { showApp(); status.textContent = data.tokenConfigured ? 'Acesso confirmado. A conexão com o Moodle ainda precisa ser verificada.' : 'Painel pronto. Falta configurar a chave autorizada do Moodle no servidor.'; }).catch(error => { loginMessage.textContent = error.message; });
