import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { FaPlane, FaUsers, FaHistory } from 'react-icons/fa';
import { Table, Tabs, Input, Button, Spin, Tag, Empty, Card, Grid, message, Switch } from 'antd';
import { getCrashHistoryForUser } from '../../../services/api';
import './CrashGame.css';

const { useBreakpoint } = Grid;

// Using the FontAwesome icon again for better rotation control
const ChartIcon = () => <FaPlane size={24} className="plane-icon" />;

// Circular Countdown Component to replicate the video's timer
const CircularCountdown = ({ duration }) => {
    const [timeLeft, setTimeLeft] = useState(duration);

    useEffect(() => {
        if (duration <= 0) return;
        setTimeLeft(duration);
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [duration]);

    return (
        <div className="game-countdown-container">
            <svg className="game-countdown-svg" viewBox="0 0 120 120">
                <circle className="game-countdown-bg" cx="60" cy="60" r="54" />
                <circle
                    className="game-countdown-fg"
                    cx="60"
                    cy="60"
                    r="54"
                    style={{ animationDuration: `${duration}s` }}
                />
            </svg>
            <div className="game-countdown-number">{timeLeft}</div>
        </div>
    );
};


// CRASH ANIMATION COMPONENT
const CrashAnimation = ({ gameState }) => {
    const { phase, multiplier, crashPoint } = gameState;
    const [planeStyle, setPlaneStyle] = useState({ bottom: '0%', left: '0%', opacity: 0 });
    const [isExploding, setIsExploding] = useState(false);
    
    const [tracedPath, setTracedPath] = useState([]);
    const containerRef = useRef(null);

    useEffect(() => {
        if (phase === 'WAITING') {
            setIsExploding(false);
            setTracedPath([]); // Clear the traced path for new round
        }

        if (phase === 'RUNNING' && containerRef.current) {
            setIsExploding(false);
            
            const containerWidth = containerRef.current.offsetWidth;
            const containerHeight = containerRef.current.offsetHeight;

            // Define the curve's start, control (for the arc), and end points
            const p0 = { x: containerWidth * 0.05, y: containerHeight * 0.9 }; // Start Point (bottom-left)
            const p1 = { x: containerWidth * 0.45, y: containerHeight * 0.15 }; // Control Point (pulls the curve up)
            const p2 = { x: containerWidth * 0.95, y: containerHeight * 0.05 }; // Logical End Point of the whole curve

            // `t` is the progress along the curve (0.0 to 1.0)
            const t = Math.min(1, Math.log1p(multiplier - 1) / Math.log1p(39)); // Normalize progress towards a goal of 40x

            // Quadratic Bézier curve formula: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
            const currentX = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x;
            const currentY = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y;

            // Calculate plane orientation using curve's tangent
            const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
            const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            // Build traced path progressively - only add points up to current position
            const newTracedPath = [];
            const segments = 50; // Number of segments to sample for smooth path
            for (let i = 0; i <= segments; i++) {
                const segmentT = (i / segments) * t; // Only go up to current t
                const segmentX = (1 - segmentT) ** 2 * p0.x + 2 * (1 - segmentT) * segmentT * p1.x + segmentT ** 2 * p2.x;
                const segmentY = (1 - segmentT) ** 2 * p0.y + 2 * (1 - segmentT) * segmentT * p1.y + segmentT ** 2 * p2.y;
                newTracedPath.push({ x: segmentX, y: segmentY });
            }
            setTracedPath(newTracedPath);

            // Update plane's style
            const newStyle = {
                left: `${currentX}px`,
                top: `${currentY}px`,
                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                opacity: 1,
                transition: 'transform 0.1s linear, top 0.1s linear, left 0.1s linear'
            };
            setPlaneStyle(newStyle);

        } else if (phase === 'CRASHED') {
            setPlaneStyle(prev => ({ ...prev, opacity: 0, transition: 'opacity 0.1s ease-out' }));
            setIsExploding(true);
        } else {
            setIsExploding(false);
            setPlaneStyle({ bottom: '10%', left: '5%', opacity: 0, transform: 'translate(-50%, -50%) rotate(15deg)', transition: 'opacity 0.5s ease-out' });
        }
    }, [phase, multiplier]);

    // Generate SVG path from traced points
    const generatePathString = () => {
        if (tracedPath.length < 2) return '';
        
        let pathString = `M ${tracedPath[0].x},${tracedPath[0].y}`;
        for (let i = 1; i < tracedPath.length; i++) {
            pathString += ` L ${tracedPath[i].x},${tracedPath[i].y}`;
        }
        return pathString;
    };

    const finalMultiplier = (phase === 'CRASHED' && crashPoint) ? crashPoint : multiplier;
    const displayMultiplier = !isNaN(finalMultiplier) ? parseFloat(finalMultiplier).toFixed(2) : "1.00";
    const multiplierColor = phase === 'CRASHED' ? '#e74c3c' : (phase === 'RUNNING' ? '#2ecc71' : 'var(--app-primary-text-light)');

    // MODIFIED: Dynamically add a class to the container during the countdown to trigger the blur effect
    const containerClassName = `crash-chart-container ${phase === 'WAITING' ? 'blur-effect-active' : ''}`;

    return (
        <div className={containerClassName} ref={containerRef}>
            {/* SVG Gradient Definition */}
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <linearGradient id="trail-stroke-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: '#FFC107' }} />
                        <stop offset="100%" style={{ stopColor: '#F44336' }} />
                    </linearGradient>
                </defs>
            </svg>
            
            <div className="parallax-bg layer-1"></div>
            <div className="parallax-bg layer-2"></div>
            <div className="parallax-bg layer-3"></div>
            <div className="chart-grid-overlay"></div>

            {/* Display countdown timer only when waiting */}
            {phase === 'WAITING' && <CircularCountdown duration={5} />}

            {/* Do not show multiplier during countdown */}
            {phase !== 'WAITING' && (
                <div className="multiplier-overlay" style={{ color: multiplierColor }}>
                    {displayMultiplier}x
                    {phase === 'CRASHED' && <span className="crashed-text">CRASHED!</span>}
                </div>
            )}

            <svg className="trail-svg-container">
                <path d={generatePathString()} className="trail-path-line" />
            </svg>

            {!isExploding && <div className="rocket-container" style={planeStyle}><ChartIcon /></div>}

            {isExploding &&
                <div className="explosion-container" style={{ left: planeStyle.left, top: planeStyle.top }}>
                    <div className="shockwave" />
                    <div className="shockwave shockwave-delayed" />
                    <div className="explosion-flash" />
                    {Array.from({ length: 25 }).map((_, i) => <div key={`fire-${i}`} className="fire-particle" style={{ '--i': i, '--delay': `${Math.random() * 0.2}s` }} />)}
                    {Array.from({ length: 30 }).map((_, i) => <div key={`smoke-${i}`} className="smoke-particle" style={{ '--i': i, '--delay': `${0.1 + Math.random() * 0.3}s` }} />)}
                    {Array.from({ length: 20 }).map((_, i) => <div key={`debris-${i}`} className="debris-particle" style={{ '--i': i, '--delay': `${Math.random() * 0.2}s` }} />)}
                </div>
            }
        </div>
    );
};

// Current Bets List Component (unchanged)
const CurrentBetsList = ({ players, myWalletAddress }) => {
    if (!players || players.length === 0) return <Empty description="No players this round." image={Empty.PRESENTED_IMAGE_SIMPLE}/>;
    return(
        <div className="bets-list-container">
            {players.map(player => (
                <div key={player.user_wallet_address} className={`bet-row ${player.user_wallet_address === myWalletAddress ? 'my-bet-row' : ''}`}>
                    <span className="player-address">{player.user_wallet_address.slice(0, 4)}...{player.user_wallet_address.slice(-4)}</span>
                    <span className="bet-amount">{parseFloat(player.bet_amount_arix).toFixed(2)} ARIX</span>
                    {player.status === 'cashed_out'
                        ? <Tag color="green">@{parseFloat(player.cash_out_multiplier).toFixed(2)}x</Tag>
                        : <Tag color="blue">Playing</Tag>
                    }
                </div>
            ))}
        </div>
    );
};

// My Bets History Component (unchanged)
const MyBetsHistory = ({ walletAddress }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchHistory = useCallback(() => {
        if (!walletAddress) { setLoading(false); return; }
        setLoading(true);
        getCrashHistoryForUser(walletAddress)
            .then(res => setHistory(res.data || []))
            .catch(() => message.error("Could not load your bet history"))
            .finally(() => setLoading(false));
    }, [walletAddress]);
    useEffect(() => { fetchHistory() }, [fetchHistory]);
    const columns = [{ title: 'ID', dataIndex: 'game_id', align: 'center'}, { title: 'Bet', dataIndex: 'bet_amount_arix', render: val => parseFloat(val).toFixed(2) }, { title: 'Crashed At', dataIndex: 'crash_multiplier', render: val => `${parseFloat(val).toFixed(2)}x` }, { title: 'Outcome', render: (_, rec) => (rec.status === 'cashed_out' ? <Tag color="green">Won (+{(rec.payout_arix - rec.bet_amount_arix).toFixed(2)})</Tag> : <Tag color="red">Lost</Tag>) }, ];
    if (loading) return <div style={{textAlign: 'center', padding: '20px'}}><Spin /></div>;
    return <Table columns={columns} dataSource={history} pagination={{ pageSize: 5 }} size="small" rowKey="id" />
};

// MAIN CRASH GAME COMPONENT (unchanged)
const CrashGame = () => {
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const userWalletAddress = useTonAddress();
    const [tonConnectUI] = useTonConnectUI();
    const socketRef = useRef(null);

    const [gameState, setGameState] = useState({ phase: 'CONNECTING', multiplier: 1.00, history: [], players: [] });
    const [placingBet, setPlacingBet] = useState(false);
    
    const [betAmount, setBetAmount] = useState("10");
    const [autoCashout, setAutoCashout] = useState("2.0");
    const [isAutoBetting, setIsAutoBetting] = useState(false);
    const [isAutoCashout, setIsAutoCashout] = useState(true);

    const myCurrentBet = useMemo(() => {
        if (!userWalletAddress || !gameState.players) return null;
        return gameState.players.find(p => p.user_wallet_address === userWalletAddress);
    }, [gameState.players, userWalletAddress]);
    
    const sendMessage = (type, payload) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type, payload }));
        }
    };
    const handlePlaceBet = useCallback(() => {
        if (!userWalletAddress) { tonConnectUI.openModal(); return; }
        setPlacingBet(true);
        sendMessage('PLACE_BET', { userWalletAddress, betAmountArix: parseFloat(betAmount) });
    }, [userWalletAddress, betAmount, tonConnectUI]);
    const handleCashOut = useCallback(() => sendMessage('CASH_OUT', { userWalletAddress }), [userWalletAddress]);
    
    useEffect(() => {
        const { VITE_BACKEND_API_URL } = import.meta.env;
        if (!VITE_BACKEND_API_URL) return;
        const host = new URL(VITE_BACKEND_API_URL).host;
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${host}`;

        let isMounted = true;
        const connect = () => {
            if (!isMounted || (socketRef.current && socketRef.current.readyState < 2)) return;
            socketRef.current = new WebSocket(wsUrl);
            socketRef.current.onopen = () => { if (isMounted) setGameState(prev => ({...prev, phase: 'WAITING'})); };
            socketRef.current.onclose = () => {
                if (isMounted) {
                    setGameState(prev => ({...prev, phase: 'CONNECTING'}));
                    setTimeout(connect, 3000);
                }
            };
            socketRef.current.onmessage = (event) => {
                if(!isMounted) return;
                try {
                    const { type, payload } = JSON.parse(event.data);
                    if (type === 'game_update' || type === 'full_state') {
                        setGameState(payload);
                        if (payload.phase === 'WAITING') setPlacingBet(false);
                    } else if (type === 'bet_success' && payload.userWalletAddress === userWalletAddress) {
                         message.success('Bet placed!'); setPlacingBet(false); 
                    } else if (type === 'bet_error' && payload.userWalletAddress === userWalletAddress) {
                         message.error(payload.message, 3); setPlacingBet(false); 
                    } else if (type === 'cashout_success' && payload.userWalletAddress === userWalletAddress) {
                         message.success(`Cashed out for ${payload.payoutArix.toFixed(2)} ARIX!`);
                    }
                } catch(e) { console.error("Error processing message:", e) }
            };
        }
        connect();
        return () => { isMounted = false; socketRef.current?.close(); };
    }, [userWalletAddress]);

    useEffect(() => {
        if (isAutoBetting && gameState.phase === 'WAITING' && !myCurrentBet && !placingBet) {
            handlePlaceBet();
        }
        if(isAutoCashout && myCurrentBet?.status === 'placed' && gameState.phase === 'RUNNING' && gameState.multiplier >= parseFloat(autoCashout)) {
            handleCashOut();
        }
    }, [gameState.phase, gameState.multiplier, isAutoBetting, isAutoCashout, myCurrentBet, placingBet, handlePlaceBet, handleCashOut, autoCashout]);

    const renderButton = () => {
        const hasBet = !!myCurrentBet;
        const hasCashedOut = myCurrentBet?.status === 'cashed_out';
        if (gameState.phase === 'CONNECTING') return <Button className="crash-btn" loading disabled>CONNECTING</Button>;
        if (hasCashedOut) return <Button disabled className="crash-btn cashed-out">Cashed Out @ {myCurrentBet.cash_out_multiplier.toFixed(2)}x</Button>;
        if (gameState.phase === 'RUNNING') {
            if (hasBet) return <Button onClick={handleCashOut} className="crash-btn cashout">Cash Out @ {gameState.multiplier.toFixed(2)}x</Button>;
            return <Button disabled className="crash-btn">Bets Closed</Button>;
        }
        if (gameState.phase === 'WAITING') {
            if (placingBet) return <Button loading className="crash-btn placed">Placing Bet...</Button>;
            if (hasBet) return <Button disabled className="crash-btn placed">Bet Placed</Button>;
            return <Button onClick={handlePlaceBet} className="crash-btn place-bet" disabled={!userWalletAddress}>Place Bet</Button>;
        }
        if (gameState.phase === 'CRASHED' && hasBet) return <Button disabled className="crash-btn crashed">Crashed</Button>;
        return <Button disabled className="crash-btn">Waiting For Next Round...</Button>;
    };

    const tabItems = [
        { key: '1', label: <span><FaUsers/> All Bets</span>, children: <CurrentBetsList players={gameState.players} myWalletAddress={userWalletAddress} /> },
        { key: '2', label: <span><FaHistory/> My History</span>, children: userWalletAddress ? <MyBetsHistory walletAddress={userWalletAddress} /> : <Empty description="Connect wallet to view your history" />},
    ];

    const isBettingDisabled = !!myCurrentBet || isAutoBetting;

    return (
        <div className="crash-game-page-container">
            <div className="history-bar">
                {gameState.history.map((h, i) => (
                    <span key={i} className={`history-item ${h.crash_multiplier < 2 ? 'red' : 'green'}`}>{h.crash_multiplier.toFixed(2)}x</span>
                ))}
            </div>
            <div className="crash-game-area">
                {!isMobile && ( <div className="bets-panel"><Tabs defaultActiveKey="1" items={tabItems} className="game-history-tabs" centered /></div> )}
                <div className="chart-and-controls-panel">
                    <CrashAnimation gameState={gameState} />
                    <Card className="bet-controls-area">
                         <Tabs defaultActiveKey="1" type="card">
                            <Tabs.TabPane tab="Manual" key="1">
                                 <div className="controls-container">
                                    <Input.Group compact>
                                        <Input addonBefore="Bet" type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} disabled={isBettingDisabled} className="bet-input"/>
                                    </Input.Group>
                                     <div className="quick-bet-buttons">
                                        <Button onClick={() => setBetAmount(p => Math.max(1, parseFloat(p)/2).toFixed(2))} disabled={isBettingDisabled}>1/2</Button>
                                        <Button onClick={() => setBetAmount(p => (parseFloat(p)*2).toFixed(2))} disabled={isBettingDisabled}>2x</Button>
                                        <Button onClick={() => setBetAmount(100)} disabled={isBettingDisabled}>100</Button>
                                     </div>
                                     {renderButton()}
                                 </div>
                             </Tabs.TabPane>
                             <Tabs.TabPane tab="Auto" key="2">
                                <div className="controls-container auto-controls-container">
                                    <Input.Group compact>
                                        <Input addonBefore="Base Bet" type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} disabled={isAutoBetting} className="bet-input"/>
                                    </Input.Group>
                                     <div className="auto-cashout-row">
                                        <Input addonBefore="Auto Cashout" addonAfter="x" type="number" value={autoCashout} onChange={e => setAutoCashout(e.target.value)} disabled={isAutoBetting || !isAutoCashout} className="bet-input"/>
                                        <Switch checked={isAutoCashout} onChange={setIsAutoCashout} disabled={isAutoBetting} />
                                    </div>
                                    <Button 
                                      className={`crash-btn ${isAutoBetting ? 'crashed' : 'place-bet'}`} 
                                      onClick={() => setIsAutoBetting(!isAutoBetting)}
                                      disabled={!userWalletAddress || placingBet || !!myCurrentBet}
                                    >
                                      {isAutoBetting ? 'Stop Auto-Bet' : 'Start Auto-Bet'}
                                    </Button>
                                </div>
                            </Tabs.TabPane>
                         </Tabs>
                    </Card>
                </div>
            </div>
             {isMobile && <div className="mobile-tabs-panel"><Tabs defaultActiveKey="1" items={tabItems} className="game-history-tabs" centered /></div>}
        </div>
    );
};

export default CrashGame;