/**
 * AR_FRONTEND/src/pages/PushPage.jsx
 *
 * This is the fully merged component, combining the original UI and animations
 * with the new, functional deposit and withdrawal logic.
 *
 * REVISIONS:
 * - The original file structure, state management (wheelState, etc.), and UI components have been fully restored.
 * - The data fetching logic now retrieves the entire user profile to get both the in-app `balance` for withdrawals
 * and the user's `walletAddress` for the deposit memo.
 * - The placeholder Top Up Modal content has been replaced with the functional version, showing the deposit
 * address and the required user-specific memo.
 * - The placeholder Cashout Modal content has been replaced with a functional Ant Design form for submitting
 * withdrawals, including validation and loading states.
 * - The header now correctly displays the `balance` (the in-app funds) instead of the `claimableArixRewards`.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Button, Modal, Alert, Spin, message, Input, Form } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
    ArrowDownOutlined,
    ArrowUpOutlined,
    CloseOutlined,
    CopyOutlined,
    InfoCircleOutlined,
    DollarCircleOutlined,
    FireOutlined
} from '@ant-design/icons';
import { useTonAddress } from '@tonconnect/ui-react';
import { getUserProfile, withdrawArix } from '../services/api';

import './PushPage.css';

const { Text, Paragraph } = Typography;

const ArixPushIcon = () => (
    <img src="/img/arix-diamond.png" alt="ARIX" className="push-page-arix-icon" onError={(e) => { e.currentTarget.src = '/img/fallback-icon.png'; }} />
);

// Hot wallet address from environment variables
const HOT_WALLET_ADDRESS = import.meta.env.VITE_HOT_WALLET_ADDRESS || "EQCLU6KIPjZJbhyYlRfENc3nQck2DWulsUq2gJPyWEK9wfDd";

const PushPage = () => {
    const navigate = useNavigate();
    const userWalletAddress = useTonAddress(); // This gives the connected user's address
    const rawAddress = useTonAddress(false); // Non-bounceable version for API calls

    // Original wheel animation state
    const [wheelState, setWheelState] = useState('IDLE_LIT');
    const [showMainBottomSheet, setShowMainBottomSheet] = useState(false);
    const [animatingWheelCenter, setAnimatingWheelCenter] = useState(false);

    // Modal states
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [showCashoutModal, setShowCashoutModal] = useState(false);

    // User data and loading states
    const [profile, setProfile] = useState(null);
    const [loadingBalance, setLoadingBalance] = useState(false);

    // Cashout form and loading
    const [cashoutForm] = Form.useForm();
    const [cashoutLoading, setCashoutLoading] = useState(false);

    // Original animation constants
    const numberOfLines = 72;
    const transitionAnimationDuration = 1200;
    const dialogAppearDelay = 40;

    // Fetch user profile data
    const fetchUserProfile = useCallback(async () => {
        if (rawAddress) {
            setLoadingBalance(true);
            try {
                const profileRes = await getUserProfile(rawAddress);
                setProfile(profileRes.data);
            } catch (error) {
                console.error("Error fetching user profile for Push Page:", error);
                message.error("Could not load user data.");
                setProfile(null);
            } finally {
                setLoadingBalance(false);
            }
        } else {
            setProfile(null);
            setLoadingBalance(false);
        }
    }, [rawAddress]);

    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    // Original wheel press handler
    const handleWheelPress = () => {
        if (wheelState === 'IDLE_LIT') {
            setWheelState('UNFILLING');
            setAnimatingWheelCenter(true);

            setTimeout(() => {
                setWheelState('IDLE_DIM');
                setAnimatingWheelCenter(false);
                setShowMainBottomSheet(true);
            }, transitionAnimationDuration + dialogAppearDelay);
        }
    };

    // Original bottom sheet close handler
    const handleCloseMainBottomSheet = (playCoinflip = false) => {
        setShowMainBottomSheet(false);
        if (wheelState === 'IDLE_DIM') {
            setWheelState('REFILLING');
            setAnimatingWheelCenter(true);

            setTimeout(() => {
                setWheelState('IDLE_LIT');
                setAnimatingWheelCenter(false);
                if (playCoinflip) {
                    navigate('/game');
                }
            }, transitionAnimationDuration);
        } else if (playCoinflip) {
            navigate('/game');
        }
    };

    // Copy to clipboard utility
    const copyToClipboard = (textToCopy) => {
        if (!textToCopy || textToCopy === "YOUR_PROJECT_ARIX_DEPOSIT_WALLET_ADDRESS_HERE") {
            message.error('Deposit address not configured.');
            return;
        }
        navigator.clipboard.writeText(textToCopy)
            .then(() => message.success('Address copied to clipboard!'))
            .catch(err => {
                console.error('Failed to copy: ', err);
                message.error('Failed to copy address.');
            });
    };

    // Handle cashout form submission
    const handleCashout = async (values) => {
        const { amount } = values;
        const recipientAddress = userWalletAddress; // Withdraw to the connected wallet
        
        if (parseFloat(amount) > parseFloat(profile?.balance || 0)) {
            message.error("Withdrawal amount cannot exceed your balance.");
            return;
        }

        setCashoutLoading(true);
        try {
            const result = await withdrawArix({
                userWalletAddress: rawAddress,
                amount: parseFloat(amount),
                recipientAddress
            });
            message.success('Withdrawal initiated successfully!');
            // Refresh user data to show new balance
            await fetchUserProfile();
            setShowCashoutModal(false);
            cashoutForm.resetFields();
        } catch (error) {
            const errorMessage = error.response?.data?.error || "An error occurred during withdrawal.";
            message.error(errorMessage);
            console.error("Cashout failed:", error);
        } finally {
            setCashoutLoading(false);
        }
    };

    // Original wheel container classes logic
    let wheelContainerClasses = "push-wheel-container";
    if (animatingWheelCenter) wheelContainerClasses += " animating-center-pulse";
    wheelContainerClasses += ` state-${wheelState.toLowerCase()}`;

    return (
        <div className="push-page-container" style={{
            '--number-of-lines': numberOfLines,
            '--transition-animation-duration': `${transitionAnimationDuration}ms`
        }}>
            <div className="header-content-wrapper">
                <div className="push-balance-section">
                    <div className="balance-info-box">
                        <div className="balance-amount-line">
                            <div className="balance-icon-wrapper">
                                <span className="balance-icon-representation">♢</span>
                            </div>
                            <Text className="push-balance-amount">
                                {loadingBalance ? <Spin size="small" wrapperClassName="balance-spin" /> : parseFloat(profile?.balance || 0).toFixed(2)}
                            </Text>
                        </div>
                        <Text className="push-balance-currency">ARIX</Text>
                    </div>
                </div>

                <div className="push-top-buttons">
                    <Button className="push-top-button top-up" onClick={() => setShowTopUpModal(true)}>
                        <ArrowDownOutlined /> Top up
                    </Button>
                    <Button className="push-top-button cashout" onClick={() => setShowCashoutModal(true)}>
                        <ArrowUpOutlined /> Cashout
                    </Button>
                </div>
            </div>

            <div className="push-banner-container">
                <div className="push-banner-content">
                    <div className="banner-text">
                        <Text className="banner-title">X2 or maybe x256? Play Coinflip and try your luck! →</Text>
                    </div>
                </div>
            </div>

            <div className="push-wheel-area">
                <div
                    className={wheelContainerClasses}
                    onClick={handleWheelPress}
                    role="button"
                    aria-label="Activate Push Wheel"
                    tabIndex={0}
                    onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') handleWheelPress(); }}
                >
                    <div className="push-wheel-outer-ring">
                        {Array.from({ length: numberOfLines }).map((_, index) => (
                            <div
                                key={index}
                                className="wheel-tick"
                                style={{
                                    transform: `rotate(${index * (360 / numberOfLines)}deg)`,
                                    '--tick-index': index,
                                }}
                            />
                        ))}
                    </div>
                    <div className="push-wheel-center">
                        <div className="wheel-center-icon">
                            <div className="pixel-icon">
                                <div className="pixel-row">
                                    <div className="pixel empty"></div><div className="pixel filled"></div><div className="pixel filled"></div><div className="pixel empty"></div>
                                </div>
                                <div className="pixel-row">
                                    <div className="pixel filled"></div><div className="pixel empty"></div><div className="pixel empty"></div><div className="pixel filled"></div>
                                </div>
                                <div className="pixel-row">
                                    <div className="pixel filled"></div><div className="pixel empty"></div><div className="pixel empty"></div><div className="pixel filled"></div>
                                </div>
                                <div className="pixel-row">
                                    <div className="pixel empty"></div><div className="pixel filled"></div><div className="pixel filled"></div><div className="pixel empty"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Bottom Sheet Modal */}
            <Modal
                open={showMainBottomSheet}
                onCancel={() => handleCloseMainBottomSheet(false)}
                footer={null}
                className="push-bottom-sheet-modal"
                closable={false}
                maskClosable={true}
                destroyOnClose
                wrapClassName="push-bottom-sheet-modal-wrapper"
                maskTransitionName=""
                transitionName=""
            >
                <div className="push-bottom-sheet-content">
                    <div className="bottom-sheet-header-bar">
                        <Text className="bottom-sheet-header-title">Pushing season is over!</Text>
                        <Button
                            shape="circle"
                            icon={<CloseOutlined />}
                            className="close-bottom-sheet-button"
                            onClick={() => handleCloseMainBottomSheet(false)}
                            aria-label="Close"
                        />
                    </div>
                    <Paragraph className="bottom-sheet-text">
                        Terminal Station continues to follow its roadmap.
                    </Paragraph>
                    <div className="bottom-sheet-next-steps">
                        <div className="next-steps-title-container">
                            <FireOutlined />
                            <Text className="next-steps-title-text">Next Steps</Text>
                        </div>
                        <ol className="next-steps-list">
                            <li>New phase</li>
                            <li>Developing existing games and adding new ones to the Game Center</li>
                            <li>Expanding into new markets</li>
                        </ol>
                    </div>
                    <Paragraph className="bottom-sheet-text coinflip-prompt">
                        In the meantime, try your luck in Coinflip! Can you turn your ARIX bet into x256?
                    </Paragraph>
                    <Button type="primary" size="large" block className="play-coinflip-button-sheet" onClick={() => handleCloseMainBottomSheet(true)}>
                        Play Coinflip!
                    </Button>
                </div>
            </Modal>

            {/* Top Up Modal */}
            <Modal
                open={showTopUpModal}
                onCancel={() => setShowTopUpModal(false)}
                footer={null}
                className="push-topup-modal"
                closable={false}
                maskClosable={true}
                centered
                destroyOnClose
                wrapClassName="push-topup-modal-wrapper"
                width={400}
            >
                <div className="push-topup-content">
                    <Button
                        shape="circle"
                        icon={<CloseOutlined />}
                        className="close-topup-button"
                        onClick={() => setShowTopUpModal(false)}
                        aria-label="Close Top up"
                    />
                    <div className="topup-modal-header">
                        <ArixPushIcon />
                        <Text className="topup-modal-title">Balance</Text>
                    </div>
                    <div className="topup-modal-actions">
                        <Button className="push-top-button top-up active">
                            <ArrowDownOutlined /> Top up
                        </Button>
                        <Button className="push-top-button cashout" onClick={() => { setShowTopUpModal(false); setShowCashoutModal(true); }}>
                            <ArrowUpOutlined /> Cashout
                        </Button>
                    </div>
                    <Alert
                        message="Send only ARIX assets to this address"
                        description="Other assets will be irrevocably lost."
                        type="warning"
                        showIcon
                        icon={<InfoCircleOutlined />}
                        className="topup-warning-alert"
                    />
                    <div className="topup-instructions">
                        <Text className="instruction-link" onClick={() => message.info("How it works: Send ARIX to the address below with your wallet address as memo.")}>How it works</Text>
                        <Text className="instruction-link" onClick={() => message.info("Instructions: 1. Copy deposit address 2. Copy your memo 3. Send ARIX with memo")}>Instruction</Text>
                    </div>
                    <Paragraph className="address-label">DEPOSIT ADDRESS</Paragraph>
                    <div className="address-display-box">
                        <Text className="deposit-address-text" copyable={{ text: HOT_WALLET_ADDRESS, tooltips: ['Copy', 'Copied!'] }}>
                            {HOT_WALLET_ADDRESS}
                        </Text>
                    </div>
                    
                    <Paragraph className="address-label" style={{ marginTop: '16px' }}>REQUIRED MEMO / COMMENT</Paragraph>
                    <Alert 
                        message="MEMO IS REQUIRED" 
                        description="You MUST put your wallet address in the transaction's memo/comment field to be credited." 
                        type="error" 
                        showIcon 
                        className="topup-warning-alert" 
                    />
                    <div className="address-display-box">
                        <Text className="deposit-address-text" copyable={{ text: userWalletAddress, tooltips: ['Copy', 'Copied!'] }}>
                            {userWalletAddress || "Connect wallet to see your address"}
                        </Text>
                    </div>

                    <Paragraph className="fee-info-text">
                        A fee of <Text strong>0.05 ARIX</Text> is applied to all deposits. <Text strong>MEMO is required</Text>
                    </Paragraph>
                    <Paragraph className="min-deposit-info">
                        <InfoCircleOutlined /> Deposit minimum <Text strong>1 ARIX</Text>
                    </Paragraph>
                    <Button
                        type="primary"
                        block
                        icon={<CopyOutlined />}
                        className="copy-address-button"
                        onClick={() => copyToClipboard(HOT_WALLET_ADDRESS)}
                    >
                        Copy address
                    </Button>
                </div>
            </Modal>

            {/* Cashout Modal */}
            <Modal
                open={showCashoutModal}
                onCancel={() => setShowCashoutModal(false)}
                footer={null}
                className="push-cashout-modal"
                closable={false}
                maskClosable={true}
                centered
                destroyOnClose
                wrapClassName="push-cashout-modal-wrapper"
                width={400}
            >
                <div className="push-cashout-content">
                    <Button
                        shape="circle"
                        icon={<CloseOutlined />}
                        className="close-cashout-button"
                        onClick={() => setShowCashoutModal(false)}
                        aria-label="Close Cashout"
                    />
                    <div className="cashout-modal-header">
                        <ArixPushIcon />
                        <Text className="cashout-modal-title">Balance</Text>
                    </div>
                    <div className="cashout-modal-actions">
                        <Button className="push-top-button top-up" onClick={() => { setShowCashoutModal(false); setShowTopUpModal(true); }}>
                            <ArrowDownOutlined /> Top up
                        </Button>
                        <Button className="push-top-button cashout active">
                            <ArrowUpOutlined /> Cashout
                        </Button>
                    </div>

                    <div className='cashout-balance-info'>
                        <Text>Available to withdraw:</Text>
                        <Text strong>{loadingBalance ? <Spin size="small" /> : `${parseFloat(profile?.balance || 0).toFixed(2)} ARIX`}</Text>
                    </div>

                    <Form form={cashoutForm} onFinish={handleCashout} layout="vertical" disabled={cashoutLoading}>
                        <Form.Item
                            name="amount"
                            label="Amount to Withdraw"
                            rules={[
                                { required: true, message: 'Please input the amount!' },
                                {
                                    validator: (_, value) => {
                                        if (!value || parseFloat(value) <= 0) {
                                            return Promise.reject(new Error('Amount must be positive'));
                                        }
                                        if (profile && parseFloat(value) > parseFloat(profile.balance)) {
                                            return Promise.reject(new Error('Amount exceeds balance'));
                                        }
                                        return Promise.resolve();
                                    }
                                }
                            ]}
                        >
                            <Input type="number" placeholder="e.g., 100" />
                        </Form.Item>
                        <Form.Item label="Withdrawal Address">
                             <Input value={userWalletAddress} disabled />
                             <Text type="secondary" style={{fontSize: '12px'}}>Funds will be sent to your connected wallet.</Text>
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" block loading={cashoutLoading}>
                                Withdraw ARIX
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            </Modal>
        </div>
    );
};

export default PushPage;