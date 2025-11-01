import React, { useState, useEffect } from 'react';

const MTGDeckBuilder = () => {
  const [authState, setAuthState] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  const [cards, setCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCards, setFilteredCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [pasteText, setPasteText] = useState('');

  const API_URL = 'https://cardbuilder-1.onrender.com/api';

  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`${API_URL}/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.username);
        setAuthState('dashboard');
        loadUserCards();
      } else {
        localStorage.removeItem('token');
        setToken(null);
        setAuthState('login');
      }
    } catch (err) {
      console.error('Token verification failed:', err);
      setAuthState('login');
    }
  };

  useEffect(() => {
    if (searchTerm) {
      const filtered = cards.filter(card =>
        card.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCards(filtered);
    } else {
      setFilteredCards(cards);
    }
  }, [searchTerm, cards]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }

      setError('');
      setAuthState('login');
      setUsername('');
      setPassword('');
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setCurrentUser(data.username);
      setAuthState('dashboard');
      setUsername('');
      setPassword('');
      await loadUserCards();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    setCards([]);
    setAuthState('login');
    setUsername('');
    setPassword('');
  };

  const loadUserCards = async () => {
    try {
      const response = await fetch(`${API_URL}/cards`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to load cards');

      const data = await response.json();
      setCards(data.cards || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePasteText = async () => {
    if (!pasteText.trim()) {
      setError('Please paste your card list first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cardNames = pasteText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const newCards = cardNames.map((name) => ({
        name,
        type: 'Card',
        rarity: 'common',
        image: 'https://via.placeholder.com/100x150?text=' + name.substring(0, 10),
        setName: 'Custom'
      }));

      const response = await fetch(`${API_URL}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cards: newCards })
      });

      if (!response.ok) throw new Error('Failed to add cards');

      await loadUserCards();
      setPasteText('');
      alert(`Added ${newCards.length} cards!`);
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteCard = async (cardId) => {
    try {
      const response = await fetch(`${API_URL}/cards/${cardId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete card');

      await loadUserCards();
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  if (authState === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-800 bg-opacity-50 backdrop-blur rounded-2xl p-10 border border-purple-500 border-opacity-30 shadow-2xl">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              CardBuilder
            </h1>
            <p className="text-gray-400 mb-8 text-sm">Build legendary MTG decks</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-800 bg-opacity-50 text-white px-4 py-3 rounded-lg border border-purple-500 border-opacity-30 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20 transition"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-800 bg-opacity-50 text-white px-4 py-3 rounded-lg border border-purple-500 border-opacity-30 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20 transition"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && (
                <div className="p-4 bg-red-900 bg-opacity-20 border border-red-500 border-opacity-30 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 rounded-lg transition transform hover:scale-105 active:scale-95 duration-200 shadow-lg mt-6"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-purple-500 border-opacity-20">
              <p className="text-gray-400 text-sm text-center mb-4">New to CardBuilder?</p>
              <button
                onClick={() => setAuthState('register')}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 bg-opacity-20 hover:bg-opacity-30 text-pink-300 font-semibold py-3 rounded-lg transition border border-pink-500 border-opacity-30 hover:border-pink-500 hover:border-opacity-50"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authState === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-800 bg-opacity-50 backdrop-blur rounded-2xl p-10 border border-purple-500 border-opacity-30 shadow-2xl">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Create Account
            </h1>
            <p className="text-gray-400 mb-8 text-sm">Join CardBuilder</p>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-800 bg-opacity-50 text-white px-4 py-3 rounded-lg border border-purple-500 border-opacity-30 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20 transition"
                  placeholder="Choose a username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-800 bg-opacity-50 text-white px-4 py-3 rounded-lg border border-purple-500 border-opacity-30 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20 transition"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-800 bg-opacity-50 text-white px-4 py-3 rounded-lg border border-purple-500 border-opacity-30 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20 transition"
                  placeholder="Min 8 characters"
                  required
                />
              </div>

              {error && (
                <div className="p-4 bg-red-900 bg-opacity-20 border border-red-500 border-opacity-30 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 rounded-lg transition transform hover:scale-105 active:scale-95 duration-200 shadow-lg mt-6"
              >
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-purple-500 border-opacity-20">
              <button
                onClick={() => {
                  setAuthState('login');
                  setError('');
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 bg-opacity-20 hover:bg-opacity-30 text-purple-300 font-semibold py-3 rounded-lg transition border border-purple-500 border-opacity-30 hover:border-purple-500 hover:border-opacity-50"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              CardBuilder
            </h1>
            <p className="text-gray-400">Welcome, <span className="font-semibold">{currentUser}</span></p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition"
          >
            Logout
          </button>
        </div>

        <div className="bg-gray-800 bg-opacity-50 backdrop-blur rounded-lg p-6 mb-6 border border-purple-500 border-opacity-30">
          <h2 className="text-xl font-bold mb-4">Add Cards to Collection</h2>
          
          <div>
            <h3 className="text-sm font-semibold text-purple-300 mb-2">Paste your cards:</h3>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste your card list here (one card per line)"
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none mb-3 h-32"
            />
            <button
              onClick={handlePasteText}
              disabled={loading}
              className="bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 px-6 py-2 rounded-lg transition"
            >
              {loading ? 'Processing...' : 'Add Cards from Paste'}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search cards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 text-white pl-4 pr-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
          />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((card, idx) => (
            <div key={idx} className="bg-gray-800 bg-opacity-50 backdrop-blur rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{card.name}</h3>
                  <p className="text-gray-400 text-sm">{card.type}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Rarity:</span>
                  <span>{card.rarity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Set:</span>
                  <span>{card.setName}</span>
                </div>
              </div>

              <button
                onClick={() => deleteCard(idx)}
                className="w-full bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg transition text-sm text-red-300"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {filteredCards.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No cards yet. Paste your card list to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MTGDeckBuilder;
