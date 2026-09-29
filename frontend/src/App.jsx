import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Shield, Sparkles, Users, Crown, Sun, Moon } from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import { Room } from './pages/Room';
import { Master } from './pages/Master';

/**
 * Página Inicial (Home): Formulário de identificação e entrada na sala do ChaosPlanning.
 */
function Home() {
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();

  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [pin, setPin] = useState('');
  const [masterToken, setMasterToken] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Entra na sala como jogador regular
  const handleJoinPlayer = (e) => {
    e.preventDefault();
    if (!userName.trim() || !roomId.trim() || !pin.trim()) {
      setError('Por favor, preencha Nome, ID da Sala e o PIN de 4 a 6 dígitos.');
      return;
    }
    setError('');
    navigate(`/room/${roomId.trim()}`, {
      state: { userName: userName.trim(), pin: pin.trim() },
    });
  };

  // Entra no painel como Scrum Master
  const handleJoinMaster = () => {
    if (!userName.trim() || !roomId.trim() || !pin.trim()) {
      setError('Preencha Nome, ID da Sala e PIN para acessar o painel Master.');
      return;
    }
    setError('');
    navigate(`/master/${roomId.trim()}`, {
      state: { userName: userName.trim(), pin: pin.trim(), masterToken: masterToken.trim() },
    });
  };

  // Criação automática de sala via API FastAPI do ChaosPlanning
  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError('');
    try {
      const payload = pin.trim() ? { pin: pin.trim() } : {};
      const res = await fetch('http://localhost:8000/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Falha ao criar sala no servidor.');
      }

      const data = await res.json();
      setRoomId(data.room_id);
      setPin(data.pin);
      setMasterToken(data.master_token);
      alert(`Sala ChaosPlanning criada!\nID: ${data.room_id}\nPIN: ${data.pin}\nMaster Token salvo.`);
    } catch (err) {
      console.warn('Backend indisponível no momento:', err.message);
      // Fallback local caso o backend não esteja ativo
      const mockId = Math.random().toString(36).substring(2, 8);
      const mockPin = Math.floor(1000 + Math.random() * 9000).toString();
      setRoomId(mockId);
      setPin(mockPin);
      setMasterToken('mock_master_token');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Botão de Toggle do Tema */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          aria-label="Alternar tema"
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 shadow-sm hover:scale-105 transition"
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8">
        {/* Cabeçalho do Card */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-3 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent">
            ChaosPlanning
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Planning Poker em tempo real com avatares e baralho interativo
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 text-xs font-medium border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        {/* Formulário de Acesso */}
        <form onSubmit={handleJoinPlayer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Nome do Jogador
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Matheus, Carol, Dev #1"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                ID da Sala
              </label>
              <input
                type="text"
                required
                placeholder="Ex: a1b2c3d4"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                PIN de Acesso
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="4 a 6 dígitos"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg transition active:scale-[0.98]"
            >
              <Users className="w-4 h-4" />
              Entrar na Mesa de Votação
            </button>

            <button
              type="button"
              onClick={handleJoinMaster}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition"
            >
              <Crown className="w-4 h-4 text-amber-500" />
              Acessar como Scrum Master
            </button>
          </div>
        </form>

        {/* Separador */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <span className="relative bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Ou comece uma nova rodada
          </span>
        </div>

        <button
          type="button"
          onClick={handleCreateRoom}
          disabled={isCreating}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-60"
        >
          <Sparkles className="w-4 h-4 text-emerald-500" />
          {isCreating ? 'Criando sala...' : 'Gerar Nova Sala & PIN'}
        </button>
      </div>
    </div>
  );
}

/**
 * Configuração de Rotas do ChaosPlanning
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="/master/:roomId" element={<Master />} />
      </Routes>
    </BrowserRouter>
  );
}
