import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, InputNumber, Button, Typography, Spin, message, Modal, Alert, Divider, Statistic as AntdStatistic, Select, Empty, Grid, Descriptions } from 'antd';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import {
    CheckCircleOutlined,
    RedoOutlined,
    InfoCircleOutlined,
    DollarCircleOutlined,
    RocketOutlined,
    WalletOutlined,
    LinkOutlined,
    InteractionOutlined,
    LogoutOutlined
} from '@ant-design/icons';
import { Cell, Builder, toNano } from '@ton/core';
import { v4 as uuidv4 } from 'uuid';
import StakingPlans from '../components/earn/StakingPlans';
import TransactionList, { renderStakeHistoryItem } from '../components/user/TransactionList';
import {
    getStakingConfig,
    recordUserStake,
    getUserStakesAndRewards,
    initiateArixUnstake,
    confirmArixUnstake
} from '../services/api';
import {
    getJettonWalletAddress,
    getJettonBalance,
    createJettonTransferMessage,
    createStakeForwardPayload,
    toArixSmallestUnits as convertToArixSmallestUnits,
    fromArixSmallestUnits,
    ARIX_DECIMALS,
    USDT_DECIMALS,
    USD_DECIMALS,
    waitForTransactionConfirmation,
    REFERRAL_LINK_BASE
} from '../utils/tonUtils.js';
import { getArxUsdtPriceFromBackend } from '../services/priceServiceFrontend';
import './EarnPage.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

