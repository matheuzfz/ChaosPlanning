import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Shield, Crown, Sun, Moon } from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import { Room } from './pages/Room';

/**
 * Página Inicial (Home): apenas o nome do Scrum Master e a criação da sala.
 * Convidados entram diretamente pelo link da sala.
 */
function Home() {
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();

  const [userName, setUserName] = useState(sessionStorage.getItem('chaosplanning_user_name') || '');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Cria a sala via API, guarda o master_token na sessão e entra como Scrum Master
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    const name = userName.trim();
    if (!name) {
      setError('Informe o seu nome para criar a sala.');
      return;
    }

    setIsCreating(true);
    setError('');
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Falha ao criar sala no servidor.');
      }

      const data = await res.json();
      sessionStorage.setItem('chaosplanning_user_name', name);
      sessionStorage.setItem(`chaosplanning_master_${data.room_id}`, data.master_token);
      navigate(`/sala/${data.room_id}`);
    } catch (err) {
      setError(err.message || 'Não foi possível criar a sala. Tente novamente.');
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

        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div>
            <label
              htmlFor="user-name"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1"
            >
              Seu Nome
            </label>
            <input
              id="user-name"
              type="text"
              required
              maxLength={25}
              placeholder="Ex: Matheus, Carol, Dev #1"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <button
            id="create-room-button"
            type="submit"
            disabled={isCreating}
            className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl font-bold text-base text-white bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg transition active:scale-[0.98] disabled:opacity-60"
          >
            <Crown className="w-5 h-5" />
            {isCreating ? 'Criando sala...' : 'Criar Nova Sala (Scrum Master)'}
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400 mt-5">
          Depois de criar, copie o link da sala e envie para a equipe.
        </p>
      </div>
    </div>
  );
}

// Links antigos (/room/:id e /master/:id) redirecionam para a nova rota
function LegacyRoomRedirect() {
  const { roomId } = useParams();
  return <Navigate to={`/sala/${roomId}`} replace />;
}

/**
 * Configuração de Rotas do ChaosPlanning
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sala/:roomId" element={<Room />} />
        <Route path="/room/:roomId" element={<LegacyRoomRedirect />} />
        <Route path="/master/:roomId" element={<LegacyRoomRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
