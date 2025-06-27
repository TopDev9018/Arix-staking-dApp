// AR_FRONTEND/src/pages/GamePage.jsx
import React from 'react';
import { Typography, Card, Button, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import './GamePage.css';

const { Title, Text, Paragraph } = Typography;

// The component receives the user and loading state from App.jsx
const GamePage = ({ user, loadingUser }) => {
    const navigate = useNavigate();

    // The balance displayed is now the user's internal game balance, not claimable rewards.
    const gameArixBalance = user ? parseFloat(user.balance || 0).toFixed(2) : '0.00';

    const handleNavigate = (path) => {
        navigate(path);
    };

    return (
        <div className="game-page-container">
            <div className="header-content-wrapper">
                <div className="push-balance-section">
                    <div className="balance-info-box">
                        <div className="balance-amount-line">
                            <div className="balance-icon-wrapper">
                                <span className="balance-icon-representation">♢</span>
                            </div>
                            <Text className="push-balance-amount">
                                {loadingUser ? <Spin size="small" wrapperClassName="balance-spin" /> : gameArixBalance}
                            </Text>
                        </div>
                        <Text className="push-balance-currency">ARIX</Text>
                    </div>
                </div>
            </div>

            <div className="game-page-top-banner">
                <Text className="game-page-top-banner-text">Up to 1000x? Play Plinko Galaxy and find your fortune! →</Text>
            </div>

            <Title level={1} className="game-page-title">Games</Title>
            <Paragraph className="game-page-intro-text">
                Exciting games and generous rewards are waiting for you! Take the first step toward victory!
            </Paragraph>

            <div className="game-card-list">
                {/* --- NEW: Plinko Game Card --- */}
                <Card className="game-card" hoverable onClick={() => handleNavigate('/game/plinko')}>
                    <div className="game-card-row">
                        <div className="game-card-image-section">
                            <img 
                                src="/img/plinko-card-visual.png" // Uses the new SVG icon
                                alt="Plinko Game Visual"
                                onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100/1a1a2e/ffffff?text=Plinko'; }}
                            />
                        </div>
                        <div className="game-card-content-section">
                            <Title level={4} className="game-card-title">Plinko Galaxy</Title>
                            <Paragraph className="game-card-description">
                                Drop the ball and watch it bounce to multipliers up to 1000x!
                            </Paragraph>
                            <Button className="game-card-button">
                                <span className="button-icon-circle"></span>
                                Find your fortune
                                <span className="button-arrow">→</span>
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* --- CoinFlip Card (Your original card) --- */}
                <Card className="game-card" hoverable onClick={() => handleNavigate('/game/coinflip')}>
                    <div className="game-card-row">
                        <div className="game-card-image-section">
                            <img 
                                src="/img/coinflip-card-visual.png" 
                                alt="Coinflip Game Visual"
                                onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100/1a1a2e/ffffff?text=Coin'; }}
                            />
                        </div>
                        <div className="game-card-content-section">
                            <Title level={4} className="game-card-title">Heads or Tails?</Title>
                            <Paragraph className="game-card-description">
                                Make a choice and increase your balance up to x210! Take a risk and win!
                            </Paragraph>
                            <Button className="game-card-button">
                                <span className="button-icon-circle"></span>
                                Test your luck 
                                <span className="button-arrow">→</span>
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* --- Crash Game Card (Your original card) --- */}
                <Card className="game-card" hoverable onClick={() => handleNavigate('/game/crash')}>
                    <div className="game-card-row">
                        <div className="game-card-image-section">
                            <img 
                                src="/img/crash-card-visual.png"
                                alt="Crash Game Visual"
                                onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100/1a1a2e/ffffff?text=Crash'; }}
                            />
                        </div>
                        <div className="game-card-content-section">
                            <Title level={4} className="game-card-title">Crash</Title>
                            <Paragraph className="game-card-description">
                                Cash out before the rocket crashes. The higher the multiplier, the bigger the win!
                            </Paragraph>
                            <Button className="game-card-button">
                                <span className="button-icon-circle"></span>
                                Fly to the moon
                                <span className="button-arrow">→</span>
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default GamePage;

