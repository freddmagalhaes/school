import React, { useState } from 'react';
import { GraduationCap, Phone, Mail, Clock, MessageSquare, Send, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// ============================================================
// Página de Contato
// ============================================================
export const Contato: React.FC = () => {
  const [form, setForm] = useState({ nome: '', email: '', mensagem: '' });
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Salva a mensagem diretamente no banco de dados do Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro(null);

    try {
      const { error } = await supabase
        .from('contatos')
        .insert([
          { 
            nome: form.nome, 
            email: form.email, 
            mensagem: form.mensagem 
          }
        ]);

      if (error) throw error;

      setEnviado(true);
      setForm({ nome: '', email: '', mensagem: '' });
    } catch (err: any) {
      console.error('Erro ao enviar contato:', err);
      setErro('Não foi possível enviar sua mensagem agora. Por favor, tente o WhatsApp.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ===== NAVBAR ===== */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg shadow">
                <GraduationCap className="text-white h-6 w-6" />
              </div>
              <span className="font-bold text-xl text-gray-900 tracking-tight">
                EduGestão <span className="text-indigo-600">Pro</span>
              </span>
            </Link>
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium"
            >
              <ArrowLeft size={16} />
              Voltar ao início
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO da página ===== */}
      <section className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex w-16 h-16 bg-white/10 rounded-2xl items-center justify-center mb-6">
            <MessageSquare size={32} className="text-indigo-300" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Fale com a gente</h1>
          <p className="text-indigo-200 text-xl max-w-2xl mx-auto">
            Tem dúvidas sobre o EduGestão Pro? Quer um plano personalizado para sua rede?
            Nossa equipe responde rápido!
          </p>
        </div>
      </section>

      {/* ===== CONTEÚDO PRINCIPAL ===== */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-start">

            {/* === CANAIS DE CONTATO === */}
            <div className="flex flex-col gap-6">
              <h2 className="text-2xl font-bold text-gray-900">Nossos canais</h2>

              {/* WhatsApp */}
              <a
                id="card-whatsapp"
                href={`https://wa.me/${import.meta.env.VITE_CONTACT_PHONE || '5531989805397'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-5 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                  <Phone size={24} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">WhatsApp</h3>
                  <p className="text-emerald-600 font-semibold text-lg">(31) 98980-5397</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Clique para abrir uma conversa diretamente no WhatsApp.
                  </p>
                </div>
              </a>

              {/* E-mail */}
              <a
                id="card-email"
                href={`mailto:${import.meta.env.VITE_CONTACT_EMAIL || 'atendimento@automacao.tec.br'}`}
                className="group flex items-start gap-5 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
                  <Mail size={24} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">E-mail</h3>
                  <p className="text-indigo-600 font-semibold">{import.meta.env.VITE_CONTACT_EMAIL || 'atendimento@automacao.tec.br'}</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Respondemos em até 1 dia útil.
                  </p>
                </div>
              </a>

              {/* Horário de atendimento */}
              <div className="flex items-start gap-5 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Clock size={24} className="text-orange-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Horário de atendimento</h3>
                  <p className="text-gray-700 font-medium">Segunda a Sexta: 8h às 18h</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Fuso horário de Brasília (UTC-3)
                  </p>
                </div>
              </div>
            </div>

            {/* === FORMULÁRIO DE CONTATO === */}
            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
              {enviado ? (
                // Estado de confirmação
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <CheckCircle2 size={56} className="text-emerald-500 mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Mensagem enviada!</h3>
                  <p className="text-gray-500">
                    Obrigado pelo contato! Nossa equipe analisará sua mensagem e retornará em breve no seu e-mail.
                  </p>
                  <button
                    onClick={() => setEnviado(false)}
                    className="mt-6 text-indigo-600 font-medium hover:underline text-sm"
                  >
                    Enviar outra mensagem
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Envie uma mensagem</h2>
                  <form id="form-contato" onSubmit={handleSubmit} className="flex flex-col gap-5">
                    
                    {erro && (
                      <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
                        {erro}
                      </div>
                    )}

                    {/* Nome */}
                    <div>
                      <label htmlFor="nome" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Nome completo *
                      </label>
                      <input
                        id="nome"
                        type="text"
                        required
                        disabled={carregando}
                        value={form.nome}
                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                        placeholder="Seu nome"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400 text-sm transition-all disabled:opacity-50"
                      />
                    </div>

                    {/* E-mail */}
                    <div>
                      <label htmlFor="email-contato" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        E-mail *
                      </label>
                      <input
                        id="email-contato"
                        type="email"
                        required
                        disabled={carregando}
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="seu@email.com"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400 text-sm transition-all disabled:opacity-50"
                      />
                    </div>

                    {/* Mensagem */}
                    <div>
                      <label htmlFor="mensagem" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Mensagem *
                      </label>
                      <textarea
                        id="mensagem"
                        required
                        disabled={carregando}
                        rows={5}
                        value={form.mensagem}
                        onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                        placeholder="Descreva sua dúvida ou necessidade..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400 text-sm transition-all resize-none disabled:opacity-50"
                      />
                    </div>

                    {/* Botão de envio */}
                    <button
                      id="btn-enviar-contato"
                      type="submit"
                      disabled={carregando}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:bg-indigo-400"
                    >
                      {carregando ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Enviar Mensagem
                        </>
                      )}
                    </button>

                    <p className="text-xs text-gray-400 text-center">
                      Sua mensagem será enviada com segurança para nossa equipe de atendimento.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-950 text-gray-500 py-8 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs">
          <p>© {new Date().getFullYear()} EduGestão Pro · Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
};
