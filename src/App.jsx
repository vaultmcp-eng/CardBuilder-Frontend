import React, { useState, useEffect } from 'react';
import './output.css';
import { Upload, LogOut, Search, Plus, Trash2, ChevronDown, AlertCircle, Send, MessageCircle, X } from 'lucide-react';

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
  const [verificationModal, setVerificationModal] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [cardVersions, setCardVersions] = useState({});
  const [loadingVersions, setLoadingVersions] = useState(null);
  
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

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

  const verifyCardName = async (cardName) => {
    try {
      const response = await fetch(`${API_URL}/verify-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cardName })
      });

      if (!response.ok) throw new Error('Verification failed');

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Card verification error:', err);
      return null;
    }
  };

  const processCardText = async (text) => {
    const cardNames = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const newCards = [];
    const unrecognizedCards = [];

    for (const cardName of cardNames) {
      const verification = await verifyCardName(cardName);

      if (verification?.found) {
        newCards.push({
          name: verification.card.name,
          type: verification.card.type,
          rarity: verification.card.rarity,
          image: verification.card.image,
          setName: verification.card.setName,
          prices: verification.card.prices,
          cardId: verification.card.cardId
        });
      } else if (verification?.suggestions?.length > 0) {
        unrecognizedCards.push({
          input: cardName,
          suggestions: verification.suggestions
        });
      } else {
        unrecognizedCards.push({
          input: cardName,
          suggestions: []
        });
      }
    }

    if (unrecognizedCards.length > 0) {
      setVerificationModal({
        unrecognized: unrecognizedCards,
        recognized: newCards,
        currentIndex: 0
      });
    } else {
      await addCardsToCollection(newCards);
      alert(`Added ${newCards.length} cards to your collection!`);
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
      await processCardText(pasteText);
      setPasteText('');
    } catch (err) {
      setError('Error processing cards: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addCardsToCollection = async (cardsToAdd) => {
    try {
      const response = await fetch(`${API_URL}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cards: cardsToAdd })
      });

      if (!response.ok) throw new Error('Failed to add cards');

      await loadUserCards();
    } catch (err) {
      setError('Error adding cards: ' + err.message);
    }
  };

  const handleVerificationChoice = async (cardIndex, selectedSuggestion) => {
    const modal = verificationModal;
    const unrecognized = modal.unrecognized[cardIndex];

    if (selectedSuggestion) {
      modal.recognized.push({
        name: selectedSuggestion.name,
        image: selectedSuggestion.image
      });
    }

    if (cardIndex + 1 < modal.unrecognized.length) {
      modal.currentIndex = cardIndex + 1;
      setVerificationModal({ ...modal });
    } else {
      setVerificationModal(null);
      await addCardsToCollection(modal.recognized);
      alert(`Added ${modal.recognized.length} cards to your collection!`);
    }
  };

  const getCardVersions = async (cardName, cardId) => {
    if (cardVersions[cardId]) {
      setExpandedCard(expandedCard === cardId ? null : cardId);
      return;
    }

    setLoadingVersions(cardId);
    try {
      const response = await fetch(`${API_URL}/card-versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cardName })
      });

      if (!response.ok) throw new Error('Failed to fetch versions');

      const data = await response.json();
      setCardVersions(prev => ({ ...prev, [cardId]: data.versions }));
      setExpandedCard(cardId);
    } catch (err) {
      setError('Error fetching card versions: ' + err.message);
    } finally {
      setLoadingVersions(null);
    }
  };

  const handleMouseEnter = (card, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.right + 10, y: rect.top });
    setHoveredCard(card);
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
      setError('Error deleting card: ' + err.message);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = {
      role: 'user',
      content: chatInput
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: chatInput,
          cards: cards
        })
      });

      if (!response.ok) throw new Error('Chat failed');

      const data = await response.json();
      const aiMessage = {
        role: 'ai',
        content: data.response
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage = {
        role: 'ai',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  if (authState === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
          body { font-family: 'Poppins', sans-serif; }
        `}</style>
        <div className="w-full max-w-md">
          <div className="relative">
            {/* Glowing background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-2xl opacity-20"></div>
            
            <div className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-black backdrop-blur-xl rounded-2xl p-10 border border-purple-500/30 shadow-2xl">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-block p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg mb-4">
                  <span className="text-2xl">🎮</span>
                </div>
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  CardBuilder
                </h1>
                <p className="text-gray-400 text-sm">Build legendary MTG decks</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-gray-800/50 text-white px-4 py-3 rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
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
                    className="w-full bg-gray-800/50 text-white px-4 py-3 rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg flex gap-3 text-red-300">
                    <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 rounded-lg transition transform hover:scale-105 active:scale-95 duration-200 shadow-lg"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-purple-500/20">
                <p className="text-gray-400 text-sm text-center mb-4">New to CardBuilder?</p>
                <button
                  onClick={() => setAuthState('register')}
                  className="w-full bg-gradient-to-r from-pink-600/20 to-purple-600/20 hover:from-pink-600/30 hover:to-purple-600/30 text-pink-300 font-semibold py-3 rounded-lg transition border border-pink-500/30 hover:border-pink-500/50"
                >
                  Create Account
                </button>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500 rounded-full blur-3xl opacity-5 -z-10"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-500 rounded-full blur-3xl opacity-5 -z-10"></div>
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
          <div className="relative">
            {/* Glowing background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl blur-2xl opacity-20"></div>
            
            <div className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-black backdrop-blur-xl rounded-2xl p-10 border border-purple-500/30 shadow-2xl">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-block p-3 bg-gradient-to-br from-pink-600 to-purple-600 rounded-lg mb-4">
                  <span className="text-2xl">✨</span>
                </div>
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Join CardBuilder
                </h1>
                <p className="text-gray-400 text-sm">Create your deck collection</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-gray-800/50 text-white px-4 py-3 rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
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
                    className="w-full bg-gray-800/50 text-white px-4 py-3 rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
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
                    className="w-full bg-gray-800/50 text-white px-4 py-3 rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
                    placeholder="Min 8 characters"
                    required
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg flex gap-3 text-red-300">
                    <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 rounded-lg transition transform hover:scale-105 active:scale-95 duration-200 shadow-lg"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-purple-500/20">
                <button
                  onClick={() => {
                    setAuthState('login');
                    setError('');
                  }}
                  className="w-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 text-purple-300 font-semibold py-3 rounded-lg transition border border-purple-500/30 hover:border-purple-500/50"
                >
                  Back to Login
                </button>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500 rounded-full blur-3xl opacity-5 -z-10"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500 rounded-full blur-3xl opacity-5 -z-10"></div>
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
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>

        <div className="bg-gray-800 bg-opacity-50 backdrop-blur rounded-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Add Cards to Collection</h2>
          
          <div>
            <h3 className="text-sm font-semibold text-purple-300 mb-2">Paste your cards:</h3>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste your card list here (one card per line)"
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none mb-3"
              rows="6"
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded flex gap-2 text-red-200">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {filteredCards.map((card, idx) => (
            <div key={idx} className="bg-gray-800 bg-opacity-50 backdrop-blur rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3
                    className="font-bold text-lg cursor-pointer hover:text-purple-400 transition"
                    onMouseEnter={(e) => handleMouseEnter(card, e)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {card.name}
                  </h3>
                  <p className="text-gray-400 text-sm">{card.type}</p>
                </div>
                <button
                  onClick={() => deleteCard(idx)}
                  className="text-red-400 hover:text-red-300 transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Rarity:</span>
                  <span className={card.rarity === 'mythic' ? 'text-red-400' : card.rarity === 'rare' ? 'text-yellow-400' : 'text-gray-300'}>
                    {card.rarity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Set:</span>
                  <span>{card.setName}</span>
                </div>
              </div>

              <button
                onClick={() => getCardVersions(card.name, idx)}
                className="w-full bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg flex items-center justify-between transition text-sm mb-4"
              >
                <span>View Versions</span>
                <ChevronDown size={16} className={expandedCard === idx ? 'rotate-180' : ''} />
              </button>

              {loadingVersions === idx && (
                <div className="text-gray-400 text-sm">Loading versions...</div>
              )}

              {expandedCard === idx && cardVersions[idx] && (
                <div className="space-y-2 border-t border-gray-700 pt-3">
                  {cardVersions[idx].map((version, vIdx) => (
                    <div key={vIdx} className="flex gap-2 p-2 bg-gray-700 rounded text-sm">
                      {version.thumbnail && (
                        <img
                          src={version.thumbnail}
                          alt={version.setName}
                          className="w-8 h-12 object-cover rounded"
                          title={version.setName}
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-gray-300">{version.setName}</p>
                        <p className="text-gray-500 text-xs">${version.prices.usd}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredCards.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No cards yet. Paste your card list to get started!</p>
          </div>
        )}

        {hoveredCard && hoveredCard.image && (
          <div
            className="fixed bg-gray-900 border border-purple-500 rounded-lg p-2 pointer-events-none z-50"
            style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
          >
            <img
              src={hoveredCard.image}
              alt={hoveredCard.name}
              className="w-32 h-48 object-cover rounded"
            />
          </div>
        )}

        {verificationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full border border-gray-700">
              <h2 className="text-2xl font-bold mb-4">Verify Card</h2>
              <p className="text-gray-400 mb-4">
                We couldn't find "{verificationModal.unrecognized[verificationModal.currentIndex].input}"
              </p>

              {verificationModal.unrecognized[verificationModal.currentIndex].suggestions.length > 0 ? (
                <div className="space-y-2 mb-6">
                  <p className="text-sm text-gray-300 mb-3">Did you mean:</p>
                  {verificationModal.unrecognized[verificationModal.currentIndex].suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleVerificationChoice(verificationModal.currentIndex, suggestion)}
                      className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-left transition"
                    >
                      {suggestion.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 mb-6">No suggestions found.</p>
              )}

              <button
                onClick={() => handleVerificationChoice(verificationModal.currentIndex, null)}
                className="w-full bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        <div className="fixed bottom-6 right-6 z-40">
          {chatOpen ? (
            <div className="bg-gray-800 border border-purple-500 rounded-lg shadow-lg w-80 flex flex-col h-96">
              <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-purple-600">
                <h3 className="font-bold">MTG AI Assistant</h3>
                <button onClick={() => setChatOpen(false)} className="hover:bg-purple-700 p-1 rounded">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="text-gray-400 text-sm text-center py-8">
                    <p>Ask me anything about your deck!</p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                          msg.role === 'user'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-100'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 text-gray-100 px-4 py-2 rounded-lg text-sm">
                      Thinking...
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-gray-700 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Ask me..."
                  className="flex-1 bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:border-purple-500 focus:outline-none text-sm"
                  disabled={chatLoading}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={chatLoading}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 p-2 rounded transition"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setChatOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg transition transform hover:scale-110"
              title="Chat with MTG AI"
            >
              <MessageCircle size={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MTGDeckBuilder;
