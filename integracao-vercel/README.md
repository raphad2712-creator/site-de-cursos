# Certificados com consulta ao Moodle

Projeto separado para a Vercel. Não substitui a página inicial, o administrador
existente nem o Moodle. Nenhum acesso real é configurado pelo código.

## Publicação

Importe o repositório `raphad2712-creator/site-de-cursos` como um **novo projeto**
na Vercel e escolha a pasta `integracao-vercel` como Root Directory. Framework:
Other. O `vercel.json` define o build e a saída. Não altere o projeto de outro site.

Sem variáveis privadas, a API fica bloqueada e não faz requisições ao Moodle.
Não há senha padrão. O login `admin/admin` da versão antiga não funciona aqui.

## Configuração privada

1. No seu computador com Node 22, abra esta pasta e execute `npm run gerar-acesso`.
   O comando gera uma chave aleatória para entrar no painel, seu hash e o segredo
   das sessões. Guarde os valores em local privado e não os envie ao GitHub.
2. No painel do novo projeto Vercel, cadastre `PANEL_KEY_HASH`, `SESSION_SECRET`
   e `APP_ORIGIN` (a origem HTTPS exata do novo site, sem barra final).
3. O responsável pelo Moodle deve fornecer um `MOODLE_TOKEN` já autorizado e
   adequado para as consultas. Configure-o no servidor, marcado como sensível.
   O programa não usa a senha de administrador para criar tokens.
4. Faça uma nova implantação após alterar as variáveis. Ative também a proteção
   de implantação e limites de tentativas no Firewall da Vercel.
5. Abra `/gerador/`, entre com a chave do painel e clique em Verificar conexão.

Não reutilize ou revogue credenciais de outra integração. Se não houver chave
adequada, pare: criar um usuário, serviço ou token separado no Moodle é uma
mudança de configuração e exige autorização específica e planejamento do backup.

## Permissões necessárias

A lista de funções permitidas pelo código é fixa:

- `core_webservice_get_site_info`: conferir acesso e funções disponíveis.
- `core_course_get_courses_by_field`: buscar um curso pelo ID.
- `core_enrol_get_enrolled_users`: listar até 25 matriculados ativos por página.
- `core_completion_get_course_completion_status`: consultar conclusão do selecionado.

Idealmente o token deve pertencer a um serviço e usuário próprios, limitados a
essas consultas e aos cursos autorizados. O código não permite escolher outra
função ou outro servidor pelo navegador. A chave não precisa nem deve ser de
administrador. A existência de REST habilitado não garante estas permissões.

## Uso

O ID do curso aparece no endereço do Moodle ao abrir o curso (`course/view.php?id=...`).
Digite o ID, busque os alunos, selecione um aluno e consulte a conclusão. O nome
e curso são preenchidos somente quando o Moodle confirma a conclusão.
Complete manualmente documento, datas, carga horária, conteúdo e responsável.
A API não inventa data de conclusão nem carga horária a partir das configurações.
A confirmação vale cinco minutos na interface e deve ser repetida para outra emissão.
Isso não substitui a revisão humana dos requisitos para emitir o documento.

O PDF é gerado no navegador com o modelo já existente no repositório. O histórico
também fica neste navegador; baixe backups JSON para guardá-lo. Não há registro
central de emissão nem serviço público de validação dos PDFs nesta versão.
O modelo é uma ferramenta de emissão por um operador autorizado, e não um
mecanismo antifraude: arquivos HTML/JavaScript e PDFs podem ser modificados por
quem os possui. Nenhum certificado, nota ou registro é enviado ao Moodle.

## Segurança e limites

As consultas REST usam POST para não colocar o token na URL; são apenas funções
de leitura. Cookies de sessão são HttpOnly, Secure e SameSite=Strict, com expiração
de uma hora. O backend exige origem exata, autenticação e seleção assinada do aluno.
Erros do Moodle são substituídos por mensagens genéricas, sem exibir os segredos.
O destino Moodle é fixo e redirecionamentos de rede são recusados.

Não existe consulta periódica, sincronização em massa nem rotina que altere os
outros sistemas. Consultas ainda consomem recursos e podem aparecer nos logs
normais do Moodle. Uma busca faz duas chamadas e consultar conclusão faz uma.
O limite de login em memória é um complemento por instância; não é um limite
global entre funções da Vercel. A chave de acesso é aleatória de 192 bits e o
Firewall/proteção de implantação devem ser usados para uma camada adicional.
Trocar PANEL_KEY_HASH ou SESSION_SECRET invalida as sessões do painel.

Não copie dados de alunos para commits, logs ou exemplos. Os testes usam apenas
respostas simuladas e não acessam o Moodle. Execute `npm test` e `npm run build`.
O servidor `npm run dev` serve para revisar o visual localmente; cookies e origem
da conexão real exigem HTTPS e devem ser testados na implantação protegida.
