import React, { useState, useEffect, useCallback } from 'react';
import {
    Typography, Tabs, message, Spin, Button, Grid, Card, Modal, Alert, Empty, Select,
    Divider, Row, Col, Descriptions, List, Tooltip, Radio, Statistic as AntdStatistic, Form, Input
} from 'antd';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { useNavigate } from 'react-router-dom';
import {
    UserOutlined, WalletOutlined, LinkOutlined, HistoryOutlined, ExperimentOutlined, RedoOutlined,
    ArrowDownOutlined, ArrowUpOutlined, CopyOutlined, ShareAltOutlined, UsergroupAddOutlined,
    DollarCircleOutlined, RiseOutlined, SettingOutlined, GlobalOutlined, SoundOutlined,
    TeamOutlined, InfoCircleOutlined, LogoutOutlined, PaperClipOutlined, SendOutlined as InviteIcon,
    UserSwitchOutlined, CloseOutlined
} from '@ant-design/icons';

import UserProfileCard from '../components/user/UserProfileCard';
import TransactionList, { renderStakeHistoryItem, renderCoinflipHistoryItem } from '../components/user/TransactionList';
import {
    getUserProfile, getUserStakesAndRewards, getCoinflipHistoryForUser, getUserReferralData,
    getReferralProgramDetails, initiateArixUnstake, confirmArixUnstake, withdrawArix
} from '../services/api';
import { getArxUsdtPriceFromBackend } from '../services/priceServiceFrontend';
import { toNano, Cell } from '@ton/core';
import { waitForTransactionConfirmation, REFERRAL_LINK_BASE, USDT_DECIMALS, ARIX_DECIMALS } from '../utils/tonUtils';
import './UserPage.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

// --- REUSABLE COMPONENTS & UTILITIES ---

const ArixPushIcon = () => (
    <img src="/img/arix-diamond.png" alt="ARIX" className="push-page-arix-icon" onError={(e) => { e.currentTarget.src = '/img/fallback-icon.png'; }} />
);

const HOT_WALLET_ADDRESS = import.meta.env.VITE_HOT_WALLET_ADDRESS;

const copyToClipboard = (textToCopy, successMessage = 'Copied to clipboard!') => {
    if (!textToCopy) {
        message.error('Nothing to copy.');
        return;
    }
    navigator.clipboard.writeText(textToCopy)
        .then(() => message.success(successMessage))
        .catch(err => {
            console.error('Failed to copy: ', err);
            message.error('Failed to copy.');
        });
};


