import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Crown, Users, Copy, Check, RotateCcw, Flag, 
  Clock, User, Trophy, Sparkles
} from "lucide-react";

interface ChessGame {
  id: string;
  board: string[][];
  currentTurn: 'white' | 'black';
  whitePlayer: string;
  blackPlayer: string | null;
  status: 'waiting' | 'active' | 'finished';
  winner: string | null;
  moves: string[];
  createdAt: number;
}

interface WilmaChessProps {
  userId: string;
  userName: string;
}

const INITIAL_BOARD = [
  ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
  ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
  ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'],
];

export default function WilmaChess({ userId, userName }: WilmaChessProps) {
  const { toast } = useToast();
  const [game, setGame] = useState<ChessGame | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [gameMode, setGameMode] = useState<'menu' | 'create' | 'join' | 'playing'>('menu');

  // Create new game
  const createGame = () => {
    const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newGame: ChessGame = {
      id: gameId,
      board: JSON.parse(JSON.stringify(INITIAL_BOARD)),
      currentTurn: 'white',
      whitePlayer: userName,
      blackPlayer: null,
      status: 'waiting',
      winner: null,
      moves: [],
      createdAt: Date.now(),
    };
    
    setGame(newGame);
    setGameMode('create');
    
    // Save to localStorage for multiplayer sync
    localStorage.setItem(`chess_game_${gameId}`, JSON.stringify(newGame));
    
    toast({
      title: "Game Created!",
      description: `Share code ${gameId} with your friend`,
    });
  };

  // Join existing game
  const joinGame = () => {
    if (!inviteCode) {
      toast({
        title: "Error",
        description: "Please enter a game code",
        variant: "destructive",
      });
      return;
    }

    const savedGame = localStorage.getItem(`chess_game_${inviteCode.toUpperCase()}`);
    if (!savedGame) {
      toast({
        title: "Game Not Found",
        description: "Invalid game code",
        variant: "destructive",
      });
      return;
    }

    const existingGame: ChessGame = JSON.parse(savedGame);
    if (existingGame.blackPlayer) {
      toast({
        title: "Game Full",
        description: "This game already has 2 players",
        variant: "destructive",
      });
      return;
    }

    existingGame.blackPlayer = userName;
    existingGame.status = 'active';
    setGame(existingGame);
    setGameMode('playing');
    
    localStorage.setItem(`chess_game_${inviteCode.toUpperCase()}`, JSON.stringify(existingGame));
    
    toast({
      title: "Joined Game!",
      description: `Playing as Black against ${existingGame.whitePlayer}`,
    });
  };

  // Copy invite code
  const copyInviteCode = () => {
    if (game) {
      navigator.clipboard.writeText(game.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Game code copied to clipboard",
      });
    }
  };

  // Check if piece belongs to current player
  const isPlayerPiece = (piece: string): boolean => {
    if (!game) return false;
    const myColor = game.whitePlayer === userName ? 'white' : 'black';
    const whitePieces = ['♙', '♖', '♘', '♗', '♕', '♔'];
    const blackPieces = ['♟', '♜', '♞', '♝', '♛', '♚'];
    
    if (myColor === 'white') {
      return whitePieces.includes(piece);
    } else {
      return blackPieces.includes(piece);
    }
  };

  // Handle square click
  const handleSquareClick = (row: number, col: number) => {
    if (!game || game.status !== 'active') return;
    
    const myColor = game.whitePlayer === userName ? 'white' : 'black';
    if (game.currentTurn !== myColor) {
      toast({
        title: "Not Your Turn",
        description: "Wait for your opponent to move",
      });
      return;
    }

    const piece = game.board[row][col];

    if (!selectedSquare) {
      // Select piece
      if (piece && isPlayerPiece(piece)) {
        setSelectedSquare([row, col]);
      }
    } else {
      // Move piece
      const [fromRow, fromCol] = selectedSquare;
      const movingPiece = game.board[fromRow][fromCol];
      
      // Simple move validation (basic rules)
      const newBoard = game.board.map(r => [...r]);
      newBoard[row][col] = movingPiece;
      newBoard[fromRow][fromCol] = '';
      
      const updatedGame = {
        ...game,
        board: newBoard,
        currentTurn: game.currentTurn === 'white' ? 'black' as const : 'white' as const,
        moves: [...game.moves, `${movingPiece} ${String.fromCharCode(97 + fromCol)}${8 - fromRow} → ${String.fromCharCode(97 + col)}${8 - row}`],
      };
      
      setGame(updatedGame);
      setSelectedSquare(null);
      
      // Save to localStorage
      localStorage.setItem(`chess_game_${game.id}`, JSON.stringify(updatedGame));
      
      toast({
        title: "Move Made!",
        description: "Opponent's turn",
      });
    }
  };

  // Reset game
  const resetGame = () => {
    if (game) {
      const resetGame = {
        ...game,
        board: JSON.parse(JSON.stringify(INITIAL_BOARD)),
        currentTurn: 'white' as const,
        moves: [],
        winner: null,
      };
      setGame(resetGame);
      localStorage.setItem(`chess_game_${game.id}`, JSON.stringify(resetGame));
    }
  };

  // Resign
  const resign = () => {
    if (game) {
      const myColor = game.whitePlayer === userName ? 'white' : 'black';
      const winner = myColor === 'white' ? game.blackPlayer : game.whitePlayer;
      const updatedGame = {
        ...game,
        status: 'finished' as const,
        winner,
      };
      setGame(updatedGame);
      localStorage.setItem(`chess_game_${game.id}`, JSON.stringify(updatedGame));
      
      toast({
        title: "Game Over",
        description: `${winner} wins by resignation`,
      });
    }
  };

  // Poll for game updates (simple multiplayer sync)
  useEffect(() => {
    if (!game || gameMode === 'menu') return;

    const interval = setInterval(() => {
      const savedGame = localStorage.getItem(`chess_game_${game.id}`);
      if (savedGame) {
        const updatedGame = JSON.parse(savedGame);
        if (JSON.stringify(updatedGame) !== JSON.stringify(game)) {
          setGame(updatedGame);
          if (updatedGame.status === 'active' && gameMode === 'create') {
            setGameMode('playing');
            toast({
              title: "Opponent Joined!",
              description: `${updatedGame.blackPlayer} has joined the game`,
            });
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game, gameMode]);

  // Render menu
  if (gameMode === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f5f5] to-[#e8e8e8] p-4 flex items-center justify-center">
        <Card className="w-full max-w-md border-2 border-[#003d82] shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Crown className="w-8 h-8" />
              Wilma Chess
              <Sparkles className="w-6 h-6 ml-auto" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <div className="text-center mb-6">
              <p className="text-gray-600">Play chess with your friends!</p>
              <p className="text-sm text-gray-500 mt-2">Hidden feature 🎮</p>
            </div>
            
            <Button
              onClick={createGame}
              className="w-full h-16 text-lg bg-[#003d82] hover:bg-[#0052a3] flex items-center justify-center gap-3"
            >
              <Users className="w-6 h-6" />
              Create New Game
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">OR</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <Input
                placeholder="Enter game code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="h-12 text-center text-lg font-mono"
                maxLength={6}
              />
              <Button
                onClick={joinGame}
                variant="outline"
                className="w-full h-12 text-lg border-2 border-[#003d82] text-[#003d82] hover:bg-[#003d82] hover:text-white"
              >
                Join Game
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render waiting screen
  if (gameMode === 'create' && game && !game.blackPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f5f5] to-[#e8e8e8] p-4 flex items-center justify-center">
        <Card className="w-full max-w-md border-2 border-[#003d82] shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white">
            <CardTitle className="flex items-center gap-3">
              <Clock className="w-6 h-6 animate-pulse" />
              Waiting for Opponent...
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Share this code with your friend:</p>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-[#003d82]">
                <p className="text-4xl font-bold text-[#003d82] tracking-widest font-mono">
                  {game.id}
                </p>
              </div>
            </div>
            
            <Button
              onClick={copyInviteCode}
              className="w-full h-12 bg-[#003d82] hover:bg-[#0052a3]"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 mr-2" />
                  Copy Code
                </>
              )}
            </Button>
            
            <Button
              onClick={() => {
                setGameMode('menu');
                setGame(null);
              }}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render game board
  if (!game) return null;

  const myColor = game.whitePlayer === userName ? 'white' : 'black';
  const isMyTurn = game.currentTurn === myColor;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f5f5] to-[#e8e8e8] p-2 md:p-4">
      <div className="max-w-4xl mx-auto">
        {/* Game Header */}
        <Card className="mb-4 border-2 border-[#003d82]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#003d82] flex items-center gap-2">
                  <Crown className="w-6 h-6" />
                  Wilma Chess
                </h2>
                <p className="text-sm text-gray-600">Game Code: {game.id}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${isMyTurn ? 'text-green-600' : 'text-gray-500'}`}>
                  {isMyTurn ? '🟢 Your Turn' : '⏳ Opponent\'s Turn'}
                </p>
                <p className="text-xs text-gray-500">
                  Playing as {myColor === 'white' ? '⚪ White' : '⚫ Black'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chess Board */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-[#003d82]">
              <CardContent className="p-4">
                <div className="aspect-square w-full max-w-2xl mx-auto">
                  <div className="grid grid-cols-8 gap-0 border-4 border-[#003d82] rounded-lg overflow-hidden shadow-2xl">
                    {game.board.map((row, rowIndex) =>
                      row.map((piece, colIndex) => {
                        const isLight = (rowIndex + colIndex) % 2 === 0;
                        const isSelected = selectedSquare && selectedSquare[0] === rowIndex && selectedSquare[1] === colIndex;
                        
                        return (
                          <button
                            key={`${rowIndex}-${colIndex}`}
                            onClick={() => handleSquareClick(rowIndex, colIndex)}
                            className={`aspect-square flex items-center justify-center text-4xl md:text-5xl transition-all ${
                              isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'
                            } ${isSelected ? 'ring-4 ring-blue-500 ring-inset' : ''} ${
                              isMyTurn && piece && isPlayerPiece(piece) ? 'hover:ring-2 hover:ring-green-400 cursor-pointer' : ''
                            }`}
                            disabled={game.status !== 'active'}
                          >
                            {piece}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game Info */}
          <div className="space-y-4">
            {/* Players */}
            <Card className="border-2 border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Players
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className={`p-3 rounded-lg ${myColor === 'white' ? 'bg-blue-100 border-2 border-blue-300' : 'bg-gray-50'}`}>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    ⚪ {game.whitePlayer}
                    {myColor === 'white' && <span className="text-xs text-blue-600">(You)</span>}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${myColor === 'black' ? 'bg-blue-100 border-2 border-blue-300' : 'bg-gray-50'}`}>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    ⚫ {game.blackPlayer || 'Waiting...'}
                    {myColor === 'black' && <span className="text-xs text-blue-600">(You)</span>}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Moves History */}
            <Card className="border-2 border-green-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Moves ({game.moves.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {game.moves.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">No moves yet</p>
                  ) : (
                    game.moves.map((move, idx) => (
                      <div key={idx} className="text-xs p-2 bg-gray-50 rounded">
                        {idx + 1}. {move}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="border-2 border-orange-200">
              <CardContent className="p-4 space-y-2">
                <Button
                  onClick={resetGame}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Board
                </Button>
                <Button
                  onClick={resign}
                  variant="destructive"
                  className="w-full"
                  size="sm"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Resign
                </Button>
                <Button
                  onClick={() => {
                    setGameMode('menu');
                    setGame(null);
                  }}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  Exit Game
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
