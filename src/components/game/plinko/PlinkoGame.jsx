import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTonWallet } from '@tonconnect/ui-react';
import { playPlinko } from '../../../services/api';
import { PLINKO_MULTIPLIERS } from '../../../utils/constants';
import { Spin, message } from 'antd';
import './PlinkoGame.css'; // Using the new, revised CSS file

// Using the Matter.js script loaded in index.html, if available
const Matter = window.Matter;

const PlinkoGame = ({ user, setUser, loadingUser }) => {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const renderRef = useRef(null);
    const sceneContainerRef = useRef(null);

    const [betAmount, setBetAmount] = useState('10');
    const [risk, setRisk] = useState('medium');
    const [rows, setRows] = useState(12);
    const [isLoading, setIsLoading] = useState(false);
    const [floatingTexts, setFloatingTexts] = useState([]);
    const [currentMultipliers, setCurrentMultipliers] = useState([]);
    
    const wallet = useTonWallet();

    const getBucketColor = useCallback((multiplier) => {
        if (multiplier < 1) return 'var(--plinko-red)';
        if (multiplier < 2) return 'var(--plinko-orange)';
        if (multiplier < 5) return 'var(--plinko-yellow)';
        if (multiplier < 20) return 'var(--plinko-green)';
        return 'var(--plinko-purple)';
    }, []);

    // Effect to update the visible multiplier bar when settings change
    useEffect(() => {
        if (PLINKO_MULTIPLIERS) {
            setCurrentMultipliers(PLINKO_MULTIPLIERS[rows]?.[risk] || []);
        }
    }, [rows, risk]);

    const setupScene = useCallback(() => {
        if (!Matter || !canvasRef.current || !sceneContainerRef.current || !PLINKO_MULTIPLIERS) return;

        const container = sceneContainerRef.current;
        const width = container.clientWidth;
        // Adjust height to leave space for multiplier bar at the bottom
        const height = container.clientHeight - 60; 

        if (width === 0 || height <= 0) return;

        if (renderRef.current) {
            Matter.Render.stop(renderRef.current);
            if (renderRef.current.runner) Matter.Runner.stop(renderRef.current.runner);
            Matter.World.clear(engineRef.current.world);
            Matter.Engine.clear(engineRef.current);
            if(renderRef.current.canvas) renderRef.current.canvas.remove();
        }

        const engine = Matter.Engine.create({ gravity: { y: 1.2 } });
        const render = Matter.Render.create({
            element: container,
            engine: engine,
            canvas: canvasRef.current,
            options: { width, height, wireframes: false, background: 'transparent' }
        });
        const runner = Matter.Runner.create();
        
        engineRef.current = engine;
        renderRef.current = render;
        render.runner = runner;

        Matter.Render.run(render);
        Matter.Runner.run(runner, engine);

        const world = engine.world;
        const pegRadius = width / (rows * 5);
        const spacingX = width / (rows);
        const spacingY = (height * 0.8) / (rows + 1);

        // Create Pegs
        for (let row = 0; row < rows; row++) {
            const numPegs = row + 2;
            // The vertical offset (row + 1.0) is reduced to move the pyramid up
            const y = spacingY * (row + 1.0);
            for (let i = 0; i < numPegs; i++) {
                const x = (width - (numPegs - 1) * spacingX) / 2 + i * spacingX;
                Matter.World.add(world, Matter.Bodies.circle(x, y, pegRadius, {
                    isStatic: true,
                    restitution: 0.6,
                    friction: 0.1,
                    render: { fillStyle: 'rgba(255, 255, 255, 0.4)', shadowBlur: 10, shadowColor: 'white' },
                    label: 'peg'
                }));
            }
        }
        
        // Create invisible buckets for physics collision, colors are handled by the UI bar
        const multipliers = PLINKO_MULTIPLIERS[rows]?.[risk] || [];
        const bucketWidth = width / (multipliers.length);
        const bucketHeight = 8;
        const bucketY = height - (bucketHeight);

        for (let i = 0; i < multipliers.length; i++) {
            const x = (bucketWidth / 2) + i * bucketWidth;
            const bucket = Matter.Bodies.rectangle(x, bucketY, bucketWidth, bucketHeight * 2, {
                isStatic: true,
                render: { visible: false }, // These are for physics only
                label: `bucket-${i}`
            });
            Matter.World.add(world, bucket);
        }
        
        // Add separators between buckets
        const separatorHeight = bucketHeight * 5;
        const separatorY = height - separatorHeight / 2;
        for (let i = 0; i <= multipliers.length; i++) {
            const x = i * bucketWidth;
            const separator = Matter.Bodies.rectangle(x, separatorY, 4, separatorHeight, {
                isStatic: true,
                render: { fillStyle: '#3a3f6b' }
            });
            Matter.World.add(world, separator);
        }

        const wallOptions = { isStatic: true, render: { visible: false } };
        Matter.World.add(world, [
            Matter.Bodies.rectangle(width / 2, height + 50, width, 100, wallOptions),
            Matter.Bodies.rectangle(-50, height / 2, 100, height, wallOptions),
            Matter.Bodies.rectangle(width + 50, height / 2, 100, height, wallOptions)
        ]);

    }, [rows, risk]);
    
    useEffect(() => {
        const handleResize = () => setupScene();
        setTimeout(setupScene, 100);
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            if (renderRef.current) {
                Matter.Render.stop(renderRef.current);
                if (renderRef.current.runner) Matter.Runner.stop(renderRef.current.runner);
            }
        };
    }, [setupScene]);
    
    const handlePlay = async () => {
        if (isLoading || !wallet?.account?.address) {
            message.error("Please connect your wallet to play.", 2);
            return;
        }
        setIsLoading(true);

        try {
            const { data: result } = await playPlinko({
                userWalletAddress: wallet.account.address,
                betAmount, risk, rows
            });
            
            if(setUser) setUser(result.user);

            const container = sceneContainerRef.current;
            const width = container.clientWidth;
            const ballRadius = Math.max(5, width / (rows * 6));
            const startX = width / 2 + (Math.random() - 0.5) * (width * 0.1);

            const ball = Matter.Bodies.circle(startX, ballRadius, ballRadius, {
                restitution: 0.8,
                friction: 0.05,
                render: {
                    fillStyle: '#fde047',
                    shadowColor: '#fde047',
                    shadowBlur: 20,
                    shadowOffsetX: 0,
                    shadowOffsetY: 0,
                },
                label: `ball-${Date.now()}`
            });

            const multipliers = PLINKO_MULTIPLIERS[rows][risk];
            const bucketWidth = width / multipliers.length;
            const targetX = (bucketWidth / 2) + result.bucketIndex * bucketWidth;
            
            const velocityX = ((targetX - startX) / (rows * 11)) * (risk === 'high' ? 1.05 : 1);
            Matter.Body.setVelocity(ball, { x: velocityX, y: 0 });

            Matter.World.add(engineRef.current.world, ball);

            setTimeout(() => {
                 const newText = {
                    id: Date.now(),
                    text: `${result.multiplier}x`,
                    x: targetX,
                    y: container.clientHeight - 80,
                    color: getBucketColor(result.multiplier)
                };
                setFloatingTexts(prev => [...prev.slice(-5), newText]);
            }, 2000); // Delay popup to match ball landing time

            setTimeout(() => {
                setIsLoading(false);
                if (ball && engineRef.current?.world) {
                   Matter.World.remove(engineRef.current.world, ball);
                }
            }, 5000); // Increased cleanup time

        } catch (error) {
            message.error(error.response?.data?.message || "An error occurred.", 2);
            setIsLoading(false);
        }
    };
    
    return (
        <div className="plinko-galaxy-container">
            <div className="plinko-header">
                <span className="balance-display">
                    {loadingUser ? <Spin size="small" /> : `${parseFloat(user?.balance || 0).toFixed(2)} ARIX`}
                </span>
            </div>
            
            <div ref={sceneContainerRef} className="plinko-game-area">
                <div className="plinko-canvas-container">
                    <canvas ref={canvasRef} />
                </div>
                {floatingTexts.map(ft => (
                    <div 
                        key={ft.id} 
                        className="multiplier-popup" 
                        style={{ 
                            left: `${ft.x}px`, 
                            top: `${ft.y}px`,
                            color: ft.color,
                        }}
                    >
                        {ft.text}
                    </div>
                ))}
                <div className="multiplier-bar">
                    {currentMultipliers.map((m, index) => (
                        <div key={index} className="multiplier-item" style={{ backgroundColor: getBucketColor(m)}}>
                            {m}x
                        </div>
                    ))}
                </div>
            </div>

            <div className="plinko-controls-panel">
                 <div className="control-row">
                    <label>Risk Level</label>
                    <div className="segmented-control">
                        {['low', 'medium', 'high'].map(r => (
                            <button key={r} className={risk === r ? 'active' : ''} onClick={() => !isLoading && setRisk(r)}>{r}</button>
                        ))}
                    </div>
                </div>
                 <div className="control-row">
                    <label>Rows</label>
                    <div className="segmented-control rows">
                        {[8, 10, 12, 14, 16].map(r => (
                            <button key={r} className={rows === r ? 'active' : ''} onClick={() => !isLoading && setRows(r)}>{r}</button>
                        ))}
                    </div>
                </div>
                <div className="control-row">
                    <label>Bet Amount</label>
                    <div className="bet-control">
                        <button onClick={() => setBetAmount(val => String(Math.max(1, parseFloat(val)/2)))} disabled={isLoading}>/2</button>
                        <input className="bet-input" type="number" value={betAmount} onChange={(e) => !isLoading && setBetAmount(e.target.value)} />
                        <button onClick={() => setBetAmount(val => String(parseFloat(val)*2))} disabled={isLoading}>x2</button>
                    </div>
                </div>
                <button className="play-button" onClick={handlePlay} disabled={isLoading || loadingUser}>
                    {isLoading ? <Spin /> : 'Play'}
                </button>
            </div>
        </div>
    );
};

export default PlinkoGame;