const UserPage = () => {
    // --- STATE MANAGEMENT ---
    const userFriendlyAddress = useTonAddress();
    const rawAddress = useTonAddress(false);
    const [tonConnectUI] = useTonConnectUI();
    const navigate = useNavigate();
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    // Data State
    const [userProfile, setUserProfile] = useState(null);
    const [referralData, setReferralData] = useState(null);
    const [programDetails, setProgramDetails] = useState({ message: '', plans: [] });
    const [stakesAndRewards, setStakesAndRewards] = useState({ stakes: [], totalClaimableUsdt: '0.00', totalClaimableArix: '0.00' });
    const [coinflipHistory, setCoinflipHistory] = useState([]);
    const [currentArxPrice, setCurrentArxPrice] = useState(null);

    // Loading State
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [loadingReferral, setLoadingReferral] = useState(true);
    const [loadingProgramDetails, setLoadingProgramDetails] = useState(true);
    const [loadingStakes, setLoadingStakes] = useState(true);
    const [loadingGames, setLoadingGames] = useState(true);

    // UI/Interaction State
    const [activeTabKey, setActiveTabKey] = useState('referral_stats');
    const [language, setLanguage] = useState('en');
    const [colorTheme, setColorTheme] = useState('terminal');
    const [sound, setSound] = useState('on');

    // Unstake Modal State
    const [isUnstakeModalVisible, setIsUnstakeModalVisible] = useState(false);
    const [selectedStakeForUnstake, setSelectedStakeForUnstake] = useState(null);
    const [unstakePrepDetails, setUnstakePrepDetails] = useState(null);
    const [isUnstakeActionLoading, setIsUnstakeActionLoading] = useState(false);
    const [stakeToSelectForUnstakeId, setStakeToSelectForUnstakeId] = useState(undefined);

    // TopUp/Cashout Modal State
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [showCashoutModal, setShowCashoutModal] = useState(false);
    const [cashoutForm] = Form.useForm();
    const [cashoutLoading, setCashoutLoading] = useState(false);

    // --- DATA FETCHING ---
    const fetchAllUserData = useCallback(async (showMessages = false) => {
        if (!rawAddress) {
            setUserProfile(null); setReferralData(null); setProgramDetails({ message: '', plans: [] });
            setStakesAndRewards({ stakes: [], totalClaimableUsdt: '0.00', totalClaimableArix: '0.00' });
            setCoinflipHistory([]); setCurrentArxPrice(null);
            setLoadingProfile(false); setLoadingReferral(false); setLoadingProgramDetails(false);
            setLoadingStakes(false); setLoadingGames(false);
            return;
        }

        setLoadingProfile(true); setLoadingReferral(true); setLoadingProgramDetails(true);
        setLoadingStakes(true); setLoadingGames(true);
        const loadingKey = 'fetchAllUserDataUserPage';
        if (showMessages) message.loading({ content: 'Refreshing all data...', key: loadingKey, duration: 0 });

        try {
            const tgLaunchParams = new URLSearchParams(window.location.search);
            const refCodeFromUrl = tgLaunchParams.get('ref') || localStorage.getItem('arixReferralCode');
            
            const profilePromise = getUserProfile(rawAddress, {
                telegram_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
                username: window.Telegram?.WebApp?.initDataUnsafe?.user?.username,
                referrer: refCodeFromUrl
            });
            const referralPromise = getUserReferralData(rawAddress);
            const programDetailsPromise = getReferralProgramDetails();
            const stakesPromise = getUserStakesAndRewards(rawAddress);
            const gamesPromise = getCoinflipHistoryForUser(rawAddress);
            const pricePromise = getArxUsdtPriceFromBackend();

            const [profileRes, referralRes, programRes, stakesRes, gamesRes, priceRes] = await Promise.all([
                profilePromise, referralPromise, programDetailsPromise, stakesPromise, gamesPromise, pricePromise
            ]);

            setUserProfile(profileRes.data);
            setReferralData(referralRes.data);
            setProgramDetails(programRes.data || { message: 'Details unavailable.', plans: [] });
            setStakesAndRewards({
                stakes: stakesRes.data?.stakes || [],
                totalClaimableUsdt: stakesRes.data?.totalClaimableUsdt || '0.00',
                totalClaimableArix: stakesRes.data?.totalClaimableArix || '0.00'
            });
            setCoinflipHistory(gamesRes.data || []);
            setCurrentArxPrice(priceRes);

            if (showMessages) message.success({ content: "All data refreshed!", key: loadingKey, duration: 2 });
            else message.destroy(loadingKey);

        } catch (error) {
            if (showMessages) message.error({ content: error?.response?.data?.message || "Failed to refresh some data.", key: loadingKey, duration: 3 });
            else message.destroy(loadingKey);
        } finally {
            setLoadingProfile(false); setLoadingReferral(false); setLoadingProgramDetails(false);
            setLoadingStakes(false); setLoadingGames(false);
        }
    }, [rawAddress]);

    useEffect(() => {
        fetchAllUserData();
    }, [fetchAllUserData]);

    const handleRefreshAllData = () => {
        fetchAllUserData(true);
    };

    // --- EVENT HANDLERS ---
    const handleCashout = async (values) => {
        const { amount } = values;
        if (parseFloat(amount) > parseFloat(userProfile?.balance || 0)) {
            message.error("Withdrawal amount cannot exceed your balance.");
            return;
        }
        setCashoutLoading(true);
        try {
            await withdrawArix({
                userWalletAddress: rawAddress,
                amount: parseFloat(amount),
                recipientAddress: userFriendlyAddress // The API sends it back to the connected wallet
            });
            message.success('Withdrawal initiated successfully!');
            await fetchAllUserData(true); // Refresh all data
            setShowCashoutModal(false);
            cashoutForm.resetFields();
        } catch (error) {
            message.error(error.response?.data?.error || "An error occurred during withdrawal.");
        } finally {
            setCashoutLoading(false);
        }
    };

    const shareUserReferralLink = () => {
        const linkToShare = referralData?.referralLink || `${REFERRAL_LINK_BASE}?ref=${referralData?.referralCode || rawAddress}`;
        if (!linkToShare) {
            message.warn('Referral link not available yet.');
            return;
        }
        if (navigator.share) {
            navigator.share({
                title: 'Join ARIX Terminal!',
                text: `Join me on ARIX Terminal to stake ARIX, earn USDT rewards, and play games! Use my referral link: ${linkToShare}`,
                url: linkToShare,
            }).catch(() => copyToClipboard(linkToShare, 'Link copied for manual sharing.'));
        } else {
            copyToClipboard(linkToShare, 'Referral link copied! Share it with your friends.');
        }
    };

    const handleTabChange = (key) => setActiveTabKey(key);
    
    // --- UNSTAKE LOGIC ---
    const activeUserStakes = stakesAndRewards.stakes.filter(s => s.status === 'active');

    const initiateUnstakeProcessFromCardOrList = (stakeToUnstake = null) => {
        if (activeUserStakes.length === 0) {
            message.info("You have no active stakes to unstake.");
            return;
        }
        if (stakeToUnstake) prepareForUnstakeModal(stakeToUnstake);
        else if (activeUserStakes.length === 1) prepareForUnstakeModal(activeUserStakes[0]);
        else {
            setSelectedStakeForUnstake(null); setStakeToSelectForUnstakeId(undefined);
            setUnstakePrepDetails(null); setIsUnstakeModalVisible(true);
        }
    };

    const prepareForUnstakeModal = async (stake) => {
        if (!rawAddress || !stake) return;
        setSelectedStakeForUnstake(stake); setIsUnstakeActionLoading(true);
        message.loading({ content: 'Preparing unstake...', key: 'prepUnstakeUser', duration: 0 });
        try {
            const response = await initiateArixUnstake({ userWalletAddress: rawAddress, stakeId: stake.id });
            setUnstakePrepDetails(response.data); setIsUnstakeModalVisible(true);
            message.destroy('prepUnstakeUser');
        } catch (error) {
            message.error({ content: error?.response?.data?.message || "Failed to prepare unstake.", key: 'prepUnstakeUser', duration: 3 });
            setSelectedStakeForUnstake(null);
        } finally {
            setIsUnstakeActionLoading(false);
        }
    };

    const handleModalUnstakeSelectionChange = (stakeId) => {
        const stake = activeUserStakes.find(s => s.id === stakeId);
        if (stake) { setStakeToSelectForUnstakeId(stakeId); prepareForUnstakeModal(stake); }
    };

    const handleConfirmUnstakeInModal = async () => {
        if (!rawAddress || !selectedStakeForUnstake || !unstakePrepDetails || !tonConnectUI) return;
        setIsUnstakeActionLoading(true);
        message.loading({ content: 'Confirming unstake in wallet...', key: 'confirmUnstakeUser', duration: 0 });
        try {
            const scStakeId = selectedStakeForUnstake.id.replace(/-/g, '').substring(0, 16);
            const payload = new Cell().asBuilder().storeUint(BigInt(Date.now()), 64).storeUint(BigInt('0x' + scStakeId), 64).asCell();
            const tx = { validUntil: Math.floor(Date.now()/1000)+360, messages: [{ address: import.meta.env.VITE_STAKING_CONTRACT_ADDRESS, amount: toNano("0.05").toString(), payload: payload.toBoc().toString("base64") }] };
            const result = await tonConnectUI.sendTransaction(tx);
            message.loading({ content: 'Awaiting confirmation...', key: 'confirmUnstakeUser', duration: 0 });
            const txHash = await waitForTransactionConfirmation(rawAddress, Cell.fromBase64(result.boc), 180000, 5000);
            if (!txHash) throw new Error('Blockchain confirmation failed.');
            message.loading({ content: 'Finalizing unstake...', key: 'confirmUnstakeUser', duration: 0 });
            await confirmArixUnstake({ userWalletAddress: rawAddress, stakeId: selectedStakeForUnstake.id, unstakeTransactionBoc: result.boc, unstakeTransactionHash: txHash });
            message.success({ content: "ARIX unstake submitted!", key: 'confirmUnstakeUser', duration: 7 });
            setIsUnstakeModalVisible(false); setSelectedStakeForUnstake(null); setUnstakePrepDetails(null); setStakeToSelectForUnstakeId(undefined);
            fetchAllUserData(false);
        } catch (err) {
            message.error({ content: err?.response?.data?.message || err?.message || 'ARIX unstake failed.', key: 'confirmUnstakeUser', duration: 6 });
        } finally {
            setIsUnstakeActionLoading(false);
        }
    };

    // --- RENDER LOGIC ---
    const combinedLoadingOverall = loadingProfile || loadingReferral || loadingProgramDetails || loadingStakes || loadingGames;
    
    if (!userFriendlyAddress && !combinedLoadingOverall) {
        return (
            <div className="user-page-container">
                <div className="page-header-section">
                     <div className="balance-display-box">
                        <div className="balance-amount-line">
                            <div className="balance-icon-wrapper"><span className="balance-icon-representation">♢</span></div>
                            <Text className="balance-amount-value"><Spin size="small" wrapperClassName="balance-spin"/></Text>
                        </div>
                        <Text className="balance-currency-label">ARIX In-App Balance</Text>
                    </div>
                     <div className="topup-cashout-buttons">
                        <Button icon={<ArrowDownOutlined />} disabled>Top up</Button>
                        <Button icon={<ArrowUpOutlined />} disabled>Cashout</Button>
                    </div>
                    <div className="page-banner" onClick={() => navigate('/game')}>
                        <Text className="page-banner-text">X2 or maybe x256? Play Coinflip and try your luck! →</Text>
                    </div>
                </div>
                <Card className="connect-wallet-prompt">
                    <WalletOutlined className="connect-wallet-icon" />
                    <Title level={4} className="connect-wallet-title">Connect Your Wallet</Title>
                    <Paragraph className="connect-wallet-text">
                        Connect your TON wallet for dashboard, settings, referrals, and activity.
                    </Paragraph>
                    <Button type="primary" size="large" onClick={() => tonConnectUI.openModal()} icon={<LinkOutlined />}>
                        Connect Wallet
                    </Button>
                </Card>
            </div>
        );
    }
    
    const referralLinkToDisplay = referralData?.referralLink || (referralData?.referralCode ? `${REFERRAL_LINK_BASE}?ref=${referralData.referralCode}` : (rawAddress ? `${REFERRAL_LINK_BASE}?ref=${rawAddress}` : ''));
    const referralCodeForBoxes = (referralData?.referralCode || rawAddress || "--------").slice(-8).toUpperCase();

    const tabItems = [
        {
            key: 'referral_stats',
            label: <span className="user-tab-label"><TeamOutlined /> Referral Stats</span>,
            children: (
                <Spin spinning={loadingReferral || loadingProgramDetails} tip="Loading referral data...">
                    <Row gutter={isMobile ? [16,16] : [24, 24]}>
                        <Col xs={24} md={12}>
                            <Card className="dark-theme-card referral-stats-card" title={<><UsergroupAddOutlined style={{marginRight: 8}} /> Your Network</>}>
                                <AntdStatistic title="Direct Referrals (Level 1)" value={referralData?.l1ReferralCount ?? 0} />
                                <AntdStatistic title="Indirect Referrals (Level 2)" value={referralData?.l2ReferralCount ?? 0} style={{marginTop: 12}}/>
                                <AntdStatistic title="Total Users Invited" value={referralData?.totalUsersInvited ?? 0} valueStyle={{color: '#A3AECF', fontWeight: 'bold'}} style={{marginTop: 12}}/>
                            </Card>
                        </Col>
                        <Col xs={24} md={12}>
                            <Card className="dark-theme-card referral-stats-card" title={<><DollarCircleOutlined style={{marginRight: 8}}/> Your Earnings (USDT)</>}>
                                <AntdStatistic title="Level 1 Earnings" value={`$${parseFloat(referralData?.l1EarningsUsdt ?? 0).toFixed(USDT_DECIMALS)}`} valueStyle={{color: '#4CAF50'}} />
                                <AntdStatistic title="Level 2 Earnings" value={`$${parseFloat(referralData?.l2EarningsUsdt ?? 0).toFixed(USDT_DECIMALS)}`} valueStyle={{color: '#4CAF50'}} style={{marginTop: 12}}/>
                                <AntdStatistic title="Total Referral Earnings" value={`$${parseFloat(referralData?.totalReferralEarningsUsdt ?? 0).toFixed(USDT_DECIMALS)}`} valueStyle={{color: '#A3AECF', fontWeight: 'bold'}} style={{marginTop: 12}}/>
                            </Card>
                        </Col>
                    </Row>
                </Spin>
            ),
        },
        {
            key: 'referral_structure',
            label: <span className="user-tab-label"><RiseOutlined /> Reward Structure</span>,
            children: (
                 <Spin spinning={loadingProgramDetails} tip="Loading program details...">
                    <Paragraph className="text-secondary-light" style={{textAlign: 'center', marginBottom: 20, padding: '0 16px'}}>
                        {programDetails.message || 'Earn rewards by inviting new users who stake ARIX. Rewards are based on their chosen plan.'}
                    </Paragraph>
                    {programDetails.plans && programDetails.plans.length > 0 ? (
                        <List
                            grid={{ gutter: isMobile ? 16 : 24, xs: 1, sm: 1, md: 2 }}
                            dataSource={programDetails.plans}
                            renderItem={plan => (
                                <List.Item>
                                    <Card className="dark-theme-card referral-reward-plan-card">
                                        <Title level={5} className="plan-title">{plan.planTitle}</Title>
                                        <Paragraph className="plan-detail"><Text strong>Level 1 Reward: </Text>{plan.l1RewardPercentage}</Paragraph>
                                        <Paragraph className="plan-detail"><Text strong>Level 2 Reward: </Text>{plan.l2RewardDescription}</Paragraph>
                                    </Card>
                                </List.Item>
                            )}
                        />
                    ) : !loadingProgramDetails && (
                        <Card className="dark-theme-card"><Empty description={<Text className="text-secondary-light">Referral program details are currently unavailable.</Text>} /></Card>
                    )}
                </Spin>
            )
        },
        {
            key: 'stakes_history',
            label: <span className="user-tab-label"><HistoryOutlined /> Staking History</span>,
            children: <TransactionList items={stakesAndRewards.stakes} isLoading={loadingStakes} renderItemDetails={renderStakeHistoryItem} itemType="staking activity" listTitle={null} onUnstakeItemClick={prepareForUnstakeModal}/>,
        },
        {
            key: 'games_history',
            label: <span className="user-tab-label"><ExperimentOutlined /> Game History</span>,
            children: <TransactionList items={coinflipHistory} isLoading={loadingGames} renderItemDetails={renderCoinflipHistoryItem} itemType="Coinflip game" listTitle={null}/>,
        },
    ];

    return (
        <Spin spinning={combinedLoadingOverall && !userFriendlyAddress} tip="Loading user data...">
            <div className="user-page-container">
                {/* --- HEADER --- */}
                <div className="page-header-section">
                    <div className="balance-display-box">
                        <div className="balance-amount-line">
                            <div className="balance-icon-wrapper"><span className="balance-icon-representation">♢</span></div>
                            <Text className="balance-amount-value">
                                {loadingProfile ? <Spin size="small"/> : parseFloat(userProfile?.balance || 0).toFixed(2)}
                            </Text>
                        </div>
                        <Text className="balance-currency-label">ARIX In-App Balance</Text>
                    </div>
                    <div className="topup-cashout-buttons">
                        <Button icon={<ArrowDownOutlined />} onClick={() => setShowTopUpModal(true)}>Top up</Button>
                        <Button icon={<ArrowUpOutlined />} onClick={() => setShowCashoutModal(true)}>Cashout</Button>
                    </div>
                    <div className="page-banner" onClick={() => navigate('/game')}>
                        <Text className="page-banner-text">X2 or maybe x256? Play Coinflip and try your luck! →</Text>
                    </div>
                </div>

                {/* --- REFERRAL SECTION --- */}
                <div className="referral-link-section">
                    <Title level={5} className="referral-section-title">Your Unique Referral Link</Title>
                    <div className="referral-code-boxes">
                        {referralCodeForBoxes.split('').map((char, index) => (
                            <div key={index} className="referral-code-box">{char}</div>
                        ))}
                    </div>
                     <Paragraph className="referral-link-display">
                        <Text
                            className="referral-link-text"
                            copyable={referralLinkToDisplay ? { text: referralLinkToDisplay, tooltips: ['Copy Link', 'Copied!'], icon: <CopyOutlined style={{ marginLeft: 8 }} /> } : false}
                        >
                            {referralLinkToDisplay || 'Connect wallet for link'}
                        </Text>
                    </Paragraph>
                    <div className="referral-actions-row">
                        <Tooltip title="Copy Full Referral Code">
                            <Button
                                icon={<PaperClipOutlined />}
                                onClick={() => copyToClipboard(referralData?.referralCode || rawAddress, "Referral code copied!")}
                                className="referral-copy-button"
                                disabled={!(referralData?.referralCode || rawAddress)}
                            />
                        </Tooltip>
                        <Button
                            icon={<InviteIcon />}
                            onClick={shareUserReferralLink}
                            className="invite-friends-button"
                            disabled={!referralLinkToDisplay}
                        >
                            Invite friends
                        </Button>
                        <Button
                            icon={<UserSwitchOutlined />}
                            onClick={() => setActiveTabKey('referral_stats')}
                            className="referral-count-button"
                        >
                            {referralData?.totalUsersInvited ?? 0} →
                        </Button>
                    </div>
                </div>
                
                {/* --- SETTINGS SECTION --- */}
                <div className="settings-section-wrapper">
                    <div className="settings-section">
                        <Title level={5} className="settings-section-title">Language</Title>
                        <Radio.Group value={language} onChange={(e) => setLanguage(e.target.value)} buttonStyle="solid" className="settings-segmented-control">
                            <Radio.Button value="en">English</Radio.Button>
                            <Radio.Button value="ru">Русский</Radio.Button>
                            <Radio.Button value="ua">Українська</Radio.Button>
                        </Radio.Group>
                    </div>
                    <div className="settings-section">
                        <Title level={5} className="settings-section-title">Color Theme</Title>
                        <Radio.Group value={colorTheme} onChange={(e) => setColorTheme(e.target.value)} buttonStyle="solid" className="settings-segmented-control">
                            <Radio.Button value="terminal">Terminal</Radio.Button>
                            <Radio.Button value="telegram">Telegram</Radio.Button>
                        </Radio.Group>
                    </div>
                    <div className="settings-section">
                        <Title level={5} className="settings-section-title">Sound</Title>
                        <Radio.Group value={sound} onChange={(e) => setSound(e.target.value)} buttonStyle="solid" className="settings-segmented-control">
                            <Radio.Button value="on">On</Radio.Button>
                            <Radio.Button value="off">Off</Radio.Button>
                        </Radio.Group>
                    </div>
                </div>

                <Button icon={<RedoOutlined />} onClick={handleRefreshAllData} loading={combinedLoadingOverall} block style={{marginTop: 0}}>Refresh All Data</Button>

                {/* --- PROFILE CARD --- */}
                <UserProfileCard
                    userProfileData={userProfile}
                    activeStakes={activeUserStakes}
                    currentArxPrice={currentArxPrice}
                    onRefreshAllData={fetchAllUserData}
                    isDataLoading={loadingProfile || loadingStakes}
                    onInitiateUnstakeProcess={initiateUnstakeProcessFromCardOrList}
                />

                <Divider className="user-page-divider"><Text className="divider-text">ACTIVITY & REFERRAL DETAILS</Text></Divider>
                
                {/* --- TABS --- */}
                <Tabs activeKey={activeTabKey} items={tabItems} onChange={handleTabChange} centered className="dark-theme-tabs user-history-tabs" size={isMobile ? 'small' : 'middle'}/>

                {/* --- MODALS --- */}

                {/* Unstake Modal */}
                <Modal
                    title={<Text className="modal-title-text">{selectedStakeForUnstake && unstakePrepDetails ? 'Confirm ARIX Unstake' : 'Select Stake to Unstake'}</Text>}
                    open={isUnstakeModalVisible}
                    onOk={selectedStakeForUnstake && unstakePrepDetails ? handleConfirmUnstakeInModal : () => message.info("Select a stake.")}
                    onCancel={() => { setIsUnstakeModalVisible(false); setSelectedStakeForUnstake(null); setUnstakePrepDetails(null); setStakeToSelectForUnstakeId(undefined); setIsUnstakeActionLoading(false); }}
                    confirmLoading={isUnstakeActionLoading}
                    okText={selectedStakeForUnstake && unstakePrepDetails ? "Proceed with Unstake" : "Confirm Selection"}
                    cancelText="Cancel"
                    destroyOnClose centered
                    okButtonProps={{ danger: selectedStakeForUnstake && unstakePrepDetails?.isEarly, disabled: (!selectedStakeForUnstake || !unstakePrepDetails) && activeUserStakes.length > 1 }}
                    width={isMobile ? '90%' : 520}
                >
                    {activeUserStakes.length > 1 && !selectedStakeForUnstake && !unstakePrepDetails && (
                        <div className="stake-selection-modal-content">
                            <Paragraph className="modal-text">Select active stake:</Paragraph>
                            <Select placeholder="Select stake" style={{ width: '100%', marginBottom: 20 }} onChange={handleModalUnstakeSelectionChange} value={stakeToSelectForUnstakeId} size="large" showSearch optionFilterProp="children">
                                {activeUserStakes.map(s => (<Option key={s.id} value={s.id}>{s.planTitle} - {parseFloat(s.arixAmountStaked).toFixed(ARIX_DECIMALS)} ARIX (Unlocks: {new Date(s.unlockTimestamp).toLocaleDateString()})</Option>))}
                            </Select>
                            <Paragraph className="modal-text small-note">Unstake details will appear below.</Paragraph>
                        </div>
                    )}
                    {selectedStakeForUnstake && unstakePrepDetails ? (
                        <div className="unstake-details-modal-content">
                            <Paragraph className="modal-text">{unstakePrepDetails.message}</Paragraph>
                            <Descriptions column={1} bordered size="small" className="modal-descriptions">
                                <Descriptions.Item label="Plan">{selectedStakeForUnstake.planTitle}</Descriptions.Item>
                                <Descriptions.Item label="ARIX Staked">{unstakePrepDetails.principalArix} ARIX</Descriptions.Item>
                                {unstakePrepDetails.isEarly && <Descriptions.Item label="Early Penalty"><Text style={{color: '#F44336'}}>{unstakePrepDetails.arixPenaltyPercentApplied}% of principal</Text></Descriptions.Item>}
                            </Descriptions>
                            <Alert message="Important Note" description="This unstakes ARIX principal. Accrued USDT rewards are separate." type="info" showIcon style={{marginTop: 16}} className="modal-alert"/>
                        </div>
                    ) : ((activeUserStakes.length === 1 && !unstakePrepDetails && isUnstakeActionLoading) || (selectedStakeForUnstake && !unstakePrepDetails && isUnstakeActionLoading)) ? (
                        <div style={{textAlign: 'center', padding: '20px'}}><Spin tip="Loading unstake details..."/></div>
                    ) : null}
                </Modal>
                
                {/* Top Up Modal */}
                <Modal open={showTopUpModal} onCancel={() => setShowTopUpModal(false)} footer={null} className="push-topup-modal" centered>
                    <div className="push-topup-content">
                        <Button shape="circle" icon={<CloseOutlined />} className="close-push-modal-button" onClick={() => setShowTopUpModal(false)} />
                        <div className="push-modal-header"><ArixPushIcon /><Text className="push-modal-title">Top Up Balance</Text></div>
                        <Alert message="Send only ARIX to this address" type="warning" showIcon />
                        <Paragraph className="address-label" style={{marginTop: '16px'}}>1. DEPOSIT ADDRESS</Paragraph>
                        <div className="address-display-box">
                            <Text className="deposit-address-text" ellipsis={{ tooltip: HOT_WALLET_ADDRESS }}>{HOT_WALLET_ADDRESS}</Text>
                            <Button icon={<CopyOutlined />} onClick={() => copyToClipboard(HOT_WALLET_ADDRESS)} />
                        </div>
                        <Paragraph className="address-label" style={{ marginTop: '16px' }}>2. REQUIRED MEMO / COMMENT</Paragraph>
                        <Alert message="YOUR WALLET ADDRESS IS THE MEMO" description="You MUST put your personal wallet address in the transaction's memo/comment field to be credited." type="error" showIcon />
                        <div className="address-display-box">
                            <Text className="deposit-address-text" ellipsis={{ tooltip: userFriendlyAddress }}>{userFriendlyAddress || "Connect wallet to see your address"}</Text>
                            <Button icon={<CopyOutlined />} onClick={() => copyToClipboard(userFriendlyAddress)} />
                        </div>
                    </div>
                </Modal>

                {/* Cashout Modal */}
                <Modal open={showCashoutModal} onCancel={() => setShowCashoutModal(false)} footer={null} className="push-cashout-modal" centered>
                    <div className="push-cashout-content">
                        <Button shape="circle" icon={<CloseOutlined />} className="close-push-modal-button" onClick={() => setShowCashoutModal(false)} />
                        <div className="push-modal-header"><ArixPushIcon /><Text className="push-modal-title">Cashout Balance</Text></div>
                        <div className='cashout-balance-info'>
                            <Text>Available to withdraw:</Text>
                            <Text strong>{loadingProfile ? <Spin size="small" /> : `${parseFloat(userProfile?.balance || 0).toFixed(2)} ARIX`}</Text>
                        </div>
                        <Form form={cashoutForm} onFinish={handleCashout} layout="vertical" disabled={cashoutLoading}>
                            <Form.Item 
                                name="amount" 
                                label="Amount to Withdraw" 
                                rules={[
                                    { required: true, message: 'Please input an amount!' },
                                    { 
                                        validator: (_, value) => {
                                            if (!value || parseFloat(value) <= 0) {
                                                return Promise.reject(new Error('Amount must be positive'));
                                            }
                                            if (userProfile && parseFloat(value) > parseFloat(userProfile.balance)) {
                                                return Promise.reject(new Error('Amount exceeds balance'));
                                            }
                                            return Promise.resolve();
                                        }
                                    }
                                ]}
                            >
                                <Input type="number" placeholder="e.g., 100" />
                            </Form.Item>
                            <Form.Item label="Withdrawal Address (Your Wallet)">
                                <Input value={userFriendlyAddress} disabled />
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit" block loading={cashoutLoading}>Withdraw ARIX</Button>
                            </Form.Item>
                        </Form>
                    </div>
                </Modal>

            </div>
        </Spin>
    );
};

export default UserPage;
