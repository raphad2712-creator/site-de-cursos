const info = document.createElement('div');
info.className = 'save-status';
info.innerHTML = '<strong>Histórico neste navegador</strong> · Histórico salvo neste navegador. Baixe um backup antes de limpar os dados. <button type="button" id="backup-download" class="secondary">Baixar backup</button> <button type="button" id="backup-restore" class="secondary">Restaurar backup</button><input type="file" id="backup-file" accept="application/json,.json" hidden><p id="backup-status" role="status" style="margin-bottom:0"></p>';
document.querySelector('.tabs').before(info);
document.querySelector('#backup-download').addEventListener('click', () => {
  const data = {format: 'gambeti-certificados-local', version: 1, exportedAt: new Date().toISOString(), certificates};
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup-certificados-${new Date().toISOString().slice(0,10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  document.querySelector('#backup-status').textContent = 'Backup preparado. Guarde o arquivo baixado em uma pasta privada.';
});
document.querySelector('#backup-restore').addEventListener('click', () => document.querySelector('#backup-file').click());
document.querySelector('#backup-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('O arquivo deve ter no máximo 10 MB.');
    const data = JSON.parse(await file.text());
    if (data.format !== 'gambeti-certificados-local' || data.version !== 1 || !Array.isArray(data.certificates)) throw new Error('Formato de backup incompatível.');
    const fields = ['id','studentName','documentType','documentNumber','cpf','course','trainingLocation','startDate','endDate','completionDate','workload','validUntil','technician','programContent','code'];
    const incoming = data.certificates.map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Registro inválido.');
      const clean = {};
      for (const key of fields) {
        if (typeof item[key] !== 'string' || item[key].length > 30000) throw new Error('Registro incompleto ou inválido.');
        clean[key] = item[key];
      }
      if (!/^[a-zA-Z0-9-]+$/.test(clean.id)) throw new Error('Identificador inválido.');
      for (const key of ['startDate','endDate','completionDate','validUntil']) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(clean[key]) || !Number.isFinite(Date.parse(clean[key]))) throw new Error('Data inválida.');
      }
      if (!['cpf','cnpj'].includes(clean.documentType)) throw new Error('Tipo de documento inválido.');
      return clean;
    });
    const ids = new Set(certificates.map(item => item.id));
    const additions = incoming.filter(item => {
      if (ids.has(item.id)) return false;
      ids.add(item.id);
      return true;
    });
    const merged = [...additions, ...certificates];
    localStorage.setItem('gambeti-integracao-certificates', JSON.stringify(merged));
    certificates = merged;
    renderCertificates();
    document.querySelector('#backup-status').textContent = `${additions.length} certificado(s) restaurado(s). Registros existentes foram mantidos.`;
  } catch (error) {
    document.querySelector('#backup-status').textContent = `Não foi possível restaurar: ${error.message}`;
  } finally {
    event.target.value = '';
  }
});
