import React, { useState, useEffect, useRef } from 'react';
import { Play, Trophy, Book, RotateCcw, Star, Zap, Target } from 'lucide-react';

const HangmanGame = () => {
  const [gameState, setGameState] = useState('menu'); // 'menu', 'difficulty', 'playing', 'won', 'lost'
  const [difficulty, setDifficulty] = useState('easy');
  const [currentWord, setCurrentWord] = useState('');
  const [guessedLetters, setGuessedLetters] = useState(new Set());
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState({ easy: 0, medium: 0, hard: 0 });
  const [wordDefinition, setWordDefinition] = useState({ meaning: '', usage: '' });
  const [isLoadingWord, setIsLoadingWord] = useState(false);
  const [loadingError, setLoadingError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  const MAX_WRONG_GUESSES = 6;

  // Fallback word lists in case API fails
  const fallbackWordLists = {
    easy: ['CAT', 'DOG', 'SUN', 'BOOK', 'TREE', 'HOUSE', 'WATER', 'HAPPY', 'MUSIC', 'SMILE'],
    medium: ['ELEPHANT', 'COMPUTER', 'RAINBOW', 'BICYCLE', 'KITCHEN', 'JOURNEY', 'MYSTERY', 'FREEDOM', 'COURAGE', 'SYMPHONY'],
    hard: ['QUIZZICAL', 'BYZANTINE', 'EPHEMERAL', 'SERENDIPITY', 'PERSPICACIOUS', 'OBFUSCATE', 'MELLIFLUOUS', 'QUINTESSENTIAL', 'SURREPTITIOUS', 'MAGNANIMOUS']
  };

  // Fetch word from online API
  const fetchRandomWord = async (difficulty) => {
    setIsLoadingWord(true);
    setLoadingError('');

    try {
      // First, get a random word based on difficulty
      let word;
      const minLength = { easy: 3, medium: 6, hard: 8 }[difficulty];
      const maxLength = { easy: 5, medium: 8, hard: 15 }[difficulty];
      
      // Using wordnik API for random words
      const wordResponse = await fetch(
        `https://api.wordnik.com/v4/words.json/randomWord?hasDictionaryDef=true&minCorpusCount=1000&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=${minLength}&maxLength=${maxLength}&api_key=a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5`
      );
      
      if (!wordResponse.ok) {
        throw new Error('Word API failed');
      }
      
      const wordData = await wordResponse.json();
      word = wordData.word.toUpperCase();

      // Then get the definition
      const definitionResponse = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`
      );
      
      let meaning = '';
      let usage = '';
      
      if (definitionResponse.ok) {
        const definitionData = await definitionResponse.json();
        const entry = definitionData[0];
        
        if (entry && entry.meanings && entry.meanings[0]) {
          const firstMeaning = entry.meanings[0];
          meaning = firstMeaning.definitions[0]?.definition || 'Definition not available';
          usage = firstMeaning.definitions[0]?.example || `The word "${word.toLowerCase()}" can be used in various contexts.`;
        }
      } else {
        // Fallback to a simpler definition API
        const fallbackResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          meaning = data[0]?.meanings?.[0]?.definitions?.[0]?.definition || 'A word in the English language';
          usage = data[0]?.meanings?.[0]?.definitions?.[0]?.example || `Example usage of "${word.toLowerCase()}" in a sentence.`;
        } else {
          meaning = 'A word in the English language';
          usage = `Example usage of "${word.toLowerCase()}" in a sentence.`;
        }
      }

      setCurrentWord(word);
      setWordDefinition({ meaning, usage });
      
    } catch (error) {
      console.error('API Error:', error);
      // Fallback to local word list
      const fallbackWords = fallbackWordLists[difficulty];
      const randomWord = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
      
      setCurrentWord(randomWord);
      setWordDefinition({
        meaning: 'Definition will be available when online',
        usage: `The word "${randomWord.toLowerCase()}" is commonly used in English.`
      });
      setLoadingError('Using offline words - connect to internet for full definitions');
    } finally {
      setIsLoadingWord(false);
    }
  };

  // Load high scores from memory on component mount
  useEffect(() => {
    const stored = { easy: 0, medium: 0, hard: 0 };
    setHighScores(stored);
    
    // Detect if mobile device
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                           window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Save high scores to memory when they change
  useEffect(() => {
    // In a real app, you'd save to localStorage here
    // For Claude artifacts, we just keep in memory
  }, [highScores]);

  const selectDifficulty = async (level) => {
    setDifficulty(level);
    setGameState('playing');
    await startNewGame(level);
  };

  const startNewGame = async (level = difficulty) => {
    await fetchRandomWord(level);
    setGuessedLetters(new Set());
    setWrongGuesses(0);
    setGameState('playing');
  };

  const makeGuess = (letter) => {
    if (guessedLetters.has(letter) || gameState !== 'playing') return;

    const newGuessedLetters = new Set(guessedLetters).add(letter);
    setGuessedLetters(newGuessedLetters);

    if (!currentWord.includes(letter)) {
      const newWrongGuesses = wrongGuesses + 1;
      setWrongGuesses(newWrongGuesses);
      
      if (newWrongGuesses >= MAX_WRONG_GUESSES) {
        setGameState('lost');
        return;
      }
    }

    // Check if word is complete
    const isComplete = currentWord.split('').every(char => newGuessedLetters.has(char));
    if (isComplete) {
      const points = calculateScore();
      setScore(prev => prev + points);
      
      // Update high score
      if (score + points > highScores[difficulty]) {
        setHighScores(prev => ({ ...prev, [difficulty]: score + points }));
      }
      
      setGameState('won');
    }
  };

  const calculateScore = () => {
    const baseScore = { easy: 10, medium: 20, hard: 40 }[difficulty];
    const lengthBonus = currentWord.length * 2;
    const wrongPenalty = wrongGuesses * 5;
    const timeBonus = Math.max(0, 20 - wrongGuesses * 2);
    
    return Math.max(5, baseScore + lengthBonus - wrongPenalty + timeBonus);
  };

  const getDisplayWord = () => {
    return currentWord.split('').map(letter => 
      guessedLetters.has(letter) ? letter : '_'
    ).join(' ');
  };

  const drawHangman = () => {
    const parts = [
      '  +---+',
      '  |   |',
      wrongGuesses > 0 ? '  |   O' : '  |    ',
      wrongGuesses > 2 ? '  |  /|\\' : wrongGuesses > 1 ? '  |   |' : '  |    ',
      wrongGuesses > 4 ? '  |  / \\' : '  |    ',
      '  |',
      '=========',
    ];
    
    return parts.join('\n');
  };

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const getDifficultyColor = (level) => {
    switch (level) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyIcon = (level) => {
    switch (level) {
      case 'easy': return <Star className="w-5 h-5" />;
      case 'medium': return <Zap className="w-5 h-5" />;
      case 'hard': return <Target className="w-5 h-5" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl overflow-hidden max-w-lg w-full">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-black">
              <Book className="w-6 h-6" />
              Hangman
            </h1>
            <div className="text-right">
              <div className="text-sm opacity-80">Score</div>
              <div className="font-mono text-lg">{score}</div>
            </div>
          </div>
        </div>

        {/* High Scores */}
        <div className="bg-gray-100 p-3">
          <div className="flex justify-between text-sm text-black">
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-green-500" />
              <span className="text-black">Easy: {highScores.easy}</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-black">Medium: {highScores.medium}</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-red-500" />
              <span className="text-black">Hard: {highScores.hard}</span>
            </div>
          </div>
        </div>

        {/* Game Content */}
        <div className="p-6">
          
          {/* Menu Screen */}
          {gameState === 'menu' && (
            <div className="text-center text-black">
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-3xl font-bold mb-4 text-black">Welcome to Hangman!</h2>
              <p className="text-black mb-6">
                Guess the word letter by letter.<br/>
                Choose your difficulty level to start!
              </p>
              <button
                onClick={() => setGameState('difficulty')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 mx-auto transition-colors"
              >
                <Play className="w-5 h-5" />
                Start Game
              </button>
            </div>
          )}

          {/* Difficulty Selection */}
          {gameState === 'difficulty' && (
            <div className="text-center text-black">
              <h2 className="text-2xl font-bold mb-6 text-black">Choose Difficulty</h2>
              <div className="space-y-4">
                {['easy', 'medium', 'hard'].map((level) => (
                  <button
                    key={level}
                    onClick={() => selectDifficulty(level)}
                    className={`w-full ${getDifficultyColor(level)} hover:opacity-80 text-white px-6 py-4 rounded-lg font-bold flex items-center gap-3 transition-opacity`}
                  >
                    {getDifficultyIcon(level)}
                    <div className="flex-1 text-left">
                      <div className="text-lg capitalize">{level}</div>
                      <div className="text-sm opacity-80">
                        {level === 'easy' && '3-5 letters • Simple words'}
                        {level === 'medium' && '6-8 letters • Common words'}
                        {level === 'hard' && '8+ letters • Advanced vocabulary'}
                      </div>
                    </div>
                    <div className="text-sm">
                      Best: {highScores[level]}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setGameState('menu')}
                className="mt-4 text-gray-500 hover:text-gray-700 underline"
              >
                Back to Menu
              </button>
            </div>
          )}

          {/* Playing Screen */}
          {gameState === 'playing' && (
            <div className="text-black">
              {/* Loading State */}
              {isLoadingWord && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Fetching a new word...</p>
                </div>
              )}

              {/* Error Message */}
              {loadingError && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                  {loadingError}
                </div>
              )}

              {!isLoadingWord && currentWord && (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <span className={`px-3 py-1 rounded-full text-white text-sm capitalize ${getDifficultyColor(difficulty)}`}>
                      {difficulty}
                    </span>
                    <span className="text-gray-600">
                      Wrong: {wrongGuesses}/{MAX_WRONG_GUESSES}
                    </span>
                  </div>

                  {/* Hangman Drawing */}
                  <div className="bg-gray-100 p-4 rounded-lg mb-6">
                    <pre className="text-center font-mono text-sm leading-tight">
                      {drawHangman()}
                    </pre>
                  </div>

                  {/* Current Word */}
                  <div className="text-center mb-6">
                    <div className="text-3xl font-mono font-bold tracking-wider mb-2 text-black">
                      {getDisplayWord()}
                    </div>
                    <div className="text-black">
                      {currentWord.length} letters
                    </div>
                  </div>

                  {/* Alphabet */}
                  <div className="grid grid-cols-6 sm:grid-cols-7 gap-2 mb-4">
                    {alphabet.map(letter => (
                      <button
                        key={letter}
                        onClick={() => makeGuess(letter)}
                        disabled={guessedLetters.has(letter)}
                        className={`aspect-square rounded-lg font-bold text-sm transition-colors ${
                          guessedLetters.has(letter)
                            ? currentWord.includes(letter)
                              ? 'bg-green-500 text-white'
                              : 'bg-red-500 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-black'
                        }`}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setGameState('menu')}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded flex items-center justify-center gap-2 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Menu
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Won Screen */}
          {gameState === 'won' && (
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold mb-4 text-green-600">You Won!</h2>
              <div className="text-xl mb-2 text-gray-600">The word was: <strong>{currentWord}</strong></div>
              <div className="text-lg mb-4 text-gray-600">You earned {calculateScore()} points!</div>
              
              {/* Definition */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6 text-left">
                <h3 className="font-bold text-blue-800 mb-2">📖 Definition & Usage</h3>
                <p className="text-blue-700 mb-2">
                  <strong>Meaning:</strong> {wordDefinition.meaning}
                </p>
                <p className="text-blue-600 italic">
                  <strong>Example:</strong> "{wordDefinition.usage}"
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => startNewGame()}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                >
                  Next Word ({difficulty})
                </button>
                <button
                  onClick={() => setGameState('difficulty')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                >
                  Change Difficulty
                </button>
                <button
                  onClick={() => setGameState('menu')}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                >
                  Main Menu
                </button>
              </div>
            </div>
          )}

          {/* Lost Screen */}
          {gameState === 'lost' && (
            <div className="text-center">
              <div className="text-6xl mb-4">😵</div>
              <h2 className="text-3xl font-bold mb-4 text-red-600">Game Over!</h2>
              <div className="text-xl mb-2 text-gray-600">The word was: <strong>{currentWord}</strong></div>
              
              {/* Definition */}
              <div className="bg-red-50 p-4 rounded-lg mb-6 text-left">
                <h3 className="font-bold text-red-800 mb-2">📖 Learn the Word</h3>
                <p className="text-red-700 mb-2">
                  <strong>Meaning:</strong> {wordDefinition.meaning}
                </p>
                <p className="text-red-600 italic">
                  <strong>Example:</strong> "{wordDefinition.usage}"
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => startNewGame()}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                >
                  Try Again ({difficulty})
                </button>
                <button
                  onClick={() => setGameState('difficulty')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                >
                  Change Difficulty
                </button>
                <button
                  onClick={() => setGameState('menu')}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                >
                  Main Menu
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HangmanGame;