const EarnPage = () => {
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const [stakingConfigData, setStakingConfigData] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [inputUsdtAmount, setInputUsdtAmount] = useState(null);
    const [calculatedArixAmount, setCalculatedArixAmount] = useState(0);

    const [currentArxPrice, setCurrentArxPrice] = useState(null);
    const [arixWalletBalance, setArixWalletBalance] = useState(0);
    const [userStakesData, setUserStakesData] = useState({ stakes: [], totalClaimableUsdt: '0.00', totalClaimableArix: '0.00' });

    const [loadingConfig, setLoadingConfig] = useState(true);
    const [loadingBalances, setLoadingBalances] = useState(false);
    const [loadingUserStakes, setLoadingUserStakes] = useState(false);

    const [stakeSubmitLoading, setStakeSubmitLoading] = useState(false);
    const [isStakeModalVisible, setIsStakeModalVisible] = useState(false);

    const [isUnstakeModalVisible, setIsUnstakeModalVisible] = useState(false);
    const [selectedStakeForUnstake, setSelectedStakeForUnstake] = useState(null);
    const [unstakePrepDetails, setUnstakePrepDetails] = useState(null);
    const [isUnstakeActionLoading, setIsUnstakeActionLoading] = useState(false);

    const userFriendlyAddress = useTonAddress();
    const rawAddress = useTonAddress(false);
    const [tonConnectUI] = useTonConnectUI();

    const STAKING_CONTRACT_ADDRESS_FROM_CONFIG = stakingConfigData?.stakingContractAddress || import.meta.env.VITE_STAKING_CONTRACT_ADDRESS;
    const STAKING_CONTRACT_JW_FROM_CONFIG = stakingConfigData?.stakingContractJettonWalletAddress || import.meta.env.VITE_STAKING_CONTRACT_JETTON_WALLET_ADDRESS;
    const ARIX_MASTER_FROM_CONFIG = stakingConfigData?.arxToken?.masterAddress || import.meta.env.VITE_ARIX_TOKEN_MASTER_ADDRESS;

    const fetchInitialData = useCallback(async (showMessages = false) => {
        setLoadingConfig(true);
        setLoadingBalances(true);
        setLoadingUserStakes(true);
        const loadingKey = 'earnPageLoadFull';
        if (showMessages) message.loading({ content: 'Loading ARIX Earn Hub...', key: loadingKey, duration: 0 });

        try {
            const configResponse = await getStakingConfig();
            const config = configResponse.data;
            setStakingConfigData(config);
            
            let price = config?.currentArxUsdtPrice;
            if (price === null || price === undefined) {
                price = await getArxUsdtPriceFromBackend();
            }
            setCurrentArxPrice(price);

            if (rawAddress) {
                const stakesResponse = await getUserStakesAndRewards(rawAddress);
                setUserStakesData({
                    stakes: stakesResponse.data?.stakes || [],
                    totalClaimableUsdt: stakesResponse.data?.totalClaimableUsdt || '0.00',
                    totalClaimableArix: stakesResponse.data?.totalClaimableArix || '0.00'
                });

                if (ARIX_MASTER_FROM_CONFIG) {
                    const userArixJW = await getJettonWalletAddress(rawAddress, ARIX_MASTER_FROM_CONFIG);
                    if (userArixJW) {
                        const balanceNano = await getJettonBalance(userArixJW);
                        setArixWalletBalance(fromArixSmallestUnits(balanceNano));
                    } else {
                        setArixWalletBalance(0);
                    }
                } else {
                     setArixWalletBalance(0);
                }
            } else {
                setArixWalletBalance(0);
                setUserStakesData({ stakes: [], totalClaimableUsdt: '0.00', totalClaimableArix: '0.00' });
            }
            if (showMessages) message.success({ content: "Earn Hub data loaded!", key: loadingKey, duration: 2 });
            else message.destroy(loadingKey);

        } catch (error) {
            console.error("[EarnPage] Fetch initial data error:", error);
            if (showMessages) message.error({ content: error?.response?.data?.message || "Failed to load Earn Hub data.", key: loadingKey, duration: 3 });
            else message.destroy(loadingKey);
            if (currentArxPrice === null) setCurrentArxPrice(null);
        } finally {
            setLoadingConfig(false);
            setLoadingBalances(false);
            setLoadingUserStakes(false);
        }
    }, [rawAddress, ARIX_MASTER_FROM_CONFIG, currentArxPrice]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        if (inputUsdtAmount && currentArxPrice && currentArxPrice > 0) {
            setCalculatedArixAmount(parseFloat((inputUsdtAmount / currentArxPrice).toFixed(ARIX_DECIMALS)));
        } else {
            setCalculatedArixAmount(0);
        }
    }, [inputUsdtAmount, currentArxPrice]);

    const handlePlanSelect = (plan) => {
        if (!userFriendlyAddress) {
            message.warn("Please connect your wallet to stake ARIX.");
            tonConnectUI.openModal();
            return;
        }
        if (currentArxPrice === null || currentArxPrice <= 0) {
            message.error("ARIX price is currently unavailable. Please refresh.", 3);
            fetchInitialData(true);
            return;
        }
        const fullPlanDetails = stakingConfigData?.stakingPlans?.find(p => (p.key || p.id.toString()) === (plan.key || plan.id.toString()));
        if (!fullPlanDetails) {
            message.error("Selected plan details not found. Please refresh.", 3);
            fetchInitialData(true);
            return;
        }
        setSelectedPlan(fullPlanDetails);
        setInputUsdtAmount(parseFloat(fullPlanDetails.minStakeUsdt)); 
        setIsStakeModalVisible(true);
    };

    const handleUsdtAmountChange = (value) => {
        setInputUsdtAmount(value === null ? null : parseFloat(value));
    };

    const handleConfirmStake = async () => {
        if (!rawAddress || !selectedPlan || !inputUsdtAmount || inputUsdtAmount <= 0 || calculatedArixAmount <= 0) {
            message.error('Please connect wallet, select a plan, and enter a valid USDT amount to stake.', 4);
            return;
        }
        if (!STAKING_CONTRACT_JW_FROM_CONFIG || STAKING_CONTRACT_JW_FROM_CONFIG.includes("PLACEHOLDER")) {
            message.error("Staking contract (Jetton Wallet) address is not configured correctly. Please contact support.", 5);
            return;
        }
        const minUsdForPlan = parseFloat(selectedPlan.minStakeUsdt || 0);
        const maxUsdForPlan = parseFloat(selectedPlan.maxStakeUsdt || Infinity);

        if (inputUsdtAmount < minUsdForPlan) {
            message.error(`Minimum stake for this plan is $${minUsdForPlan.toFixed(USDT_DECIMALS)} USD.`, 3);
            return;
        }
        if (inputUsdtAmount > maxUsdForPlan) {
            message.error(`Maximum stake for this plan is $${maxUsdForPlan.toFixed(USDT_DECIMALS)} USD.`, 3);
            return;
        }
        if (calculatedArixAmount > arixWalletBalance) {
            message.error(`Insufficient ARIX balance. You need ${calculatedArixAmount.toFixed(ARIX_DECIMALS)} ARIX, but have ${arixWalletBalance.toFixed(ARIX_DECIMALS)} ARIX.`, 4);
            return;
        }

        setStakeSubmitLoading(true);
        const loadingMessageKey = 'stakeActionModalEarnPage';
        message.loading({ content: 'Preparing ARIX stake transaction...', key: loadingMessageKey, duration: 0 });
        
        const dbStakeUUID = uuidv4(); 
        const scStakeIdentifier = BigInt('0x' + dbStakeUUID.replace(/-/g, '').substring(0, 16));

        try {
            const userArixJettonWallet = await getJettonWalletAddress(rawAddress, ARIX_MASTER_FROM_CONFIG);
            if (!userArixJettonWallet) throw new Error("Your ARIX Jetton Wallet could not be found. Ensure you have ARIX.");
            
            const amountInSmallestArixUnits = convertToArixSmallestUnits(calculatedArixAmount);
            const scPayloadParams = {
                queryId: BigInt(Date.now()), 
                stakeIdentifier: scStakeIdentifier,
                durationSeconds: parseInt(selectedPlan.durationDays, 10) * 24 * 60 * 60,
                arix_lock_apr_bps: 0, 
                arix_lock_penalty_bps: parseInt(parseFloat(selectedPlan.arixEarlyUnstakePenaltyPercent) * 100 || 0),
            };
            const forwardPayloadCell = createStakeForwardPayload(scPayloadParams);
            const jettonTransferBody = createJettonTransferMessage(
                amountInSmallestArixUnits, STAKING_CONTRACT_JW_FROM_CONFIG, rawAddress,    
                toNano("0.1"), forwardPayloadCell      
            );
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 360, 
                messages: [{ 
                    address: userArixJettonWallet, 
                    amount: toNano("0.15").toString(), 
                    payload: jettonTransferBody.toBoc().toString("base64") 
                }],
            };
            
            message.loading({ content: 'Please confirm transaction in your wallet...', key: loadingMessageKey, duration: 0 });
            const result = await tonConnectUI.sendTransaction(transaction);
            
            message.loading({ content: 'Transaction sent, awaiting blockchain confirmation...', key: loadingMessageKey, duration: 0 });
            const externalMessageCell = Cell.fromBase64(result.boc);
            const txHash = await waitForTransactionConfirmation(rawAddress, externalMessageCell.toBoc().toString("base64"), 180000, 5000); 

            if (!txHash) {
                throw new Error('Failed to confirm stake transaction on blockchain. Please check your wallet activity. If ARIX was deducted without stake appearing, contact support.');
            }
            
            message.loading({ content: 'Transaction confirmed! Recording ARIX stake with backend...', key: loadingMessageKey, duration: 0 });
            const referrerCode = localStorage.getItem('arixReferralCode');
            await recordUserStake({
                planKey: selectedPlan.key || selectedPlan.id.toString(), 
                arixAmount: calculatedArixAmount,
                userWalletAddress: rawAddress, 
                transactionBoc: result.boc, 
                transactionHash: txHash, 
                stakeUUID: dbStakeUUID, 
                referenceUsdtValue: inputUsdtAmount,
                referrerCodeOrAddress: referrerCode 
            });
            message.success({ content: `Successfully staked ${calculatedArixAmount.toFixed(ARIX_DECIMALS)} ARIX! USDT rewards will now accrue.`, key: loadingMessageKey, duration: 6 });
            
            setIsStakeModalVisible(false); setSelectedPlan(null); setInputUsdtAmount(null);
            if (referrerCode) localStorage.removeItem('arixReferralCode'); 
            setTimeout(() => { fetchInitialData(false); }, 8000); 
            setTimeout(() => { fetchInitialData(false); }, 40000);
        } catch (error) {
            message.error({ content: error?.response?.data?.message || error?.message || 'ARIX Staking failed. Please try again.', key: loadingMessageKey, duration: 6 });
            console.error('[EarnPage] ARIX Staking tx/record error:', error);
        } finally {
            setStakeSubmitLoading(false);
        }
    };

    const handleUnstakeActionClick = (stake) => { 
        if (!rawAddress) return;
        setSelectedStakeForUnstake(stake);
        setIsUnstakeActionLoading(true);
        message.loading({ content: 'Preparing unstake...', key: 'prepUnstakeEarnPage', duration: 0 });
        initiateArixUnstake({ userWalletAddress: rawAddress, stakeId: stake.id })
            .then(response => {
                setUnstakePrepDetails(response.data);
                setIsUnstakeModalVisible(true);
                message.destroy('prepUnstakeEarnPage');
            })
            .catch(error => {
                message.error({ content: error?.response?.data?.message || "Failed to prepare unstake.", key: 'prepUnstakeEarnPage', duration: 3 });
                console.error("Prepare unstake error on EarnPage:", error);
            })
            .finally(() => setIsUnstakeActionLoading(false));
    };

    const handleConfirmUnstakeInModal = async () => {
        if (!rawAddress || !selectedStakeForUnstake || !unstakePrepDetails || !tonConnectUI || !STAKING_CONTRACT_ADDRESS_FROM_CONFIG) {
            message.error("Missing critical information for unstake.");
            return;
        }
        setIsUnstakeActionLoading(true);
        const loadingMessageKey = 'unstakeConfirmActionEarnPage';
        message.loading({ content: 'Please confirm ARIX unstake in your wallet...', key: loadingMessageKey, duration: 0 });

        try {
            const scStakeIdentifierToWithdraw = selectedStakeForUnstake.id.replace(/-/g, '').substring(0, 16);
            const unstakePayloadBuilder = new Cell().asBuilder();
            unstakePayloadBuilder.storeUint(BigInt(Date.now()), 64); 
            unstakePayloadBuilder.storeUint(BigInt('0x' + scStakeIdentifierToWithdraw), 64); 

            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 360,
                messages: [{
                    address: STAKING_CONTRACT_ADDRESS_FROM_CONFIG,
                    amount: toNano("0.05").toString(), 
                    payload: unstakePayloadBuilder.asCell().toBoc().toString("base64")
                }],
            };
            
            const result = await tonConnectUI.sendTransaction(transaction);
            
            message.loading({ content: 'Unstake transaction sent, awaiting confirmation...', key: loadingMessageKey, duration: 0 });
            const externalMessageCell = Cell.fromBase64(result.boc);
            const txHash = await waitForTransactionConfirmation(rawAddress, externalMessageCell.toBoc().toString("base64"), 180000, 5000); 

            if (!txHash) {
                throw new Error('Failed to confirm unstake transaction on blockchain.');
            }
            
            message.loading({ content: 'Transaction confirmed! Finalizing ARIX unstake...', key: loadingMessageKey, duration: 0 });
            await confirmArixUnstake({ 
                userWalletAddress: rawAddress, 
                stakeId: selectedStakeForUnstake.id, 
                unstakeTransactionBoc: result.boc,
                unstakeTransactionHash: txHash 
            });
            message.success({ content: "ARIX unstake request submitted! Backend will verify.", key: loadingMessageKey, duration: 7 });
            
            setIsUnstakeModalVisible(false);
            setSelectedStakeForUnstake(null);
            setUnstakePrepDetails(null);
            fetchInitialData(false); 
        } catch (txError) {
            message.error({ content: txError?.response?.data?.message || txError?.message || 'ARIX unstake failed.', key: loadingMessageKey, duration: 6 });
            console.error("On-chain ARIX Unstake Tx Error on EarnPage:", txError);
        } finally {
            setIsUnstakeActionLoading(false);
        }
    };

    const isLoadingInitial = loadingConfig && !stakingConfigData;
    const isStakingAvailable = stakingConfigData?.stakingPlans && stakingConfigData.stakingPlans.length > 0;
    const modalWidth = isMobile ? '95%' : 520;

    if (!userFriendlyAddress && !loadingConfig) { 
        return ( 
            <div className="earn-page-container">
                <Title level={2} className="page-title"><DollarCircleOutlined style={{marginRight:10}}/>ARIX Staking</Title>
                <Card className="centered-message-card">
                    <WalletOutlined />
                    <Title level={4} className="text-primary-light">Connect Your Wallet</Title>
                    <Paragraph className="text-secondary-light" style={{marginBottom: 24, fontSize: '1rem'}}>
                        To access ARIX staking plans, view your earnings, and manage your stakes, please connect your TON wallet.
                    </Paragraph>
                    <Button type="primary" size="large" onClick={() => tonConnectUI.openModal()} icon={<LinkOutlined />}>
                        Connect Wallet
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <Spin spinning={isLoadingInitial} tip="Loading ARIX Staking Hub..." size="large">
            <div className="earn-page-container">
                <Title level={2} className="page-title"><DollarCircleOutlined style={{marginRight:10}}/>ARIX Staking</Title>
                <Row justify="space-between" align="middle" className="earn-page-header-actions">
                    <Text className="wallet-info-text">
                        {userFriendlyAddress ? `Wallet: ${userFriendlyAddress?.slice(0,6)}...${userFriendlyAddress?.slice(-4)}` : 'Wallet not connected'}
                    </Text>
                    <Button icon={<RedoOutlined/>} onClick={() => fetchInitialData(true)} loading={loadingConfig || loadingBalances || loadingUserStakes} size="middle" disabled={!userFriendlyAddress}>
                        Refresh Data
                    </Button> 
                </Row>
            
                <div className="earn-summary-card-wrapper">
                    <Row gutter={[16, 16]} align="stretch" justify="center">
                        <Col xs={24} sm={12} className="summary-stat-col">
                             <Card className="earn-summary-card">
                                <AntdStatistic 
                                    title="Your ARIX Wallet Balance"
                                    value={loadingBalances ? '-' : arixWalletBalance.toFixed(ARIX_DECIMALS)} 
                                    suffix="ARIX" 
                                />
                                {currentArxPrice != null && !loadingBalances && (
                                    <Text className="summary-value-equivalent">
                                        ~${(arixWalletBalance * currentArxPrice).toFixed(USD_DECIMALS)} USD
                                    </Text>
                                )}
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} className="summary-stat-col">
                            <Card className="earn-summary-card">
                                <AntdStatistic 
                                    title="Total Claimable USDT Rewards" 
                                    value={loadingUserStakes ? '-' : `$${parseFloat(userStakesData.totalClaimableUsdt).toFixed(USDT_DECIMALS)}`}
                                    valueStyle={{color: '#4CAF50'}} // Keep green for positive rewards
                                />
                                <Text className="summary-value-equivalent">From staking & referrals</Text>
                            </Card>
                        </Col>
                    </Row>
                </div>

                {loadingConfig && !stakingConfigData ? (
                    <div style={{textAlign: 'center', padding: '50px 0'}}>
                        <Spin tip="Loading Staking Plans..." size="large"/>
                    </div>
                ) : isStakingAvailable ? (
                    <StakingPlans
                        plans={stakingConfigData?.stakingPlans || []}
                        onSelectPlan={handlePlanSelect}
                        currentArxPrice={currentArxPrice}
                        userFriendlyAddress={userFriendlyAddress}
                    />
                ) : (
                    <Card className="centered-message-card" style={{marginTop: 20}}>
                        <img src="/img/earn-farming-over.png" alt="Farming phase over" style={{maxHeight: '180px', marginBottom: 20}} onError={(e) => e.currentTarget.style.display='none'} />
                        <Title level={3} className="text-primary-light" style={{ marginBottom: 8}}>Staking Temporarily Paused</Title>
                        <Paragraph className="text-secondary-light" style={{fontSize: '1rem'}}>
                            The current staking phase has concluded. New opportunities and plans will be announced soon!
                        </Paragraph>
                        <Paragraph className="text-tertiary-light" style={{fontSize: '0.9rem'}}>
                            Follow our announcements in the PUSH section for the latest updates.
                        </Paragraph>
                    </Card>
                )}
                
                {userFriendlyAddress && userStakesData.stakes.length > 0 && !loadingUserStakes && (
                    <div className="active-stakes-section">
                        <Title level={3} className="section-title">Your Active & Past Stakes</Title>
                        <TransactionList
                            items={userStakesData.stakes}
                            isLoading={loadingUserStakes}
                            renderItemDetails={renderStakeHistoryItem}
                            itemType="staking activity"
                            listTitle={null} 
                            onUnstakeItemClick={handleUnstakeActionClick}
                        />
                    </div>
                )}
                {userFriendlyAddress && !loadingUserStakes && userStakesData.stakes.length === 0 && isStakingAvailable && (
                    <Card className="centered-message-card" style={{marginTop: 20}}>
                        <Empty 
                            image={<RocketOutlined/>}
                            description={
                                <Paragraph className="text-secondary-light" style={{fontSize: '1rem'}}>
                                    You have no active ARIX stakes yet. Choose a plan above to start earning USDT rewards!
                                </Paragraph>
                            } 
                        />
                    </Card>
                )}
                
                <Modal
                    title={<Text className="modal-title-text">{`Stake ARIX in "${selectedPlan?.title || ''}"`}</Text>}
                    open={isStakeModalVisible}
                    onCancel={() => {setIsStakeModalVisible(false); setSelectedPlan(null); setInputUsdtAmount(null);}}
                    destroyOnClose 
                    footer={[ 
                        <Button key="back" onClick={() => {setIsStakeModalVisible(false); setSelectedPlan(null); setInputUsdtAmount(null);}}>
                            Cancel
                        </Button>,
                        <Button 
                            key="submit" 
                            type="primary" 
                            loading={stakeSubmitLoading} 
                            onClick={handleConfirmStake}
                            disabled={
                                !calculatedArixAmount || 
                                calculatedArixAmount <= 0 || 
                                calculatedArixAmount > arixWalletBalance || 
                                (selectedPlan && inputUsdtAmount < parseFloat(selectedPlan.minStakeUsdt)) ||
                                (selectedPlan && selectedPlan.maxStakeUsdt && inputUsdtAmount > parseFloat(selectedPlan.maxStakeUsdt))
                            }
                        >
                            Stake {calculatedArixAmount > 0 ? calculatedArixAmount.toFixed(ARIX_DECIMALS) : ''} ARIX
                        </Button>
                    ]}
                    width={modalWidth} 
                >
                    {selectedPlan && ( 
                        <div className="stake-modal-content">
                            <Descriptions column={1} bordered size="small" className="modal-descriptions">
                                <Descriptions.Item label="Plan Duration">{selectedPlan.durationDays} days</Descriptions.Item>
                                <Descriptions.Item label="USDT Reward APR">
                                    <Text style={{color: '#4CAF50', fontWeight: 'bold'}}>{selectedPlan.fixedUsdtAprPercent}%</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="ARIX Early Unstake Penalty">
                                    <Text style={{color: '#F44336'}}>{selectedPlan.arixEarlyUnstakePenaltyPercent}%</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Min. Stake (USDT Value)">${parseFloat(selectedPlan.minStakeUsdt).toFixed(USDT_DECIMALS)}</Descriptions.Item>
                                {selectedPlan.maxStakeUsdt && 
                                    <Descriptions.Item label="Max. Stake (USDT Value)">${parseFloat(selectedPlan.maxStakeUsdt).toFixed(USDT_DECIMALS)}</Descriptions.Item>
                                }
                            </Descriptions>
                            
                            <Divider className="modal-divider"/>

                            <Paragraph className="modal-text"><Text strong className="text-primary-light">Your ARIX Wallet Balance: </Text>
                                <Text style={{fontWeight: 'bold'}} className="text-primary-light">{arixWalletBalance.toFixed(ARIX_DECIMALS)} ARIX</Text>
                            </Paragraph> 
                            
                            <div style={{ margin: '16px 0' }}>
                                <Text strong className="modal-input-label">Enter USDT Value to Commit for Staking:</Text>
                                <InputNumber
                                    style={{ width: '100%'}} 
                                    addonBefore={<Text className="text-secondary-light">$</Text>}
                                    value={inputUsdtAmount} 
                                    onChange={handleUsdtAmountChange}
                                    placeholder={`Min $${parseFloat(selectedPlan.minStakeUsdt).toFixed(USDT_DECIMALS)}${selectedPlan.maxStakeUsdt ? `, Max $${parseFloat(selectedPlan.maxStakeUsdt).toFixed(USDT_DECIMALS)}` : ''}`}
                                    min={parseFloat(selectedPlan.minStakeUsdt)}
                                    max={selectedPlan.maxStakeUsdt ? parseFloat(selectedPlan.maxStakeUsdt) : undefined}
                                    precision={USDT_DECIMALS} 
                                    step={10} 
                                    className="themed-input-number large-input"
                                    size="large"
                                />
                            </div>

                            {currentArxPrice && inputUsdtAmount != null && inputUsdtAmount >= 0 && ( 
                                <Paragraph className={`modal-calculated-arix ${calculatedArixAmount > arixWalletBalance ? 'insufficient' : ''}`}>
                                    This equals approx: <Text strong className="text-primary-light">{calculatedArixAmount.toFixed(ARIX_DECIMALS)} ARIX</Text>
                                    <Text className="price-reference"> (at ~${currentArxPrice.toFixed(4)}/ARIX)</Text>
                                    {calculatedArixAmount > arixWalletBalance && 
                                        <Text className="insufficient-balance-warning"> (Insufficient ARIX Balance)</Text>
                                    }
                                    {inputUsdtAmount > 0 && inputUsdtAmount < parseFloat(selectedPlan.minStakeUsdt) &&
                                        <Text className="insufficient-balance-warning"> (Below plan minimum)</Text>
                                    }
                                     {selectedPlan.maxStakeUsdt && inputUsdtAmount > parseFloat(selectedPlan.maxStakeUsdt) &&
                                        <Text className="insufficient-balance-warning"> (Above plan maximum)</Text>
                                    }
                                </Paragraph>
                            )}
                            <Alert type="info" style={{marginTop: 16}} className="modal-alert"
                                message={<Text className="text-primary-light">Staking Process Note</Text>}
                                description={<Text className="text-secondary-light">You are committing a specific USDT value. The system calculates the equivalent ARIX to be staked from your wallet. USDT rewards are based on this initial USDT value. Your ARIX principal is locked in the smart contract.</Text>}
                            />
                        </div>
                    )}
                </Modal>

                <Modal
                    title={<Text className="modal-title-text">Confirm ARIX Principal Unstake</Text>}
                    open={isUnstakeModalVisible}
                    onOk={handleConfirmUnstakeInModal}
                    onCancel={() => {
                        setIsUnstakeModalVisible(false);
                        setSelectedStakeForUnstake(null);
                        setUnstakePrepDetails(null);
                        setIsUnstakeActionLoading(false);
                    }}
                    confirmLoading={isUnstakeActionLoading}
                    okText="Proceed with Unstake"
                    cancelText="Cancel"
                    destroyOnClose
                    centered
                    okButtonProps={{ danger: unstakePrepDetails?.isEarly }}
                    width={modalWidth} 
                >
                    {unstakePrepDetails && selectedStakeForUnstake ? (
                        <div className="unstake-details-modal-content">
                            <Paragraph className="modal-text">{unstakePrepDetails.message}</Paragraph>
                            <Descriptions column={1} bordered size="small" className="modal-descriptions">
                                <Descriptions.Item label="Plan">{selectedStakeForUnstake.planTitle}</Descriptions.Item>
                                <Descriptions.Item label="ARIX Principal Staked">{unstakePrepDetails.principalArix} ARIX</Descriptions.Item>
                                {unstakePrepDetails.isEarly && 
                                    <Descriptions.Item label="Early Unstake Penalty">
                                        <Text style={{color: '#F44336'}}>{unstakePrepDetails.arixPenaltyPercentApplied}% of principal</Text>
                                    </Descriptions.Item>
                                }
                            </Descriptions>
                            <Alert 
                                message={<Text className="text-primary-light">Important Note</Text>}
                                description={<Text className="text-secondary-light">This action only unstakes your ARIX principal from the smart contract. Your accrued USDT rewards are separate and can be withdrawn from your dashboard.</Text>}
                                type="info"
                                showIcon
                                style={{marginTop: 16}}
                                className="modal-alert"
                            />
                        </div>
                    ) : <div style={{textAlign: 'center', padding: '20px'}}><Spin tip="Loading unstake details..."/></div>}
                </Modal>
            </div>
        </Spin>
    );
};
export default EarnPage;