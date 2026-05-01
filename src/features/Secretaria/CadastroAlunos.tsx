import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, UserPlus, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Turma {
  id: string;
  nome: string;
}

interface CadastroAlunoForm {
  nome: string;
  email: string;
  cpf: string;
  data_nascimento: string;
  sexo: string;
  nis: string;
  rg: string;
  naturalidade: string;
  nome_mae: string;
  nome_pai: string;
  endereco: string;
  bairro: string;
  municipio: string;
  uf: string;
  telefone: string;
  responsavel: string;
  serie: string;
  turno: string;
  turma_id: string;
}

export const CadastroAlunos: React.FC = () => {
  const { escolaAtiva, isSystemRoot, loading } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [form, setForm] = useState<CadastroAlunoForm>({
    nome: '',
    email: '',
    cpf: '',
    data_nascimento: '',
    sexo: '',
    nis: '',
    rg: '',
    naturalidade: '',
    nome_mae: '',
    nome_pai: '',
    endereco: '',
    bairro: '',
    municipio: '',
    uf: 'SP',
    telefone: '',
    responsavel: '',
    serie: '',
    turno: 'Matutino',
    turma_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const canCadastrar = isSystemRoot || ['Admin', 'Secretaria'].includes(escolaAtiva?.papel || '');

  useEffect(() => {
    if (!escolaAtiva || !canCadastrar) return;
    carregarTurmas();
  }, [escolaAtiva, canCadastrar]);

  const carregarTurmas = async () => {
    if (!escolaAtiva) return;
    const { data } = await supabase
      .from('turmas')
      .select('id, nome')
      .eq('escola_id', escolaAtiva.escola_id)
      .order('nome');

    setTurmas((data || []) as Turma[]);
  };

  const validarFormulario = () => {
    if (!form.nome.trim()) return 'O nome completo do aluno é obrigatório.';
    if (!form.cpf.trim()) return 'O CPF é obrigatório.';
    if (!form.data_nascimento.trim()) return 'A data de nascimento é obrigatória.';
    if (!form.nome_mae.trim()) return 'O nome da mãe é obrigatório.';
    if (!form.endereco.trim() || !form.municipio.trim() || !form.uf.trim()) {
      return 'Endereço completo é obrigatório segundo exigências federais e municipais.';
    }
    if (new Date(form.data_nascimento) > new Date()) return 'A data de nascimento não pode ser no futuro.';
    return '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!escolaAtiva) return;

    const validationError = validarFormulario();
    if (validationError) {
      setError(validationError);
      setFeedback('');
      return;
    }

setSaving(true);
    setError('');
    setFeedback('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-school-user', {
        body: {
          escola_id: escolaAtiva.escola_id,
          nome: form.nome,
          email: form.email,
          cpf: form.cpf,
          papel: 'Aluno',
          tipo_vinculo: 'Efetivo',
          metadata: {
            data_nascimento: form.data_nascimento,
            sexo: form.sexo,
            nis: form.nis,
            rg: form.rg,
            naturalidade: form.naturalidade,
            nome_mae: form.nome_mae,
            nome_pai: form.nome_pai,
            endereco: form.endereco,
            bairro: form.bairro,
            municipio: form.municipio,
            uf: form.uf,
            telefone: form.telefone,
            responsavel: form.responsavel,
            serie: form.serie,
            turno: form.turno,
          },
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      const alunoId = (data?.user_id as string) || (data?.user_id && String(data.user_id));
      if (!alunoId) throw new Error('Não foi possível obter o ID do aluno criado.');

      if (form.turma_id) {
        const { error: matriculaError } = await supabase.from('matriculas').insert({
          escola_id: escolaAtiva.escola_id,
          turma_id: form.turma_id,
          aluno_id: alunoId,
          status: 'Ativo',
        });
        if (matriculaError) throw matriculaError;
      }

      setFeedback('Aluno cadastrado com sucesso!');
      setForm({
        nome: '',
        email: '',
        cpf: '',
        data_nascimento: '',
        sexo: '',
        nis: '',
        rg: '',
        naturalidade: '',
        nome_mae: '',
        nome_pai: '',
        endereco: '',
        bairro: '',
        municipio: '',
        uf: 'SP',
        telefone: '',
        responsavel: '',
        serie: '',
        turno: 'Matutino',
        turma_id: '',
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar o aluno.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-600">
        Carregando contexto da escola...
      </div>
    );
  }

  if (!escolaAtiva) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 max-w-3xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Nenhuma escola ativa selecionada</h2>
        <p className="text-sm text-gray-600">
          Selecione a escola ativa no seletor superior para usar o cadastro de alunos.
          Se você já tem uma escola associada e ela não aparece, atualize a página ou entre em contato com o administrador.
        </p>
      </div>
    );
  }

  if (!canCadastrar) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4 text-amber-700">
          <AlertTriangle size={24} />
          <h2 className="text-xl font-semibold">Acesso restrito</h2>
        </div>
        <p className="text-sm text-gray-600">
          Apenas os perfis <strong>Admin</strong> e <strong>Secretaria</strong> podem cadastrar novos alunos.
          Se você acredita que precisa desse acesso, peça para o administrador da escola revisar seu perfil.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-indigo-600">Cadastro de Alunos</p>
            <h1 className="text-3xl font-bold text-gray-900">Registro atualizado com regras federais, estaduais e municipais</h1>
            <p className="mt-3 text-sm text-gray-600 max-w-2xl">
              Preencha os dados do aluno com base nas exigências legais de matrícula escolar.
              O sistema respeita o level access e só permite operações de cadastro para perfis autorizados.
            </p>
          </div>
          <div className="rounded-3xl bg-indigo-50 p-5 border border-indigo-100 flex items-center gap-4">
            <ShieldCheck size={28} className="text-indigo-600" />
            <div>
              <p className="text-sm text-indigo-900 font-semibold">Level access aplicado</p>
              <p className="text-xs text-gray-500">Admin/Secretaria podem cadastrar; demais perfis visualizam apenas.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl bg-indigo-50 p-5 border border-indigo-100">
            <p className="text-sm font-semibold text-indigo-700">Regras Federais</p>
            <ul className="mt-3 list-disc list-inside text-sm text-gray-600 space-y-2">
              <li>CPF, data de nascimento e nome da mãe.</li>
              <li>LGPD aplicada a dados pessoais sensíveis.</li>
              <li>Registro de dados de residência e contato.</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-indigo-50 p-5 border border-indigo-100">
            <p className="text-sm font-semibold text-indigo-700">Regras Estaduais / Municipais</p>
            <ul className="mt-3 list-disc list-inside text-sm text-gray-600 space-y-2">
              <li>NIS/PIS e histórico de endereço.</li>
              <li>Série e turno aplicáveis ao calendário local.</li>
              <li>Cadastro direto em turma quando disponível.</li>
            </ul>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <UserPlus size={28} className="text-indigo-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Dados do Aluno</h2>
              <p className="text-sm text-gray-500">Campos obrigatórios são marcados com *</p>
            </div>
          </div>

          {feedback && (
            <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 flex items-start gap-2">
              <CheckCircle2 size={20} />
              <div>{feedback}</div>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle size={20} />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome completo *</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">CPF *</label>
                <input
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Data de nascimento *</label>
                <input
                  type="date"
                  value={form.data_nascimento}
                  onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Sexo</label>
                <select
                  value={form.sexo}
                  onChange={(e) => setForm({ ...form, sexo: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">NIS / PIS</label>
                <input
                  value={form.nis}
                  onChange={(e) => setForm({ ...form, nis: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">RG</label>
                <input
                  value={form.rg}
                  onChange={(e) => setForm({ ...form, rg: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Naturalidade</label>
                <input
                  value={form.naturalidade}
                  onChange={(e) => setForm({ ...form, naturalidade: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome da mãe *</label>
                <input
                  value={form.nome_mae}
                  onChange={(e) => setForm({ ...form, nome_mae: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome do pai</label>
                <input
                  value={form.nome_pai}
                  onChange={(e) => setForm({ ...form, nome_pai: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Responsável legal</label>
                <input
                  value={form.responsavel}
                  onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Endereço completo *</label>
                <input
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Bairro *</label>
                <input
                  value={form.bairro}
                  onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Município *</label>
                <input
                  value={form.municipio}
                  onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">UF *</label>
                <input
                  value={form.uf}
                  onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Telefone</label>
                <input
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Série / Ano Letivo</label>
                <input
                  value={form.serie}
                  onChange={(e) => setForm({ ...form, serie: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Turno</label>
                <select
                  value={form.turno}
                  onChange={(e) => setForm({ ...form, turno: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Matutino">Matutino</option>
                  <option value="Vespertino">Vespertino</option>
                  <option value="Noturno">Noturno</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Turma</label>
                <select
                  value={form.turma_id}
                  onChange={(e) => setForm({ ...form, turma_id: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecionar turma (opcional)</option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>{turma.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-3xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? 'Cadastrando...' : 'Cadastrar Aluno'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};
